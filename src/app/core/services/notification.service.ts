import { inject, Injectable, signal, computed } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { environment } from '../../../environments/environment.development';
import { Observable, of, switchMap, map, catchError, tap } from 'rxjs';
import { AuthService } from './auth.service';
import { UserService } from './user.service';
import { NotificationResponse } from '../../shared/http/response/notification.response';
import { NotificationPaginatedResponse } from '../../shared/http/response/paginated-notification.response';

@Injectable({ providedIn: 'root' })
export class NotificationService {
    private http = inject(HttpClient);
    private auth = inject(AuthService);
    private userService = inject(UserService);
    private readonly API_URL = `${environment.apiUrl}/notifications`;

    private notificationsSignal = signal<NotificationResponse[]>([]);
    
    readonly allNotifications = computed(() => this.notificationsSignal());
    readonly unreadCount = computed(() => 
        this.notificationsSignal().filter(n => !n.read).length
    );

    private getHeaders(): HttpHeaders {
        return new HttpHeaders({
            'Authorization': `Bearer ${this.auth.getToken()}`
        });
    }

    loadNotifications(page: number = 0, size: number = 10): void {
        this.http.get<NotificationPaginatedResponse>(
            `${this.API_URL}?page=${page}&size=${size}`, 
            { headers: this.getHeaders() }
        ).pipe(
            switchMap((response) => {
                const notifications = response.content;
                if (!notifications || notifications.length === 0) {
                    return of([]); 
                }
                const uniqueSenderIds = new Set(
                    notifications.map(n => n.senderId).filter(id => id != null)
                );
                const idsToFetch = Array.from(uniqueSenderIds);

                if (idsToFetch.length === 0) return of(notifications);

                return this.userService.getUsersByIds(idsToFetch).pipe(
                    map((users: any[]) => {
                        return notifications.map(notif => {
                            const sender = users.find(u => u.id === notif.senderId);
                            return {
                                ...notif,
                                senderName: sender ? sender.username : `User_${notif.senderId}`
                            };
                        });
                    }),
                    catchError(() => of(notifications)) 
                );
            })
        ).subscribe({
            next: (hydratedNotifications) => {
                if (page === 0) {
                    this.notificationsSignal.set(hydratedNotifications);
                } else {
                    this.notificationsSignal.update(current => [...current, ...hydratedNotifications]);
                }
            },
            error: (err) => console.error('Failed to load notifications', err)
        });
    }

    markAsRead(notificationId: string): void {
        this.http.patch(`${this.API_URL}/${notificationId}/read`, {}, { headers: this.getHeaders() })
            .subscribe({
                next: () => {
                    this.notificationsSignal.update(notifications => 
                        notifications.map(n => 
                            n.id === notificationId ? { ...n, read: true } : n
                        )
                    );
                },
                error: (err) => console.error('Failed to mark notification as read', err)
            });
    }
}