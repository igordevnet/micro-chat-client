import { inject, Injectable } from "@angular/core";
import { environment } from "../../../environments/environment.development";
import { AuthService } from "./auth.service";
import { HttpClient } from "@angular/common/http";
import { Observable } from "rxjs";

@Injectable({ providedIn: 'root' })
export class FriendshipService {
    private http = inject(HttpClient);
    private auth = inject(AuthService);
    private readonly API_URL = `${environment.apiUrl}/friendship`;

    sendRequest(receiverId: number): Observable<void> {
        return this.http.post<void>(
            `${this.API_URL}/request`, 
            { receiverId, status: 'PENDING' }, 
            { headers: { 'Authorization': `Bearer ${this.auth.getToken()}` } }
        );
    }

    answerRequest(friendshipId: string, status: 'ACCEPTED' | 'DECLINED'): Observable<void> {
        return this.http.put<void>(
            `${this.API_URL}/answer`, 
            { friendshipId, status }, 
            { headers: { 'Authorization': `Bearer ${this.auth.getToken()}` } }
        );
    }

    getFriends(): Observable<number[]> {
        return this.http.get<number[]>(
            `${this.API_URL}/friends`, 
            { headers: { 'Authorization': `Bearer ${this.auth.getToken()}` } }
        );
    }
}