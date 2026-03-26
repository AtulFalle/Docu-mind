import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MATERIAL_MODULES } from '@docu-mind/ui-material';
import { DocumentDto, DocumentStatus } from '../../core/models/types';

@Component({
  selector: 'app-document-table',
  standalone: true,
  imports: [CommonModule, ...MATERIAL_MODULES],
  templateUrl: './document-table.html',
  styleUrl: './document-table.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DocumentTableComponent {
  readonly documents = input.required<DocumentDto[]>();
  readonly view = output<string>();
  readonly delete = output<string>();

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

  onView(id: string):void {
    this.view.emit(id);
  }

  onDelete(id: string):void {
    this.delete.emit(id);
  }
}
