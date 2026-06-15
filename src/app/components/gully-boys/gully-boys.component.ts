import { Component, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-gully-boys',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './gully-boys.component.html',
  styleUrl: './gully-boys.component.css'
})
export class GullyBoysComponent {
  // Form fields
  username = signal('');
  email = signal('');
  password = signal('');

  // Status flags
  isLoading = signal(false);
  errorMessage = signal<string | null>(null);
  successMessage = signal<string | null>(null);

  constructor(
    private authService: AuthService,
    private router: Router
  ) {}

  onRegister() {
    this.errorMessage.set(null);
    this.successMessage.set(null);

    const u = this.username().trim();
    const e = this.email().trim();
    const p = this.password();

    if (!u || !e || !p) {
      this.errorMessage.set('Please fill out all fields');
      return;
    }

    this.isLoading.set(true);

    // Hardcode the admin email to gully@gmail.com
    this.authService.registerPlayer(u, e, p, 'gully@gmail.com').subscribe({
      next: (user) => {
        this.isLoading.set(false);
        this.successMessage.set('Registration successful! Redirecting...');
        
        // Short delay before navigation
        setTimeout(() => {
          this.router.navigate(['/dashboard']);
        }, 1500);
      },
      error: (err) => {
        this.isLoading.set(false);
        const msg = err.error?.message || 'Registration failed. Please try again.';
        this.errorMessage.set(msg);
      }
    });
  }
}
