import { computed, inject, Injectable, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, tap } from 'rxjs';
import { environment } from '../../../environments/environment.development';
import { UserSession } from '../../shared/interfaces/user.session';

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private readonly API_URL = environment.apiUrl + '/auth';

  private http = inject(HttpClient);

  private session = signal<UserSession | null>(this.getStoredSession());

  readonly currentUser = computed(() => this.session());
  readonly isAuthenticated = computed(() => !!this.session());

  constructor() { }

  login(credentials: any): Observable<any> {
    return this.http.post(`${this.API_URL}/local/signin`, credentials).pipe(
      tap((response: any) => {
        if (response.accessToken) {
          this.setSession(response.accessToken);
        }
      })
    );
  }

  register(userData: any): Observable<any> {
    return this.http.post(`${this.API_URL}/register`, userData);
  }

  forgotPassword(email: string): Observable<any> {
    return this.http.post(`${this.API_URL}/forgot-password`, { email });
  }

  resendEmailVerification(email: string): Observable<any> {
    return this.http.post(`${this.API_URL}/resend-email-code`, { email });
  }

  resetPassword(token: string, newPassword: string): Observable<any> {
    return this.http.post(`${this.API_URL}/reset-password`, { token, newPassword });
  }

  verifyEmail(email: string, code: string): Observable<any> {
    return this.http.post(`${this.API_URL}/verify-email`, { email, code });
  }

  refreshToken(): Observable<any> {
    return this.http.post(`${this.API_URL}/refresh-token`, {}, { withCredentials: true }).pipe(
      tap((response: any) => {
        if (response.accessToken) {
          this.setSession(response.accessToken);
        }
      })
    );
  }

  logout(): void {
    this.http.post(
      `${this.API_URL}/logout`,
      {},
      {
        headers: {
          Authorization: `Bearer ${this.getToken()}`
        },
        withCredentials: true
      }
    ).subscribe({
      next: () => this.clearLocalSession(),
      error: () => this.clearLocalSession()
    });
  }

  getToken(): string | null {
    return localStorage.getItem('chat_auth') ? JSON.parse(localStorage.getItem('chat_auth')!).token : null;
  }

  private clearLocalSession(): void {
    localStorage.removeItem('chat_auth');
    this.session.set(null);
  }

  private decodeToken(token: string): any {
    try {
      const payload = token.split('.')[1];
      const base64 = payload.replace(/-/g, '+').replace(/_/g, '/');
      const jsonPayload = decodeURIComponent(
        window.atob(base64)
          .split('')
          .map(c => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
          .join('')
      );

      return JSON.parse(jsonPayload);
    } catch (e) {
      console.error("Could not decode JWT", e);
      return null;
    }
  }

  private setSession(token: string) {
    const decoded = this.decodeToken(token);

    if (decoded) {
      const userSession = {
        token: token,
        id: decoded.userId || decoded.sub,
        username: decoded.username || decoded.name,
        email: decoded.email
      };

      localStorage.setItem('chat_auth', JSON.stringify(userSession));
      this.session.set(userSession);
    }
  }

  private getStoredSession(): UserSession | null {
    const data = localStorage.getItem('chat_auth');
    return data ? JSON.parse(data) : null;
  }
}