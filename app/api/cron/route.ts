import { NextRequest, NextResponse } from 'next/server';
import { fetchUpworkJobs } from '@/lib/upwork';
import { fetchLinkedinJobs } from '@/lib/linkedin';
import { scoreJobs } from '@/lib/claude';
import { getExistingJobUrls, saveJob } from '@/lib/notion';

export const maxDuration = 300; // 5 minutes max

export async function GET(req: NextRequest) {
  // Verify CRON_SECRET via Authorization: Bearer header
  const authHeader = req.headers.get('authorization');
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const startTime = Date.now();
  const results = {
    upworkFetched: 0,
    linkedinFetched: 0,
    scored: 0,
    saved: 0,
    skipped: 0,
    errors: [] as string[],
  };

  try {
    console.log('[Cron] Starting job search run...');

    // 1. Fetch jobs from both platforms in parallel
    const [upworkJobs, linkedinJobs] = await Promise.all([
      fetchUpworkJobs().catch((e: Error) => {
        results.errors.push(`Upwork: ${e.message}`);
        console.error('[Cron] Upwork fetch failed:', e.message);
        return [];
      }),
      fetchLinkedinJobs().catch((e: Error) => {
        results.errors.push(`LinkedIn: ${e.message}`);
        console.error('[Cron] LinkedIn fetch failed:', e.message);
        return [];
      }),
    ]);

    results.upworkFetched = upworkJobs.length;
    results.linkedinFetched = linkedinJobs.length;

    console.log(`[Cron] Fetched ${upworkJobs.length} Upwork jobs, ${linkedinJobs.length} LinkedIn jobs`);

    const allJobs = [...upworkJobs, ...linkedinJobs];

    if (allJobs.length === 0) {
      console.log('[Cron] No new jobs found on either platform');
      return NextResponse.json({ message: 'No new jobs found', results });
    }

    // 2. Get existing job URLs from Notion to avoid duplicates
    const existingUrls = await getExistingJobUrls();
    const newJobs = allJobs.filter(job => !existingUrls.has(job.url));
    results.skipped = allJobs.length - newJobs.length;

    console.log(`[Cron] ${newJobs.length} new jobs after deduplication (${results.skipped} already in Notion)`);

    if (newJobs.length === 0) {
      return NextResponse.json({ message: 'All jobs already saved', results });
    }

    // 3. Score new jobs with Claude
    console.log(`[Cron] Scoring ${newJobs.length} jobs with Claude...`);
    const scoredJobs = await scoreJobs(newJobs);
    results.scored = scoredJobs.length;

    // 4. Save to Notion — only jobs scoring >= 5
    console.log('[Cron] Saving qualifying jobs to Notion...');
    for (const job of scoredJobs) {
      if (job.relevanceScore < 5) {
        console.log(`[Cron] Skipping low-score job (${job.relevanceScore}/10): "${job.title}"`);
        results.skipped++;
        continue;
      }

      try {
        await saveJob(job);
        results.saved++;
      } catch (e: unknown) {
        const message = e instanceof Error ? e.message : String(e);
        results.errors.push(`Save failed for ${job.url}: ${message}`);
      }
    }

    const duration = ((Date.now() - startTime) / 1000).toFixed(1);
    console.log(`[Cron] Done in ${duration}s — saved: ${results.saved}, skipped: ${results.skipped}, errors: ${results.errors.length}`);

    return NextResponse.json({
      message: `Done in ${duration}s`,
      results,
      timestamp: new Date().toISOString(),
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    console.error('[Cron] Fatal error:', message);
    return NextResponse.json({ error: message, results }, { status: 500 });
  }
}
