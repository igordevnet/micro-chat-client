import { ChangeDetectorRef, Component, DestroyRef, inject, OnInit, signal, WritableSignal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators, AbstractControl, ValidationErrors } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../../../core/services/auth.service';
import { timer } from 'rxjs';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { RegisterResponse } from '../../../shared/http/response/register.response';
import { ApiError } from '../../../shared/interfaces/error';
import { strengthValidator } from '../../../shared/validators/password.validator';
import { PopUpComponent } from '../../../shared/components/pop-up/pop-up';

@Component({
  selector: 'app-register',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterLink, PopUpComponent],
  templateUrl: './register.html',
  styleUrl: './register.scss'
})
export class RegisterComponent {
  public apiError: WritableSignal<ApiError | undefined> = signal(undefined);

  private router = inject(Router);
  private destroyRef = inject(DestroyRef);
  private cdr = inject(ChangeDetectorRef);
  private fb = inject(FormBuilder);
  private authService = inject(AuthService);

  signupForm: FormGroup;
  isSubmitting = false;
  showSuccess = false;
  passwordVisible = false;
  activeField = '';

  constructor() {
    this.signupForm = this.fb.group({
      nickname: ['', Validators.required],
      email: ['', [Validators.required, Validators.email]],
      age: [null, [Validators.required, Validators.min(18), Validators.max(120)]],
      password: ['', [
        Validators.required,
        Validators.minLength(8),
        strengthValidator()
      ]],
      confirmPassword: ['', Validators.required]
    }, { validators: this.passwordMatchValidator });
  }

  passwordMatchValidator(control: AbstractControl): ValidationErrors | null {
    const password = control.get('password')?.value;
    const confirm = control.get('confirmPassword')?.value;
    return password === confirm ? null : { mismatch: true };
  }

  isFieldInvalid(field: string): boolean {
    const control = this.signupForm.get(field);
    return !!(control && control.invalid && (control.dirty || control.touched));
  }

  togglePassword() {
    this.passwordVisible = !this.passwordVisible;
  }

  handleSignup(): void {
    if (this.signupForm.invalid) {
      this.triggerShake();
      this.signupForm.markAllAsTouched();
      return;
    }

    const authDto = {
      username: this.signupForm.value.nickname,
      email: this.signupForm.value.email,
      password: this.signupForm.value.password,
      age: 18
    };

    this.isSubmitting = true;

    this.authService.register(authDto).subscribe({
      next: (response: RegisterResponse) => {
        this.showSuccess = true;
        this.isSubmitting = false;
        this.cdr.detectChanges();

        timer(3000).pipe(
          takeUntilDestroyed(this.destroyRef)
        ).subscribe(() => {
          this.router.navigate(['/verify-email'], { queryParams: { email: authDto.email } });
        });
      },
      error: (err) => {
        this.isSubmitting = false;

        if (err.status === 0) {
          this.apiError.set({ status: 0, error: 'Servidor offline ou inacessível.' } as ApiError);
        } else {
          this.apiError.set(err.error || { status: err.status, error: 'Ocorreu um erro no servidor.' });
        }

        this.applyApiErrors(this.apiError()!);
        this.triggerShake();
        this.cdr.detectChanges();
      },
      complete: () => {
        this.isSubmitting = false;
      }
    });
  }

  private triggerShake() {
    const element = document.querySelector('.login-card') as HTMLElement;
    if (element) {
      element.classList.remove('shake-animation');
      void element.offsetWidth;
      element.classList.add('shake-animation');
    }
  }

  private applyApiErrors(apiError: ApiError): void {
    Object.keys(this.signupForm.controls).forEach(field => {
      const control = this.signupForm.get(field);
      control?.setErrors(null);
    });

    if (apiError.status === 409) {
      const isEmailConflict = apiError.error.includes("email");
      const control = isEmailConflict ? this.signupForm.get("email") : this.signupForm.get("nickname");

      if (control) {
        control.setErrors({ apiError: apiError.error });
        control.markAsTouched();
      }
      return;
    }
    if (!apiError.errors) {
      this.apiError.set(apiError);
      return;
    }

    apiError.errors.forEach((err: any) => {
      const control = this.signupForm.get(err.fieldName);
      if (control) {
        control.setErrors({ apiError: err.message });
        control.markAsTouched();
      }
    });
  }

  getFieldError(field: string): string | null {
    const control = this.signupForm.get(field);
    if (!control || !control.errors) return null;
    if (!(control.dirty || control.touched)) return null;

    if (control.errors['apiError']) return control.errors['apiError'];
    if (control.errors['required'] && (field === 'password')) return 'Senha deve ter entre 8 e 16 caracteres, conter letras e números';
    if (control.errors['required']) return 'Este campo é obrigatório';
    if (control.errors['email']) return 'Por favor, insira um email válido';

    if (control.errors['min'] && field === 'age') return 'Você precisa ter pelo menos 18 anos';
    if (control.errors['max'] && field === 'age') return 'Idade inválida';

    if (control.errors['passwordStrength']) {
      const strength = control.errors['passwordStrength'];
      if (!strength.hasUpperCase) return 'A senha deve ter pelo menos uma letra maiúscula';
      if (!strength.hasNumeric) return 'A senha deve conter pelo menos um número';
      if (!strength.hasSpecial) return 'A senha deve conter um caractere especial (@$!%*?&)';
      return 'Senha muito fraca';
    }

    if (control.errors['minlength']) {
      const requiredLength = control.errors['minlength'].requiredLength;
      return `A senha deve ter pelo menos ${requiredLength} caracteres`;
    }

    return null;
  }
}