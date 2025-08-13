import { Component, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink, Router } from '@angular/router';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { AuthService } from '../../../services/auth.service';

@Component({
  selector: 'app-register',
  standalone: true,
  imports: [CommonModule, RouterLink, ReactiveFormsModule],
  template: `
    <div class="register-container">
      <div class="register-card">
        <div class="register-header">
          <h1>Join Crypto Comrades</h1>
          <p>Create your account and start your crypto journey</p>
        </div>

        <form [formGroup]="registerForm" (ngSubmit)="onSubmit()" class="register-form">


          <div class="form-group">
            <label for="username" class="form-label">Username</label>
            <input 
              type="text" 
              id="username"
              formControlName="username"
              class="form-input"
              [class.error]="usernameControl.invalid && usernameControl.touched"
              placeholder="Choose a unique username">
            <div class="form-error" *ngIf="usernameControl.invalid && usernameControl.touched">
              <small *ngIf="usernameControl.errors?.['required']">Username is required</small>
              <small *ngIf="usernameControl.errors?.['minlength']">Username must be at least 3 characters</small>
              <small *ngIf="usernameControl.errors?.['pattern']">Username can only contain letters, numbers, and underscores</small>
            </div>
          </div>

          <div class="form-group">
            <label for="email" class="form-label">Email Address</label>
            <input 
              type="email" 
              id="email"
              formControlName="email"
              class="form-input"
              [class.error]="emailControl.invalid && emailControl.touched"
              placeholder="Enter your email address">
            <div class="form-error" *ngIf="emailControl.invalid && emailControl.touched">
              <small *ngIf="emailControl.errors?.['required']">Email is required</small>
              <small *ngIf="emailControl.errors?.['email']">Please enter a valid email address</small>
            </div>
          </div>

          <div class="form-row">
            <div class="form-group">
              <label for="password" class="form-label">Password</label>
              <input 
                type="password" 
                id="password"
                formControlName="password"
                class="form-input"
                [class.error]="passwordControl.invalid && passwordControl.touched"
                placeholder="Create a strong password">
              <div class="form-error" *ngIf="passwordControl.invalid && passwordControl.touched">
                <small *ngIf="passwordControl.errors?.['required']">Password is required</small>
                <small *ngIf="passwordControl.errors?.['minlength']">Password must be at least 8 characters</small>
                <small *ngIf="passwordControl.errors?.['pattern']">Password must contain uppercase, lowercase, number, and special character</small>
              </div>
            </div>

            <div class="form-group">
              <label for="confirmPassword" class="form-label">Confirm Password</label>
              <input 
                type="password" 
                id="confirmPassword"
                formControlName="confirmPassword"
                class="form-input"
                [class.error]="confirmPasswordControl.invalid && confirmPasswordControl.touched"
                placeholder="Confirm your password">
              <div class="form-error" *ngIf="confirmPasswordControl.invalid && confirmPasswordControl.touched">
                <small *ngIf="confirmPasswordControl.errors?.['required']">Please confirm your password</small>
              </div>
              <div class="form-error" *ngIf="registerForm.errors?.['passwordMismatch'] && confirmPasswordControl.touched">
                <small>Passwords do not match</small>
              </div>
            </div>
          </div>



          <!-- Custom UI for existing user error -->
          <div class="existing-user-error" *ngIf="isExistingUserError">
            <div class="error-icon">⚠️</div>
            <div class="error-content">
              <h4>Account Already Exists</h4>
              <p>{{ registerError }}</p>
              <div class="error-actions">
                <a routerLink="/auth/login" class="btn btn-secondary btn-small">Sign In Instead</a>
              </div>
            </div>
          </div>

          <!-- General error message -->
          <div class="form-error" *ngIf="registerError && !isExistingUserError">
            <small>{{ registerError }}</small>
          </div>

          <button 
            type="submit" 
            class="btn btn-primary btn-full"
            [disabled]="registerForm.invalid || isSubmitting">
            {{ isSubmitting ? 'Creating Account...' : 'Create Account' }}
          </button>
        </form>

        <div class="register-footer">
          <div class="login-prompt">
            <p>Already have an account? <a routerLink="/auth/login" class="link">Sign in here</a></p>
          </div>
        </div>

        <div class="password-requirements">
          <h3>Password Requirements</h3>
          <ul>
            <li [class.met]="passwordRequirements.length">At least 8 characters long</li>
            <li [class.met]="passwordRequirements.uppercase">Contains uppercase letter (A-Z)</li>
            <li [class.met]="passwordRequirements.lowercase">Contains lowercase letter (a-z)</li>
            <li [class.met]="passwordRequirements.number">Contains number (0-9)</li>
            <li [class.met]="passwordRequirements.special">Contains special character (!@#$%^&*)</li>
          </ul>
        </div>

        <div class="platform-benefits">
          <h3>What You'll Get</h3>
          <div class="benefits-grid">
            <div class="benefit">
              <span class="benefit-icon">🚀</span>
              <h4>Real-time Market Data</h4>
              <p>Access live cryptocurrency prices and market information</p>
            </div>
            <!-- <div class="benefit">
              <span class="benefit-icon">💼</span>
              <h4>Portfolio Tracking</h4>
              <p>Monitor your crypto holdings and track performance over time</p>
            </div> -->
            <div class="benefit">
              <span class="benefit-icon">💬</span>
              <h4>Community Engagement</h4>
              <p>Share insights, discuss trends, and learn from other traders</p>
            </div>
            <!-- <div class="benefit">
              <span class="benefit-icon">📈</span>
              <h4>Advanced Analytics</h4>
              <p>Get detailed charts and analysis tools for better decisions</p>
            </div> -->
          </div>
        </div>
      </div>
    </div>
  `,
  styleUrls: ['./register.component.css']
})
export class RegisterComponent implements OnDestroy {
  registerForm: FormGroup;
  isSubmitting = false;
  registerError: string | null = null;
  isExistingUserError = false;
  passwordRequirements = {
    length: false,
    uppercase: false,
    lowercase: false,
    number: false,
    special: false
  };

  private destroy$ = new Subject<void>();

  constructor(
    private fb: FormBuilder,
    private authService: AuthService,
    private router: Router
  ) {
    this.registerForm = this.fb.group({
      username: ['', [Validators.required, Validators.minLength(3), Validators.pattern(/^[a-zA-Z0-9_]+$/)]],
      email: ['', [Validators.required, Validators.email]],
      password: ['', [Validators.required, Validators.minLength(8), this.strongPasswordValidator]],
      confirmPassword: ['', [Validators.required]]
    }, { validators: this.passwordMatchValidator });

    // Watch password changes for requirements display
    this.registerForm.get('password')?.valueChanges.subscribe(password => {
      this.updatePasswordRequirements(password || '');
    });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  get usernameControl() { return this.registerForm.get('username')!; }
  get emailControl() { return this.registerForm.get('email')!; }
  get passwordControl() { return this.registerForm.get('password')!; }
  get confirmPasswordControl() { return this.registerForm.get('confirmPassword')!; }


  onSubmit(): void {
    if (this.registerForm.invalid) {
      this.markFormGroupTouched();
      return;
    }

    this.isSubmitting = true;
    this.registerError = null;
    this.isExistingUserError = false;

    const formData = this.registerForm.value;
    const registerRequest = {
      username: formData.username,
      email: formData.email,
      password: formData.password,
      confirmPassword: formData.confirmPassword
    };

    this.authService.register(registerRequest).pipe(
      takeUntil(this.destroy$)
    ).subscribe({
      next: (response) => {
        this.isSubmitting = false;
        // Redirect to community posts after successful registration
        this.router.navigate(['/posts']);
      },
      error: (error) => {
        this.isSubmitting = false;
        console.error('Registration error:', error);
        
        // Check for Firebase existing email error
        if (error.message && error.message.includes('Email already exists')) {
          this.isExistingUserError = true;
          this.registerError = 'It looks like this email or username is already taken. Please try with different credentials or sign in if you already have an account.';
        }
        // Check for weak password error
        else if (error.message && error.message.includes('Password is too weak')) {
          this.registerError = 'Password is too weak. Please choose a stronger password with uppercase, lowercase, numbers, and special characters.';
        }
        // Check for invalid email error
        else if (error.message && error.message.includes('valid email address')) {
          this.registerError = 'Please enter a valid email address.';
        }
        // Generic error for other cases
        else {
          this.registerError = error.message || 'Registration failed. Please check your internet connection and try again.';
        }
      }
    });
  }

  private strongPasswordValidator(control: any) {
    const value = control.value;
    if (!value) return null;

    const hasUpperCase = /[A-Z]/.test(value);
    const hasLowerCase = /[a-z]/.test(value);
    const hasNumeric = /[0-9]/.test(value);
    const hasSpecialChar = /[!@#$%^&*(),.?":{}|<>]/.test(value);
    
    const valid = hasUpperCase && hasLowerCase && hasNumeric && hasSpecialChar;
    return valid ? null : { pattern: true };
  }

  private passwordMatchValidator(form: FormGroup) {
    const password = form.get('password');
    const confirmPassword = form.get('confirmPassword');
    
    if (!password || !confirmPassword) return null;
    
    return password.value === confirmPassword.value ? null : { passwordMismatch: true };
  }

  private updatePasswordRequirements(password: string): void {
    this.passwordRequirements = {
      length: password.length >= 8,
      uppercase: /[A-Z]/.test(password),
      lowercase: /[a-z]/.test(password),
      number: /[0-9]/.test(password),
      special: /[!@#$%^&*(),.?":{}|<>]/.test(password)
    };
  }

  private markFormGroupTouched(): void {
    Object.keys(this.registerForm.controls).forEach(key => {
      const control = this.registerForm.get(key);
      control?.markAsTouched();
    });
  }
}
