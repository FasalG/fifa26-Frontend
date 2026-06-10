import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from '../services/auth.service';

export const authGuard: CanActivateFn = (route, state) => {
  const authService = inject(AuthService);
  const router = inject(Router);

  if (authService.isLoggedIn()) {
    // If the route has an admin requirement, check if the user is an admin
    if (route.data && route.data['role'] === 'admin' && !authService.isAdmin()) {
      router.navigate(['/dashboard']);
      return false;
    }
    return true;
  }

  // Redirect to login
  router.navigate(['/login']);
  return false;
};
