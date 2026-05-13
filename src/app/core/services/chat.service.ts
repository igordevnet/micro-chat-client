import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Injectable, signal, computed, inject } from '@angular/core';
import { environment } from '../../../environments/environment.development';
import { ChatResponse } from '../../shared/http/response/chat.response';
import { AuthService } from '../../core/services/auth.service';
import { catchError, Observable, of, switchMap, map, tap } from 'rxjs';
import { UserService } from './user.service';

@Injectable({ providedIn: 'root' })
export class ChatService {
    private http = inject(HttpClient);
    private auth = inject(AuthService);
    private userService = inject(UserService);
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
        this.http.get<ChatResponse[]>(this.API_URL+'/user', { headers: this.getHeaders() })
            .pipe(
                switchMap((chats) => {
                    if (!chats || chats.length === 0) {
                        return of([]); 
                    }

                    const myUserId = this.auth.currentUser()?.id;
                    const uniqueIds = new Set<number>();
                    
                    chats.forEach(chat => {
                        chat.participants?.forEach((p: any) => {
                            if (p.userId !== myUserId) {
                                uniqueIds.add(p.userId);
                            }
                        });
                    });

                    const idsToFetch = Array.from(uniqueIds);
                    if (idsToFetch.length === 0) {
                        return of(chats); 
                    }

                    return this.userService.getUsersByIds(idsToFetch).pipe(
                        map((users: any[]) => {
                            return chats.map(chat => ({
                                ...chat,
                                participants: chat.participants?.map((p: any) => {
                                    const foundUser = users.find(u => u.id === p.userId);
                                    return { ...p, username: foundUser ? foundUser.username : 'Unknown User' };
                                })
                            }));
                        }),
                        catchError(() => of(chats)) 
                    );
                })
            )
            .subscribe({
                next: (hydratedChats) => {
                    if (hydratedChats.length > 0) {
                        this.chats.set(hydratedChats);
                    } else {
                        this.setMocks(); 
                    }
                },
                error: (err) => {
                    console.error('Failed to load chats', err);
                    this.setMocks();
                }
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

    getExistingPrivateChat(targetUserId: number): ChatResponse | undefined {
        return this.chats().find(chat => 
            chat.type === 'PRIVATE' && 
            chat.participants?.some((p: any) => p.userId === targetUserId)
        );
    }

    createChat(targetUserId: number, friendName: string): Observable<ChatResponse> {
        const request = {
            chatName: null, 
            type: 'ONE_ON_ONE',
            participantIds: [targetUserId]
        };

        return this.http.post<ChatResponse>(this.API_URL, request, { headers: this.getHeaders() })
            .pipe(
                tap((newChat) => {

                    const patchedChat = {
                        ...newChat,
                        participants: newChat.participants?.map((p: any) => 
                            p.userId === targetUserId ? { ...p, username: friendName } : p
                        )
                    };

                    this.chats.update(chats => [patchedChat, ...chats]);
                    this.selectChat(patchedChat.id as any);
                })
            );
    }

    getChatDisplayName(chat: ChatResponse): string {
        if (chat.chatName) {
            return chat.chatName; 
        }
        
        const myUserId = this.auth.currentUser()?.id; 
        const otherParticipant = chat.participants?.find((p: any) => p.userId !== myUserId);
        
        return otherParticipant?.username || 'Private Chat'; 
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