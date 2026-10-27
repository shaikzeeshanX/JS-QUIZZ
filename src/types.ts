export interface Question {
  id: string;
  kind: "foundation" | "dynamic";
  topic: string;
  concept?: string;
  question: string;
  code?: string;
  options: string[];
  answerIndex: number;
  explanation: string;
  source: string;
  difficulty?: string;
}

export interface User {
  name: string;
  email: string;
  logins?: number;
}

export interface LoginResponse {
  token: string;
  seed: number;
  user: User;
  foundation: Question[];
  dynamic: Question[];
  /** True when this session was minted without the backend (built-in engine). */
  offline?: boolean;
}

export interface Answer {
  qid: string;
  choice: number;
  correct: boolean;
  timeMs: number;
}

export interface PhaseStat {
  correct: number;
  total: number;
}

export interface LeaderRow {
  rank: number;
  id: string;
  name: string;
  score: number;
  total: number;
  accuracy: number;
  timeMs: number;
  at: number;
}

export interface SubmitResult {
  score: number;
  total: number;
  accuracy: number;
  grade: string;
  phase: { foundation: PhaseStat; dynamic: PhaseStat };
  timeMs: number;
  attemptId: string;
  leaderboard: LeaderRow[];
}
