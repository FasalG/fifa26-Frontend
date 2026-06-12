import { Component, signal, inject, effect } from '@angular/core';
import { RouterOutlet, RouterLink, RouterLinkActive, Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { AuthService } from './services/auth.service';
import { ChatbotComponent } from './components/chatbot/chatbot.component';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet, RouterLink, RouterLinkActive, CommonModule, ChatbotComponent],
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.css']
})
export class AppComponent {
  authService = inject(AuthService);
  router = inject(Router);

  // Responsive state for mobile navigation drawer
  isSidebarOpen = signal<boolean>(false);
  
  // Theme state
  isLightTheme = signal<boolean>(false);

  constructor() {
    // Load theme from storage
    const savedTheme = localStorage.getItem('fifa_theme');
    if (savedTheme === 'light') {
      this.isLightTheme.set(true);
      document.body.classList.add('light-theme');
    }

    // Reactively watch auth changes to close mobile sidebar on navigation
    effect(() => {
      // Accessing logged in state
      if (!this.authService.isLoggedIn()) {
        this.isSidebarOpen.set(false);
      }
    });
  }

  toggleSidebar() {
    this.isSidebarOpen.update(open => !open);
  }

  closeSidebar() {
    this.isSidebarOpen.set(false);
  }

  toggleTheme() {
    this.isLightTheme.update(light => {
      const newVal = !light;
      if (newVal) {
        document.body.classList.add('light-theme');
        localStorage.setItem('fifa_theme', 'light');
      } else {
        document.body.classList.remove('light-theme');
        localStorage.setItem('fifa_theme', 'dark');
      }
      return newVal;
    });
  }

  logout() {
    this.authService.logout();
    this.closeSidebar();
    this.router.navigate(['/login']);
  }
}
