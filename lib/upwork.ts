import Parser from 'rss-parser';
import type { Job } from '@/lib/types';

const parser = new Parser({
  customFields: {
    item: ['content:encoded', 'content'],
  },
});

// All 7 job titles to search on Upwork
const JOB_QUERIES = [
  'API Documentation',
  'SaaS Guides',
  'SaaS Documentation',
  'Software Documentation',
  'AI Documentation',
  'RAG Documentation',
  'LLM Documentation',
];

// Jobs posted within the last 7 hours (1hr buffer over 6hr cron)
const MAX_AGE_MS = 7 * 60 * 60 * 1000;

function extractBudget(content: string): string | undefined {
  // Try to find budget patterns like "$50/hr", "$500", "Budget: $1,000", "Fixed: $500", etc.
  const budgetPatterns = [
    /Budget:\s*\$?([\d,]+(?:\.\d+)?)\s*(?:\/hr|\/hour)?/i,
    /Hourly Range:\s*\$?([\d,]+(?:\.\d+)?)\s*[-–]\s*\$?([\d,]+(?:\.\d+)?)/i,
    /Fixed[- ]Price:\s*\$?([\d,]+(?:\.\d+)?)/i,
    /\$\s*([\d,]+(?:\.\d+)?)\s*[-–]\s*\$\s*([\d,]+(?:\.\d+)?)\s*(?:\/hr|\/hour)/i,
    /\$\s*([\d,]+(?:\.\d+)?)\s*(?:\/hr|\/hour)/i,
  ];

  for (const pattern of budgetPatterns) {
    const match = content.match(pattern);
    if (match) {
      return match[0].trim();
    }
  }
  return undefined;
}

function buildRssUrl(query: string): string {
  const encoded = encodeURIComponent(query);
  return `https://www.upwork.com/ab/feed/jobs/rss?q=${encoded}&sort=recency&paging=0%3B20`;
}

export async function fetchUpworkJobs(): Promise<Job[]> {
  const now = Date.now();
  const cutoff = now - MAX_AGE_MS;
  const allJobs: Job[] = [];
  const seenUrls = new Set<string>();

  for (const query of JOB_QUERIES) {
    try {
      const url = buildRssUrl(query);
      const feed = await parser.parseURL(url);

      for (const item of feed.items) {
        const jobUrl = item.link ?? item.guid ?? '';
        if (!jobUrl || seenUrls.has(jobUrl)) continue;

        // Parse the post date
        const postedDate = item.pubDate ? new Date(item.pubDate) : null;
        if (!postedDate || isNaN(postedDate.getTime())) continue;

        // Filter to jobs posted within the last 7 hours
        if (postedDate.getTime() < cutoff) continue;

        seenUrls.add(jobUrl);

        // Extract content for budget parsing
        const rawContent: string =
          (item as Record<string, unknown>)['content:encoded'] as string ??
          (item as Record<string, unknown>)['content'] as string ??
          item.contentSnippet ??
          item.summary ??
          '';

        const description = item.contentSnippet ?? item.summary ?? rawContent.replace(/<[^>]+>/g, '').slice(0, 1000);
        const budget = extractBudget(rawContent);

        const job: Job = {
          title: item.title ?? query,
          company: 'Upwork Client',
          url: jobUrl,
          description: description.slice(0, 1000),
          postedAt: postedDate.toISOString(),
          platform: 'Upwork',
          budget,
          isRemote: true,
        };

        allJobs.push(job);
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      console.error(`[Upwork] Failed to fetch jobs for query "${query}": ${message}`);
      // Continue to next query
    }
  }

  return allJobs;
}
