import { Injectable, signal } from '@angular/core';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly storageKey = 'isLoggedIn';
  private readonly usernameKey = 'loggedInUser';

  // Use Angular signals for reactive auth state
  private readonly loggedIn = signal<boolean>(this.readPersistedAuth());
  private readonly currentUser = signal<string | null>(this.readPersistedUser());

  get isLoggedInSignal() {
    return this.loggedIn.asReadonly();
  }

  get currentUserSignal() {
    return this.currentUser.asReadonly();
  }

  isLoggedIn(): boolean {
    return this.loggedIn();
  }

  login(username: string, password: string): boolean {
    // Static check as requested
    const isValid = username === 'admin' && password === '1234';
    if (isValid) {
      this.loggedIn.set(true);
      this.currentUser.set(username);
      localStorage.setItem(this.storageKey, 'true');
      localStorage.setItem(this.usernameKey, username);
    } else {
      this.loggedIn.set(false);
      this.currentUser.set(null);
      localStorage.removeItem(this.storageKey);
      localStorage.removeItem(this.usernameKey);
    }
    return isValid;
  }

  logout(): void {
    this.loggedIn.set(false);
    this.currentUser.set(null);
    localStorage.removeItem(this.storageKey);
    localStorage.removeItem(this.usernameKey);
  }

  private readPersistedAuth(): boolean {
    return localStorage.getItem(this.storageKey) === 'true';
  }

  private readPersistedUser(): string | null {
    return localStorage.getItem(this.usernameKey);
  }
}


