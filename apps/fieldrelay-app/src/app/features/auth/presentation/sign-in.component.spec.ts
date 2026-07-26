import { describe, it, expect, beforeEach, vi } from 'vitest';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { signal } from '@angular/core';
import { SignInComponent } from './sign-in.component';
import { AuthService } from '../../../core/services/auth.service';
import { ThemeService, ThemeMode } from '../../../core/services/theme.service';
import { Router } from '@angular/router';

describe('SignInComponent', () => {
  let component: SignInComponent;
  let fixture: ComponentFixture<SignInComponent>;
  let mockAuthService: Partial<AuthService>;
  let mockThemeService: Partial<ThemeService>;
  let mockRouter: Partial<Router>;

  beforeEach(async () => {
    mockAuthService = {
      signInDemo: vi.fn(),
      signIn: vi.fn(),
      isLoading: signal(false),
      authError: signal<string | null>(null)
    };
    mockThemeService = {
      currentTheme: signal<ThemeMode>('dark'),
      toggleTheme: vi.fn()
    };
    mockRouter = {
      navigate: vi.fn()
    };

    await TestBed.configureTestingModule({
      imports: [SignInComponent],
      providers: [
        { provide: AuthService, useValue: mockAuthService },
        { provide: ThemeService, useValue: mockThemeService },
        { provide: Router, useValue: mockRouter }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(SignInComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('renders sign in form with pre-filled demo email', () => {
    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.querySelector('.auth-title')?.textContent).toContain('Secure Sign In');
    expect(component.emailControl?.value).toBe('ops.demo@fieldrelay.io');
  });

  it('triggers quick demo sign in when button clicked', () => {
    component.onQuickDemoSignIn();
    expect(mockAuthService.signInDemo).toHaveBeenCalled();
  });

  it('submits form with valid input', () => {
    component.onSubmit();
    expect(mockAuthService.signIn).toHaveBeenCalledWith(
      'ops.demo@fieldrelay.io',
      'DemoOps2026!',
      true,
      true
    );
  });

  describe('password visibility toggle', () => {
    const passwordInput = () =>
      (fixture.nativeElement as HTMLElement).querySelector<HTMLInputElement>('#password');
    const toggle = () =>
      (fixture.nativeElement as HTMLElement).querySelector<HTMLButtonElement>('.input-action');

    it('masks the password until the toggle is used', () => {
      expect(component.passwordVisible).toBe(false);
      expect(passwordInput()?.type).toBe('password');
    });

    it('reveals and re-masks the value on click', () => {
      toggle()?.click();
      fixture.detectChanges();
      expect(passwordInput()?.type).toBe('text');

      toggle()?.click();
      fixture.detectChanges();
      expect(passwordInput()?.type).toBe('password');
    });

    it('describes its current action to assistive technology', () => {
      expect(toggle()?.getAttribute('aria-label')).toBe('Show password');
      expect(toggle()?.getAttribute('aria-pressed')).toBe('false');

      toggle()?.click();
      fixture.detectChanges();

      expect(toggle()?.getAttribute('aria-label')).toBe('Hide password');
      expect(toggle()?.getAttribute('aria-pressed')).toBe('true');
    });

    it('does not submit the form when toggling', () => {
      // A button inside a form defaults to type="submit"; without the explicit
      // type this click would attempt a sign-in.
      expect(toggle()?.getAttribute('type')).toBe('button');
      toggle()?.click();
      expect(mockAuthService.signIn).not.toHaveBeenCalled();
    });

    it('keeps the typed value intact across a reveal', () => {
      component.passwordControl?.setValue('SomeOtherValue1!');
      fixture.detectChanges();
      toggle()?.click();
      fixture.detectChanges();
      expect(passwordInput()?.value).toBe('SomeOtherValue1!');
    });
  });
});
