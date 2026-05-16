import { Injectable, inject, signal } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { environment } from '../../../environments/environment.development';
import { AuthService } from './auth.service';

@Injectable({ providedIn: 'root' })
export class PresenceService {
    private http = inject(HttpClient);
    private auth = inject(AuthService);
    private readonly API_URL = `${environment.apiUrl}/presence`;

    public statuses = signal<Record<number, string>>({});

    fetchPresence(userIds: number[]) {
        if (!userIds || userIds.length === 0) return;

        const params = new HttpParams().set('userIds', userIds.join(','));
        
        this.http.get<Record<number, string>>(this.API_URL, {
            params,
            headers: { Authorization: `Bearer ${this.auth.currentUser()?.token}` }
        }).subscribe({
            next: (res) => {
                this.statuses.update(current => ({ ...current, ...res }));
            },
            error: (err) => console.error('Failed to fetch presence', err)
        });
    }

    updatePresence(userId: number, status: string) {
        this.statuses.update(current => ({ ...current, [userId]: status }));
    }
    
    getStatus(userId: number | null): string {
        if (!userId) return 'OFFLINE';
        return this.statuses()[userId] || 'OFFLINE';
    }
}