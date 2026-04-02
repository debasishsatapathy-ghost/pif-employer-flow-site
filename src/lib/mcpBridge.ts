/**
 * MCP Bridge - Connects to the job posting MCP server
 * 
 * Hybrid approach (inspired by trainco-site-4):
 * 1. Try /api/invoke/* routes first (for local dev with Next.js API routes)
 * 2. If 405/404, fall back to agent RPC (for Mobeus platform deployment)
 * 3. Remember which approach works to avoid retrying
 */

export interface JobPostingData {
  title: string;
  department?: string;
  location?: string;
  employment_type?: string;
  description?: string;
  skills?: {
    mustHave: string[];
    preferred: string[];
    niceToHave: string[];
  };
  salary_min?: string;
  salary_max?: string;
  posted_by?: string;
}

/** Track tools that returned 405/404 so we don't retry API routes */
const skippedInvokeTools = new Set<string>();

/**
 * Waits for the Mobeus platform room to be available.
 * Polls every 100ms for up to 10 seconds.
 */
async function waitForMobeusRoom(timeoutMs = 10000): Promise<any> {
  const startTime = Date.now();
  
  while (Date.now() - startTime < timeoutMs) {
    const room = (window as any).__employerRoom 
        || (window as any).__mobeusRoom 
        || (window as any).MobeusSDK?.room;
    
    if (room?.localParticipant) {
      return room;
    }
    
    // Wait 100ms before checking again
    await new Promise(resolve => setTimeout(resolve, 100));
  }
  
  throw new Error('LiveKit room not available after waiting. Please ensure the Mobeus session is connected.');
}

/**
 * Gets the Mobeus platform room (synchronous).
 */
function getMobeusRoom(): any {
  return (window as any).__employerRoom 
      || (window as any).__mobeusRoom 
      || (window as any).MobeusSDK?.room;
}

/**
 * Try calling via /api/invoke/* first (for local dev).
 * Returns undefined if route doesn't exist (405/404).
 */
async function tryInvokeApi(tool: string, args: any): Promise<any | undefined> {
  // Skip if we already know this tool doesn't have an API route
  if (skippedInvokeTools.has(tool)) {
    return undefined;
  }

  try {
    const res = await fetch(`/api/invoke/${tool}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(args),
    });

    // API route doesn't exist - remember this and fall back to agent RPC
    if (res.status === 405 || res.status === 404) {
      skippedInvokeTools.add(tool);
      console.warn(
        `[MCP Bridge] ${tool} returned ${res.status} — API route not available. ` +
        'Falling back to agent RPC (Mobeus platform mode).'
      );
      return undefined;
    }

    if (!res.ok) {
      console.error(`[MCP Bridge] ${tool} API call failed:`, res.status);
      return undefined;
    }

    const data = await res.json();
    console.log(`[MCP Bridge] ${tool} succeeded via API route`);
    return data;
  } catch (err) {
    console.error(`[MCP Bridge] ${tool} API call error:`, err);
    return undefined;
  }
}

/**
 * Call MCP tool via agent RPC (fallback for Mobeus platform).
 * Waits for the room to be available if it's not ready yet.
 */
async function callViaAgentRpc(tool: string, args: any): Promise<any> {
  console.log(`[MCP Bridge] Calling ${tool} via agent RPC`);
  
  // Wait for room to be available
  const room = await waitForMobeusRoom();

  // Find agent participant
  const agentParticipant = Array.from(room.remoteParticipants.values()).find(
    (p: any) => p.kind === 'agent'
  );

  if (!agentParticipant) {
    throw new Error('No agent participant found in the room. Please ensure the agent is connected.');
  }

  // Call the agent's MCP tool via RPC
  const response = await room.localParticipant.performRpc({
    destinationIdentity: (agentParticipant as any).identity,
    method: 'callMcpTool',
    payload: JSON.stringify({
      tool,
      arguments: args,
    }),
  });

  const result = JSON.parse(response);
  
  if (!result.success) {
    throw new Error(result.error || 'MCP tool call failed');
  }

  console.log(`[MCP Bridge] ${tool} succeeded via agent RPC`);
  return result.data;
}

/**
 * Hybrid MCP tool caller:
 * 1. Try /api/invoke/* first (local dev)
 * 2. Fall back to agent RPC (Mobeus platform)
 */
async function callMcpTool(tool: string, args: any): Promise<any> {
  // Try API route first
  const apiResult = await tryInvokeApi(tool, args);
  if (apiResult !== undefined) {
    return apiResult;
  }

  // Fall back to agent RPC
  return await callViaAgentRpc(tool, args);
}

/**
 * Creates a job posting via the agent's MCP integration.
 * On Mobeus platform, the agent has access to MCP tools.
 */
export async function createJobPosting(data: JobPostingData): Promise<any> {
  try {
    const result = await callMcpTool('create_job_posting', data);
    console.log('[MCP Bridge] Job posting created via agent:', result);
    return result;
  } catch (error) {
    console.error('[MCP Bridge] Error creating job posting:', error);
    throw error;
  }
}

/**
 * Lists job postings via the agent's MCP integration.
 */
export async function listJobPostings(limit = 50, offset = 0): Promise<any> {
  try {
    return await callMcpTool('list_job_postings', { limit, offset });
  } catch (error) {
    console.error('[MCP Bridge] Error listing job postings:', error);
    throw error;
  }
}

/**
 * Lists job postings by poster via the agent's MCP integration.
 */
export async function listJobPostingsByPoster(postedBy: string, limit = 100, offset = 0): Promise<any> {
  try {
    return await callMcpTool('list_job_postings_by_poster', {
      posted_by: postedBy,
      limit,
      offset,
    });
  } catch (error) {
    console.error('[MCP Bridge] Error listing job postings by poster:', error);
    throw error;
  }
}

/**
 * Gets applicants for a job posting via the agent's MCP integration.
 */
export async function getJobApplicants(postingId: string, includeProfile = true, limit = 100): Promise<any> {
  try {
    return await callMcpTool('get_job_applicants', {
      posting_id: postingId,
      include_profile: includeProfile,
      limit,
    });
  } catch (error) {
    console.error('[MCP Bridge] Error getting job applicants:', error);
    throw error;
  }
}
