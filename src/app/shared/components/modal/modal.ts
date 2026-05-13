import { Component, inject, signal, effect } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { UserService } from '../../../core/services/user.service';
import { FriendshipService } from '../../../core/services/friendship.service';

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

  isOpen = signal(false);
  searchQuery = signal('');
  searchResults = signal<any[]>([]); 
  friends = signal<any[]>([]);       

  constructor() {
    effect(() => {
      const query = this.searchQuery();
      if (query.length >= 3) {
        this.userService.searchUsers(query, 0).subscribe({
          next: (res: any) => this.searchResults.set(res.content), 
          error: () => this.searchResults.set([])
        });
      } else {
        this.searchResults.set([]);
      }
    });
  }

  open() { 
    this.isOpen.set(true); 
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
        console.log('Array of Friend IDs received:', ids);
        
        // 🧪 PHASE 1: Temporary mock so the HTML doesn't break while testing
        const mockUsers = ids.map(id => ({ 
          id: id, 
          username: `Amigo ${id}`, // Mock name using the ID
          isFriend: true 
        }));
        this.friends.set(mockUsers);

        /* 🚀 PHASE 2: UNCOMMENT THIS WHEN 'getUsersById' IS READY
        if (ids.length > 0) {
          this.userService.getUsersById(ids).subscribe({
            next: (users) => this.friends.set(users),
            error: (err) => console.error('Failed to hydrate friend details', err)
          });
        } else {
          this.friends.set([]);
        }
        */
      },
      error: (err) => console.error('Failed to load friends', err)
    });
  }

  startChat(userId: number) {
    console.log('Starting chat with friend:', userId);
    this.close();
  }
}