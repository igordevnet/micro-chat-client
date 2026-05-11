import { inject, Injectable } from '@angular/core';
import { Client, StompSubscription } from '@stomp/stompjs';
import { AuthService } from './auth.service';
import { MessageService } from './message.service';
import { ChatService } from './chat.service';
import { FriendshipResponse } from '../../shared/http/response/friendship.response';
import { UserStatusEvent } from '../../shared/interfaces/user-status.event';
import { SignalingPayload } from '../../shared/interfaces/signaling.payload';
import { environment } from '../../../environments/environment.development';


@Injectable({ providedIn: 'root' })
export class WebSocketService {
    private readonly WEBSOCKET_URL = environment.webSocketUrl;

    private auth = inject(AuthService);
    private msgService = inject(MessageService);
    private chatService = inject(ChatService);

    private stompClient: Client | null = null;
    private chatSubscription?: StompSubscription;

    connect() {
        const user = this.auth.currentUser();
        if (!user) return;

        this.stompClient = new Client({
            brokerURL: this.WEBSOCKET_URL,
            connectHeaders: { Authorization: `Bearer ${user.token}` },
            onConnect: () => {
                console.log('Connected to RabbitMQ via STOMP 🐇');
                this.subscribeToUserEvents(user.id);
            }
        });

        this.stompClient.activate();
    }

    private subscribeToUserEvents(userId: number) {
        if (!this.stompClient) return;

        this.stompClient.subscribe(`/topic/notification.${userId}`, (msg) => {
            const notification = JSON.parse(msg.body);
            console.log('System Notification:', notification);
        });

        // 2. WebRTC Signaling
        this.stompClient.subscribe(`/queue/signaling.${userId}`, (msg) => {
            const signal: SignalingPayload = JSON.parse(msg.body);
            console.log('WebRTC Signal Received:', signal.type);
            // Handle WebRTC logic...
        });

        this.stompClient.subscribe(`/topic/presence.${userId}`, (msg) => {
            const event: UserStatusEvent = JSON.parse(msg.body);
            // Update the chat list to show who is online
            console.log(`User ${event.userId} is now ${event.status}`);
        });

        this.stompClient.subscribe(`/queue/user.${userId}`, (msg) => {
            const friendship: FriendshipResponse = JSON.parse(msg.body);
            console.log('Friendship Update:', friendship.status);
        });
    }

    subscribeToChat(chatId: string) {
        if (this.chatSubscription) {
            this.chatSubscription.unsubscribe();
        }

        this.chatSubscription = this.stompClient?.subscribe(`/topic/chat.${chatId}`, (msg) => {
            const data = JSON.parse(msg.body);

            if (data.content && !data.actionType) {
                this.msgService.pushMessage(data);
                this.chatService.updateChatPreview(chatId, data.content, data.createdAt);
            }
            else if (data.actionType === 'READ') {
                console.log('Message read by user:', data.userId);
                // Update message UI with double-blue checkmarks?
            }
            else if (data.action === 'DELETE') {
                console.log('Message deleted:', data.messageId);
                // this.msgService.removeMessage(data.messageId);
            }
        });
    }

    disconnect() {
        this.stompClient?.deactivate();
    }
}