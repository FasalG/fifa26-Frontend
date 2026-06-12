import { Component, OnInit, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { GameService, Fixture, Team } from '../../services/game.service';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './dashboard.component.html',
  styleUrls: ['./dashboard.component.css']
})
export class DashboardComponent implements OnInit {
  gameService = inject(GameService);
  authService = inject(AuthService);

  allFixtures = signal<Fixture[]>([]);
  teams = signal<Team[]>([]);
  activeTab = signal<'predictions' | 'all'>('predictions');
  isLoading = signal<boolean>(true);
  errorMessage = signal<string | null>(null);
  successMessage = signal<string | null>(null);

  // Dictionaries to store inline inputs
  predInputsA: { [key: string]: number } = {};
  predInputsB: { [key: string]: number } = {};
  submittingIds: { [key: string]: boolean } = {};

  displayedFixtures = computed(() => {
    const tab = this.activeTab();
    const fixtures = this.allFixtures();
    const now = Date.now();
    const twoDaysInMs = 24 * 60 * 60 * 1000;

    if (tab === 'predictions') {
      // "My Predictions" tab displays:
      // 1. Upcoming matches starting within 48 hours (for prediction entry)
      // 2. Any Live match
      // 3. Completed or locked matches ONLY if they have the user's prediction
      return fixtures.filter(fixture => {
        if (fixture.status === 'Live') {
          return true;
        }
        if (fixture.status === 'Completed') {
          return !!fixture.myPrediction;
        }
        // Upcoming: show if within 48h OR if they have already predicted it
        const matchTime = new Date(fixture.matchTime).getTime();
        const isWithin48Hours = (matchTime - now) <= twoDaysInMs;
        return isWithin48Hours || !!fixture.myPrediction;
      });
    } else {
      // "All Fixtures & Results" tab displays all tournament matches
      return fixtures;
    }
  });

  ngOnInit() {
    this.loadFixtures();
    this.loadTeams();
    // Refresh user profile in background to get updated points
    this.authService.refreshProfile().subscribe({
      error: (err) => console.warn('Could not refresh profile points:', err)
    });
  }

  setActiveTab(tab: 'predictions' | 'all') {
    this.activeTab.set(tab);
  }

  loadTeams() {
    this.gameService.getTeams().subscribe({
      next: (data) => this.teams.set(data),
      error: (err) => console.warn('Could not load teams:', err)
    });
  }

  imageErrors = new Set<string>();

  onImageError(teamName: string) {
    this.imageErrors.add(teamName);
    // Force angular to re-evaluate by creating a new reference if needed, 
    // but Set mutation won't trigger signal natively so we might need a small workaround.
    // Instead of Set, we can use a standard object and mutate it.
  }

  hasValidLogo(teamName: string): boolean {
    if (this.imageErrors.has(teamName)) return false;
    return !!this.getTeamLogo(teamName);
  }

  getTeamLogo(teamName: string): string | null {
    const team = this.teams().find(t => t.name === teamName);
    return team?.logo || null;
  }

  loadFixtures() {
    this.isLoading.set(true);
    this.errorMessage.set(null);
    this.gameService.getFixtures().subscribe({
      next: (data) => {
        this.allFixtures.set(data);
        // Pre-fill local prediction inputs
        data.forEach(fixture => {
          if (fixture.myPrediction) {
            this.predInputsA[fixture._id] = fixture.myPrediction.predScoreA;
            this.predInputsB[fixture._id] = fixture.myPrediction.predScoreB;
          }
        });
        this.isLoading.set(false);
      },
      error: (err) => {
        console.error(err);
        this.errorMessage.set('Failed to load fixtures. Please try again.');
        this.isLoading.set(false);
      }
    });
  }

  submitPrediction(fixture: Fixture) {
    const scoreA = this.predInputsA[fixture._id];
    const scoreB = this.predInputsB[fixture._id];

    if (scoreA === undefined || scoreB === undefined || scoreA === null || scoreB === null || scoreA < 0 || scoreB < 0) {
      this.showTemporaryAlert('Please enter valid, non-negative scores.', 'error');
      return;
    }

    this.submittingIds[fixture._id] = true;
    this.gameService.submitPrediction(fixture._id, scoreA, scoreB).subscribe({
      next: (res) => {
        this.submittingIds[fixture._id] = false;
        this.showTemporaryAlert(res.message, 'success');
        
        // Refresh local data
        this.loadFixtures();
      },
      error: (err) => {
        this.submittingIds[fixture._id] = false;
        this.showTemporaryAlert(err.error?.message || 'Error submitting prediction', 'error');
      }
    });
  }

  private showTemporaryAlert(msg: string, type: 'success' | 'error') {
    if (type === 'success') {
      this.successMessage.set(msg);
      setTimeout(() => this.successMessage.set(null), 3000);
    } else {
      this.errorMessage.set(msg);
      setTimeout(() => this.errorMessage.set(null), 4000);
    }
  }

  // Calculates a readable countdown string till locks (1 hr prior to matchTime)
  getCountdownText(matchTimeStr: string): string {
    const matchTime = new Date(matchTimeStr).getTime();
    const lockTime = matchTime - (60 * 60 * 1000); // 1 hour before
    const now = Date.now();
    const diff = lockTime - now;

    if (diff <= 0) {
      return 'Locked';
    }

    const hours = Math.floor(diff / (1000 * 60 * 60));
    const mins = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));

    if (hours > 24) {
      const days = Math.floor(hours / 24);
      return `Locks in ${days}d ${hours % 24}h`;
    }
    return `Locks in ${hours}h ${mins}m`;
  }
}
