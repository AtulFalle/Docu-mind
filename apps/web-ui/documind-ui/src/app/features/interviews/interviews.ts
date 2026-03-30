import { ChangeDetectionStrategy, Component, computed, signal, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Router } from '@angular/router';
import { MATERIAL_MODULES } from '@docu-mind/ui-material';
import { SummaryCardComponent } from '../../ui/summary-card/summary-card';
import { UploadSectionComponent } from '../../ui/upload-section/upload-section';
import { InterviewTableComponent } from '../../ui/interview-table/interview-table';
import { InterviewService } from '../../core/services/interview.service';
import { InterviewStats } from '../../core/models/types';

@Component({
  selector: 'app-interviews',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    ...MATERIAL_MODULES,
    SummaryCardComponent,
    UploadSectionComponent,
    InterviewTableComponent
  ],
  templateUrl: './interviews.html',
  styleUrl: './interviews.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class InterviewsComponent {
  private readonly interviewService = inject(InterviewService);
  private readonly router = inject(Router);

  readonly interviews = this.interviewService.interviewResource;
  readonly isUploading = signal(false);
  readonly uploadSuccess = signal(false);
  readonly isEvaluating = signal(false);

  readonly stats = computed<InterviewStats>(() => {
    const interviews = this.interviews.value() ?? [];
    return {
      total: interviews.length,
      completed: interviews.filter(i => i.status === 'completed').length,
      processing: interviews.filter(i => i.status === 'processing' || i.status === 'uploaded' || i.status === 'transcribed').length,
      failed: interviews.filter(i => i.status === 'failed').length
    };
  });

  onRefresh(): void {
    this.interviews.reload();
  }

  async onUploadFile(file: File): Promise<void> {
    this.isUploading.set(true);
    this.uploadSuccess.set(false);

    try {
      await this.interviewService.uploadFile(file);
      this.uploadSuccess.set(true);
    } catch (error) {
      console.error('Error uploading file:', error);
    } finally {
      this.isUploading.set(false);
    }
  }

  async onEvaluateInterview(interviewId: string): Promise<void> {
    this.isEvaluating.set(true);

    try {
      await this.interviewService.requestEvaluation(interviewId);
    } catch (error) {
      console.error('Error requesting evaluation:', error);
    } finally {
      this.isEvaluating.set(false);
    }
  }

  onViewInterview(interviewId: string): void {
    this.router.navigate(['/interview', interviewId]);
  }

  onDeleteInterview(interviewId: string): void {
    // TODO: Implement delete functionality
    console.log('Delete interview:', interviewId);
  }
}
