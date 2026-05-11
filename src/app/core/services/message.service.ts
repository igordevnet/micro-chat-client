import { HttpClient, HttpParams, HttpHeaders } from '@angular/common/http';
import { Injectable, signal, computed, inject } from '@angular/core';
import { environment } from '../../../environments/environment.development';
import { MessageResponse } from '../../shared/http/response/message.response';
import { PaginatedMessage } from '../../shared/http/response/paginated-message.response';
import { AuthService } from '../../core/services/auth.service';
import { Observable, tap } from 'rxjs';

@Injectable({ providedIn: 'root' })
export class MessageService {
  private http = inject(HttpClient);
  private auth = inject(AuthService);
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
    }).subscribe(res => {
      const reversedContent = [...res.content].reverse();
      
      if (page === 0) {
        this.messages.set(reversedContent);
      } else {
        this.messages.update(prev => [...reversedContent, ...prev]);
      }

      this.totalPages.set(res.totalPages);
      this.currentPage.set(res.currentPage);
      this.isLoadingHistory.set(false);
    });
  }

  sendMessage(chatId: string, content: string): Observable<MessageResponse> {
    return this.http.post<MessageResponse>(this.API_URL, { chatId, content }, { 
      headers: this.getHeaders() 
    }).pipe(
      tap(newMsg => this.pushMessage(newMsg))
    );
  }

  pushMessage(msg: MessageResponse): void {
    this.messages.update(prev => [...prev, msg]);
  }

  clearMessages(): void {
    this.messages.set([]);
    this.currentPage.set(0);
  }
}