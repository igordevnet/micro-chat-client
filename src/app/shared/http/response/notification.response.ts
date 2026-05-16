export interface NotificationResponse {
    id: string;
    senderId: number;
    receiverId: number;
    type: string;
    content: string;
    timestamp: Date | string;
    read?: boolean; 
    senderName?: string; 
    chatId?: string;
}