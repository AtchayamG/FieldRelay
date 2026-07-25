import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { catchError, throwError } from 'rxjs';
import { AuthService } from '../services/auth.service';

// Attaches the API session token to every same-origin API call, so no feature
// adapter has to remember to. Requests to anything other than the API are left
// alone, which keeps the token off third-party hosts.
export const sessionInterceptor: HttpInterceptorFn = (request, next) => {
  const auth = inject(AuthService);
  const isApiCall = request.url.startsWith('/api/');
  const token = auth.currentSession()?.token;

  const outbound =
    isApiCall && token
      ? request.clone({ setHeaders: { Authorization: `Bearer ${token}` } })
      : request;

  return next(outbound).pipe(
    catchError((error: unknown) => {
      // A rejected session means the stored token is expired or invalid. Clear
      // it and return to sign-in rather than leaving the user clicking through
      // a shell whose every request will fail.
      if (isApiCall && error instanceof HttpErrorResponse && error.status === 401) {
        auth.signOut();
      }
      return throwError(() => error);
    })
  );
};
