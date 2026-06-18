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

  // States for prediction history accordion
  expandedPlayerId = signal<string | null>(null);
  playerHistories = signal<{ [userId: string]: any[] }>({});
  loadingHistories = signal<{ [userId: string]: boolean }>({});

  ngOnInit() {
    this.loadLeaderboard();
  }

  togglePlayerHistory(userId: string) {
    if (this.expandedPlayerId() === userId) {
      this.expandedPlayerId.set(null);
    } else {
      this.expandedPlayerId.set(userId);
      // Fetch if not already cached
      if (!this.playerHistories()[userId]) {
        this.loadingHistories.update(prev => ({ ...prev, [userId]: true }));
        this.gameService.getPlayerPredictionsHistory(userId).subscribe({
          next: (history) => {
            this.playerHistories.update(prev => ({ ...prev, [userId]: history }));
            this.loadingHistories.update(prev => ({ ...prev, [userId]: false }));
          },
          error: (err) => {
            console.error('Error fetching player prediction history:', err);
            this.loadingHistories.update(prev => ({ ...prev, [userId]: false }));
          }
        });
      }
    }
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

        let currentRank = 0;
        let lastPoints = -1;
        const rankedData = sortedData.map((user, index) => {
          const userPoints = user.totalPoints || 0;
          if (index === 0 || userPoints !== lastPoints) {
            currentRank++;
          }
          lastPoints = userPoints;
          return {
            ...user,
            rank: currentRank
          };
        });

        this.leaderboard.set(rankedData);
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
