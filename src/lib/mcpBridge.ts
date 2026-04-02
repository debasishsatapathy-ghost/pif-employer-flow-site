/**
 * MCP Bridge - Connects to the job posting MCP server
 * 
 * This module provides a bridge to create job postings via the MCP server.
 * When deployed on Mobeus platform, it uses the agent to invoke MCP tools.
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

/**
 * Gets the Mobeus platform room.
 */
function getMobeusRoom(): any {
  return (window as any).__employerRoom 
      || (window as any).__mobeusRoom 
      || (window as any).MobeusSDK?.room;
}

/**
 * Calls an MCP tool via the agent's RPC interface.
 */
async function callMcpTool(tool: string, args: any): Promise<any> {
  const room = getMobeusRoom();
  
  if (!room?.localParticipant) {
    throw new Error('No LiveKit room available');
  }

  // Find agent participant
  const agentParticipant = Array.from(room.remoteParticipants.values()).find(
    (p: any) => p.kind === 'agent'
  );

  if (!agentParticipant) {
    throw new Error('No agent participant found');
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

  return result.data;
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
