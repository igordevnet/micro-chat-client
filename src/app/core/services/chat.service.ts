import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Injectable, signal, computed, inject } from '@angular/core';
import { environment } from '../../../environments/environment.development';
import { ChatResponse } from '../../shared/http/response/chat.response';
import { AuthService } from '../../core/services/auth.service';

@Injectable({ providedIn: 'root' })
export class ChatService {
    private http = inject(HttpClient);
    private auth = inject(AuthService);
    private readonly API_URL = `${environment.apiUrl}/chat`;

    private chats = signal<ChatResponse[]>([]);
    private activeChatId = signal<string | null>(null);

    readonly allChats = computed(() => this.chats());
    readonly selectedChat = computed(() =>
        this.chats().find(c => c.id === this.activeChatId()) || null
    );

    private getHeaders(): HttpHeaders {
        return new HttpHeaders({
            'Authorization': `Bearer ${this.auth.currentUser()?.token}`
        });
    }

    loadChats(): void {
        this.http.get<ChatResponse[]>(this.API_URL, { headers: this.getHeaders() })
            .subscribe({
                next: (data) => {
                    if (data && data.length > 0) {
                        this.chats.set(data);
                    } else {
                        this.setMocks(); 
                    }
                },
                error: () => this.setMocks()
            });
    }

    private setMocks() {
        const mocks: ChatResponse[] = [
            {
                id: '1' as any,
                chatName: 'Global Room',
                type: 'GROUP',
                lastMessagePreview: 'RabbitMQ is humming! 🐇',
                lastMessageAt: new Date(),
                createdAt: new Date(),
                updatedAt: new Date(),
                participants: []
            },
            {
                id: '2' as any,
                chatName: 'Suporte Técnico',
                type: 'PRIVATE',
                lastMessagePreview: 'Seu microserviço está online.',
                lastMessageAt: new Date(),
                createdAt: new Date(),
                updatedAt: new Date(),
                participants: []
            }
        ];
        this.chats.set(mocks);
    }

    selectChat(chatId: string): void {
        this.activeChatId.set(chatId);
    }

    updateChatPreview(chatId: string, lastMessage: string, timestamp: string | Date): void {
        this.chats.update((currentChats) => {
            return currentChats.map((chat) => {
                if (chat.id === chatId) {
                    return {
                        ...chat,
                        lastMessagePreview: lastMessage,
                        lastMessageAt: new Date(timestamp)
                    };
                }
                return chat;
            }).sort((a, b) => {
                const timeA = new Date(a.lastMessageAt || 0).getTime();
                const timeB = new Date(b.lastMessageAt || 0).getTime();
                return timeB - timeA;
            });
        });
    }
} 