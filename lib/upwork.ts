import type { Job } from '@/lib/types';

// Direct Upwork job search via upwork-jobs-api3 on RapidAPI
// Updated every 5 minutes, 30 fields per job, real Upwork listings

// Search queries targeting the owner's specialties
const JOB_QUERIES = [
  'API Documentation|SaaS Documentation|Software Documentation',
  'AI Documentation|RAG Documentation|LLM Documentation',
  'Technical Writer API',
  'Technical Writer SaaS',
];

// 48h in dev to verify pipeline; 6h in production (cron runs every 6h)
const IS_TEST = process.env.NODE_ENV === 'development';
const MAX_AGE_MS = IS_TEST ? 48 * 60 * 60 * 1000 : 6 * 60 * 60 * 1000;

const RAPIDAPI_HOST = 'upwork-jobs-api3.p.rapidapi.com';

interface UpworkJob {
  job_id: string;
  url: string;
  published_at: string;
  title: string;
  description: string;
  skills: string[];
  budget_type?: string;
  budget_total_usd?: string | null;
  experience_level?: string;
  location?: string;
  project_length?: string;
  hours_per_week?: string;
}

interface UpworkResponse {
  data?: UpworkJob[];
  next_cursor?: string;
  error?: unknown;
}

function formatBudget(job: UpworkJob): string | undefined {
  if (job.budget_type === 'fixed' && job.budget_total_usd) {
    return `Fixed: ${job.budget_total_usd}`;
  }
  if (job.budget_type === 'hourly') {
    return 'Hourly';
  }
  return undefined;
}

async function fetchJobsForQuery(query: string, now: number): Promise<Job[]> {
  const apiKey = process.env.RAPIDAPI_KEY;
  if (!apiKey) throw new Error('RAPIDAPI_KEY is not set');

  const params = new URLSearchParams({
    q: query,
    limit: '50',
    sort_order: 'desc',
  });

  const response = await fetch(`https://${RAPIDAPI_HOST}/upwork?${params}`, {
    method: 'GET',
    headers: {
      'X-RapidAPI-Key': apiKey,
      'X-RapidAPI-Host': RAPIDAPI_HOST,
    },
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Upwork API error ${response.status}: ${text.slice(0, 200)}`);
  }

  const data: UpworkResponse = await response.json();
  if (!data.data || !Array.isArray(data.data)) return [];

  const cutoff = now - MAX_AGE_MS;
  const jobs: Job[] = [];

  for (const item of data.data) {
    if (!item.url) continue;

    const postedDate = item.published_at ? new Date(item.published_at) : null;
    if (!postedDate || isNaN(postedDate.getTime())) continue;
    if (postedDate.getTime() < cutoff) continue;

    jobs.push({
      title: item.title,
      company: item.location ?? 'Upwork Client',
      url: item.url,
      description: (item.description ?? '').slice(0, 1000),
      postedAt: postedDate.toISOString(),
      platform: 'Upwork',
      budget: formatBudget(item),
      isRemote: true,
    });
  }

  return jobs;
}

export async function fetchUpworkJobs(): Promise<Job[]> {
  const now = Date.now();
  const allJobs: Job[] = [];
  const seenUrls = new Set<string>();

  for (const query of JOB_QUERIES) {
    try {
      const jobs = await fetchJobsForQuery(query, now);
      for (const job of jobs) {
        if (seenUrls.has(job.url)) continue;
        seenUrls.add(job.url);
        allJobs.push(job);
      }
      console.log(`[Upwork] Query "${query}" → ${jobs.length} jobs`);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      console.error(`[Upwork] Failed for query "${query}": ${message}`);
    }
  }

  console.log(`[Upwork] Total unique jobs: ${allJobs.length}`);
  return allJobs;
}
