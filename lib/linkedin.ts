import type { Job } from '@/lib/types';

// All 7 job titles to search on LinkedIn via JSearch
const JOB_QUERIES = [
  'API Documentation technical writer',
  'SaaS Guides technical writer',
  'SaaS Documentation technical writer',
  'Software Documentation technical writer',
  'AI Documentation technical writer',
  'RAG Documentation technical writer',
  'LLM Documentation technical writer',
];

// Jobs posted within the last 6 hours (matches cron interval)
// Use 48h during local testing to verify the pipeline; production uses 6h via cron
const IS_TEST = process.env.NODE_ENV === 'development';
const MAX_AGE_MS = IS_TEST ? 48 * 60 * 60 * 1000 : 6 * 60 * 60 * 1000;

const ALLOWED_COUNTRIES = new Set(['US', 'GB', 'AU']);

interface JSearchJob {
  job_id: string;
  job_title: string;
  employer_name: string;
  job_apply_link: string;
  job_description: string;
  job_posted_at_datetime_utc: string;
  job_publisher: string;
  job_is_remote: boolean;
  job_country?: string;
  job_min_salary?: number;
  job_max_salary?: number;
  job_salary_currency?: string;
  job_salary_period?: string;
}

interface JSearchResponse {
  data?: JSearchJob[];
  status?: string;
  message?: string;
}

function formatSalary(job: JSearchJob): string | undefined {
  if (job.job_min_salary == null && job.job_max_salary == null) return undefined;

  const currency = job.job_salary_currency ?? 'USD';
  const period = job.job_salary_period ?? 'YEAR';

  const periodLabel =
    period === 'HOUR' ? '/hr' :
    period === 'MONTH' ? '/mo' :
    '/yr';

  const symbol = currency === 'USD' ? '$' : currency;

  if (job.job_min_salary != null && job.job_max_salary != null) {
    return `${symbol}${job.job_min_salary.toLocaleString()} - ${symbol}${job.job_max_salary.toLocaleString()}${periodLabel}`;
  }
  if (job.job_min_salary != null) {
    return `${symbol}${job.job_min_salary.toLocaleString()}+${periodLabel}`;
  }
  if (job.job_max_salary != null) {
    return `Up to ${symbol}${job.job_max_salary.toLocaleString()}${periodLabel}`;
  }
  return undefined;
}

async function fetchJobsForQuery(query: string, now: number): Promise<Job[]> {
  const apiKey = process.env.RAPIDAPI_KEY;
  if (!apiKey) throw new Error('RAPIDAPI_KEY environment variable is not set');

  const params = new URLSearchParams({
    query,
    num_pages: '1',
    date_posted: 'today',
    remote_jobs_only: 'true',
  });

  const response = await fetch(
    `https://jsearch.p.rapidapi.com/search?${params.toString()}`,
    {
      method: 'GET',
      headers: {
        'X-RapidAPI-Key': apiKey,
        'X-RapidAPI-Host': 'jsearch.p.rapidapi.com',
      },
    }
  );

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`JSearch API error ${response.status}: ${text.slice(0, 200)}`);
  }

  const data: JSearchResponse = await response.json();

  if (!data.data || !Array.isArray(data.data)) {
    return [];
  }

  const cutoff = now - MAX_AGE_MS;
  const jobs: Job[] = [];

  for (const item of data.data) {
    const jobUrl = item.job_apply_link;
    if (!jobUrl) continue;

    // Parse post date and filter to last 6 hours
    const postedDate = item.job_posted_at_datetime_utc
      ? new Date(item.job_posted_at_datetime_utc)
      : null;

    if (!postedDate || isNaN(postedDate.getTime())) continue;
    if (postedDate.getTime() < cutoff) continue;

    // Only include jobs from US, UK (GB), or Australian companies
    const country = (item.job_country ?? '').toUpperCase();
    if (country && !ALLOWED_COUNTRIES.has(country)) continue;

    const job: Job = {
      title: item.job_title ?? query,
      company: item.employer_name ?? 'Unknown Company',
      url: jobUrl,
      description: (item.job_description ?? '').slice(0, 1000),
      postedAt: postedDate.toISOString(),
      platform: 'LinkedIn',
      budget: formatSalary(item),
      isRemote: item.job_is_remote ?? true,
    };

    jobs.push(job);
  }

  return jobs;
}

export async function fetchLinkedinJobs(): Promise<Job[]> {
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
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      console.error(`[LinkedIn] Failed to fetch jobs for query "${query}": ${message}`);
      // Continue to next query
    }
  }

  return allJobs;
}
