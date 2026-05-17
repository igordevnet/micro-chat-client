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

    readonly allChats = computed(() => this.chats());


    private activeChatId = signal<string | null>(null);

    public selectedChat = computed(() => {
        const id = this.activeChatId();
        if (!id) return null;
        return this.chats().find(c => c.id === id) || null;
    });

    deselectChat() {
        this.activeChatId.set(null);
    }

    selectChat(chatId: string) {
        this.activeChatId.set(chatId);
    }

    private getHeaders(): HttpHeaders {
        return new HttpHeaders({
            'Authorization': `Bearer ${this.auth.currentUser()?.token}`
        });
    }

    loadChats(): void {
        this.http.get<ChatResponse[]>(this.API_URL + '/user', { headers: this.getHeaders() })
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
                            return chats.map(chat => {
                                const hydratedParticipants = chat.participants?.map((p: any) => {
                                    const foundUser = users.find(u => u.id === p.userId);
                                    return {
                                        ...p,
                                        username: foundUser ? foundUser.username : `User_${p.userId}`
                                    };
                                });

                                let displayChatName = chat.chatName;
                                if (!displayChatName) {
                                    const friend = hydratedParticipants?.find((p: any) => p.userId !== myUserId);
                                    displayChatName = friend ? friend.username : 'Chat Privado';
                                }

                                return {
                                    ...chat,
                                    participants: hydratedParticipants,
                                    chatName: displayChatName
                                };
                            });
                        }),
                        catchError((err) => {
                            console.error('Failed to fetch user names:', err);
                            return of(chats);
                        })
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
    getExistingPrivateChat(friendId: number) {
        const chats = this.allChats();

        return chats.find(chat => {
            if (!chat.participants || chat.participants.length === 0) return false;

            const hasFriend = chat.participants.some((p: any) => Number(p.userId) === Number(friendId));

            const isPrivate = chat.participants.length === 2;

            return hasFriend && isPrivate;
        });
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

    createGroupChat(groupName: string, participantIds: number[]): Observable<ChatResponse> {
        const request = {
            chatName: groupName,
            type: 'GROUP', 
            participantIds: participantIds
        };

        return this.http.post<ChatResponse>(this.API_URL, request, { headers: this.getHeaders() })
            .pipe(
                tap((newChat) => {
                    this.chats.update(chats => [newChat, ...chats]);
                    this.selectChat(newChat.id as any);
                })
            );
    }

    updateChatName(chatId: string, newName: string): Observable<any> {
        return this.http.patch(`${this.API_URL}/${chatId}`, { chatName: newName }, { headers: this.getHeaders() })
            .pipe(
                tap(() => {
                    this.chats.update(chats =>
                        chats.map(c => c.id === chatId ? { ...c, chatName: newName } : c)
                    );

                })
            );
    }

    deleteChat(chatId: string): Observable<void> {
        return this.http.delete<void>(`${this.API_URL}/${chatId}`, { headers: this.getHeaders() })
            .pipe(
                tap(() => {
                    this.chats.update(chats => chats.filter(c => c.id !== chatId));

                    if (this.activeChatId() === chatId) {
                        this.deselectChat(); 
                    }
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

    updateParticipantReadTime(chatId: string, userId: number, timestamp: string) {
        this.chats.update(chats => chats.map(chat => {
            if (chat.id === chatId) {
                const updatedParticipants = chat.participants?.map((p: any) => {
                    if (Number(p.userId) === Number(userId)) {
                        return { ...p, lastReadAt: timestamp };
                    }
                    return p;
                });
                return { ...chat, participants: updatedParticipants };
            }
            return chat;
        }));
    }

    waitForNewChat(missingChatId: string, attempts = 0) {
        if (attempts > 5) {
            console.error('Gave up waiting for chat to appear in database.');
            return;
        }

        console.log(`Polling for new chat... Attempt ${attempts + 1}`);

        this.http.get<any[]>(this.API_URL + '/user', { headers: this.getHeaders() }).subscribe({
            next: (chats) => {
                const found = chats.find(c => c.id === missingChatId);

                if (found) {
                    console.log('✅ Chat found! DB transaction is complete. Updating UI.');
                    this.chats.set(chats);
                } else {
                    setTimeout(() => this.waitForNewChat(missingChatId, attempts + 1), 500);
                }
            },
            error: (err) => console.error('Failed to poll chats', err)
        });
    }
} 