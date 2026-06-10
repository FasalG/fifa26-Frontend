import { Component, signal, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './login.component.html',
  styleUrls: ['./login.component.css']
})
export class LoginComponent {
  authService = inject(AuthService);
  router = inject(Router);

  // Signalling tab state: 'login' or 'register'
  activeTab = signal<'login' | 'register'>('login');
  
  // Form fields
  username = '';
  email = '';
  password = '';
  role: 'admin' | 'player' = 'admin';
  loginCredential = ''; // Can be username or email

  errorMessage = signal<string | null>(null);
  successMessage = signal<string | null>(null);
  isLoading = signal<boolean>(false);

  constructor() {
    // If already logged in, redirect to their respective dashboard
    if (this.authService.isLoggedIn()) {
      if (this.authService.isAdmin()) {
        this.router.navigate(['/admin']);
      } else {
        this.router.navigate(['/dashboard']);
      }
    }
  }

  setTab(tab: 'login' | 'register') {
    this.activeTab.set(tab);
    this.errorMessage.set(null);
    this.successMessage.set(null);
  }

  onSubmit() {
    this.errorMessage.set(null);
    this.successMessage.set(null);
    this.isLoading.set(true);

    if (this.activeTab() === 'login') {
      if (!this.loginCredential || !this.password) {
        this.errorMessage.set('Please fill in all fields.');
        this.isLoading.set(false);
        return;
      }

      this.authService.login(this.loginCredential, this.password).subscribe({
        next: () => {
          this.isLoading.set(false);
          if (this.authService.isAdmin()) {
            this.router.navigate(['/admin']);
          } else {
            this.router.navigate(['/dashboard']);
          }
        },
        error: (err) => {
          this.isLoading.set(false);
          this.errorMessage.set(err.error?.message || 'Login failed. Please check your credentials.');
        }
      });
    } else {
      if (!this.username || !this.email || !this.password) {
        this.errorMessage.set('Please fill in all fields.');
        this.isLoading.set(false);
        return;
      }

      this.authService.register(this.username, this.email, this.password, this.role).subscribe({
        next: () => {
          this.isLoading.set(false);
          this.successMessage.set('Registration successful! Redirecting...');
          setTimeout(() => {
            if (this.authService.isAdmin()) {
              this.router.navigate(['/admin']);
            } else {
              this.router.navigate(['/dashboard']);
            }
          }, 1500);
        },
        error: (err) => {
          this.isLoading.set(false);
          this.errorMessage.set(err.error?.message || 'Registration failed. Try a different username/email.');
        }
      });
    }
  }
}
