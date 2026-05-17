import { CommonModule } from '@angular/common';
import { ChangeDetectorRef, Component, DestroyRef, inject, OnInit, signal } from '@angular/core';
import { FormBuilder, FormGroup, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { AuthService } from '../../../core/services/auth.service'; // Adjusted path to match our previous setup
import { timer } from 'rxjs';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';

interface ApiError {
  status: number;
  error: string;
}

@Component({
  selector: 'app-verify-email-page', 
  standalone: true,
  imports: [CommonModule, FormsModule, ReactiveFormsModule, RouterLink],
  templateUrl: './verify-email.html',
  styleUrl: './verify-email.scss',
})
export class VerifyEmailComponent implements OnInit {

  readonly secondsRemaining = signal(60);

  private cdr = inject(ChangeDetectorRef);
  private router = inject(Router);
  private route = inject(ActivatedRoute);
  private destroyRef = inject(DestroyRef);
  private authService = inject(AuthService);
  private fb = inject(FormBuilder);

  verifyForm!: FormGroup;
  email: string = '';
  codeSlots: string[] = ['', '', '', '', '', ''];
  isError: boolean = false;
  isLoading: boolean = false;
  isSuccess: boolean = false;

  constructor() {
    const timerId = setInterval(() => {
      this.secondsRemaining.update(v => Math.max(v - 1, 0));
    }, 1000);

    this.destroyRef.onDestroy(() => clearInterval(timerId));
  }

  ngOnInit() {
    this.email = this.route.snapshot.queryParamMap.get('email') || '';
    
    this.verifyForm = this.fb.group({
      code: ['', [Validators.required, Validators.pattern('^[0-9A-Z]{6}$')]],
    });
  }

  onInput(event: Event, index: number) {
    const input = event.target as HTMLInputElement;
    const cleanValue = input.value.toUpperCase().replace(/[^A-Z0-9]/g, '');
    
    input.value = cleanValue;
    this.codeSlots[index] = cleanValue;

    if (cleanValue && index < 5) {
      const nextInput = input.nextElementSibling as HTMLInputElement;
      if (nextInput) nextInput.focus();
    }
  }

  onKeyDown(event: KeyboardEvent, index: number) {
    if (event.key === 'Backspace' && !this.codeSlots[index] && index > 0) {
      const parent = (event.target as HTMLElement).parentElement;
      const inputs = parent?.querySelectorAll('input');
      if (inputs && inputs[index - 1]) {
        (inputs[index - 1] as HTMLInputElement).focus();
      }
    }
  }

  onVerify() {
    const fullCode = this.codeSlots.join('');
    
    this.verifyForm.get('code')?.setValue(fullCode);

    if (this.verifyForm.invalid || fullCode.length < 6) {
      this.verifyForm.markAllAsTouched();
      this.triggerError();
      return;
    }

    this.isLoading = true;
    console.log('Verifying essence code:', fullCode);

    this.authService.verifyEmail(this.email, fullCode).subscribe({
      next: () => {
        this.isLoading = false;
        this.isSuccess = true;
        this.cdr.detectChanges();

        timer(3000).pipe( 
          takeUntilDestroyed(this.destroyRef)
        ).subscribe(() => {
          this.router.navigate(['/login']); 
        });
      },
      error: (err) => {
        this.isLoading = false;
        this.applyApiErrors({ status: err.status, error: 'Invalid or expired code.' });
        this.triggerError();
      },
    });
  }

  triggerError() {
    this.isError = true;
    setTimeout(() => (this.isError = false), 500);
  }

  private applyApiErrors(apiError: ApiError): void {
    Object.keys(this.verifyForm.controls).forEach(field => {
      const control = this.verifyForm.get(field);
      control?.setErrors(null);
    });

    if (apiError.status === 401 || apiError.status === 404) {
      const control = this.verifyForm.get('code');
      if (control) {
        control.setErrors({ apiError: apiError.error });
        control.markAsTouched();
      }
    }
  }

  getFieldError(field: string): string | null {
    const control = this.verifyForm.get(field);
    if (!control || !control.errors) return null;
    if (!(control.dirty || control.touched)) return null;

    if (control.errors['apiError']) {
      return control.errors['apiError'];
    }
    return null;
  }

  resendCode() {
    if (this.secondsRemaining() > 0) return;

    this.authService.resendEmailVerification(this.email).subscribe({
      next: () => {
        this.secondsRemaining.set(60); 
      },
      error: (err) => {
        console.error('Failed to resend code:', err);
      },
    });
  }
}