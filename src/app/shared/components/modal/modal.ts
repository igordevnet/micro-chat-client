import { Component, inject, signal, effect } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { UserService } from '../../../core/services/user.service';
import { FriendshipService } from '../../../core/services/friendship.service';
import { ChatService } from '../../../core/services/chat.service';
import { AuthService } from '../../../core/services/auth.service';

@Component({
  selector: 'app-modal',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './modal.html',
  styleUrl: './modal.scss'
})
export class ModalComponent {
  private userService = inject(UserService);
  private friendshipService = inject(FriendshipService);
  private chatService = inject(ChatService);
  private auth = inject(AuthService);

  isOpen = signal(false);
  searchQuery = signal('');
  searchResults = signal<any[]>([]); 
  friends = signal<any[]>([]);       

  constructor() {
    effect(() => {
      const query = this.searchQuery();
      if (query.length >= 3) {
        this.userService.searchUsers(query, 0).subscribe({
          next: (res: any) => {
            const filtered = res.content.filter((u: any) => u.id !== this.auth.currentUser()?.id);
            this.searchResults.set(filtered);
          },
          error: () => this.searchResults.set([])
        });
      } else {
        this.searchResults.set([]);
      }
    });
  }

  open() {
    this.isOpen.set(true);
    this.friendshipService.loadFriendshipData(); 
    this.loadFriends();
  }
  
  close() { 
    this.isOpen.set(false);
    this.searchQuery.set('');
  }

    sendFriendRequest(targetUserId: number) {
    this.friendshipService.sendRequest(targetUserId).subscribe({
        next: () => {
        this.searchResults.update(users => 
            users.map(u => u.id === targetUserId ? { ...u, requestPending: true } : u)
        );
        console.log('Request sent successfully!');
        },
        error: (err) => {
        if (err.status === 409) {
            alert('You already have a pending request with this user.');
        } else {
            console.error('Failed to send request', err);
        }
        }
    });
    }

  loadFriends() {
    this.friendshipService.getFriends().subscribe({
      next: (ids: number[]) => {
        if (ids.length > 0) {
          this.userService.getUsersByIds(ids).subscribe({
            next: (users) => this.friends.set(users),
            error: (err) => console.error('Failed to hydrate friend details', err)
          });
        } else {
          this.friends.set([]);
        }
      },
      error: (err) => console.error('Failed to load friends', err)
    });
  }

  getFriendshipStatus(targetUserId: number): 'FRIEND' | 'PENDING' | 'BLOCKED' | 'NONE' {
    if (this.friendshipService.friendIds().includes(targetUserId)) {
      return 'FRIEND';
    }

    const isPending = this.friendshipService.pendingRequests().some(r => 
      r.requesterId === targetUserId || r.receiverId === targetUserId
    );
    if (isPending) return 'PENDING';

    const isBlocked = this.friendshipService.blockedFriendships().some(b => 
      b.requesterId === targetUserId || b.receiverId === targetUserId
    );
    if (isBlocked) return 'BLOCKED';

    return 'NONE';
  }

  startChat(friendId: number, friendName: string) {
    console.log(`Starting chat with ${friendName} (ID: ${friendId})`);

    const existingChat = this.chatService.getExistingPrivateChat(friendId);

    if (existingChat) {
      console.log('Chat already exists! Opening it...');
      
      if (!existingChat.chatName) {
         existingChat.chatName = friendName; 
      }
      
      this.chatService.selectChat(existingChat.id as any);
      this.close();
      
    } else {
      console.log('No chat found. Creating a new one...');
      
      this.chatService.createChat(friendId, friendName).subscribe({
        next: () => {
          console.log('Chat created and opened with cached name!');
          this.close();
        },
        error: (err) => console.error('Failed to create chat', err)
      });
    }
  }
}