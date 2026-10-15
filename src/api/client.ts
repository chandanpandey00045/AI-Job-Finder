import { UserProfile, JobListing, ApplicationRecord, WorkflowLog } from '../types';

export const API_BASE = '/api';

export async function fetchProfile(): Promise<UserProfile> {
  const res = await fetch(`${API_BASE}/profile`);
  if (!res.ok) throw new Error(`Failed to load profile: ${res.statusText}`);
  const data = await res.json();
  return data.profile;
}

export async function saveProfile(profile: UserProfile): Promise<UserProfile> {
  const res = await fetch(`${API_BASE}/profile`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(profile)
  });
  if (!res.ok) throw new Error(`Failed to save profile: ${res.statusText}`);
  const data = await res.json();
  return data.profile;
}

export async function uploadResumeFile(file: File): Promise<{ profile: UserProfile; parsed: any; filename: string }> {
  const formData = new FormData();
  formData.append('resume', file);

  const res = await fetch(`${API_BASE}/profile/upload-resume`, {
    method: 'POST',
    body: formData
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || `Upload failed: ${res.statusText}`);
  }
  return res.json();
}

export async function fetchJobs(): Promise<JobListing[]> {
  const res = await fetch(`${API_BASE}/jobs`);
  if (!res.ok) throw new Error(`Failed to fetch jobs: ${res.statusText}`);
  const data = await res.json();
  return data.jobs;
}

export async function triggerJobSearch(): Promise<{ jobsFound: number; jobsAdded: number }> {
  const res = await fetch(`${API_BASE}/jobs/search`, { method: 'POST' });
  if (!res.ok) throw new Error(`Search failed: ${res.statusText}`);
  return res.json();
}

export async function importAssistedJob(jobData: {
  title: string;
  company: string;
  location: string;
  workMode?: string;
  jobUrl: string;
  description: string;
  platform: string;
  requiredSkills?: string[];
  salaryMin?: number;
  salaryMax?: number;
}): Promise<any> {
  const res = await fetch(`${API_BASE}/jobs/import`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(jobData)
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || `Import failed: ${res.statusText}`);
  }
  return res.json();
}

export async function importJobByUrl(url: string, platform?: string): Promise<any> {
  const res = await fetch(`${API_BASE}/jobs/import-url`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ url, platform })
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || `URL import failed: ${res.statusText}`);
  }
  return res.json();
}

export async function fetchJobMaterials(jobId: string): Promise<any> {
  const res = await fetch(`${API_BASE}/jobs/${jobId}/materials`);
  if (!res.ok) throw new Error(`Failed to fetch materials: ${res.statusText}`);
  return res.json();
}

export async function fetchApplications(): Promise<ApplicationRecord[]> {
  const res = await fetch(`${API_BASE}/applications`);
  if (!res.ok) throw new Error(`Failed to fetch applications: ${res.statusText}`);
  const data = await res.json();
  return data.applications;
}

export async function approveApplication(appId: string, customAnswer?: string): Promise<any> {
  const res = await fetch(`${API_BASE}/applications/${appId}/approve`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ customAnswer })
  });
  if (!res.ok) throw new Error(`Approval failed: ${res.statusText}`);
  return res.json();
}

export async function rejectApplication(appId: string, reason?: string): Promise<any> {
  const res = await fetch(`${API_BASE}/applications/${appId}/reject`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ reason })
  });
  if (!res.ok) throw new Error(`Rejection failed: ${res.statusText}`);
  return res.json();
}

export async function verifySubmitApplication(appId: string, evidence: {
  submissionMethod?: string;
  receiptId?: string;
  confirmationUrl?: string;
  notes?: string;
}): Promise<any> {
  const res = await fetch(`${API_BASE}/applications/${appId}/verify-submit`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(evidence)
  });
  if (!res.ok) throw new Error(`Submission verification failed: ${res.statusText}`);
  return res.json();
}

export async function updateApplicationStatus(appId: string, status: string, notes?: string): Promise<any> {
  const res = await fetch(`${API_BASE}/applications/${appId}/status`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ status, notes })
  });
  if (!res.ok) throw new Error(`Status update failed: ${res.statusText}`);
  return res.json();
}

export async function fetchSources(): Promise<any[]> {
  const res = await fetch(`${API_BASE}/sources`);
  if (!res.ok) throw new Error(`Failed to fetch sources: ${res.statusText}`);
  const data = await res.json();
  return data.sources;
}

export async function fetchSearchUrls(): Promise<Record<string, string>> {
  const res = await fetch(`${API_BASE}/sources/search-urls`);
  if (!res.ok) throw new Error(`Failed to fetch search URLs: ${res.statusText}`);
  const data = await res.json();
  return data.searchUrls;
}

export async function fetchSchedule(): Promise<any> {
  const res = await fetch(`${API_BASE}/schedule`);
  if (!res.ok) throw new Error(`Failed to fetch schedule: ${res.statusText}`);
  const data = await res.json();
  return data.schedule;
}

export async function updateSchedule(intervalHours?: number, isActive?: boolean): Promise<any> {
  const res = await fetch(`${API_BASE}/schedule`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ intervalHours, isActive })
  });
  if (!res.ok) throw new Error(`Failed to update schedule: ${res.statusText}`);
  return res.json();
}

export async function fetchLogs(): Promise<WorkflowLog[]> {
  const res = await fetch(`${API_BASE}/logs`);
  if (!res.ok) return [];
  const data = await res.json();
  return data.logs;
}

export async function clearLogs(): Promise<any> {
  const res = await fetch(`${API_BASE}/logs`, { method: 'DELETE' });
  return res.json();
}

export async function fetchDashboardStats(): Promise<any> {
  const res = await fetch(`${API_BASE}/dashboard/stats`);
  if (!res.ok) throw new Error(`Failed to fetch stats: ${res.statusText}`);
  const data = await res.json();
  return data.stats;
}
