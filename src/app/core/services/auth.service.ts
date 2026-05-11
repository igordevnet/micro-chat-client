import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, tap } from 'rxjs';
import { environment } from '../../../environments/environment.development';

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private readonly API_URL = environment.apiUrl + '/auth'; 

  constructor(private http: HttpClient) {}

  login(credentials: any): Observable<any> {
    return this.http.post(`${this.API_URL}/local/signin`, credentials).pipe(
      tap((response: any) => {
        if (response.accessToken) {
          localStorage.setItem('access_token', response.accessToken);
        }
      })
    );
  }

  register(userData: any): Observable<any> {
    return this.http.post(`${this.API_URL}/register`, userData);
  }

  logout(): void {
    this.http.post(`${this.API_URL}/logout`, {});
    localStorage.removeItem('access_token');
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

  private getToken(): string | null {
    return localStorage.getItem('access_token');
  }
}