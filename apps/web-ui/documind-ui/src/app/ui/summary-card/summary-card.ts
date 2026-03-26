import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MATERIAL_MODULES } from '@docu-mind/ui-material';

@Component({
  selector: 'app-summary-card',
  standalone: true,
  imports: [CommonModule, ...MATERIAL_MODULES],
  templateUrl: './summary-card.html',
  styleUrl: './summary-card.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SummaryCardComponent {
  readonly label = input.required<string>();
  readonly value = input.required<number | string>();
  readonly icon = input.required<string>();
  readonly iconColor = input<string>('primary');
}
