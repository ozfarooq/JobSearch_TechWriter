export interface Job {
  title: string;
  company: string;
  url: string;
  description: string;
  postedAt: string; // ISO string
  platform: string; // e.g. 'Upwork', 'LinkedIn', 'Indeed', 'Glassdoor'
  budget?: string;
  isRemote: boolean;
}

export interface ScoredJob extends Job {
  relevanceScore: number; // 1-10
  matchReason: string;
  tags: string[];
}
