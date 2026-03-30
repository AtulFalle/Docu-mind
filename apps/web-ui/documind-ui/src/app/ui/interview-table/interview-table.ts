import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatTableModule } from '@angular/material/table';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatChipsModule } from '@angular/material/chips';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { InterviewDto, InterviewStatus } from '../../core/models/types';

@Component({
  selector: 'app-interview-table',
  standalone: true,
  imports: [
    CommonModule,
    MatTableModule,
    MatButtonModule,
    MatIconModule,
    MatChipsModule,
    MatTooltipModule,
    MatProgressSpinnerModule
  ],
  templateUrl: './interview-table.html',
  styleUrl: './interview-table.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class InterviewTableComponent {
  readonly interviews = input.required<InterviewDto[]>();
  readonly view = output<string>();
  readonly evaluate = output<string>();
  readonly delete = output<string>();

  readonly displayedColumns: string[] = [
    'videoPath',
    'status',
    'technical',
    'communication',
    'createdAt',
    'actions'
  ];

  getStatusColor(status: InterviewStatus): string {
    switch (status) {
      case 'completed':
        return 'success';
      case 'transcribed':
        return 'warning';
      case 'processing':
        return 'warning';
      case 'failed':
        return 'error';
      case 'uploaded':
        return 'default';
      default:
        return 'default';
    }
  }

  hasEvaluation(interview: InterviewDto): boolean {
    return !!interview.evaluation && interview.evaluation.status === 'completed';
  }

  getMetricDisplay(interview: InterviewDto, metric: string): string | number {
    if (!this.hasEvaluation(interview)) {
      return '—';
    }
    const evaluation = interview.evaluation;
    if(!evaluation) return 0;
    switch (metric) {
      case 'technical':
        return evaluation.technical || 0;
      case 'communication':
        return evaluation.communication || 0;
      default:
        return '—';
    }
  }

  onView(id: string): void {
    this.view.emit(id);
  }

  onEvaluate(id: string, status: InterviewStatus): void {
    if (status === 'transcribed' || status === 'completed') {
      this.evaluate.emit(id);
    }
  }

  onDelete(id: string): void {
    this.delete.emit(id);
  }
}
