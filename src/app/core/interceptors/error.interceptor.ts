import { HttpInterceptorFn, HttpErrorResponse } from '@angular/common/http';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { catchError, throwError } from 'rxjs';

export const errorInterceptor: HttpInterceptorFn = (req, next) => {
  const router = inject(Router);

  return next(req).pipe(
    catchError((error: HttpErrorResponse) => {
      
      if (error.status === 401) {
        console.error('🚨 401: Token expired or invalid. Kicking to login.');
        localStorage.removeItem('access_token');
        router.navigate(['/login']);
      } 
      else if (error.status === 403) {
        console.error('🛑 403: You do not have permission to do this.');
      } 
      else if (error.status === 500) {
        console.error('🔥 500: Backend is on fire!');
      } 
      else if (error.status === 0) {
        console.error('🔌 0: Network error or CORS issue.');
      }

      return throwError(() => error);
    })
  );
};