import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { AuthService } from '../../../core/services/auth.service';

@Component({
  selector: 'app-forgot-password',
  standalone: true,
  imports: [ReactiveFormsModule, CommonModule, RouterModule],
  templateUrl: './forgot-password.html',
  styleUrl: './forgot-password.scss'
})
export class ForgotPasswordComponent {
  forgotForm: FormGroup;
  isSubmitted = false; 
  
  private fb = inject(FormBuilder);
  private authService = inject(AuthService);

  constructor() {
    this.forgotForm = this.fb.group({
      email: ['', [Validators.required, Validators.email]]
    });
  }

  onSubmit() {
    if (this.forgotForm.valid) {
      this.authService.forgotPassword(this.forgotForm.value.email).subscribe({
        next: () => {
          this.isSubmitted = true; 
        },
        error: (err) => {
          // We will let the global interceptor handle this later
          console.error(err);
        }
      });
    }
  }
}