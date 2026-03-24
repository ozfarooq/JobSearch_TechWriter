export interface Job {
  title: string;
  company: string;
  url: string;
  description: string;
  postedAt: string; // ISO string
  platform: 'Upwork' | 'LinkedIn';
  budget?: string;
  isRemote: boolean;
}

export interface ScoredJob extends Job {
  relevanceScore: number; // 1-10
  matchReason: string;
  tags: string[];
}
