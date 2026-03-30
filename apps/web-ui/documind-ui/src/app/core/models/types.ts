export type DocumentStatus = 'uploaded' | 'processing' | 'completed' | 'failed';

export interface DocumentDto {
  docId: string;
  fileName: string;
  status: DocumentStatus;
  bucket?: string;
  key?: string;
  createdAt: string;
  updatedAt: string;
}

export interface DashboardStats {
  total: number;
  processed: number;
  pending: number;
  failed: number;
}

export type InterviewStatus = 'uploaded' | 'processing' | 'transcribed' | 'completed' | 'failed';

export interface EvaluationResultDto {
  status: string;
  technical: number;
  communication: number;
  confidence: number;
  consistency: number;
  aiRisk: number;
  strengths: string[];
  weaknesses: string[];
  summary: string;
  completedAt?: string;
}

export interface InterviewDto {
  interviewId: string;
  videoPath: string;
  status: InterviewStatus;
  evaluation?: EvaluationResultDto;
  createdAt: string;
  updatedAt: string;
}

export interface InterviewStats {
  total: number;
  completed: number;
  processing: number;
  failed: number;
}
