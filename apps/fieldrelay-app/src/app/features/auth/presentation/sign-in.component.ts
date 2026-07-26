import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { AuthService } from '../../../core/services/auth.service';
import { ThemeService } from '../../../core/services/theme.service';
import { IconComponent } from '../../../shared/components/icon/icon.component';

@Component({
  selector: 'app-sign-in',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, IconComponent],
  template: `
    <div class="auth-page">
      <div class="auth-card">
        <div class="auth-header">
          <div class="brand-badge">
            <fr-icon class="icon" name="bolt" [size]="14" [strokeWidth]="2" />
            <span class="text">FIELDRELAY OPS</span>
          </div>
          <h1 class="auth-title">Secure Sign In</h1>
          <p class="auth-subtitle">
            Autonomous Property Dispatch & Emergency AI Voice Operations
          </p>
        </div>

        <!-- Working Demo Quick Access Banner -->
        <div class="demo-access-banner">
          <div class="banner-text">
            <strong>Evaluator / Demo Session:</strong> Access full Mission Control with pre-configured operational state.
          </div>
          <button
            type="button"
            class="demo-btn"
            (click)="onQuickDemoSignIn()"
            [disabled]="authService.isLoading()"
            id="demo-login-btn"
          >
            <fr-icon name="bolt" [size]="17" [strokeWidth]="2" />
            <span>Continue as Demo Ops Manager</span>
          </button>
        </div>

        <div class="divider">
          <span>OR SIGN IN WITH CREDENTIALS</span>
        </div>

        <form [formGroup]="loginForm" (ngSubmit)="onSubmit()" class="auth-form" novalidate>
          <div class="form-group">
            <label for="email" class="form-label">Organization Email</label>
            <input
              id="email"
              type="email"
              formControlName="email"
              class="form-input"
              placeholder="ops.manager@fieldrelay.io"
              autocomplete="email"
              [class.is-invalid]="emailControl?.invalid && emailControl?.touched"
            />
            <div class="error-msg" *ngIf="emailControl?.invalid && emailControl?.touched">
              <span *ngIf="emailControl?.errors?.['required']">Email is required.</span>
              <span *ngIf="emailControl?.errors?.['email']">Please enter a valid email address.</span>
            </div>
          </div>

          <div class="form-group">
            <div class="label-row">
              <label for="password" class="form-label">Password</label>
              <button
                type="button"
                class="forgot-link"
                disabled
                title="Password recovery is unavailable in the demo environment"
              >
                Forgot password?
              </button>
            </div>
            <div class="input-with-action">
              <input
                id="password"
                [type]="passwordVisible ? 'text' : 'password'"
                formControlName="password"
                class="form-input form-input--with-action"
                placeholder="••••••••••••"
                autocomplete="current-password"
                [class.is-invalid]="passwordControl?.invalid && passwordControl?.touched"
              />
              <button
                type="button"
                class="input-action"
                (click)="togglePasswordVisibility()"
                [attr.aria-label]="passwordVisible ? 'Hide password' : 'Show password'"
                [attr.aria-pressed]="passwordVisible"
                [title]="passwordVisible ? 'Hide password' : 'Show password'"
              >
                <!-- Inline SVG rather than an emoji or icon font: it inherits
                     currentColor for theme parity and is announced by the
                     aria-label above rather than by a decorative glyph. -->
                <svg
                  *ngIf="!passwordVisible"
                  width="18"
                  height="18"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  stroke-width="2"
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  aria-hidden="true"
                  focusable="false"
                >
                  <path d="M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7-10-7-10-7Z" />
                  <circle cx="12" cy="12" r="3" />
                </svg>
                <svg
                  *ngIf="passwordVisible"
                  width="18"
                  height="18"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  stroke-width="2"
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  aria-hidden="true"
                  focusable="false"
                >
                  <path d="M10.7 5.1A9.9 9.9 0 0 1 12 5c6.4 0 10 7 10 7a17.3 17.3 0 0 1-3 4" />
                  <path d="M6.2 6.2A17.3 17.3 0 0 0 2 12s3.6 7 10 7a9.7 9.7 0 0 0 5.1-1.4" />
                  <path d="M9.9 9.9a3 3 0 0 0 4.2 4.2" />
                  <line x1="3" y1="3" x2="21" y2="21" />
                </svg>
              </button>
            </div>
            <div class="error-msg" *ngIf="passwordControl?.invalid && passwordControl?.touched">
              <span *ngIf="passwordControl?.errors?.['required']">Password is required.</span>
              <span *ngIf="passwordControl?.errors?.['minlength']">Password must be at least 6 characters.</span>
            </div>
          </div>

          <div class="form-options">
            <label class="checkbox-label">
              <input type="checkbox" formControlName="rememberMe" />
              <span>Remember this browser session</span>
            </label>
          </div>

          <div class="auth-error-banner" *ngIf="authService.authError() as err" role="alert">
            ⚠️ {{ err }}
          </div>

          <button
            type="submit"
            class="submit-btn"
            [disabled]="loginForm.invalid || authService.isLoading()"
          >
            <span *ngIf="!authService.isLoading()">Sign In to Mission Control</span>
            <span *ngIf="authService.isLoading()" class="spinner">Verifying Session...</span>
          </button>
        </form>

        <div class="auth-footer">
          <p class="security-note">
            <fr-icon name="lock" [size]="13" />
            <span>Simulated Demo Environment • No real calls are placed</span>
          </p>
          <div class="theme-switch-row">
            <span>Theme Mode:</span>
            <button
              type="button"
              class="theme-btn"
              (click)="themeService.toggleTheme()"
            >
              <fr-icon [name]="themeService.currentTheme() === 'dark' ? 'sun' : 'moon'" [size]="15" />
              <span>{{ themeService.currentTheme() === 'dark' ? 'Light Mode' : 'Dark Mode' }}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .auth-page {
      min-height: 100vh;
      display: flex;
      align-items: center;
      justify-content: center;
      background: var(--fr-color-bg);
      padding: var(--fr-space-lg);
    }
    .auth-card {
      width: 100%;
      max-width: 460px;
      background: var(--fr-color-surface);
      border: 1px solid var(--fr-color-border);
      border-radius: var(--fr-radius-xl);
      padding: var(--fr-space-xl);
      box-shadow: var(--fr-shadow-elevated);
      display: flex;
      flex-direction: column;
      gap: var(--fr-space-lg);
    }
    .auth-header {
      text-align: center;
    }
    .brand-badge {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      padding: 4px 12px;
      border-radius: var(--fr-radius-pill);
      background: var(--fr-color-primary-soft);
      color: var(--fr-color-primary-bright);
      font-size: 11px;
      font-weight: 700;
      letter-spacing: 0.8px;
      margin-bottom: var(--fr-space-xs);
    }
    .auth-title {
      font-size: 24px;
      font-weight: 700;
      color: var(--fr-color-text);
      margin-bottom: 6px;
    }
    .auth-subtitle {
      font-size: 13px;
      color: var(--fr-color-muted);
      line-height: 1.4;
    }
    .demo-access-banner {
      background: var(--fr-color-surface2);
      border: 1px solid var(--fr-color-border);
      border-left: 4px solid var(--fr-color-primary);
      padding: var(--fr-space-md);
      border-radius: var(--fr-radius-md);
      display: flex;
      flex-direction: column;
      gap: var(--fr-space-sm);
    }
    .banner-text {
      font-size: 12px;
      color: var(--fr-color-muted);
      line-height: 1.4;
    }
    .demo-btn {
      width: 100%;
      background: var(--fr-color-primary);
      color: var(--fr-color-on-accent);
      border: none;
      padding: 10px 16px;
      border-radius: var(--fr-radius-md);
      font-size: 13px;
      font-weight: 700;
      cursor: pointer;
      transition: background var(--fr-motion-fast);
      display: inline-flex;
      align-items: center;
      justify-content: center;
      gap: 8px;
    }
    .demo-btn:hover:not(:disabled) {
      background: var(--fr-color-primary-bright);
    }
    .divider {
      display: flex;
      align-items: center;
      text-align: center;
      font-size: 10px;
      font-weight: 700;
      color: var(--fr-color-muted);
      letter-spacing: 0.8px;
    }
    .divider::before,
    .divider::after {
      content: '';
      flex: 1;
      border-bottom: 1px solid var(--fr-color-border);
    }
    .divider span {
      padding: 0 10px;
    }
    .auth-form {
      display: flex;
      flex-direction: column;
      gap: var(--fr-space-md);
    }
    .form-group {
      display: flex;
      flex-direction: column;
      gap: 6px;
    }
    .label-row {
      display: flex;
      justify-content: space-between;
      align-items: center;
    }
    .form-label {
      font-size: 12px;
      font-weight: 600;
      color: var(--fr-color-text);
    }
    .input-with-action {
      position: relative;
      display: block;
    }
    /* Reserve room for the toggle so a long value never runs underneath it. */
    .form-input--with-action {
      padding-right: 44px;
    }
    .input-action {
      position: absolute;
      top: 50%;
      right: 6px;
      transform: translateY(-50%);
      display: inline-flex;
      align-items: center;
      justify-content: center;
      /* 32px plus the surrounding field padding keeps the hit area at the 44px
         minimum without visually crowding the input. */
      width: 32px;
      height: 32px;
      padding: 0;
      border: 0;
      border-radius: var(--fr-radius-sm);
      background: transparent;
      color: var(--fr-color-muted);
      cursor: pointer;
      transition: color var(--fr-motion-fast) ease, background var(--fr-motion-fast) ease;
    }
    .input-action:hover {
      color: var(--fr-color-text);
      background: var(--fr-color-surface3);
    }
    .input-action:focus-visible {
      outline: 2px solid var(--fr-color-primary);
      outline-offset: 2px;
      color: var(--fr-color-text);
    }
    .forgot-link {
      padding: 0;
      border: 0;
      background: transparent;
      font-size: 11px;
      color: var(--fr-color-primary-bright);
      text-decoration: none;
      cursor: not-allowed;
      opacity: 0.65;
    }
    .form-input {
      width: 100%;
      background: var(--fr-color-surface3);
      border: 1px solid var(--fr-color-border);
      border-radius: var(--fr-radius-md);
      padding: 10px 14px;
      color: var(--fr-color-text);
      font-size: 13px;
    }
    .form-input.is-invalid {
      border-color: var(--fr-color-danger);
    }
    .error-msg {
      font-size: 11px;
      color: var(--fr-color-danger);
    }
    .form-options {
      display: flex;
      align-items: center;
    }
    .checkbox-label {
      display: flex;
      align-items: center;
      gap: 8px;
      font-size: 12px;
      color: var(--fr-color-muted);
      cursor: pointer;
    }
    .auth-error-banner {
      background: var(--fr-color-danger-soft);
      border: 1px solid var(--fr-color-danger);
      color: var(--fr-color-danger);
      padding: 10px;
      border-radius: var(--fr-radius-md);
      font-size: 12px;
      font-weight: 600;
    }
    .submit-btn {
      width: 100%;
      background: var(--fr-color-surface2);
      border: 1px solid var(--fr-color-border);
      color: var(--fr-color-text);
      padding: 12px;
      border-radius: var(--fr-radius-md);
      font-size: 14px;
      font-weight: 700;
      cursor: pointer;
      transition: all var(--fr-motion-fast);
    }
    .submit-btn:hover:not(:disabled) {
      border-color: var(--fr-color-primary-bright);
      color: var(--fr-color-primary-bright);
    }
    .auth-footer {
      border-top: 1px solid var(--fr-color-border);
      padding-top: var(--fr-space-md);
      text-align: center;
      display: flex;
      flex-direction: column;
      gap: var(--fr-space-xs);
    }
    .security-note {
      font-size: 11px;
      color: var(--fr-color-muted);
      display: inline-flex;
      align-items: center;
      gap: 6px;
      justify-content: center;
    }
    .theme-switch-row {
      display: flex;
      align-items: center;
      justify-content: center;
      gap: var(--fr-space-xs);
      font-size: 11px;
      color: var(--fr-color-muted);
    }
    .theme-btn {
      background: transparent;
      border: none;
      color: var(--fr-color-primary-bright);
      font-weight: 600;
      cursor: pointer;
      display: inline-flex;
      align-items: center;
      gap: 6px;
    }
  `]
})
export class SignInComponent {
  private fb = inject(FormBuilder);
  authService = inject(AuthService);
  themeService = inject(ThemeService);

  loginForm = this.fb.group({
    email: ['ops.demo@fieldrelay.io', [Validators.required, Validators.email]],
    password: ['DemoOps2026!', [Validators.required, Validators.minLength(6)]],
    rememberMe: [true]
  });

  get emailControl() {
    return this.loginForm.get('email');
  }

  // Starts hidden. Revealing is an explicit, per-visit act, so a shared or
  // screen-shared browser never exposes the value by default.
  passwordVisible = false;

  togglePasswordVisibility(): void {
    this.passwordVisible = !this.passwordVisible;
  }

  get passwordControl() {
    return this.loginForm.get('password');
  }

  onQuickDemoSignIn(): void {
    this.authService.signInDemo();
  }

  onSubmit(): void {
    if (this.loginForm.valid) {
      const { email, password, rememberMe } = this.loginForm.value;
      this.authService.signIn(email!, password!, true, Boolean(rememberMe));
    }
  }
}
