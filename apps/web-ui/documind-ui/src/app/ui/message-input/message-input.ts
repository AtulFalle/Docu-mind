import { Component, Output, EventEmitter, Input, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';

@Component({
  selector: 'app-message-input',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatIconModule,
  ],
  templateUrl: './message-input.html',
  styleUrl: './message-input.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class MessageInputComponent {
  @Input() isLoading = false;
  @Output() sendMessage = new EventEmitter<string>();
  @Output() clearChat = new EventEmitter<void>();

  messageText = '';

  onSendMessage(): void {
    if (this.messageText.trim() && !this.isLoading) {
      this.sendMessage.emit(this.messageText);
      this.messageText = '';
    }
  }

  onClear(): void {
    this.clearChat.emit();
    this.messageText = '';
  }
}
