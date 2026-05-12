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

  open() { this.isOpen.set(true); }
  
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

  startChat(userId: number) {
    console.log('Starting chat with friend:', userId);
    this.close();
  }
}