import { Injectable, resource } from '@angular/core';
import { DocumentDto } from '../models/types';

@Injectable({
  providedIn: 'root'
})
export class DocumentService {
  readonly documentResource = resource({
    loader: async () => {
      const response = await fetch('/api/documents');
      
      if (!response.ok) {
        throw new Error('Failed to fetch documents');
      }
      
      const data: DocumentDto[] = await response.json();
      return data;
    }
  });

  async uploadFile(file: File): Promise<void> {
    const formData = new FormData();
    formData.append('file', file);

    const response = await fetch('/api/documents/upload', {
      method: 'POST',
      body: formData,
    });

    if (!response.ok) {
      throw new Error('Upload failed');
    }

    // Refresh the resource
    this.documentResource.reload();
  }
}
