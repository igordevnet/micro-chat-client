export interface MessageDeletedEvent {
  messageId: string;
  chatId: string;
  action: string;
}