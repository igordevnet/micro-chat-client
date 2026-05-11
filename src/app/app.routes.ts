import { Routes } from '@angular/router';
import { LoginComponent } from './features/auth/login/login';
import { RegisterComponent } from './features/auth/register/register';

export const routes: Routes = [
    { path: '', loadComponent: () => import('./features/home-page/home-page').then(m => m.HomeComponent) },
    { path: 'login', component: LoginComponent },
    { path: 'register', component: RegisterComponent },
    { path: 'forgot-password', loadComponent: () => import('./features/auth/forgot-password/forgot-password').then(m => m.ForgotPasswordComponent) },
    { path : 'reset-password-page', loadComponent: () => import('./features/auth/reset-password/reset-password').then(m => m.ResetPasswordComponent) },
    { path : 'verify-email', loadComponent: () => import('./features/auth/verify-email/verify-email').then(m => m.VerifyEmailComponent) },
];
