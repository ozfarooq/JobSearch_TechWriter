import Anthropic from '@anthropic-ai/sdk';
import type { Job, ScoredJob } from '@/lib/types';

const client = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

const SYSTEM_PROMPT = `You are a job relevance evaluator for an experienced freelance technical writer.

The technical writer specializes in:
- API Documentation (REST, GraphQL, OpenAPI/Swagger specs)
- SaaS product documentation, onboarding guides, and release notes
- AI/ML documentation: RAG systems, LLM integrations, and vector databases
- Developer portals, SDK docs, and integration guides
- Software architecture documentation

Your task is to evaluate how relevant a job posting is for this technical writer and return a JSON object.

Scoring scale:
- 10: Perfect match — senior technical writing for APIs, AI/SaaS products
- 7-9: Strong match — technical writing with clear domain overlap
- 5-6: Partial match — writing role with some technical elements
- 1-4: Weak match — general writing or unrelated tech role

Return ONLY a valid JSON object with this exact structure (no markdown, no extra text):
{
  "relevanceScore": <integer 1-10>,
  "matchReason": "<one concise sentence explaining the score>",
  "tags": ["<tag1>", "<tag2>", "<tag3>"]
}

Rules:
- relevanceScore must be an integer between 1 and 10
- matchReason must be a single sentence under 150 characters
- tags must be an array of 3 to 5 short skill keywords extracted from the job description
- Do not include any text outside the JSON object`;

function delay(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

interface ClaudeScoreResponse {
  relevanceScore: number;
  matchReason: string;
  tags: string[];
}

async function scoreJob(job: Job): Promise<ScoredJob> {
  const userMessage = `Please evaluate this job posting:

Title: ${job.title}
Company: ${job.company}
Platform: ${job.platform}
${job.budget ? `Budget: ${job.budget}` : ''}

Description:
${job.description}`;

  try {
    const message = await client.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 300,
      system: SYSTEM_PROMPT,
      messages: [
        {
          role: 'user',
          content: userMessage,
        },
      ],
    });

    const responseText =
      message.content[0]?.type === 'text' ? message.content[0].text.trim() : '';

    // Parse Claude's JSON response
    let parsed: ClaudeScoreResponse;
    try {
      parsed = JSON.parse(responseText) as ClaudeScoreResponse;
    } catch {
      // If JSON parsing fails, attempt to extract JSON from the response
      const jsonMatch = responseText.match(/\{[\s\S]*\}/);
      if (!jsonMatch) throw new Error(`Could not parse Claude response: ${responseText.slice(0, 100)}`);
      parsed = JSON.parse(jsonMatch[0]) as ClaudeScoreResponse;
    }

    // Validate and clamp the score
    const relevanceScore = Math.min(10, Math.max(1, Math.round(Number(parsed.relevanceScore))));
    const matchReason = String(parsed.matchReason ?? '').slice(0, 200);
    const tags = Array.isArray(parsed.tags)
      ? parsed.tags.slice(0, 5).map(t => String(t).trim()).filter(Boolean)
      : [];

    return {
      ...job,
      relevanceScore,
      matchReason,
      tags,
    };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    console.error(`[Claude] Failed to score job "${job.title}" (${job.url}): ${message}`);

    // Return job with low default score on failure
    return {
      ...job,
      relevanceScore: 1,
      matchReason: 'Scoring failed — could not evaluate this job.',
      tags: [],
    };
  }
}

export async function scoreJobs(jobs: Job[]): Promise<ScoredJob[]> {
  const scoredJobs: ScoredJob[] = [];

  for (let i = 0; i < jobs.length; i++) {
    const job = jobs[i];
    console.log(`[Claude] Scoring job ${i + 1}/${jobs.length}: "${job.title}" from ${job.platform}`);

    const scored = await scoreJob(job);
    scoredJobs.push(scored);

    // Add 200ms delay between calls to avoid rate limits (skip after last item)
    if (i < jobs.length - 1) {
      await delay(200);
    }
  }

  return scoredJobs;
}
