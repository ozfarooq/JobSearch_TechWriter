export default function HomePage() {
  const jobTitles = [
    'API Documentation',
    'SaaS Guides',
    'SaaS Documentation',
    'Software Documentation',
    'AI Documentation',
    'RAG Documentation',
    'LLM Documentation',
  ];

  return (
    <main className="min-h-screen bg-gray-50 py-12 px-4">
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Job Finder Agent</h1>
          <p className="text-gray-600 text-lg">
            Automated freelance job search for technical writers. Searches Upwork and LinkedIn
            every 6 hours, scores jobs using Claude AI, and saves the best matches to Notion.
          </p>
        </div>

        {/* Status badge */}
        <div className="mb-8 inline-flex items-center gap-2 bg-green-50 border border-green-200 text-green-800 px-4 py-2 rounded-full text-sm font-medium">
          <span className="w-2 h-2 rounded-full bg-green-500 inline-block"></span>
          Active — runs every 6 hours
        </div>

        {/* Job titles */}
        <section className="bg-white rounded-xl border border-gray-200 p-6 mb-6">
          <h2 className="text-lg font-semibold text-gray-800 mb-4">Job Titles Searched</h2>
          <ul className="space-y-2">
            {jobTitles.map((title, index) => (
              <li key={index} className="flex items-center gap-3 text-gray-700">
                <span className="w-6 h-6 rounded-full bg-blue-100 text-blue-700 text-xs font-semibold flex items-center justify-center flex-shrink-0">
                  {index + 1}
                </span>
                {title}
              </li>
            ))}
          </ul>
        </section>

        {/* Platforms */}
        <section className="bg-white rounded-xl border border-gray-200 p-6 mb-6">
          <h2 className="text-lg font-semibold text-gray-800 mb-4">Platforms</h2>
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-gray-50 rounded-lg p-4">
              <div className="font-semibold text-gray-800 mb-1">Upwork</div>
              <div className="text-sm text-gray-500">RSS feed, no auth required</div>
              <div className="text-sm text-gray-500">All remote, latest 20 per query</div>
            </div>
            <div className="bg-gray-50 rounded-lg p-4">
              <div className="font-semibold text-gray-800 mb-1">LinkedIn</div>
              <div className="text-sm text-gray-500">JSearch RapidAPI</div>
              <div className="text-sm text-gray-500">Remote-only filter applied</div>
            </div>
          </div>
        </section>

        {/* How it works */}
        <section className="bg-white rounded-xl border border-gray-200 p-6 mb-6">
          <h2 className="text-lg font-semibold text-gray-800 mb-4">How It Works</h2>
          <ol className="space-y-3">
            {[
              'Fetches jobs from Upwork (RSS) and LinkedIn (JSearch API) in parallel',
              'Filters to jobs posted within the last 7 hours',
              'Checks Notion to skip jobs already saved (deduplication)',
              'Scores each new job with Claude AI on a 1-10 relevance scale',
              'Saves jobs scoring 5 or higher to your Notion database',
            ].map((step, index) => (
              <li key={index} className="flex items-start gap-3 text-gray-700 text-sm">
                <span className="w-5 h-5 rounded-full bg-blue-600 text-white text-xs font-bold flex items-center justify-center flex-shrink-0 mt-0.5">
                  {index + 1}
                </span>
                {step}
              </li>
            ))}
          </ol>
        </section>

        {/* Schedule */}
        <section className="bg-white rounded-xl border border-gray-200 p-6 mb-6">
          <h2 className="text-lg font-semibold text-gray-800 mb-3">Schedule</h2>
          <div className="text-sm text-gray-600 space-y-1">
            <p>
              <span className="font-medium text-gray-800">Cron expression:</span>{' '}
              <code className="bg-gray-100 px-2 py-0.5 rounded font-mono text-xs">0 */6 * * *</code>
            </p>
            <p>
              <span className="font-medium text-gray-800">Frequency:</span> Every 6 hours
            </p>
            <p>
              <span className="font-medium text-gray-800">Endpoint:</span>{' '}
              <code className="bg-gray-100 px-2 py-0.5 rounded font-mono text-xs">GET /api/cron</code>
            </p>
            <p className="text-gray-400 text-xs pt-1">
              Note: Vercel Pro plan required for sub-daily cron frequency.
              Alternatively, use cron-job.org to call this endpoint every 6 hours.
            </p>
          </div>
        </section>

        {/* Results */}
        <section className="bg-blue-50 border border-blue-200 rounded-xl p-6 mb-6">
          <h2 className="text-lg font-semibold text-blue-900 mb-2">Results</h2>
          <p className="text-blue-800 text-sm">
            Check your Notion database for results. Each saved job includes the title, company,
            platform, posting date, budget/rate, Claude relevance score, match reason, and skill tags.
          </p>
        </section>

        {/* Manual trigger */}
        <section className="bg-amber-50 border border-amber-200 rounded-xl p-6">
          <h2 className="text-lg font-semibold text-amber-900 mb-2">Manual Trigger</h2>
          <p className="text-amber-800 text-sm mb-3">
            Trigger the job search manually by sending a GET request to{' '}
            <code className="bg-amber-100 px-1.5 py-0.5 rounded font-mono text-xs">/api/cron</code>{' '}
            with the correct Authorization header.
          </p>
          <div className="bg-amber-100 rounded-lg p-3 font-mono text-xs text-amber-900 overflow-x-auto whitespace-nowrap">
            curl -H &quot;Authorization: Bearer YOUR_CRON_SECRET&quot; https://your-domain.vercel.app/api/cron
          </div>
        </section>

        {/* Footer */}
        <div className="mt-8 text-center text-xs text-gray-400">
          Job Finder Agent — built with Next.js, Claude AI, and Notion
        </div>
      </div>
    </main>
  );
}
