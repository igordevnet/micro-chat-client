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
  public friendshipService = inject(FriendshipService);
  private chatService = inject(ChatService);
  public auth = inject(AuthService);

  hydratedBlockedFriendships = signal<any[]>([]);

  isOpen = signal(false);
  searchQuery = signal('');
  searchResults = signal<any[]>([]);
  friends = signal<any[]>([]);
  isGroupMode = signal(false);
  groupName = signal('');
  selectedGroupMembers = signal<Set<number>>(new Set());

  hydratedPendingRequests = signal<any[]>([]);

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
    }, { allowSignalWrites: true });

    effect(() => {
      const pending = this.friendshipService.pendingRequests();
      const myId = this.auth.currentUser()?.id;

      if (pending.length > 0 && myId) {
        const idsToFetch = pending.map(req => req.requesterId === myId ? req.receiverId : req.requesterId);

        const uniqueIds = Array.from(new Set(idsToFetch));

        this.userService.getUsersByIds(uniqueIds).subscribe({
          next: (users: any[]) => {
            const hydrated = pending.map(req => {
              const targetId = req.requesterId === myId ? req.receiverId : req.requesterId;
              const targetUser = users.find(u => u.id === targetId);
              return {
                ...req,
                username: targetUser ? targetUser.username : `Usuário ${targetId}`
              };
            });
            this.hydratedPendingRequests.set(hydrated);
          },
          error: (err) => console.error('Failed to hydrate pending requests', err)
        });
      } else {
        this.hydratedPendingRequests.set([]);
      }
    }, { allowSignalWrites: true });

    effect(() => {
      const ids = this.friendshipService.friendIds();

      if (ids.length > 0) {
        this.userService.getUsersByIds(ids).subscribe({
          next: (users) => this.friends.set(users),
          error: (err) => console.error('Failed to hydrate friend details', err)
        });
      } else {
        this.friends.set([]);
      }
    }, { allowSignalWrites: true });

    effect(() => {
      const blocked = this.friendshipService.blockedFriendships();
      const myId = this.auth.currentUser()?.id;

      if (blocked.length > 0 && myId) {
        const idsToFetch = blocked.map(b => b.requesterId === myId ? b.receiverId : b.requesterId);
        const uniqueIds = Array.from(new Set(idsToFetch));

        this.userService.getUsersByIds(uniqueIds).subscribe({
          next: (users: any[]) => {
            const hydrated = blocked.map(b => {
              const targetId = b.requesterId === myId ? b.receiverId : b.requesterId;
              const targetUser = users.find(u => u.id === targetId);
              return {
                ...b,
                targetUserId: targetId,
                username: targetUser ? targetUser.username : `Usuário ${targetId}`
              };
            });
            this.hydratedBlockedFriendships.set(hydrated);
          },
          error: (err) => console.error('Failed to hydrate blocked users', err)
        });
      } else {
        this.hydratedBlockedFriendships.set([]);
      }
    }, { allowSignalWrites: true });
  }

  open() {
    this.isOpen.set(true);
    this.friendshipService.loadFriendshipData();
  }

  close() {
    this.isOpen.set(false);
    this.searchQuery.set('');
    this.isGroupMode.set(false);
    this.selectedGroupMembers.set(new Set());
    this.groupName.set('');
  }

  toggleGroupMode() {
    this.isGroupMode.update(v => !v);
    this.selectedGroupMembers.set(new Set());
    this.groupName.set('');
    this.searchQuery.set('');
  }

  toggleMemberSelection(userId: number) {
    this.selectedGroupMembers.update(set => {
      const newSet = new Set(set);
      if (newSet.has(userId)) {
        newSet.delete(userId);
      } else {
        newSet.add(userId);
      }
      return newSet;
    });
  }

  submitGroup() {
    const name = this.groupName().trim();
    const members = Array.from(this.selectedGroupMembers());

    if (!name) return alert('Dê um nome ao grupo!');
    if (members.length === 0) return alert('Selecione pelo menos 1 amigo!');

    this.chatService.createGroupChat(name, members).subscribe({
      next: () => {
        console.log('Group created successfully!');
        this.close();
        this.toggleGroupMode();
      },
      error: (err) => console.error('Failed to create group', err)
    });
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

  getFriendshipStatus(targetUserId: number): 'FRIEND' | 'SENT_REQUEST' | 'RECEIVED_REQUEST' | 'BLOCKED' | 'NONE' {
    if (this.friendshipService.friendIds().includes(targetUserId)) {
      return 'FRIEND';
    }

    const myId = this.auth.currentUser()?.id;

    const pendingReq = this.friendshipService.pendingRequests().find(r =>
      r.requesterId === targetUserId || r.receiverId === targetUserId
    );

    if (pendingReq) {
      return pendingReq.requesterId === myId ? 'SENT_REQUEST' : 'RECEIVED_REQUEST';
    }

    const isBlocked = this.friendshipService.blockedFriendships().some(b =>
      b.requesterId === targetUserId || b.receiverId === targetUserId
    );
    if (isBlocked) return 'BLOCKED';

    return 'NONE';
  }

  getPendingRequestId(targetUserId: number): string {
    const req = this.friendshipService.pendingRequests().find(r =>
      r.requesterId === targetUserId || r.receiverId === targetUserId
    );
    return req ? req.id : '';
  }

  startChat(friendId: number, friendName: string) {
    const existingChat = this.chatService.getExistingPrivateChat(friendId);

    if (existingChat) {
      if (!existingChat.chatName) existingChat.chatName = friendName;
      this.chatService.selectChat(existingChat.id as any);
      this.close();
    } else {
      this.chatService.createChat(friendId, friendName).subscribe({
        next: () => this.close(),
        error: (err) => console.error('Failed to create chat', err)
      });
    }
  }

  answerFriendship(friendshipId: string, accepted: boolean) {
    this.friendshipService.answerRequest(friendshipId, accepted).subscribe({
      next: () => console.log(`Friend request ${accepted ? 'accepted' : 'rejected'}`),
      error: (err) => console.error('Failed to answer friend request', err)
    });
  }

  unblockUser(targetUserId: number) {
    this.friendshipService.unblockUser(targetUserId).subscribe({
      next: () => console.log(`Unblocked user ID: ${targetUserId}`),
      error: (err) => console.error('Failed to unblock user', err)
    });
  }
}