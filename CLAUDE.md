# Job Finder Agent - Claude Context

## Purpose
Automated freelance job search agent for a technical writer. Searches Upwork and LinkedIn every 6 hours, scores jobs using Claude AI, and saves results to Notion.

## Owner Profile
- Role: Freelance Technical Writer
- Email: ozfarooq@gmail.com
- Expertise:
  - API Documentation (REST, GraphQL, OpenAPI/Swagger specs)
  - SaaS product documentation, onboarding guides, release notes
  - AI/ML documentation: RAG systems, LLM integrations, vector databases
  - Developer portals, SDK docs, integration guides
  - Software architecture documentation

## Job Titles Being Searched
1. API Documentation
2. SaaS Guides
3. SaaS Documentation
4. Software Documentation
5. AI Documentation
6. RAG Documentation
7. LLM Documentation

## Platforms
- **Upwork**: RSS feeds (no auth), all remote, filtered to last 7 hours
- **LinkedIn**: JSearch RapidAPI (account: ozfarooq@gmail.com), remote-only, filtered to last 7 hours

## Scoring Criteria (Claude)
- 10: Perfect match — senior technical writing for APIs, AI/SaaS products
- 7-9: Strong match — technical writing with domain overlap
- 5-6: Partial match — writing role with some technical elements
- 1-4: Weak match — general writing or unrelated tech role
- Jobs scoring < 5 are NOT saved to Notion

## Notion Database Properties
| Property | Type | Description |
|----------|------|-------------|
| Name | title | Job title |
| Platform | select | Upwork or LinkedIn |
| Company | rich_text | Company/client name |
| Link | url | Direct job application link |
| Posted | date | When the job was posted |
| Budget | rich_text | Rate or salary range |
| Relevance | number | Claude score 1-10 |
| Match Reason | rich_text | Why Claude scored it this way |
| Status | select | New / Reviewing / Applied / Rejected |
| Tags | multi_select | Skill tags extracted from job |

## Schedule
- Cron: `0 */6 * * *` (every 6 hours)
- Endpoint: GET /api/cron
- Auth: Bearer token via CRON_SECRET env var
- Requires Vercel Pro plan for sub-daily cron frequency

## Environment Variables Required
- `RAPIDAPI_KEY` — RapidAPI key for LinkedIn job search
- `NOTION_API_KEY` — Notion integration secret
- `NOTION_DATABASE_ID` — Target Notion database ID
- `ANTHROPIC_API_KEY` — Claude API key for job scoring
- `CRON_SECRET` — Random secret to protect cron endpoint

## Key Design Decisions
- Deduplication: Checks existing Notion URLs before saving, preventing re-saves across runs
- Time filter: Only jobs posted within 7 hours are processed (1hr buffer over 6hr cron)
- Parallel fetch: Upwork and LinkedIn fetched simultaneously
- Error resilience: Each platform fetch wrapped in try/catch, cron continues on partial failure
- Score threshold: Only jobs scoring >= 5 are saved to Notion

## Setup Instructions (for Notion)
1. Go to https://www.notion.so/my-integrations → Create integration
2. Copy the "Internal Integration Token" → set as NOTION_API_KEY
3. Create a new full-page database in Notion with all the property columns above
4. Open database → Share → Invite your integration
5. Copy the database ID from the URL (the 32-char hex after the last slash, before the ?)
6. Set as NOTION_DATABASE_ID

## Deployment (Vercel)
1. `npm install` then `vercel deploy`
2. Add all env vars in Vercel dashboard
3. Vercel Pro required for 6-hour cron (Hobby only allows daily)
4. Alternative for free: use cron-job.org to POST to your endpoint every 6 hours
