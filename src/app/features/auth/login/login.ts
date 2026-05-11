import { ChangeDetectorRef, Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { AuthService } from '../../../core/services/auth.service';
import { ApiError } from '../../../shared/interfaces/error';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterLink], 
  templateUrl: './login.html', 
  styleUrl: './login.scss' 
})
export class LoginComponent implements OnInit {
  loginForm!: FormGroup;
  isSubmitting = false;
  showSuccess = false;
  passwordVisible = false;
  activeField = '';
  public apiError?: ApiError;

  private fb = inject(FormBuilder);
  private authService = inject(AuthService);
  private cdr = inject(ChangeDetectorRef);

  ngOnInit(): void {
    this.loginForm = this.fb.group({
      username: ['', [Validators.required]], 
      password: ['', [Validators.required, Validators.minLength(6)]],
      remember: [false]
    });
  }

  togglePassword() { 
    this.passwordVisible = !this.passwordVisible; 
  }

  handleSubmit(): void {

    if (this.loginForm.invalid) {
      this.triggerShake();
      this.loginForm.markAllAsTouched();
      return;
    }

    this.isSubmitting = true;

    const loginPayload = {
      username: this.loginForm.value.username, 
      password: this.loginForm.value.password,
      rememberMe: this.loginForm.value.remember
    };

    this.authService.login(loginPayload).subscribe({
      next: (response) => {
        this.showSuccess = true;
        this.isSubmitting = false;
        this.cdr.detectChanges();
      },
      error: (error) => {
        this.isSubmitting = false;
        this.apiError = error.error as ApiError;
        this.applyApiErrors(this.apiError);
        this.triggerShake();
      }
    });
  }

  private applyApiErrors(apiError: ApiError): void {
    Object.keys(this.loginForm.controls).forEach(field => {
      const control = this.loginForm.get(field);
      control?.setErrors(null);
    });

    if (apiError.status === 404 || apiError.status === 401) {
      const control = this.loginForm.get('username'); 
      if (control) {
        control.setErrors({ apiError: apiError.error });
        control.markAsTouched();
      }
    }
  }

  private triggerShake() {
    const element = document.querySelector('.login-card') as HTMLElement;
    if (element) {
      element.classList.remove('shake-animation');
      element.classList.add('shake-animation');
    }
  }

  getFieldError(field: string): string | null {
    const control = this.loginForm.get(field);
    if (!control || !control.errors) return null;
    if (!(control.dirty || control.touched)) return null;

    if (control.errors['apiError']) return control.errors['apiError'];
    if (control.errors['required'] && field === 'username') return `Por favor, digite seu usuário`;
    if (control.errors['required'] && field === 'password') return `Por favor, digite sua senha`;
    if (control.errors['required']) return `Este campo é obrigatório`;

    return null;
  }
}