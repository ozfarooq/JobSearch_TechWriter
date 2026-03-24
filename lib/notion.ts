import { Client, isFullPage } from '@notionhq/client';
import type { ScoredJob } from '@/lib/types';

// Expected Notion Database Properties:
// - Name          (title)        — Job title
// - Platform      (select)       — "Upwork" or "LinkedIn"
// - Company       (rich_text)    — Company/client name
// - Link          (url)          — Direct job application URL
// - Posted        (date)         — ISO date when job was posted
// - Budget        (rich_text)    — Rate or salary range (optional)
// - Relevance     (number)       — Claude relevance score 1-10
// - Match Reason  (rich_text)    — Claude's one-sentence explanation
// - Status        (select)       — Defaults to "New"; options: New / Reviewing / Applied / Rejected
// - Tags          (multi_select) — Skill tags extracted from job description

const notion = new Client({
  auth: process.env.NOTION_API_KEY,
});

function getDatabaseId(): string {
  const id = process.env.NOTION_DATABASE_ID;
  if (!id) throw new Error('NOTION_DATABASE_ID environment variable is not set');
  return id;
}

/**
 * Retrieves all existing job URLs from the Notion database.
 * Paginates through all results to build a complete deduplication set.
 */
export async function getExistingJobUrls(): Promise<Set<string>> {
  const databaseId = getDatabaseId();
  const urls = new Set<string>();
  let hasMore = true;
  let startCursor: string | undefined = undefined;

  while (hasMore) {
    const response = await notion.databases.query({
      database_id: databaseId,
      start_cursor: startCursor,
      page_size: 100,
      filter_properties: ['Link'], // Only fetch the Link property to reduce payload
    });

    for (const page of response.results) {
      if (!isFullPage(page)) continue;

      const linkProp = page.properties['Link'];
      if (linkProp?.type === 'url' && linkProp.url) {
        urls.add(linkProp.url);
      }
    }

    hasMore = response.has_more;
    startCursor = response.next_cursor ?? undefined;
  }

  console.log(`[Notion] Found ${urls.size} existing job URLs in database`);
  return urls;
}

/**
 * Creates a new page in the Notion database for a scored job.
 * Tags are formatted as { name: tag } objects for the multi_select property.
 */
export async function saveJob(job: ScoredJob): Promise<void> {
  const databaseId = getDatabaseId();

  try {
    await notion.pages.create({
      parent: { database_id: databaseId },
      properties: {
        // Title property — job title
        Name: {
          title: [
            {
              text: {
                content: job.title.slice(0, 2000),
              },
            },
          ],
        },

        // Select property — platform source
        Platform: {
          select: {
            name: job.platform,
          },
        },

        // Rich text — company name
        Company: {
          rich_text: [
            {
              text: {
                content: job.company.slice(0, 2000),
              },
            },
          ],
        },

        // URL property — direct application link
        Link: {
          url: job.url,
        },

        // Date property — when the job was posted
        Posted: {
          date: {
            start: job.postedAt,
          },
        },

        // Rich text — budget/rate (optional)
        ...(job.budget
          ? {
              Budget: {
                rich_text: [
                  {
                    text: {
                      content: job.budget.slice(0, 2000),
                    },
                  },
                ],
              },
            }
          : {}),

        // Number property — Claude relevance score
        Relevance: {
          number: job.relevanceScore,
        },

        // Rich text — Claude's match reason
        'Match Reason': {
          rich_text: [
            {
              text: {
                content: job.matchReason.slice(0, 2000),
              },
            },
          ],
        },

        // Select property — default status for new jobs
        Status: {
          select: {
            name: 'New',
          },
        },

        // Multi-select property — skill tags (must be { name: string } objects)
        Tags: {
          multi_select: job.tags.map(tag => ({ name: tag.slice(0, 100) })),
        },
      },
    });

    console.log(`[Notion] Saved job: "${job.title}" (score: ${job.relevanceScore}) — ${job.url}`);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    console.error(`[Notion] Failed to save job "${job.title}" (${job.url}): ${message}`);
    throw err;
  }
}
