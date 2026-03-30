import { Injectable, resource } from '@angular/core';
import { InterviewDto } from '../models/types';

@Injectable({
  providedIn: 'root'
})
export class InterviewService {
  readonly interviewResource = resource({
    loader: async () => {
      const response = await fetch('/api/interview');

      if (!response.ok) {
        throw new Error('Failed to fetch interviews');
      }

      const data: InterviewDto[] = await response.json();
      return data;
    }
  });

  async uploadFile(file: File): Promise<void> {
    const formData = new FormData();
    formData.append('video', file);

    const response = await fetch('/api/interview/upload', {
      method: 'POST',
      body: formData,
    });

    if (!response.ok) {
      throw new Error('Upload failed');
    }

    this.interviewResource.reload();
  }

  async requestEvaluation(interviewId: string): Promise<void> {
    const response = await fetch(`/api/interview/${interviewId}/evaluate`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      }
    });

    if (!response.ok) {
      throw new Error('Evaluation request failed');
    }

    this.interviewResource.reload();
  }
}
