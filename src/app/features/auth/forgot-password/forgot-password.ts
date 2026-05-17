import { ChangeDetectorRef, Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { AuthService } from '../../../core/services/auth.service';
import { ApiError } from '../../../shared/interfaces/error';

@Component({
  selector: 'app-forgot-password',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterLink],
  templateUrl: './forgot-password.html',
  styleUrl: './forgot-password.scss'
})
export class ForgotPasswordComponent implements OnInit {
  resetForm!: FormGroup;
  isSubmitting = false;
  showSuccess = false;
  activeField = '';
  public apiError?: ApiError;


  private fb = inject(FormBuilder);
  private authService = inject(AuthService);
  private cdr = inject(ChangeDetectorRef);

  ngOnInit(): void {
    this.resetForm = this.fb.group({
      email: ['', [Validators.required, Validators.email]]
    });
  }

  isFieldInvalid(field: string): boolean {
    const control = this.resetForm.get(field);
    return !!(control && control.invalid && (control.dirty || control.touched));
  }

  handleReset(): void {
    console.log('Reset request started...');

    if (this.resetForm.invalid) {
      this.triggerShake();
      this.resetForm.markAllAsTouched();
      return;
    }

    this.isSubmitting = true;

    this.authService.forgotPassword(this.resetForm.value.email).subscribe({
      next: () => {
        this.showSuccess = true;
        this.isSubmitting = false;
        this.cdr.detectChanges();
      },
      error: (err) => {
        this.isSubmitting = false;

        if (err.status === 0) {
          this.apiError = { status: 0, error: 'Servidor offline ou inacessível.' } as ApiError;
        } else {
          this.apiError = err.error || { status: err.status, error: 'Ocorreu um erro no servidor.' };
        }

        this.applyApiErrors(this.apiError!);
        this.triggerShake();
        this.cdr.detectChanges();
      }
    });
  }

  private applyApiErrors(apiError: ApiError): void {
    Object.keys(this.resetForm.controls).forEach(field => {
      const control = this.resetForm.get(field);
      control?.setErrors(null);
    });

    if (apiError.status === 404) {
      const control = this.resetForm.get('email');
      if (control) {
        control.setErrors({ apiError: apiError.error });
        control.markAsTouched();
      }
    }

    if (apiError.status === 422 && apiError.errors) {
      apiError.errors.forEach(err => {
        const control = this.resetForm.get(err.fieldName);
        if (control) {
          control.setErrors({ apiError: err.message });
          control.markAsTouched();
        }
      });
    }
  }

  private triggerShake() {
    const element = document.querySelector('.login-card') as HTMLElement;
    if (element) {
      element.classList.remove('shake-animation');
      void element.offsetWidth;
      element.classList.add('shake-animation');
    }
  }

  getFieldError(field: string): string | null {
    const control = this.resetForm.get(field);
    if (!control || !control.errors) return null;
    if (!(control.dirty || control.touched)) return null;

    if (control.errors['apiError']) return control.errors['apiError'];
    if (control.errors['required'] && field === 'email') return `Por favor, digite seu email`;
    if (control.errors['email']) return `Por favor, insira um formato de email válido`;

    return null;
  }
}