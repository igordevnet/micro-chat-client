export interface ChatRequest {
    chatName: string;
    type: 'ONE_ON_ONE' | 'GROUP';
    participantIds: number[];
}