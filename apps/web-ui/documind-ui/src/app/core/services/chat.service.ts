import { Injectable, signal, computed } from '@angular/core';
import { ChatMessage, ChatSession } from '../models/chat.types';
import { v4 as uuidv4 } from 'uuid';

interface ChatResponse {
  answer: string;
  relatedDocuments?: string[];
}

@Injectable({
  providedIn: 'root'
})
export class ChatService {
  // Signals for reactive state management
  private readonly messages = signal<ChatMessage[]>([]);
  private readonly currentSessionId = signal<string>(this.generateSessionId());
  private readonly isAwaitingResponse = signal(false);
  private readonly currentDocId = signal<string>('');

  // Computed signals
  readonly messageList = computed(() => this.messages());
  readonly isLoading = computed(() => this.isAwaitingResponse());
  readonly messageCount = computed(() => this.messages().length);

  initializeChat(docId: string, documentName: string): void {
    this.currentDocId.set(docId);
    this.messages.set(this.getInitialMessages(documentName));
    this.currentSessionId.set(this.generateSessionId());
  }

  async sendMessage(userMessage: string, docId: string): Promise<void> {
    if (!userMessage.trim() || !docId) {
      return;
    }

    this.addUserMessage(userMessage);
    this.isAwaitingResponse.set(true);

    try {
      const response = await fetch(`/api/documents/${docId}/query`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ question: userMessage })
      });

      if (!response.ok) {
        throw new Error(`Failed to query document: ${response.statusText}`);
      }

      const data: ChatResponse = await response.json();
      this.addAssistantMessage(data.answer, data.relatedDocuments || []);
    } catch (error) {
      const errorMessage = error instanceof Error
        ? error.message
        : 'An error occurred while processing your question. Please try again.';
      this.addAssistantMessage(
        `Error: ${errorMessage}`,
        []
      );
    } finally {
      this.isAwaitingResponse.set(false);
    }
  }

  clearChat(): void {
    const docName = this.currentDocId();
    this.messages.set(this.getInitialMessages(docName));
    this.currentSessionId.set(this.generateSessionId());
  }

  getCurrentSession(): ChatSession {
    return {
      id: this.currentSessionId(),
      title: `Chat ${new Date().toLocaleDateString()}`,
      messages: this.messages(),
      createdAt: new Date(),
      updatedAt: new Date()
    };
  }

  private addUserMessage(content: string): void {
    const userMsg: ChatMessage = {
      id: uuidv4(),
      role: 'user',
      content,
      timestamp: new Date(),
      relatedDocuments: []
    };
    this.messages.update(msgs => [...msgs, userMsg]);
  }

  private addAssistantMessage(
    content: string,
    relatedDocuments: string[]
  ): void {
    const assistantMsg: ChatMessage = {
      id: uuidv4(),
      role: 'assistant',
      content,
      timestamp: new Date(),
      relatedDocuments
    };
    this.messages.update(msgs => [...msgs, assistantMsg]);
  }

  private getInitialMessages(documentName: string): ChatMessage[] {
    return [
      {
        id: uuidv4(),
        role: 'assistant',
        content: `Hello! I'm analyzing "${documentName}". You can ask me questions about this document, and I'll provide detailed answers. What would you like to know?`,
        timestamp: new Date(),
        relatedDocuments: []
      }
    ];
  }

  private generateSessionId(): string {
    return `session-${Date.now()}`;
  }
}
