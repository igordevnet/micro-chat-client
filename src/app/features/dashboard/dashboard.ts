import { Component, OnInit, AfterViewInit, OnDestroy, ElementRef, ViewChild, inject, signal, effect } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ChatService } from '../../core/services/chat.service';
import { MessageService } from '../../core/services/message.service'; // 🔥 New service
import { AuthService } from '../../core/services/auth.service';

@Component({
    selector: 'app-dashboard',
    standalone: true,
    imports: [CommonModule, FormsModule],
    templateUrl: './dashboard.html',
    styleUrl: './dashboard.scss'
})
export class DashboardComponent implements OnInit, AfterViewInit, OnDestroy {
    @ViewChild('scrollContainer') private scrollContainer!: ElementRef;
    @ViewChild('topSentinel') private topSentinel!: ElementRef;

    public chatService = inject(ChatService);
    public messageService = inject(MessageService);
    public auth = inject(AuthService);

    showChatMobile = signal<boolean>(false);

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

        this.showChatMobile.set(true);
    }

    closeChat() {
        this.showChatMobile.set(false);
    }

    sendMessage() {
        const text = this.newMessage().trim();
        const activeChat = this.chatService.selectedChat();

        if (!text || !activeChat) return;

        this.messageService.sendMessage(activeChat.id, text).subscribe({
            next: (msg) => {
                this.chatService.updateChatPreview(activeChat.id, msg.content, msg.createdAt);
                this.newMessage.set('');
            }
        });
    }

    isMyMessage(senderId: number): boolean {
        return senderId === this.auth.currentUser()?.id;
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
}