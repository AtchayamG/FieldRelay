import { describe, it, expect, beforeEach, vi } from 'vitest';
import { AuthService } from './auth.service';
import { Router } from '@angular/router';

describe('AuthService', () => {
  let service: AuthService;
  let mockRouter: Partial<Router>;

  beforeEach(() => {
    localStorage.clear();
    mockRouter = {
      navigate: vi.fn()
    };
    service = new AuthService(mockRouter as Router);
  });

  it('validates credentials and establishes demo session', async () => {
    const success = await service.signInDemo();
    expect(success).toBe(true);
    expect(service.isAuthenticated()).toBe(true);
    expect(service.currentSession()?.isDemo).toBe(true);
    expect(mockRouter.navigate).toHaveBeenCalledWith(['/mission-control']);
  });

  it('fails with short password', async () => {
    const success = await service.signIn('user@test.com', '123');
    expect(success).toBe(false);
    expect(service.authError()).toBe('Invalid password credentials.');
    expect(service.isAuthenticated()).toBe(false);
  });

  it('rejects non-demo credentials', async () => {
    const success = await service.signIn('user@test.com', 'long-enough-password');
    expect(success).toBe(false);
    expect(service.authError()).toContain('evaluator demo credentials');
    expect(service.isAuthenticated()).toBe(false);
  });

  it('clears session on sign out', async () => {
    await service.signInDemo();
    service.signOut();
    expect(service.isAuthenticated()).toBe(false);
    expect(mockRouter.navigate).toHaveBeenCalledWith(['/auth/sign-in']);
  });
});
