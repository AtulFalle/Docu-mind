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
