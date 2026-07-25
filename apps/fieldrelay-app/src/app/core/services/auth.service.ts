import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Injectable, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { firstValueFrom } from 'rxjs';

export interface UserSession {
  email: string;
  role: string;
  name: string;
  organization: string;
  isDemo: boolean;
  // Issued and signed by the API. Every API request carries it, and the API
  // refuses any request without it, so this is a real credential rather than a
  // client-side flag the browser could simply set.
  token: string;
  expiresAt: string;
}

// Published on the sign-in screen and in the README on purpose: evaluators must
// be able to get in without being handed a secret out of band.
export const DEMO_CREDENTIALS = {
  email: 'ops.demo@fieldrelay.io',
  password: 'DemoOps2026!'
} as const;

interface SessionApiResponse {
  data: { token: string; expiresAt: string; subject: string; role: string; demo: boolean };
}

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private readonly SESSION_KEY = 'fieldrelay_demo_session';
  readonly currentSession = signal<UserSession | null>(null);
  readonly isLoading = signal<boolean>(false);
  readonly authError = signal<string | null>(null);

  private readonly http = inject(HttpClient);

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
    return this.signIn(DEMO_CREDENTIALS.email, DEMO_CREDENTIALS.password, true, true);
  }

  async signIn(
    email: string,
    password: string,
    isDemo = false,
    rememberSession = false
  ): Promise<boolean> {
    this.isLoading.set(true);
    this.authError.set(null);

    if (!email || !password) {
      this.authError.set('Please provide both email and password.');
      this.isLoading.set(false);
      return false;
    }

    try {
      // The API is the only authority on whether these credentials are valid.
      // The browser cannot mint a session for itself.
      const response = await firstValueFrom(
        this.http.post<SessionApiResponse>('/api/v1/auth/session', { email, password })
      );

      const session: UserSession = {
        email,
        role: 'Operations Manager',
        name: isDemo ? 'Demo Ops Manager' : email.split('@')[0],
        organization: 'Apex Property Management',
        isDemo: response.data.demo,
        token: response.data.token,
        expiresAt: response.data.expiresAt
      };

      this.currentSession.set(session);
      const storage = rememberSession ? localStorage : sessionStorage;
      storage.setItem(this.SESSION_KEY, JSON.stringify(session));
      this.isLoading.set(false);
      this.router.navigate(['/mission-control']);
      return true;
    } catch (error) {
      this.authError.set(
        error instanceof HttpErrorResponse && error.status === 401
          ? 'Use the evaluator demo credentials shown on this page.'
          : 'Could not reach the FieldRelay API. Check that the service is running.'
      );
      this.isLoading.set(false);
      return false;
    }
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
