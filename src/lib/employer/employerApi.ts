/** Employer API client */

export interface SkillSet {
  mustHave: string[];
  preferred: string[];
  niceToHave: string[];
}

export interface JobPostingCreate {
  title: string;
  department?: string;
  location?: string;
  employment_type?: string;
  description?: string;
  skills?: SkillSet;
  salary_min?: string;
  salary_max?: string;
  posted_by?: string;
}

export interface JobPostingResponse {
  id: string;
  title: string;
  department: string | null;
  location: string | null;
  employment_type: string | null;
  description: string | null;
  skills: SkillSet | null;
  salary_min: string | null;
  salary_max: string | null;
  posted_by: string | null;
  status: string;
  created_at: string;
  updated_at: string;
}

export interface JobPostingListResponse {
  items: JobPostingResponse[];
  total: number;
}

export interface MockJobSkill {
  name: string;
  level: string;
}

export interface MockJobResponse {
  id: string;
  title: string;
  company: string;
  posted_by: string | null;
  location: string;
  category: string;
  description: string;
  salary_range: string | null;
  required_skills: MockJobSkill[];
  recommended_skills: MockJobSkill[];
}

export interface MockJobsByPosterResponse {
  jobs: MockJobResponse[];
  total: number;
  limit: number;
  offset: number;
}

export interface CandidateSkill {
  name: string;
  level: string;
  years: number;
}

export interface CandidateProfile {
  id: string;
  name?: string;
  city?: string;
  location?: string;
  experience_years?: number;
  skills?: CandidateSkill[];
  job_preferences?: string[];
  experience?: { title: string; company: string; years: number }[];
  education?: { degree: string; institution: string; graduation_year: number }[];
}

export interface ApplicationWithProfileResponse {
  id: string;
  job_posting_id: string;
  candidate_id: string;
  candidate_name: string | null;
  status: string;
  applied_at: string;
  updated_at: string;
  candidate_profile: CandidateProfile | null;
}

export interface ApplicationWithProfileListResponse {
  items: ApplicationWithProfileResponse[];
  total: number;
  limit: number;
  offset: number;
}
