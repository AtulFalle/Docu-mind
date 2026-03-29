import { Component, ChangeDetectionStrategy, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatTooltipModule } from '@angular/material/tooltip';
import { ChatService } from '../../core/services/chat.service';
import { MessageListComponent } from '../../ui/message-list/message-list';
import { MessageInputComponent } from '../../ui/message-input/message-input';

@Component({
  selector: 'app-chat',
  standalone: true,
  imports: [
    CommonModule,
    MatIconModule,
    MatButtonModule,
    MatTooltipModule,
    MessageListComponent,
    MessageInputComponent
  ],
  templateUrl: './chat.html',
  styleUrl: './chat.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ChatComponent implements OnInit {
  private readonly chatService = inject(ChatService);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);

  readonly messages = this.chatService.messageList;
  readonly isLoading = this.chatService.isLoading;

  private currentDocId = '';
  private currentDocName = '';

  ngOnInit(): void {
    this.route.params.subscribe(params => {
      const docId = params['docId'];
      const docName = params['docName'] || 'Document';

      if (docId) {
        this.currentDocId = docId;
        this.currentDocName = decodeURIComponent(docName);
        this.chatService.initializeChat(this.currentDocId, this.currentDocName);
      } else {
        this.goToDashboard();
      }
    });
  }

  async onSendMessage(message: string): Promise<void> {
    await this.chatService.sendMessage(message, this.currentDocId);
  }

  onClearChat(): void {
    const shouldClear = confirm(
      'Are you sure you want to clear the chat? This action cannot be undone.'
    );
    if (shouldClear) {
      this.chatService.clearChat();
    }
  }

  goToDashboard(): void {
    this.router.navigate(['/dashboard']);
  }
}
