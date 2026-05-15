import { Component, OnInit, AfterViewInit, OnDestroy, ElementRef, ViewChild, inject, signal, effect, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ChatService } from '../../core/services/chat.service';
import { MessageService } from '../../core/services/message.service';
import { AuthService } from '../../core/services/auth.service';
import { WebSocketService } from '../../core/services/websocket.service';
import { ModalComponent } from '../../shared/components/modal/modal';
import { NotificationService } from '../../core/services/notification.service';

@Component({
    selector: 'app-dashboard',
    standalone: true,
    imports: [CommonModule, FormsModule, ModalComponent],
    templateUrl: './dashboard.html',
    styleUrl: './dashboard.scss'
})
export class DashboardComponent implements OnInit, AfterViewInit, OnDestroy {
    @ViewChild('scrollContainer') private scrollContainer!: ElementRef;
    @ViewChild('topSentinel') private topSentinel!: ElementRef;
    @ViewChild('newChatModal') newChatModal!: ModalComponent;

    public chatService = inject(ChatService);
    public messageService = inject(MessageService);
    public wsService = inject(WebSocketService);
    public auth = inject(AuthService);
    isRecording = signal<boolean>(false);
    private mediaRecorder: MediaRecorder | null = null;
    private audioChunks: Blob[] = [];
    private recordingStartTime: number = 0;
    notificationService = inject(NotificationService);

    showChatMobile = signal<boolean>(false);

    isDropdownOpen = signal(false);
    chatSearchQuery = signal<string>('');

    newMessage = signal<string>('');
    private observer?: IntersectionObserver;

    constructor() {
        effect(() => {
            const messages = this.messageService.currentMessages();
            const isLoading = this.messageService.loading();

            if (messages.length > 0 && !isLoading) {
                this.scrollToBottom();
            }
        });
    }

    ngOnInit() {
        this.wsService.connect();
        this.chatService.loadChats();
    }

    ngAfterViewInit() {
        this.initInfiniteScroll();
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

        // Optional: Send whatever text is in the input as a caption!
        const caption = this.newMessage().trim();

        this.messageService.sendFileMessage(activeChat.id, file, caption).subscribe({
            next: () => {
                console.log('File uploaded successfully via HTTP');
                this.newMessage.set(''); // Clear caption
                event.target.value = ''; // Reset file input
            },
            error: (err) => console.error('Failed to upload file', err)
        });
    }

    // ==========================================
    // 🎤 AUDIO RECORDING LOGIC
    // ==========================================
    async startRecording() {
        try {
            // Request microphone access
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

                // Turn off the microphone hardware light
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
        this.observer = new IntersectionObserver(([entry]) => {
            if (entry.isIntersecting && !this.messageService.loading() && this.messageService.canLoadMore()) {
                this.loadMoreHistory();
            }
        }, {
            root: this.scrollContainer?.nativeElement,
            threshold: 0.1
        });

        if (this.topSentinel) {
            this.observer.observe(this.topSentinel.nativeElement);
        }
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
            this.chatService.selectChat(notification.chatId);
        }

        this.isDropdownOpen.set(false);
    }

    getChatName(chat: any): string {
        if (chat.chatName) return chat.chatName;
        const myId = this.auth.currentUser()?.id;
        const friend = chat.participants?.find((p: any) => p.userId !== myId);
        return friend?.username || 'Chat Privado';
    }

    filteredChats = computed(() => {
        const query = this.chatSearchQuery().toLowerCase().trim();
        const allChats = this.chatService.allChats();

        if (!query) {
            return allChats;
        }

        return allChats.filter(chat =>
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

        const msgTime = new Date(msgCreatedAt).getTime();
        const readTime = new Date(friend.lastReadAt).getTime();

        return msgTime <= readTime;
    }
}