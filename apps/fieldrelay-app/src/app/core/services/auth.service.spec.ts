import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { AuthService, DEMO_CREDENTIALS } from './auth.service';

const SESSION_URL = '/api/v1/auth/session';

// The API is now the only authority on whether a session exists, so these tests
// assert what the service sends, what it stores, and how it behaves when the
// API refuses — not a client-side password check, which no longer exists.
describe('AuthService', () => {
  let service: AuthService;
  let http: HttpTestingController;
  let navigate: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    localStorage.clear();
    sessionStorage.clear();
    navigate = vi.fn();

    TestBed.configureTestingModule({
      providers: [
        AuthService,
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: Router, useValue: { navigate } }
      ]
    });

    service = TestBed.inject(AuthService);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    http.verify();
  });

  function respondWithSession(token = 'v1.payload.signature'): void {
    const request = http.expectOne(SESSION_URL);
    expect(request.request.method).toBe('POST');
    request.flush({
      data: {
        token,
        expiresAt: '2026-07-26T12:00:00.000Z',
        subject: DEMO_CREDENTIALS.email,
        role: 'operator',
        demo: true
      }
    });
  }

  it('exchanges the published demo credentials for an API-issued session', async () => {
    const pending = service.signInDemo();
    const request = http.expectOne(SESSION_URL);
    expect(request.request.body).toEqual({
      email: DEMO_CREDENTIALS.email,
      password: DEMO_CREDENTIALS.password
    });
    request.flush({
      data: {
        token: 'v1.real.token',
        expiresAt: '2026-07-26T12:00:00.000Z',
        subject: DEMO_CREDENTIALS.email,
        role: 'operator',
        demo: true
      }
    });

    expect(await pending).toBe(true);
    expect(service.isAuthenticated()).toBe(true);
    // The token is the API's, not a placeholder the browser invented.
    expect(service.currentSession()?.token).toBe('v1.real.token');
    expect(service.currentSession()?.isDemo).toBe(true);
    expect(navigate).toHaveBeenCalledWith(['/mission-control']);
  });

  it('surfaces a refusal from the API rather than deciding locally', async () => {
    const pending = service.signIn('user@test.com', 'long-enough-password');
    http.expectOne(SESSION_URL).flush(
      { error: { code: 'NOT_AUTHORIZED', message: 'Invalid credentials' } },
      { status: 401, statusText: 'Unauthorized' }
    );

    expect(await pending).toBe(false);
    expect(service.authError()).toContain('evaluator demo credentials');
    expect(service.isAuthenticated()).toBe(false);
  });

  it('distinguishes an unreachable API from a rejected credential', async () => {
    const pending = service.signIn(DEMO_CREDENTIALS.email, DEMO_CREDENTIALS.password);
    http.expectOne(SESSION_URL).flush('', { status: 0, statusText: 'Unknown Error' });

    expect(await pending).toBe(false);
    expect(service.authError()).toContain('Could not reach');
  });

  it('never calls the API with an empty field', async () => {
    expect(await service.signIn('', '')).toBe(false);
    expect(service.authError()).toContain('both email and password');
    http.expectNone(SESSION_URL);
  });

  it('clears the stored session on sign out', async () => {
    const pending = service.signInDemo();
    respondWithSession();
    await pending;

    service.signOut();

    expect(service.isAuthenticated()).toBe(false);
    expect(localStorage.getItem('fieldrelay_demo_session')).toBeNull();
    expect(sessionStorage.getItem('fieldrelay_demo_session')).toBeNull();
    expect(navigate).toHaveBeenCalledWith(['/auth/sign-in']);
  });
});
