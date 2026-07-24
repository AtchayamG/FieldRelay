import { Injectable, signal } from '@angular/core';
import { Router } from '@angular/router';

export interface UserSession {
  email: string;
  role: string;
  name: string;
  organization: string;
  isDemo: boolean;
  token: string;
}

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private readonly SESSION_KEY = 'fieldrelay_demo_session';
  readonly currentSession = signal<UserSession | null>(null);
  readonly isLoading = signal<boolean>(false);
  readonly authError = signal<string | null>(null);

  constructor(private router: Router) {
    this.restoreSession();
  }

  private restoreSession(): void {
    const saved =
      sessionStorage.getItem(this.SESSION_KEY) ??
      localStorage.getItem(this.SESSION_KEY);
    if (saved) {
      try {
        const session: UserSession = JSON.parse(saved);
        this.currentSession.set(session);
      } catch {
        localStorage.removeItem(this.SESSION_KEY);
        sessionStorage.removeItem(this.SESSION_KEY);
      }
    }
  }

  signInDemo(): Promise<boolean> {
    return this.signIn('ops.demo@fieldrelay.io', 'DemoOps2026!', true, true);
  }

  async signIn(
    email: string,
    password: string,
    isDemo = false,
    rememberSession = false
  ): Promise<boolean> {
    this.isLoading.set(true);
    this.authError.set(null);

    // Simulate network validation delay
    await new Promise((res) => setTimeout(res, 600));

    if (!email || !password) {
      this.authError.set('Please provide both email and password.');
      this.isLoading.set(false);
      return false;
    }

    if (password.length < 6) {
      this.authError.set('Invalid password credentials.');
      this.isLoading.set(false);
      return false;
    }

    if (email !== 'ops.demo@fieldrelay.io' || password !== 'DemoOps2026!') {
      this.authError.set('Use the evaluator demo credentials shown on this page.');
      this.isLoading.set(false);
      return false;
    }

    const session: UserSession = {
      email,
      role: 'Operations Manager',
      name: isDemo ? 'Demo Ops Manager' : email.split('@')[0],
      organization: 'Apex Property Management',
      isDemo: true, // Always explicitly labeled as demo session in this foundation
      token: 'demo-simulated-jwt-token'
    };

    this.currentSession.set(session);
    const storage = rememberSession ? localStorage : sessionStorage;
    storage.setItem(this.SESSION_KEY, JSON.stringify(session));
    this.isLoading.set(false);
    this.router.navigate(['/mission-control']);
    return true;
  }

  signOut(): void {
    this.currentSession.set(null);
    localStorage.removeItem(this.SESSION_KEY);
    sessionStorage.removeItem(this.SESSION_KEY);
    this.router.navigate(['/auth/sign-in']);
  }

  isAuthenticated(): boolean {
    return this.currentSession() !== null;
  }
}
