import { Component, OnInit, AfterViewInit, OnDestroy, ElementRef, ViewChild, inject, signal, effect, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ChatService } from '../../core/services/chat.service';
import { MessageService } from '../../core/services/message.service';
import { AuthService } from '../../core/services/auth.service';
import { WebSocketService } from '../../core/services/websocket.service';
import { ModalComponent } from '../../shared/components/modal/modal';
import { NotificationService } from '../../core/services/notification.service';
import { PresenceService } from '../../core/services/presence.service';
import { CallService } from '../../core/services/call.service';
import { FriendshipService } from '../../core/services/friendship.service';
import { UserService } from '../../core/services/user.service';

@Component({
    selector: 'app-dashboard',
    standalone: true,
    imports: [CommonModule, FormsModule, ModalComponent],
    templateUrl: './dashboard.html',
    styleUrl: './dashboard.scss'
})
export class DashboardComponent implements OnInit, OnDestroy {
    @ViewChild('scrollContainer') private scrollContainer!: ElementRef;
    private topSentinel!: ElementRef;
    @ViewChild('topSentinel') set setupSentinel(el: ElementRef) {
        if (el) {
            this.topSentinel = el;
            this.initInfiniteScroll();
        }
    }
    @ViewChild('newChatModal') newChatModal!: ModalComponent;

    private mediaRecorder: MediaRecorder | null = null;
    private audioChunks: Blob[] = [];
    private recordingStartTime: number = 0;
    private observer?: IntersectionObserver;

    public callService = inject(CallService);
    public chatService = inject(ChatService);
    public messageService = inject(MessageService);
    public presenceService = inject(PresenceService);
    public wsService = inject(WebSocketService);
    public friendshipService = inject(FriendshipService);
    public auth = inject(AuthService);
    public userService = inject(UserService);

    userNamesCache = signal<Map<number, string>>(new Map());
    isRecording = signal<boolean>(false);

    notificationService = inject(NotificationService);

    showChatMobile = signal<boolean>(false);

    isDropdownOpen = signal(false);
    chatSearchQuery = signal<string>('');

    newMessage = signal<string>('');

    constructor() {
        effect(() => {
            const messages = this.messageService.currentMessages();
            const isLoading = this.messageService.loading();

            if (messages.length > 0 && !isLoading) {
                this.scrollToBottom();
            }
        });

        effect(() => {
            const chats = this.chatService.allChats();
            const myId = this.auth.currentUser()?.id;

            if (chats.length > 0 && myId) {
                const friendIds = new Set<number>();

                chats.forEach(c => {
                    c.participants?.forEach((p: any) => {
                        if (p.userId !== myId) friendIds.add(p.userId);
                    });
                });

                if (friendIds.size > 0) {
                    this.presenceService.fetchPresence(Array.from(friendIds));
                }
            }
        });

        effect(() => {
            const chats = this.chatService.allChats();
            const myId = this.auth.currentUser()?.id;

            if (chats.length > 0 && myId) {
                const friendIds = new Set<number>();

                chats.forEach(c => {
                    c.participants?.forEach((p: any) => {
                        if (p.userId !== myId) friendIds.add(p.userId);
                    });
                });

                if (friendIds.size > 0) {
                    this.presenceService.fetchPresence(Array.from(friendIds));

                    const missingIds = Array.from(friendIds).filter(id => !this.userNamesCache().has(id));

                    if (missingIds.length > 0) {
                        this.userService.getUsersByIds(missingIds).subscribe({
                            next: (users: any[]) => {
                                this.userNamesCache.update(map => {
                                    const newMap = new Map(map);
                                    users.forEach(u => newMap.set(u.id, u.username));
                                    return newMap;
                                });
                            }
                        });
                    }
                }
            }
        }, { allowSignalWrites: true });
    }

    ngOnInit() {
        this.wsService.connect();
        this.chatService.loadChats();
        this.notificationService.loadNotifications(0, 10);
    }

    ngOnDestroy() {
        this.observer?.disconnect();
    }

    selectChat(chatId: string) {
        this.chatService.selectChat(chatId);
        this.messageService.clearMessages();
        this.messageService.loadHistory(chatId, 0);

        this.wsService.subscribeToChat(chatId);

        this.showChatMobile.set(true);
    }

    closeChat() {
        this.showChatMobile.set(false);

        this.chatService.deselectChat();

        this.messageService.clearMessages();
    }

    sendMessage() {
        const text = this.newMessage().trim();
        const activeChat = this.chatService.selectedChat();

        if (!text || !activeChat) return;

        this.wsService.sendTextMessage(activeChat.id, text);

        this.newMessage.set('');

    }

    isMyMessage(senderId: number): boolean {
        return senderId === this.auth.currentUser()?.id;
    }

    openNewChat() {
        this.newChatModal.open();
    }

    handleModalConfirm(event: any) {
        console.log('Modal Action:', event);
        // Here we will eventually call your FriendshipService or ChatService
    }

    onFileSelected(event: any) {
        const file = event.target.files[0];
        const activeChat = this.chatService.selectedChat();

        if (!file || !activeChat) return;

        const caption = this.newMessage().trim();

        this.messageService.sendFileMessage(activeChat.id, file, caption).subscribe({
            next: () => {
                console.log('File uploaded successfully via HTTP');
                this.newMessage.set('');
                event.target.value = '';
            },
            error: (err) => console.error('Failed to upload file', err)
        });
    }

    async startRecording() {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });

            this.mediaRecorder = new MediaRecorder(stream);
            this.audioChunks = [];
            this.recordingStartTime = Date.now();

            this.mediaRecorder.ondataavailable = (event) => {
                if (event.data.size > 0) {
                    this.audioChunks.push(event.data);
                }
            };

            this.mediaRecorder.onstop = () => {
                const audioBlob = new Blob(this.audioChunks, { type: 'audio/webm' });
                const durationInSeconds = Math.floor((Date.now() - this.recordingStartTime) / 1000);
                const activeChat = this.chatService.selectedChat();

                if (activeChat) {
                    this.messageService.sendAudioMessage(activeChat.id, audioBlob, durationInSeconds).subscribe({
                        next: () => console.log('Audio sent via HTTP'),
                        error: (err) => console.error('Failed to send audio', err)
                    });
                }

                stream.getTracks().forEach(track => track.stop());
            };

            this.mediaRecorder.start();
            this.isRecording.set(true);

        } catch (err) {
            console.error('Microphone access denied or unsupported', err);
            alert('Não foi possível acessar o microfone. Verifique as permissões do navegador.');
        }
    }

    stopRecording() {
        if (this.mediaRecorder && this.mediaRecorder.state !== 'inactive') {
            this.mediaRecorder.stop();
            this.isRecording.set(false);
        }
    }

    private initInfiniteScroll() {
        if (!this.topSentinel || !this.scrollContainer) return;

        this.observer?.disconnect();

        this.observer = new IntersectionObserver(([entry]) => {
            if (entry.isIntersecting && !this.messageService.loading() && this.messageService.canLoadMore()) {
                this.loadMoreHistory();
            }
        }, {
            root: this.scrollContainer.nativeElement,
            threshold: 0.1
        });

        this.observer.observe(this.topSentinel.nativeElement);
    }

    private loadMoreHistory() {
        const chat = this.chatService.selectedChat();
        if (!chat) return;

        const oldHeight = this.scrollContainer.nativeElement.scrollHeight;

        this.messageService.loadHistory(chat.id, this.messageService.page() + 1);

        setTimeout(() => {
            const newHeight = this.scrollContainer.nativeElement.scrollHeight;
            this.scrollContainer.nativeElement.scrollTop = newHeight - oldHeight;
        }, 60);
    }

    private scrollToBottom() {
        setTimeout(() => {
            if (this.scrollContainer) {
                this.scrollContainer.nativeElement.scrollTop = this.scrollContainer.nativeElement.scrollHeight;
            }
        }, 100);
    }

    toggleDropdown() {
        this.isDropdownOpen.update(v => !v);

        if (this.isDropdownOpen()) {
            this.notificationService.loadNotifications(0, 10);
        }
    }

    onNotificationClick(notification: any) {
        if (!notification.isRead) {
            this.notificationService.markAsRead(notification.id);
        }

        if (notification.chatId) {
            this.selectChat(notification.chatId);
        }
        else if (notification.type === 'ACCEPTED' || notification.type === 'REQUEST') {
            this.openNewChat();
        }

        this.isDropdownOpen.set(false);
    }

    getChatName(chat: any): string {
        if (chat.chatName) return chat.chatName;

        const myId = this.auth.currentUser()?.id;
        const friend = chat.participants?.find((p: any) => p.userId !== myId);

        if (!friend) return 'Chat Privado';

        return this.userNamesCache().get(friend.userId) || `Usuário ${friend.userId}`;
    }
    filteredChats = computed(() => {
        const query = this.chatSearchQuery().toLowerCase().trim();

        let chats = [...this.chatService.allChats()];

        chats.sort((a, b) => {
            const timeA = new Date(a.lastMessageAt || a.createdAt).getTime();
            const timeB = new Date(b.lastMessageAt || b.createdAt).getTime();
            return timeB - timeA;
        });

        if (!query) {
            return chats;
        }

        return chats.filter(chat =>
            this.getChatName(chat).toLowerCase().includes(query)
        );
    });

    onSearchInput(event: Event) {
        const target = event.target as HTMLInputElement;
        this.chatSearchQuery.set(target.value);
    }

    isMessageRead(msgCreatedAt: any): boolean {
        const chat = this.chatService.selectedChat();
        if (!chat || !chat.participants) return false;

        const myId = this.auth.currentUser()?.id;

        const friend = chat.participants.find((p: any) => Number(p.userId) !== myId);

        if (!friend || !friend.lastReadAt) return false;

        const parseDate = (dateData: any): number => {
            if (!dateData) return 0;
            if (Array.isArray(dateData)) {
                const [y, m, d, h = 0, min = 0, s = 0] = dateData;
                return new Date(y, m - 1, d, h, min, s).getTime();
            }

            return new Date(dateData).getTime();
        };

        const msgTime = parseDate(msgCreatedAt);
        const readTime = parseDate(friend.lastReadAt);

        return msgTime <= readTime;
    }

    getFriendId(chat: any): number | null {
        if (!chat || !chat.participants) return null;
        const myId = this.auth.currentUser()?.id;
        const friend = chat.participants.find((p: any) => p.userId !== myId);
        return friend ? friend.userId : null;
    }

    startCall(isVideo: boolean) {
        const chat = this.chatService.selectedChat();
        const targetId = this.getFriendId(chat);

        if (chat && targetId) {
            this.callService.startCall(targetId, chat.id, isVideo);
        }
    }

    acceptCall(isVideo: boolean = true) {
        this.callService.acceptCall(isVideo);
    }

    rejectCall() {
        this.callService.rejectCall();
    }

    endCall() {
        this.callService.endCall(true);
    }

    blockCurrentChat() {
        const chat = this.chatService.selectedChat();
        const targetUserId = this.getFriendId(chat);

        if (!targetUserId) return;

        const confirmBlock = confirm('Tem certeza que deseja bloquear este usuário? Vocês não poderão mais enviar mensagens.');
        
        if (confirmBlock) {
            this.friendshipService.blockUser(targetUserId).subscribe({
                next: () => {
                    alert('Usuário bloqueado com sucesso.');
                    this.closeChat(); 
                },
                error: (err) => console.error('Failed to block user', err)
            });
        }
    }

    isChatBlocked = computed(() => {
        const chat = this.chatService.selectedChat();
        const targetId = this.getFriendId(chat);
        
        if (!targetId) return false;

        return this.friendshipService.blockedFriendships().some(b => 
            b.requesterId === targetId || b.receiverId === targetId
        );
    });

}