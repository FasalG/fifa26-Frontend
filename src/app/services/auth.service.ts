import { Injectable, signal, computed } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable, tap } from 'rxjs';
import { environment } from '../../environments/environment';

export interface User {
  _id: string;
  username: string;
  email: string;
  role: 'admin' | 'player';
  totalPoints: number;
  token?: string;
}

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private apiUrl = `${environment.apiUrl}/auth`;
  
  // Use Angular Signals for reactive state management
  currentUserSignal = signal<User | null>(null);
  
  // Deriving states
  isLoggedIn = computed(() => this.currentUserSignal() !== null);
  isAdmin = computed(() => this.currentUserSignal()?.role === 'admin');

  constructor(private http: HttpClient) {
    this.loadUserFromStorage();
  }

  private loadUserFromStorage() {
    const savedUser = localStorage.getItem('fifa_user');
    if (savedUser) {
      try {
        const user = JSON.parse(savedUser);
        this.currentUserSignal.set(user);
      } catch (e) {
        localStorage.removeItem('fifa_user');
      }
    }
  }

  register(username: string, email: string, password: string, role: 'admin' | 'player' = 'player'): Observable<User> {
    return this.http.post<User>(`${this.apiUrl}/register`, { username, email, password, role }).pipe(
      tap(user => this.handleAuthSuccess(user))
    );
  }

  registerPlayer(username: string, email: string, password: string, adminEmail: string): Observable<User> {
    return this.http.post<User>(`${this.apiUrl}/register-player`, { username, email, password, adminEmail }).pipe(
      tap(user => this.handleAuthSuccess(user))
    );
  }

  login(loginCredential: string, password: string): Observable<User> {
    return this.http.post<User>(`${this.apiUrl}/login`, { loginCredential, password }).pipe(
      tap(user => this.handleAuthSuccess(user))
    );
  }

  private handleAuthSuccess(user: User) {
    if (user && user.token) {
      localStorage.setItem('fifa_user', JSON.stringify(user));
      this.currentUserSignal.set(user);
    }
  }

  logout() {
    localStorage.removeItem('fifa_user');
    this.currentUserSignal.set(null);
  }

  getAuthHeaders(): HttpHeaders {
    const user = this.currentUserSignal();
    if (user && user.token) {
      return new HttpHeaders({
        'Authorization': `Bearer ${user.token}`
      });
    }
    return new HttpHeaders();
  }

  // Helper to refresh user profile details (points) from server
  refreshProfile(): Observable<User> {
    return this.http.get<User>(`${this.apiUrl}/me`, { headers: this.getAuthHeaders() }).pipe(
      tap(updatedUser => {
        const current = this.currentUserSignal();
        if (current && updatedUser) {
          const merged = { ...current, ...updatedUser };
          localStorage.setItem('fifa_user', JSON.stringify(merged));
          this.currentUserSignal.set(merged);
        }
      })
    );
  }
}
