export interface FriendshipResponse {
  id: string;
  requesterId: number;
  receiverId: number;
  status: 'PENDING' | 'ACCEPTED' | 'DECLINED' | 'BLOCKED';
  blockedBy?: number;
}