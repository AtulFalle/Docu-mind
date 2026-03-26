import { ChangeDetectionStrategy, Component, computed, signal, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MATERIAL_MODULES } from '@docu-mind/ui-material';
import { SummaryCardComponent } from '../../ui/summary-card/summary-card';
import { UploadSectionComponent } from '../../ui/upload-section/upload-section';
import { DocumentTableComponent } from '../../ui/document-table/document-table';
import { DocumentService } from '../../core/services/document.service';
import { DashboardStats } from '../../core/models/types';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [
    CommonModule, 
    ...MATERIAL_MODULES,
    SummaryCardComponent,
    UploadSectionComponent,
    DocumentTableComponent
  ],
  templateUrl: './dashboard.html',
  styleUrl: './dashboard.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DashboardComponent {
  private readonly documentService = inject(DocumentService);
  
  readonly documents = this.documentService.documentResource;
  readonly isUploading = signal(false);
  readonly uploadSuccess = signal(false);

  readonly stats = computed<DashboardStats>(() => {
    const docs = this.documents.value() ?? [];
    return {
      total: docs.length,
      processed: docs.filter(d => d.status === 'completed').length,
      pending: docs.filter(d => d.status === 'processing' || d.status === 'uploaded').length,
      failed: docs.filter(d => d.status === 'failed').length
    };
  });

  onViewDocument(id: string) {
    console.log('Viewing document:', id);
  }

  onDeleteDocument(id: string) {
    console.log('Deleting document:', id);
  }

  onRefresh() {
    this.documents.reload();
  }

  async onUploadFile(file: File) {
    this.isUploading.set(true);
    this.uploadSuccess.set(false);

    try {
      await this.documentService.uploadFile(file);
      this.uploadSuccess.set(true);
      
      // Reset success message after 3 seconds
      setTimeout(() => this.uploadSuccess.set(false), 3000);
    } catch (error) {
      console.error('Error uploading file:', error);
    } finally {
      this.isUploading.set(false);
    }
  }
}
