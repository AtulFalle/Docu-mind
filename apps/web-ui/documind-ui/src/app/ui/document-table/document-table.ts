import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatTableModule } from '@angular/material/table';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatChipsModule } from '@angular/material/chips';
import { MatTooltipModule } from '@angular/material/tooltip';
import { DocumentDto, DocumentStatus } from '../../core/models/types';

@Component({
  selector: 'app-document-table',
  standalone: true,
  imports: [
    CommonModule,
    MatTableModule,
    MatButtonModule,
    MatIconModule,
    MatChipsModule,
    MatTooltipModule
  ],
  templateUrl: './document-table.html',
  styleUrl: './document-table.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DocumentTableComponent {
  readonly documents = input.required<DocumentDto[]>();
  readonly view = output<string>();
  readonly delete = output<string>();
  readonly chat = output<{ docId: string; fileName: string }>();

  readonly displayedColumns: string[] = ['fileName', 'status', 'createdAt', 'actions'];

  getStatusColor(status: DocumentStatus): string {
    switch (status) {
      case 'completed': return 'success';
      case 'processing': return 'warning';
      case 'failed': return 'error';
      case 'uploaded': return 'default';
      default: return 'default';
    }
  }

  onView(id: string): void {
    this.view.emit(id);
  }

  onDelete(id: string): void {
    this.delete.emit(id);
  }

  onChat(docId: string, fileName: string): void {
    this.chat.emit({ docId, fileName });
  }
}
