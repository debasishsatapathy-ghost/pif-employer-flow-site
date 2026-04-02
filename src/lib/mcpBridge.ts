/**
 * MCP Bridge - Connects to the job posting MCP server
 * 
 * This module provides a bridge to create job postings via the MCP server.
 * When deployed on Mobeus platform, it uses the platform's MCP integration.
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
 * Creates a job posting via the MCP server.
 * Uses the /api/invoke/create_job_posting endpoint.
 */
export async function createJobPosting(data: JobPostingData): Promise<any> {
  try {
    const response = await fetch('/api/invoke/create_job_posting', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
    });

    if (!response.ok) {
      const errorText = await response.text().catch(() => '');
      throw new Error(`Failed to create job posting (${response.status}): ${errorText}`);
    }

    const result = await response.json();
    console.log('[MCP Bridge] Job posting created:', result);
    return result;
    
  } catch (error) {
    console.error('[MCP Bridge] Error creating job posting:', error);
    throw error;
  }
}

/**
 * Lists job postings via the MCP server.
 */
export async function listJobPostings(limit = 50, offset = 0): Promise<any> {
  try {
    const response = await fetch('/api/invoke/list_job_postings', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ limit, offset }),
    });

    if (!response.ok) {
      throw new Error(`Failed to list job postings (${response.status})`);
    }

    return await response.json();
    
  } catch (error) {
    console.error('[MCP Bridge] Error listing job postings:', error);
    throw error;
  }
}

/**
 * Gets applicants for a job posting via the MCP server.
 */
export async function getJobApplicants(postingId: string, includeProfile = true, limit = 100): Promise<any> {
  try {
    const response = await fetch('/api/invoke/get_job_applicants', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ 
        posting_id: postingId, 
        include_profile: includeProfile,
        limit 
      }),
    });

    if (!response.ok) {
      throw new Error(`Failed to get job applicants (${response.status})`);
    }

    return await response.json();
    
  } catch (error) {
    console.error('[MCP Bridge] Error getting job applicants:', error);
    throw error;
  }
}
