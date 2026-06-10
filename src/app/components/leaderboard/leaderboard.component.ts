import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { GameService, LeaderboardUser } from '../../services/game.service';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-leaderboard',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './leaderboard.component.html',
  styleUrls: ['./leaderboard.component.css']
})
export class LeaderboardComponent implements OnInit {
  gameService = inject(GameService);
  authService = inject(AuthService);

  leaderboard = signal<LeaderboardUser[]>([]);
  isLoading = signal<boolean>(true);
  errorMessage = signal<string | null>(null);

  ngOnInit() {
    this.loadLeaderboard();
  }

  loadLeaderboard() {
    this.isLoading.set(true);
    this.errorMessage.set(null);
    this.gameService.getLeaderboard().subscribe({
      next: (data) => {
        // Explicitly sort players by totalPoints descending, then by username alphabetically
        const sortedData = [...data].sort((a, b) => {
          const ptsA = a.totalPoints || 0;
          const ptsB = b.totalPoints || 0;
          if (ptsB !== ptsA) {
            return ptsB - ptsA;
          }
          return a.username.localeCompare(b.username);
        });
        this.leaderboard.set(sortedData);
        this.isLoading.set(false);
      },
      error: (err) => {
        console.error(err);
        this.errorMessage.set('Failed to load leaderboard data.');
        this.isLoading.set(false);
      }
    });
  }

  isCurrentUser(user: LeaderboardUser): boolean {
    const current = this.authService.currentUserSignal();
    return current ? current.username === user.username : false;
  }
}
