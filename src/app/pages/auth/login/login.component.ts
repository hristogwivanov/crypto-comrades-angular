import { Component, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink, Router } from '@angular/router';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { AuthService } from '../../../services/auth.service';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, RouterLink, ReactiveFormsModule],
  template: `
    <div class="login-container">
      <div class="login-card">
        <div class="login-header">
          <h1>Welcome Back</h1>
          <p>Sign in to your Crypto Comrades account</p>
        </div>

        <form [formGroup]="loginForm" (ngSubmit)="onSubmit()" class="login-form">
          <div class="form-group">
            <label for="email" class="form-label">Email Address</label>
            <input 
              type="email" 
              id="email"
              formControlName="email"
              class="form-input"
              [class.error]="emailControl.invalid && emailControl.touched"
              placeholder="Enter your email">
            <div class="form-error" *ngIf="emailControl.invalid && emailControl.touched">
              <small *ngIf="emailControl.errors?.['required']">Email is required</small>
              <small *ngIf="emailControl.errors?.['email']">Please enter a valid email address</small>
            </div>
          </div>

          <div class="form-group">
            <label for="password" class="form-label">Password</label>
            <input 
              type="password" 
              id="password"
              formControlName="password"
              class="form-input"
              [class.error]="passwordControl.invalid && passwordControl.touched"
              placeholder="Enter your password">
            <div class="form-error" *ngIf="passwordControl.invalid && passwordControl.touched">
              <small *ngIf="passwordControl.errors?.['required']">Password is required</small>
              <small *ngIf="passwordControl.errors?.['minlength']">Password must be at least 6 characters long</small>
            </div>
          </div>

          <div class="form-group">
            <label class="checkbox-container">
              <input type="checkbox" formControlName="rememberMe" class="checkbox-input">
              <span class="checkbox-label">Remember me</span>
            </label>
          </div>

          <div class="form-error" *ngIf="loginError">
            <small>{{ loginError }}</small>
          </div>

          <button 
            type="submit" 
            class="btn btn-primary btn-full"
            [disabled]="loginForm.invalid || isSubmitting">
            {{ isSubmitting ? 'Signing In...' : 'Sign In' }}
          </button>
        </form>

        <div class="login-footer">
          <div class="forgot-password">
            <a href="#" class="link">Forgot your password?</a>
          </div>
          
          <div class="signup-prompt">
            <p>Don't have an account? <a routerLink="/auth/register" class="link">Sign up here</a></p>
          </div>
        </div>



        <div class="auth-features">
          <div class="feature">
            <h4>💼 Portfolio Management</h4>
            <p>Track your crypto holdings and performance</p>
          </div>
          <div class="feature">
            <h4>📝 Community Posts</h4>
            <p>Share insights and engage with other traders</p>
          </div>
          <div class="feature">
            <h4>📊 Market Data</h4>
            <p>Access real-time cryptocurrency prices</p>
          </div>
        </div>
      </div>
    </div>
  `,
  styleUrls: ['./login.component.css']
})
export class LoginComponent implements OnDestroy {
  loginForm: FormGroup;
  isSubmitting = false;
  loginError: string | null = null;


  private destroy$ = new Subject<void>();

  constructor(
    private fb: FormBuilder,
    private authService: AuthService,
    private router: Router
  ) {
    this.loginForm = this.fb.group({
      email: ['', [Validators.required, Validators.email]],
      password: ['', [Validators.required, Validators.minLength(6)]],
      rememberMe: [false]
    });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  get emailControl() {
    return this.loginForm.get('email')!;
  }

  get passwordControl() {
    return this.loginForm.get('password')!;
  }

  onSubmit(): void {
    if (this.loginForm.invalid) {
      this.markFormGroupTouched();
      return;
    }

    this.isSubmitting = true;
    this.loginError = null;

    const { email, password, rememberMe } = this.loginForm.value;

    this.authService.login({ email, password }).pipe(
      takeUntil(this.destroy$)
    ).subscribe({
      next: (response) => {
        this.isSubmitting = false;
        

        const returnUrl = this.getReturnUrl();
        this.router.navigate([returnUrl]);
      },
      error: (error) => {
        this.isSubmitting = false;
        console.error('Login error:', error);
        
        if (error.status === 401) {
          this.loginError = 'Invalid email or password. Please try again.';
        } else if (error.status === 429) {
          this.loginError = 'Too many login attempts. Please try again later.';
        } else {
          this.loginError = 'Login failed. Please check your internet connection and try again.';
        }
      }
    });
  }



  private markFormGroupTouched(): void {
    Object.keys(this.loginForm.controls).forEach(key => {
      const control = this.loginForm.get(key);
      control?.markAsTouched();
    });
  }

  private getReturnUrl(): string {

    const urlParams = new URLSearchParams(window.location.search);
    const returnUrl = urlParams.get('returnUrl');
    return returnUrl && returnUrl.startsWith('/') ? returnUrl : '/dashboard';
  }
}
