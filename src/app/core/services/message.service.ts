import { HttpClient, HttpParams, HttpHeaders } from '@angular/common/http';
import { Injectable, signal, computed, inject } from '@angular/core';
import { environment } from '../../../environments/environment.development';
import { MessageResponse } from '../../shared/http/response/message.response';
import { PaginatedMessage } from '../../shared/http/response/paginated-message.response';
import { AuthService } from '../../core/services/auth.service';
import { Observable } from 'rxjs';

@Injectable({ providedIn: 'root' })
export class MessageService {
  private http = inject(HttpClient);
  public auth = inject(AuthService); 
  private readonly API_URL = `${environment.apiUrl}/message`; 

  private messages = signal<MessageResponse[]>([]);
  private currentPage = signal<number>(0);
  private totalPages = signal<number>(0);
  private isLoadingHistory = signal<boolean>(false);

  readonly currentMessages = computed(() => this.messages());
  readonly loading = computed(() => this.isLoadingHistory());
  readonly page = computed(() => this.currentPage());
  readonly canLoadMore = computed(() => this.currentPage() < (this.totalPages() - 1));

  private getHeaders(): HttpHeaders {
    return new HttpHeaders({
      'Authorization': `Bearer ${this.auth.currentUser()?.token}`
    });
  }

  loadHistory(chatId: string, page: number = 0): void {
    this.isLoadingHistory.set(true);
    const params = new HttpParams().set('page', page.toString()).set('size', '20');

    this.http.get<PaginatedMessage>(`${this.API_URL}/${chatId}`, { 
      params, 
      headers: this.getHeaders() 
    }).subscribe({
      next: (res) => {
        const reversedContent = [...res.content].reverse();
        
        if (page === 0) {
          this.messages.set(reversedContent);
        } else {
          this.messages.update(prev => [...reversedContent, ...prev]);
        }

        this.totalPages.set(res.totalPages);
        this.currentPage.set(res.currentPage);
        this.isLoadingHistory.set(false);
      },
      error: (err) => {
        console.error('Failed to load history', err);
        this.isLoadingHistory.set(false);
      }
    });
  }

  clearMessages(): void {
    this.messages.set([]);
    this.currentPage.set(0);
  }

  sendFileMessage(chatId: string, file: File, content?: string): Observable<void> {
    const formData = new FormData();
    
    const metadata = { content: content || '', messageType: 'FILE' };
    formData.append('data', new Blob([JSON.stringify(metadata)], { type: 'application/json' }));
    
    formData.append('file', file);

    return this.http.post<void>(`${this.API_URL}/${chatId}/messages`, formData, {
      headers: this.getHeaders()
    });
  }

  sendAudioMessage(chatId: string, audioBlob: Blob, durationInSeconds: number): Observable<void> {
    const formData = new FormData();
    
    const metadata = { duration: durationInSeconds, messageType: 'AUDIO' };
    formData.append('data', new Blob([JSON.stringify(metadata)], { type: 'application/json' }));
    
    formData.append('file', audioBlob, 'voice-message.webm');

    return this.http.post<void>(`${this.API_URL}/${chatId}/audio`, formData, {
      headers: this.getHeaders()
    });
  }

  pushMessage(newMessage: MessageResponse): void {
    this.messages.update(prev => {
      const exists = prev.find(m => m.id === newMessage.id);
      if (exists) {
        return prev.map(m => m.id === newMessage.id ? newMessage : m);
      }
      return [...prev, newMessage];
    });
  }

  updateMessage(updatedMessage: MessageResponse): void {
    this.messages.update(messages => 
        messages.map(m => m.id === updatedMessage.id ? updatedMessage : m)
    );
  }

  removeMessage(messageId: string): void {
    this.messages.update(messages => 
        messages.filter(m => m.id !== messageId)
    );
  }
}