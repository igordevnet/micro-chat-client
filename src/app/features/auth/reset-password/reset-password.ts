import { ChangeDetectorRef, Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router, RouterLink, RouterLinkActive } from '@angular/router';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators, AbstractControl, ValidationErrors } from '@angular/forms';
import { AuthService } from '../../../core/services/auth.service'; // Adjusted path
import { strengthValidator } from '../../../shared/validators/password.validator';
import { ApiError } from '../../../shared/interfaces/error';

@Component({
  selector: 'app-reset-password',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterLinkActive],
  templateUrl: './reset-password.html',
  styleUrl: './reset-password.scss' 
})
export class ResetPasswordComponent implements OnInit {
  resetPasswordForm!: FormGroup;
  isSubmitting = false;
  showSuccess = false;
  passwordVisible = false;
  activeField = '';
  token: string | null = null;

  private fb = inject(FormBuilder);
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private cdr = inject(ChangeDetectorRef);
  private authService = inject(AuthService);

  ngOnInit(): void {
    this.token = this.route.snapshot.queryParamMap.get('token');
    
    if (!this.token) {
      alert('Link de recuperação inválido ou ausente.');
      this.router.navigate(['/login']);
      return;
    }

    this.initForm();
  }

  private initForm() {
    this.resetPasswordForm = this.fb.group({
      password: ['', [
        Validators.required,
        Validators.minLength(8),
        strengthValidator()
      ]],
      confirmPassword: ['', [Validators.required]]
    }, { validators: this.passwordMatchValidator });
  }

  passwordMatchValidator(control: AbstractControl): ValidationErrors | null {
    const password = control.get('password')?.value;
    const confirm = control.get('confirmPassword')?.value;
    return password === confirm ? null : { mismatch: true };
  }

  togglePassword() { 
    this.passwordVisible = !this.passwordVisible; 
  }

  handleUpdate(): void {
    if (this.resetPasswordForm.invalid) {
      this.triggerShake();
      this.resetPasswordForm.markAllAsTouched();
      return;
    }

    if (!this.token) return;

    this.isSubmitting = true;

    this.authService.resetPassword(this.token, this.resetPasswordForm.value.password).subscribe({
      next: () => {
        this.showSuccess = true;
        this.isSubmitting = false;
        this.cdr.detectChanges();
      },
      error: (error) => {
        this.isSubmitting = false;
        const apiError = error.error as ApiError;
        this.applyApiErrors(apiError);
        this.triggerShake();
      },
      complete: () => {
        this.isSubmitting = false;
      }
    });
  }

  private applyApiErrors(apiError: ApiError): void {
    Object.keys(this.resetPasswordForm.controls).forEach(field => {
      const control = this.resetPasswordForm.get(field);
      control?.setErrors(null);
    });

    if (apiError.status === 401) {
      const control = this.resetPasswordForm.get('password');
      if (control) {
        control.setErrors({ apiError: apiError.error });
        control.markAsTouched();
      }
    }

    if (apiError.status === 422 && apiError.errors) {
      apiError.errors.forEach(err => {
        const control = this.resetPasswordForm.get(err.fieldName);
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
    const control = this.resetPasswordForm.get(field);

    if (!control || !control.errors) return null;
    if (!(control.dirty || control.touched)) return null;
    if (control.errors['apiError']) return control.errors['apiError'];
    if (control.errors['required'] && field === 'password') return `Senha deve ter entre 8 e 16 caracteres, conter letras e números`;

    if (control.errors['passwordStrength']) {
      const strength = control.errors['passwordStrength'];
      if (!strength.hasUpperCase) return 'A senha deve ter pelo menos uma letra maiúscula';
      if (!strength.hasNumeric) return 'A senha deve conter pelo menos um número';
      if (!strength.hasSpecial) return 'A senha deve conter um caractere especial (@$!%*?&)';
      return 'Senha muito fraca';
    }

    if (control.errors['minlength']) return `Senha deve ter no mínimo 8 caracteres`;

    return null;
  }
}