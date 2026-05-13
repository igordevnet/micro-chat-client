export interface NotificationResponse {
    id: string;
    senderId: number;
    receiverId: number;
    type: string;
    content: string;
    timestamp: Date | string;
    isRead?: boolean; 
    senderName?: string; 
    chatId?: string;
}