export interface SignalingPayload {
  type: 'OFFER' | 'ANSWER' | 'ICE_CANDIDATE' | 'HANG_UP' | 'REJECTED' | 'MISSED';
  senderId: number;
  targetId: number;
  chatId: string;
  data: string;
}