export interface ReadReceiptEvent {
  chatId: string;
  userId: number;
  time: string;
  actionType: 'READ'; 
}