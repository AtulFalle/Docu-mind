import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MATERIAL_MODULES } from '@docu-mind/ui-material';

@Component({
  selector: 'app-upload-section',
  standalone: true,
  imports: [CommonModule, ...MATERIAL_MODULES],
  templateUrl: './upload-section.html',
  styleUrl: './upload-section.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class UploadSectionComponent {
  readonly isUploading = input<boolean>(false);
  readonly uploadSuccess = input<boolean>(false);
  readonly fileSelected = output<File>();

  onFileDropped(event: DragEvent): void {
    event.preventDefault();
    const files = event.dataTransfer?.files;
    if (files && files.length > 0) {
      this.fileSelected.emit(files[0]);
    }
  }

  onDragOver(event: DragEvent): void {
    event.preventDefault();
  }

  onFileSelected(event: Event): void {
    // eslint-disable-next-line @typescript-eslint/consistent-type-assertions
    const input = event.target as HTMLInputElement;
    if (!input) return;
    if (input.files && input.files.length > 0) {
      this.fileSelected.emit(input.files[0]);
    }
  }
}
