import { Injectable, inject } from '@angular/core';
import { CanActivateFn, Router, UrlTree } from '@angular/router';
import { AuthService } from '../services/auth.service';

@Injectable({ providedIn: 'root' })
export class AuthGuardService {
  constructor(private auth: AuthService, private router: Router) {}

  canActivate(redirectUrl?: string): boolean | UrlTree {
    if (this.auth.isLoggedIn()) {
      return true;
    }
    const tree = this.router.createUrlTree(['/login'], {
      queryParams: redirectUrl ? { redirectUrl } : undefined,
    });
    return tree;
  }
}

export const authGuard: CanActivateFn = (route, state) => {
  const guard = inject(AuthGuardService);
  return guard.canActivate(state.url);
};


