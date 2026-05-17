import { HttpInterceptorFn, HttpErrorResponse } from '@angular/common/http';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { catchError, switchMap, throwError } from 'rxjs';
import { AuthService } from '../services/auth.service';

export const errorInterceptor: HttpInterceptorFn = (req, next) => {
  const router = inject(Router);
  const auth = inject(AuthService); 

  return next(req).pipe(
    catchError((error: HttpErrorResponse) => {
      
      if (error.status === 401 && (req.url.includes('/login') || req.url.includes('/signin'))) {
        
        const backendMessage = error.error?.error || ''; 

        if (backendMessage.toLowerCase().includes('not verified')) {
          console.warn('📧 Account not verified! Extracting email from backend response...');

          const emailRegex = /([a-zA-Z0-9._-]+@[a-zA-Z0-9._-]+\.[a-zA-Z0-9_-]+)/;
          const match = backendMessage.match(emailRegex);
          const targetEmail = match ? match[0] : null;

          if (targetEmail) {
            console.log(`Extracted email: ${targetEmail}`);
            
            auth.resendEmailVerification(targetEmail).subscribe({
              next: () => console.log('✅ New verification code sent automatically!'),
              error: (err) => console.error('❌ Failed to send new code', err)
            });

            router.navigate(['/verify-email'], { queryParams: { email: targetEmail } });
          } else {
            console.error('Regex could not extract email from the error string!');
            router.navigate(['/verify-email']); 
          }

          return throwError(() => error);
        }
      }

      if (error.status === 401 && !req.url.includes('/signin') && !req.url.includes('/refresh')) {
        console.warn('🚨 401: Token expired. Pausing request to attempt refresh...');

        return auth.refreshToken().pipe(
          switchMap((response: any) => {
            console.log('✅ Token refreshed successfully! Retrying original request...');
            
            const clonedRequest = req.clone({
              setHeaders: {
                Authorization: `Bearer ${auth.getToken()}` 
              }
            });

            return next(clonedRequest);
          }),
          catchError((refreshError) => {
            console.error('❌ Failed to refresh token. Session is totally dead. Logging out.');
            
            auth.logout();
            router.navigate(['/login']);
            
            return throwError(() => refreshError);
          })
        );
      }

      if (error.status === 403) {
        console.error('🛑 403: You do not have permission to do this.');
      } else if (error.status === 500) {
        console.error('🔥 500: Backend is on fire!');
      } else if (error.status === 0) {
        console.error('🔌 0: Network error or CORS issue.');
      }

      return throwError(() => error);
    })
  );
};