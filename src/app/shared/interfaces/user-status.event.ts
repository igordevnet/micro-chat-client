export interface UserStatusEvent {
  userId: number;
  status: 'ONLINE' | 'OFFLINE';
}