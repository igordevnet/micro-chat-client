import { inject, Injectable, Injector } from '@angular/core';
import { Client, StompSubscription } from '@stomp/stompjs';
import { AuthService } from './auth.service';
import { MessageService } from './message.service';
import { ChatService } from './chat.service';
import { FriendshipResponse } from '../../shared/http/response/friendship.response';
import { UserStatusEvent } from '../../shared/interfaces/user-status.event';
import { SignalingPayload } from '../../shared/interfaces/signaling.payload';
import { environment } from '../../../environments/environment.development';
import { PresenceService } from './presence.service';
import { CallService } from './call.service';


@Injectable({ providedIn: 'root' })
export class WebSocketService {
    private readonly WEBSOCKET_URL = environment.webSocketUrl;

    private auth = inject(AuthService);
    private msgService = inject(MessageService);
    private chatService = inject(ChatService);
    private presenceService = inject(PresenceService);
    private injector = inject(Injector);

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

        this.stompClient.subscribe(`/queue/signaling.${userId}`, (msg) => {
            const signal: SignalingPayload = JSON.parse(msg.body);
            console.log('WebRTC Signal Received:', signal.type);
            
            const callService = this.injector.get(CallService);
            callService.handleSignalingMessage(signal);
        });

        this.stompClient.subscribe(`/topic/presence.${userId}`, (msg) => {
            const event: UserStatusEvent = JSON.parse(msg.body);
            console.log(`User ${event.userId} is now ${event.status}`);

            this.presenceService.updatePresence(event.userId, event.status);
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

        this.markChatAsRead(chatId);

        this.chatSubscription = this.stompClient?.subscribe(`/topic/chat.${chatId}`, (msg) => {
            const rawData = JSON.parse(msg.body);

            if (rawData.action === 'DELETE') {
                console.log('Message deleted:', rawData.messageId);
                this.msgService.removeMessage(rawData.messageId);
                return;
            }

            if (rawData.actionType === 'READ') {
                console.log(`User ${rawData.userId} read messages up to ${rawData.time}`);
                this.chatService.updateParticipantReadTime(chatId, rawData.userId, rawData.time);
                return;
            }

            if (rawData.edited === true || rawData.action === 'EDIT') {
                console.log('Message edited:', rawData.id);
                this.msgService.updateMessage(rawData);

                this.chatService.updateChatPreview(chatId, `Editada: ${rawData.content}`, rawData.createdAt);
                return;
            }

            if (rawData.actionType === 'NEW_MESSAGE' || (!rawData.actionType && rawData.content)) {
                this.msgService.pushMessage(rawData);

                if (rawData.messageType !== 'SYSTEM') {
                    let previewText = rawData.content;
                    if (rawData.attachment) {
                        previewText = `📎 ${rawData.attachment.fileType || 'Arquivo'}`;
                    }
                    this.chatService.updateChatPreview(chatId, previewText, rawData.createdAt);
                    this.markChatAsRead(chatId);
                }
            }
        });
    }

    sendTextMessage(chatId: string, content: string) {
        if (!this.stompClient?.connected) return;
        this.stompClient.publish({
            destination: `/app/chat/${chatId}/sendMessage`,
            body: JSON.stringify({ content, messageType: 'TEXT' })
        });
    }

    editMessage(chatId: string, messageId: string, newContent: string) {
        if (!this.stompClient?.connected) return;
        this.stompClient.publish({
            destination: `/app/chat/${chatId}/editMessage`,
            body: JSON.stringify({ messageId, newContent })
        });
    }

    deleteMessage(chatId: string, messageId: string) {
        if (!this.stompClient?.connected) return;
        this.stompClient.publish({
            destination: `/app/chat/${chatId}/deleteMessage`,
            body: messageId
        });
    }

    markChatAsRead(chatId: string) {
        if (!this.stompClient?.connected) return;
        this.stompClient.publish({
            destination: `/app/chat/${chatId}/read`,
            body: "{}"
        });
    }

    sendWebRTCSignal(payload: SignalingPayload) {
    if (!this.stompClient?.connected) return;
    
    this.stompClient.publish({
        destination: `/app/call/signaling`, 
        body: JSON.stringify(payload)
    });
}

    disconnect() {
        this.stompClient?.deactivate();
    }
}