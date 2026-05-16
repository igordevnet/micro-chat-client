import { inject, Injectable, signal, computed } from "@angular/core";
import { environment } from "../../../environments/environment.development";
import { AuthService } from "./auth.service";
import { FriendshipResponse } from "../../shared/http/response/friendship.response";
import { HttpClient } from "@angular/common/http";
import { Observable, tap } from "rxjs";

@Injectable({ providedIn: 'root' })
export class FriendshipService {
    private http = inject(HttpClient);
    private auth = inject(AuthService);
    private readonly API_URL = `${environment.apiUrl}/friendship`;

    friendIds = signal<number[]>([]);
    pendingRequests = signal<FriendshipResponse[]>([]);
    blockedFriendships = signal<FriendshipResponse[]>([]);

    private getHeaders() {
        return { 'Authorization': `Bearer ${this.auth.getToken()}` };
    }

    loadFriendshipData() {
        this.getFriends().subscribe(ids => this.friendIds.set(ids));
        this.getPendingRequests().subscribe(reqs => this.pendingRequests.set(reqs));
        this.getBlockedFriends().subscribe(blocks => this.blockedFriendships.set(blocks));
    }

    sendRequest(receiverId: number): Observable<void> {
        return this.http.post<void>(`${this.API_URL}/request`, { receiverId }, { headers: this.getHeaders() })
            .pipe(tap(() => this.loadFriendshipData()));
    }

    answerRequest(friendshipId: string, isAccepted: boolean): Observable<void> {
        const payload = {
            friendshipId: friendshipId,
            status: isAccepted ? 'ACCEPTED' : 'REJECTED' 
        };

        return this.http.put<void>(
            `${this.API_URL}/answer`,
            payload,
            { headers: this.getHeaders() }
        ).pipe(
            tap(() => {
                console.log(`Friend request ${isAccepted ? 'accepted' : 'rejected'}`);
                this.loadFriendshipData(); 
            })
        );
    }

    blockFriendship(friendshipId: string): Observable<void> {
        return this.http.put<void>(
            `${this.API_URL}/${friendshipId}/block`,
            {},
            { headers: this.getHeaders() }
        ).pipe(
            tap(() => {
                console.log('Friendship blocked successfully');
                this.loadFriendshipData();
            })
        );
    }

    getFriends(): Observable<number[]> {
        return this.http.get<number[]>(`${this.API_URL}/friends`, { headers: this.getHeaders() });
    }

    getPendingRequests(): Observable<FriendshipResponse[]> {
        return this.http.get<FriendshipResponse[]>(`${this.API_URL}/pending`, { headers: this.getHeaders() });
    }

    getBlockedFriends(): Observable<FriendshipResponse[]> {
        return this.http.get<FriendshipResponse[]>(`${this.API_URL}/blocked`, { headers: this.getHeaders() });
    }
}