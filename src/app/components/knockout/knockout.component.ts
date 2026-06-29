import { Component, OnInit, inject, signal, computed, ElementRef, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { GameService, Fixture, Team, Prediction } from '../../services/game.service';
import { AuthService } from '../../services/auth.service';

interface KnockoutRound {
  name: string;
  fixtures: Fixture[];
}

@Component({
  selector: 'app-knockout',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="knockout-container animate-fade">
      <!-- Page Header -->
      <div class="page-header">
        <div class="header-main">
          <h1>Knockout Stage</h1>
          <p class="subtitle">Predict the matches and track the road to the Final 🏆</p>
        </div>
        <div class="header-actions">
          <button *ngIf="authService.isAdmin()" (click)="generateKnockoutFixtures()" class="btn btn-accent" [disabled]="isGenerating()">
            ⚡ {{ isGenerating() ? 'Syncing...' : 'Autogenerate Knockout Stage' }}
          </button>
          <button (click)="loadData()" class="btn btn-secondary">
            🔄 Refresh Bracket
          </button>
        </div>
      </div>

      <!-- Messages -->
      <div *ngIf="errorMessage()" class="alert alert-danger">
        <span>⚠️ {{ errorMessage() }}</span>
      </div>
      <div *ngIf="successMessage()" class="alert alert-success">
        <span>✅ {{ successMessage() }}</span>
      </div>

      <!-- Quick Rules Banner -->
      <div class="rules-banner glass-panel">
        <span class="info-icon">💡</span>
        <div class="rules-content">
          <h4>Knockout Prediction Rules</h4>
          <p>
            • <strong>30 points</strong> for exact full-time score (tie predictions do not need correct penalty scores). <br>
            • <strong>60 points</strong> if the match ends in a draw and you predict the exact full-time score AND correct penalty shootout score. <br>
            • <strong>10 points</strong> for predicting the correct outcome (based on full-time score) if the exact score is incorrect. <br>
            • Predictions unlock exactly <strong>24 hours</strong> before kickoff and lock <strong>1 hour</strong> prior to kickoff.
          </p>
        </div>
      </div>

      <!-- Bracket Navigation Slider Bar (matches layout from user images) -->
      <div class="bracket-nav-bar glass-panel">
        <button class="nav-arrow" (click)="slideLeft()" [disabled]="activeRoundIndex() === 0">
          &lt;
        </button>
        
        <div class="nav-rounds-container">
          <div 
            *ngFor="let roundName of roundNames; let idx = index" 
            class="nav-round-item" 
            [class.active]="idx === activeRoundIndex()"
            (click)="selectRound(idx)">
            {{ roundName }}
          </div>
        </div>

        <button class="nav-arrow" (click)="slideRight()" [disabled]="activeRoundIndex() === roundNames.length - 1">
          &gt;
        </button>
      </div>

      <!-- Loading State -->
      <div *ngIf="isLoading()" class="loader-container glass-panel">
        <div class="loader"></div>
        <p>Loading tournament bracket...</p>
      </div>

      <!-- Main Bracket Viewer -->
      <div *ngIf="!isLoading()" class="bracket-wrapper" #bracketContainer>
        <div class="rounds-track" [style.transform]="getTrackTransform()">
          
          <!-- Loop through Knockout Rounds -->
          <div 
            *ngFor="let round of knockoutRounds(); let rIdx = index" 
            class="round-column"
            [class.active-column]="rIdx === activeRoundIndex()">
            
            <div class="round-header-mobile">
              <h3>{{ round.name }}</h3>
            </div>

            <div class="fixtures-list">
              <div 
                *ngFor="let match of round.fixtures; let mIdx = index" 
                class="match-card-wrapper"
                [attr.data-match-number]="match.matchNumber">
                
                <div class="fixture-card glass-panel" 
                  [class.completed]="match.status === 'Completed'" 
                  [class.live]="match.status === 'Live'"
                  [class.unlocked]="!match.isLocked && match.status === 'Upcoming'">
                  
                  <!-- Match Header Info -->
                  <div class="card-header">
                    <span class="match-num">Match #{{ match.matchNumber }}</span>
                    <span class="status-badge" 
                      [class.badge-upcoming]="match.status === 'Upcoming' && !match.isLocked" 
                      [class.badge-locked]="match.status === 'Upcoming' && match.isLocked" 
                      [class.badge-live]="match.status === 'Live'" 
                      [class.badge-completed]="match.status === 'Completed'">
                      {{ match.status === 'Completed' ? 'Completed' : (match.status === 'Live' ? 'LIVE' : (match.isLocked ? 'Locked' : 'Open')) }}
                    </span>
                  </div>

                  <!-- Date/Time of Kickoff -->
                  <div class="match-time">
                    📅 {{ match.matchTime | date:'EEE, d MMM, h:mm a':'+05:30' }} (IST)
                  </div>

                  <!-- Match main team content -->
                  <div class="match-teams">
                    <!-- Team A -->
                    <div class="team-row" [class.winner-row]="match.status === 'Completed' && match.winner === 'A'">
                      <div class="team-info">
                        <img *ngIf="hasValidLogo(match.teamA)" [src]="'assets/' + getTeamLogo(match.teamA)" class="team-logo" alt="logo" (error)="onImageError(match.teamA)">
                        <span *ngIf="!hasValidLogo(match.teamA)" class="flag-placeholder">{{ match.teamA.substring(0, 3).toUpperCase() }}</span>
                        <span class="team-name">{{ match.teamA }}</span>
                      </div>
                      
                      <div class="scores-display">
                        <span class="score-main" *ngIf="match.status !== 'Upcoming'">{{ match.scoreA }}</span>
                        <span class="score-penalty" *ngIf="match.status === 'Completed' && match.penaltyScoreA !== null && match.penaltyScoreA !== undefined">
                          ({{ match.penaltyScoreA }})
                        </span>
                      </div>
                    </div>

                    <!-- Team B -->
                    <div class="team-row" [class.winner-row]="match.status === 'Completed' && match.winner === 'B'">
                      <div class="team-info">
                        <img *ngIf="hasValidLogo(match.teamB)" [src]="'assets/' + getTeamLogo(match.teamB)" class="team-logo" alt="logo" (error)="onImageError(match.teamB)">
                        <span *ngIf="!hasValidLogo(match.teamB)" class="flag-placeholder">{{ match.teamB.substring(0, 3).toUpperCase() }}</span>
                        <span class="team-name">{{ match.teamB }}</span>
                      </div>
                      
                      <div class="scores-display">
                        <span class="score-main" *ngIf="match.status !== 'Upcoming'">{{ match.scoreB }}</span>
                        <span class="score-penalty" *ngIf="match.status === 'Completed' && match.penaltyScoreB !== null && match.penaltyScoreB !== undefined">
                          ({{ match.penaltyScoreB }})
                        </span>
                      </div>
                    </div>
                  </div>

                  <!-- Venue -->
                  <div class="match-venue" *ngIf="match.venue">
                    📍 {{ match.venue }}
                  </div>

                  <!-- Prediction Info for Players -->
                  <div class="prediction-area">
                    <!-- CASE 1: MATCH IS COMPLETED -->
                    <div *ngIf="match.status === 'Completed'" class="pred-summary completed-pred">
                      <div class="pred-label-row">
                        <span class="lbl">Predicted:</span>
                        <strong class="val" *ngIf="match.myPrediction">
                          {{ match.myPrediction.predScoreA }} - {{ match.myPrediction.predScoreB }}
                          <span class="pen-val" *ngIf="match.myPrediction.predPenaltyScoreA !== null && match.myPrediction.predPenaltyScoreA !== undefined">
                            (Pen: {{ match.myPrediction.predPenaltyScoreA }} - {{ match.myPrediction.predPenaltyScoreB }})
                          </span>
                        </strong>
                        <strong class="val empty" *ngIf="!match.myPrediction">None</strong>
                      </div>
                      <div class="points-row">
                        <span class="points-badge" [class.exact]="match.myPrediction?.pointsEarned === 60 || match.myPrediction?.pointsEarned === 30" [class.outcome]="match.myPrediction?.pointsEarned === 10" [class.incorrect]="!match.myPrediction || match.myPrediction?.pointsEarned === 0">
                          {{ match.myPrediction ? '+' + match.myPrediction.pointsEarned : '+0' }} PTS
                        </span>
                        <span class="points-text">
                          {{ getPointsReason(match.myPrediction?.pointsEarned) }}
                        </span>
                      </div>
                    </div>

                    <!-- CASE 2: MATCH IS LIVE OR LOCKED (Upcoming but locked) -->
                    <div *ngIf="match.status === 'Live' || (match.status === 'Upcoming' && match.isLocked)" class="pred-summary locked-pred">
                      <span class="lbl">🔐 Locked Prediction:</span>
                      <strong class="val" *ngIf="match.myPrediction">
                        {{ match.myPrediction.predScoreA }} - {{ match.myPrediction.predScoreB }}
                        <span class="pen-val" *ngIf="match.myPrediction.predPenaltyScoreA !== null && match.myPrediction.predPenaltyScoreA !== undefined">
                          (Pen: {{ match.myPrediction.predPenaltyScoreA }} - {{ match.myPrediction.predPenaltyScoreB }})
                        </span>
                      </strong>
                      <strong class="val empty" *ngIf="!match.myPrediction">No prediction</strong>
                    </div>

                    <!-- CASE 3: MATCH IS UNLOCKED & ACTIVE FOR PREDICTION -->
                    <div *ngIf="match.status === 'Upcoming' && !match.isLocked" class="pred-entry">
                      <button (click)="openPredictionForm(match)" class="btn btn-primary btn-block btn-sm">
                        {{ match.myPrediction ? '✏️ Edit Prediction' : '🎯 Submit Prediction' }}
                      </button>
                    </div>
                  </div>

                </div>
              </div>
            </div>

          </div>

        </div>
      </div>
    </div>

    <!-- Prediction Modal -->
    <div class="modal-overlay" *ngIf="selectedFixture()">
      <div class="modal-content glass-panel animate-fade">
        <div class="modal-header">
          <h3>Predict Match #{{ selectedFixture()?.matchNumber }}</h3>
          <button class="close-modal" (click)="closePredictionForm()">&times;</button>
        </div>
        
        <div class="modal-teams-header">
          <span class="team">{{ selectedFixture()?.teamA }}</span>
          <span class="vs">VS</span>
          <span class="team">{{ selectedFixture()?.teamB }}</span>
        </div>

        <div class="prediction-form-body">
          <!-- Full Time Scores -->
          <label class="section-label">Full-Time Scores</label>
          <div class="score-inputs-row">
            <div class="input-container">
              <span class="team-name-short">{{ selectedFixture()?.teamA?.substring(0,3)?.toUpperCase() }}</span>
              <input type="number" min="0" [(ngModel)]="modalScoreA" class="form-control score-box" placeholder="0">
            </div>
            <span class="colon">:</span>
            <div class="input-container">
              <input type="number" min="0" [(ngModel)]="modalScoreB" class="form-control score-box" placeholder="0">
              <span class="team-name-short">{{ selectedFixture()?.teamB?.substring(0,3)?.toUpperCase() }}</span>
            </div>
          </div>

          <!-- Penalty Shootout Scores (Only shown if modalScoreA !== null && modalScoreB !== null && modalScoreA === modalScoreB) -->
          <div class="penalties-section animate-fade" *ngIf="modalScoreA !== null && modalScoreB !== null && modalScoreA === modalScoreB">
            <label class="section-label penalty-label">✨ Match Tie! Predict Penalty Shootout Score</label>
            <div class="score-inputs-row penalty-inputs">
              <div class="input-container">
                <span class="sub-label">Pen A</span>
                <input type="number" min="0" [(ngModel)]="modalPenaltyScoreA" class="form-control score-box pen-box" placeholder="0">
              </div>
              <span class="colon">-</span>
              <div class="input-container">
                <input type="number" min="0" [(ngModel)]="modalPenaltyScoreB" class="form-control score-box pen-box" placeholder="0">
                <span class="sub-label">Pen B</span>
              </div>
            </div>
            <p class="penalty-hint">Note: Penalty shootout cannot end in a draw. One team must win.</p>
          </div>

          <!-- Error message inside modal -->
          <div class="modal-error" *ngIf="modalError()">
            ⚠️ {{ modalError() }}
          </div>

          <div class="modal-footer">
            <button class="btn btn-secondary" (click)="closePredictionForm()">Cancel</button>
            <button class="btn btn-accent" (click)="submitPrediction()" [disabled]="isSaving()">
              {{ isSaving() ? 'Saving...' : 'Save Prediction' }}
            </button>
          </div>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .knockout-container {
      padding: 24px;
      max-width: 1350px;
      margin: 0 auto;
    }
    .page-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 24px;
      gap: 16px;
      flex-wrap: wrap;
    }
    .page-header h1 {
      font-size: 2rem;
      font-weight: 800;
      background: linear-gradient(135deg, var(--text-primary) 30%, var(--primary) 100%);
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
      margin: 0 0 6px;
    }
    .subtitle {
      color: var(--text-muted);
      font-size: 0.95rem;
      margin: 0;
    }
    .header-actions {
      display: flex;
      gap: 12px;
    }
    .rules-banner {
      display: flex;
      gap: 16px;
      background: rgba(99, 102, 241, 0.05);
      border-color: rgba(99, 102, 241, 0.2);
      border-radius: var(--border-radius-lg);
      padding: 16px 20px;
      margin-bottom: 24px;
      align-items: flex-start;
    }
    .info-icon {
      font-size: 1.5rem;
      line-height: 1;
    }
    .rules-content h4 {
      margin: 0 0 4px 0;
      font-size: 1rem;
      color: var(--text-primary);
    }
    .rules-content p {
      margin: 0;
      font-size: 0.85rem;
      color: var(--text-secondary);
      line-height: 1.5;
    }

    /* Slider Nav Bar */
    .bracket-nav-bar {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 12px 20px;
      margin-bottom: 24px;
      background-color: var(--bg-secondary);
      border-radius: var(--border-radius-lg);
    }
    .nav-arrow {
      background: var(--bg-surface);
      border: 1px solid var(--border-color);
      color: var(--text-primary);
      width: 36px;
      height: 36px;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      cursor: pointer;
      font-weight: bold;
      transition: var(--transition);
    }
    .nav-arrow:hover:not(:disabled) {
      background-color: var(--bg-surface-hover);
      color: var(--primary);
    }
    .nav-arrow:disabled {
      opacity: 0.3;
      cursor: not-allowed;
    }
    .nav-rounds-container {
      display: flex;
      gap: 16px;
      overflow-x: auto;
      flex-grow: 1;
      justify-content: space-evenly;
      padding: 0 10px;
      scroll-behavior: smooth;
    }
    .nav-rounds-container::-webkit-scrollbar {
      display: none; /* Hide scrollbar for rounds selector */
    }
    .nav-round-item {
      padding: 8px 16px;
      font-size: 0.9rem;
      font-weight: 600;
      color: var(--text-secondary);
      cursor: pointer;
      border-radius: var(--border-radius-md);
      transition: var(--transition);
      white-space: nowrap;
    }
    .nav-round-item:hover {
      color: var(--text-primary);
      background-color: var(--bg-surface);
    }
    .nav-round-item.active {
      color: var(--text-primary);
      background-color: var(--primary);
      box-shadow: 0 0 10px var(--primary-glow);
    }

    /* Main Bracket Viewport */
    .bracket-wrapper {
      width: 100%;
      overflow: hidden; /* Hide horizontal scrollbar to use CSS translate slider */
      position: relative;
    }
    .rounds-track {
      display: flex;
      transition: transform 0.4s cubic-bezier(0.25, 0.8, 0.25, 1);
      width: 100%;
    }
    .round-column {
      width: 100%;
      padding: 0 12px;
      flex-shrink: 0;
    }
    .round-header-mobile {
      text-align: center;
      margin-bottom: 16px;
      border-bottom: 2px solid var(--border-color);
      padding-bottom: 8px;
    }
    .round-header-mobile h3 {
      font-size: 1.15rem;
      color: var(--text-primary);
      margin: 0;
    }
    .fixtures-list {
      display: flex;
      flex-direction: column;
      gap: 16px;
      align-items: center;
    }
    .match-card-wrapper {
      width: 100%;
      max-width: 320px;
    }
    
    /* Fixture Card Styles */
    .fixture-card {
      background-color: var(--bg-secondary);
      border: 1px solid var(--border-color);
      border-radius: var(--border-radius-md);
      padding: 16px;
      transition: var(--transition);
      position: relative;
    }
    .fixture-card.unlocked {
      border-color: rgba(16, 185, 129, 0.4);
      box-shadow: 0 0 12px rgba(16, 185, 129, 0.05);
    }
    .fixture-card.completed {
      opacity: 0.85;
    }
    .fixture-card.live {
      border-color: var(--danger);
      box-shadow: 0 0 12px rgba(239, 68, 68, 0.1);
    }
    .card-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 8px;
    }
    .match-num {
      font-size: 0.75rem;
      font-weight: 700;
      color: var(--text-muted);
      text-transform: uppercase;
    }
    .status-badge {
      font-size: 0.7rem;
      font-weight: 700;
      padding: 2px 6px;
      border-radius: 4px;
      text-transform: uppercase;
    }
    .badge-upcoming {
      background-color: rgba(16, 185, 129, 0.15);
      color: var(--accent);
    }
    .badge-locked {
      background-color: rgba(107, 114, 128, 0.15);
      color: var(--text-secondary);
    }
    .badge-live {
      background-color: rgba(239, 68, 68, 0.15);
      color: var(--danger);
      animation: pulse 1.5s infinite alternate;
    }
    .badge-completed {
      background-color: rgba(99, 102, 241, 0.15);
      color: var(--primary);
    }
    @keyframes pulse {
      from { opacity: 0.6; }
      to { opacity: 1; }
    }
    .match-time {
      font-size: 0.78rem;
      color: var(--text-secondary);
      margin-bottom: 12px;
      font-weight: 500;
    }
    .match-teams {
      display: flex;
      flex-direction: column;
      gap: 10px;
      margin-bottom: 12px;
    }
    .team-row {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 4px 0;
    }
    .team-info {
      display: flex;
      align-items: center;
      gap: 10px;
    }
    .team-logo {
      width: 20px;
      height: 20px;
      object-fit: cover;
      border-radius: 2px;
    }
    .flag-placeholder {
      font-size: 0.6rem;
      font-weight: 700;
      color: var(--text-muted);
      background-color: var(--bg-primary);
      padding: 2px 4px;
      border-radius: 2px;
      border: 1px solid var(--border-color);
    }
    .team-name {
      font-size: 0.88rem;
      font-weight: 500;
      color: var(--text-primary);
    }
    .winner-row .team-name {
      font-weight: 700;
      color: #ffffff;
    }
    .scores-display {
      display: flex;
      align-items: center;
      gap: 6px;
    }
    .score-main {
      font-size: 0.95rem;
      font-weight: 700;
      color: var(--text-primary);
      width: 16px;
      text-align: right;
    }
    .winner-row .score-main {
      color: var(--accent);
    }
    .score-penalty {
      font-size: 0.75rem;
      color: var(--text-muted);
      font-weight: 500;
    }
    .winner-row .score-penalty {
      color: var(--accent);
    }
    .match-venue {
      font-size: 0.72rem;
      color: var(--text-muted);
      border-top: 1px solid var(--border-color);
      padding-top: 8px;
      margin-bottom: 10px;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }

    /* Predictions UI */
    .prediction-area {
      border-top: 1px solid var(--border-color);
      padding-top: 12px;
      margin-top: 4px;
    }
    .pred-summary {
      font-size: 0.8rem;
    }
    .pred-label-row {
      display: flex;
      justify-content: space-between;
      margin-bottom: 6px;
    }
    .pred-summary .lbl {
      color: var(--text-secondary);
    }
    .pred-summary .val {
      color: var(--text-primary);
    }
    .pred-summary .pen-val {
      font-size: 0.75rem;
      color: var(--text-muted);
    }
    .points-row {
      display: flex;
      align-items: center;
      gap: 8px;
      margin-top: 4px;
    }
    .points-badge {
      font-size: 0.72rem;
      font-weight: 800;
      padding: 2px 6px;
      border-radius: 4px;
      color: white;
    }
    .points-badge.exact {
      background-color: var(--accent);
      box-shadow: 0 0 6px var(--accent-glow);
    }
    .points-badge.outcome {
      background-color: var(--primary);
      box-shadow: 0 0 6px var(--primary-glow);
    }
    .points-badge.incorrect {
      background-color: var(--danger);
      opacity: 0.8;
    }
    .points-text {
      font-size: 0.72rem;
      color: var(--text-muted);
    }
    .locked-pred {
      display: flex;
      flex-direction: column;
      gap: 4px;
      background-color: var(--bg-primary);
      padding: 8px;
      border-radius: var(--border-radius-sm);
      border: 1px dashed var(--border-color);
    }
    .btn-block {
      width: 100%;
    }
    .btn-sm {
      padding: 6px 12px;
      font-size: 0.8rem;
      border-radius: var(--border-radius-sm);
    }

    /* Modal Styles */
    .modal-overlay {
      position: fixed;
      top: 0;
      left: 0;
      width: 100vw;
      height: 100vh;
      background: rgba(0, 0, 0, 0.75);
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 1000;
      padding: 16px;
      backdrop-filter: blur(4px);
    }
    .modal-content {
      background-color: var(--bg-secondary);
      border: 1px solid var(--border-color);
      border-radius: var(--border-radius-lg);
      width: 100%;
      max-width: 420px;
      padding: 24px;
      position: relative;
    }
    .modal-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 20px;
    }
    .modal-header h3 {
      font-size: 1.25rem;
      margin: 0;
      color: var(--text-primary);
    }
    .close-modal {
      background: none;
      border: none;
      font-size: 1.5rem;
      color: var(--text-muted);
      cursor: pointer;
      line-height: 1;
    }
    .close-modal:hover {
      color: var(--text-primary);
    }
    .modal-teams-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      font-weight: 750;
      font-size: 1.05rem;
      color: #ffffff;
      background: var(--bg-primary);
      padding: 10px 16px;
      border-radius: var(--border-radius-md);
      margin-bottom: 20px;
      border: 1px solid var(--border-color);
    }
    .modal-teams-header .team {
      width: 42%;
      text-align: center;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }
    .modal-teams-header .vs {
      color: var(--primary);
      font-size: 0.8rem;
    }
    .section-label {
      display: block;
      font-size: 0.75rem;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.05em;
      color: var(--text-secondary);
      margin-bottom: 8px;
    }
    .score-inputs-row {
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 16px;
      margin-bottom: 20px;
    }
    .input-container {
      display: flex;
      align-items: center;
      gap: 8px;
    }
    .team-name-short {
      font-size: 0.85rem;
      font-weight: 700;
      color: var(--text-muted);
      width: 32px;
    }
    .score-box {
      width: 60px;
      height: 48px;
      text-align: center;
      font-size: 1.25rem;
      font-weight: 700;
      padding: 0;
      border-radius: var(--border-radius-md);
    }
    .colon {
      font-size: 1.5rem;
      font-weight: 700;
      color: var(--text-muted);
    }
    .penalties-section {
      background: rgba(245, 158, 11, 0.05);
      border: 1px dashed var(--warning);
      border-radius: var(--border-radius-md);
      padding: 14px;
      margin-bottom: 20px;
    }
    .penalty-label {
      color: var(--warning);
      margin-bottom: 12px;
    }
    .pen-box {
      width: 50px;
      height: 40px;
      font-size: 1.1rem;
      border-color: rgba(245, 158, 11, 0.4);
    }
    .pen-box:focus {
      border-color: var(--warning);
      box-shadow: 0 0 0 3px rgba(245, 158, 11, 0.15);
    }
    .sub-label {
      font-size: 0.75rem;
      font-weight: 600;
      color: var(--text-muted);
    }
    .penalty-hint {
      font-size: 0.7rem;
      color: var(--text-muted);
      margin: 0;
      text-align: center;
    }
    .modal-error {
      color: var(--danger);
      background-color: rgba(239, 68, 68, 0.05);
      border: 1px solid rgba(239, 68, 68, 0.1);
      padding: 8px 12px;
      border-radius: var(--border-radius-sm);
      margin-bottom: 20px;
      font-size: 0.82rem;
      text-align: center;
    }
    .modal-footer {
      display: flex;
      justify-content: flex-end;
      gap: 12px;
      margin-top: 10px;
    }
    .loader-container {
      text-align: center;
      padding: 40px;
    }
    .loader {
      border: 4px solid var(--border-color);
      border-top: 4px solid var(--primary);
      border-radius: 50%;
      width: 36px;
      height: 36px;
      animation: spin 1s linear infinite;
      margin: 0 auto 16px;
    }
    @keyframes spin {
      0% { transform: rotate(0deg); }
      100% { transform: rotate(360deg); }
    }

    /* Responsive Styles */
    @media (min-width: 993px) {
      .bracket-wrapper {
        overflow-x: auto !important;
        padding-bottom: 16px;
      }
      .bracket-wrapper::-webkit-scrollbar {
        height: 8px;
      }
      .bracket-wrapper::-webkit-scrollbar-track {
        background: var(--bg-primary);
        border-radius: 4px;
      }
      .bracket-wrapper::-webkit-scrollbar-thumb {
        background: var(--border-color);
        border-radius: 4px;
      }
      .bracket-wrapper::-webkit-scrollbar-thumb:hover {
        background: var(--text-muted);
      }

      .rounds-track {
        width: max-content;
        display: flex;
        gap: 0;
        transform: none !important; /* Disable CSS translate sliding on desktop */
      }
      .round-column {
        width: 320px; /* Each column gets exactly 320px width to fit cards perfectly */
        flex-shrink: 0;
        border-right: 1px solid var(--border-color);
      }
      .round-column:last-child {
        border-right: none;
      }
      .round-header-mobile {
        display: block; /* Visible round header at the top of each column */
      }
      .bracket-nav-bar {
        display: flex; /* Keep the navigation bar visible on desktop for easy centering/scrolling! */
      }
      .fixtures-list {
        padding-top: 20px;
      }
      
      /* Desktop connector tree lines simulations via margin offsets or grids */
      .round-column:nth-child(1) .match-card-wrapper {
        margin-bottom: 12px;
      }
      .round-column:nth-child(2) .fixtures-list {
        padding-top: 80px;
        gap: 140px;
      }
      .round-column:nth-child(3) .fixtures-list {
        padding-top: 210px;
        gap: 400px;
      }
      .round-column:nth-child(4) .fixtures-list {
        padding-top: 480px;
        gap: 600px;
      }
      .round-column:nth-child(5) .fixtures-list {
        padding-top: 480px;
        gap: 100px; /* Final and 3rd place side by side or stacked */
      }
    }

    @media (max-width: 992px) {
      /* Mobile/Tablet: slide track horizontally */
      .rounds-track {
        display: flex;
      }
      .round-column {
        width: 100%; /* Column takes full width when slider active */
      }
      .round-header-mobile {
        display: block;
      }
      .bracket-nav-bar {
        display: flex;
      }
    }
  `]
})
export class KnockoutComponent implements OnInit {
  @ViewChild('bracketContainer') bracketContainer!: ElementRef;

  gameService = inject(GameService);
  authService = inject(AuthService);

  fixtures = signal<Fixture[]>([]);
  teams = signal<Team[]>([]);
  
  isLoading = signal<boolean>(true);
  isGenerating = signal<boolean>(false);
  isSaving = signal<boolean>(false);
  
  errorMessage = signal<string | null>(null);
  successMessage = signal<string | null>(null);
  modalError = signal<string | null>(null);

  // Bracket navigation state
  roundNames = ['Round of 32', 'Round of 16', 'Quarter-finals', 'Semi-finals', 'Finals'];
  activeRoundIndex = signal<number>(0);

  // Prediction modal state
  selectedFixture = signal<Fixture | null>(null);
  modalScoreA: number | null = null;
  modalScoreB: number | null = null;
  modalPenaltyScoreA: number | null = null;
  modalPenaltyScoreB: number | null = null;

  imageErrors = new Set<string>();

  ngOnInit() {
    this.loadData();
  }

  loadData() {
    this.isLoading.set(true);
    this.errorMessage.set(null);

    // Fetch fixtures and teams in parallel
    this.gameService.getFixtures().subscribe({
      next: (fixturesData) => {
        this.fixtures.set(fixturesData);
        
        this.gameService.getTeams().subscribe({
          next: (teamsData) => {
            this.teams.set(teamsData);
            
            // Set initial active round index to the first round containing upcoming unlocked matches
            this.setInitialActiveRound(fixturesData);
            this.isLoading.set(false);
          },
          error: (err) => {
            console.error('Error fetching teams:', err);
            this.isLoading.set(false);
          }
        });
      },
      error: (err) => {
        console.error('Error fetching fixtures:', err);
        this.errorMessage.set('Failed to load bracket data.');
        this.isLoading.set(false);
      }
    });
  }

  setInitialActiveRound(fixtures: Fixture[]) {
    // Locate the first round that has matches open for prediction
    // We group them first
    const grouped = this.groupFixturesByRound(fixtures);
    
    // Find the first round index where there is at least one upcoming match that is open (not locked)
    for (let i = 0; i < this.roundNames.length; i++) {
      const roundFixtures = grouped[i];
      const hasOpenMatches = roundFixtures.some(f => f.status === 'Upcoming' && !f.isLocked);
      if (hasOpenMatches) {
        this.activeRoundIndex.set(i);
        return;
      }
    }

    // Fallback: first round index with any upcoming match
    for (let i = 0; i < this.roundNames.length; i++) {
      const roundFixtures = grouped[i];
      const hasUpcoming = roundFixtures.some(f => f.status === 'Upcoming');
      if (hasUpcoming) {
        this.activeRoundIndex.set(i);
        return;
      }
    }

    // Default fallback: Round of 16 (since it's usually active when group stage ends)
    // Wait, let's find the round where we have matches that are not completed.
    for (let i = 0; i < this.roundNames.length; i++) {
      const roundFixtures = grouped[i];
      const allCompleted = roundFixtures.length > 0 && roundFixtures.every(f => f.status === 'Completed');
      if (!allCompleted && roundFixtures.length > 0) {
        this.activeRoundIndex.set(i);
        return;
      }
    }
  }

  // Group fixtures computed signal
  knockoutRounds = computed<KnockoutRound[]>(() => {
    const all = this.fixtures();
    const grouped = this.groupFixturesByRound(all);
    return this.roundNames.map((name, idx) => ({
      name,
      fixtures: grouped[idx]
    }));
  });

  private groupFixturesByRound(allFixtures: Fixture[]): Fixture[][] {
    const roundOf32 = allFixtures.filter(f => f.matchNumber >= 73 && f.matchNumber <= 88);
    const roundOf16 = allFixtures.filter(f => f.matchNumber >= 89 && f.matchNumber <= 96);
    const quarterfinals = allFixtures.filter(f => f.matchNumber >= 97 && f.matchNumber <= 100);
    const semifinals = allFixtures.filter(f => f.matchNumber >= 101 && f.matchNumber <= 102);
    const finals = allFixtures.filter(f => f.matchNumber === 103 || f.matchNumber === 104)
      .sort((a, b) => a.matchNumber - b.matchNumber); // Put Match 103 then Match 104

    return [roundOf32, roundOf16, quarterfinals, semifinals, finals];
  }

  // Navigation handlers
  slideLeft() {
    if (this.activeRoundIndex() > 0) {
      const newIdx = this.activeRoundIndex() - 1;
      this.selectRound(newIdx);
    }
  }

  slideRight() {
    if (this.activeRoundIndex() < this.roundNames.length - 1) {
      const newIdx = this.activeRoundIndex() + 1;
      this.selectRound(newIdx);
    }
  }

  selectRound(idx: number) {
    this.activeRoundIndex.set(idx);
    
    // Smooth scroll to target column on desktop
    if (window.innerWidth >= 993 && this.bracketContainer) {
      const container = this.bracketContainer.nativeElement;
      const columns = container.querySelectorAll('.round-column');
      if (columns && columns[idx]) {
        const col = columns[idx] as HTMLElement;
        container.scrollTo({
          left: col.offsetLeft - 24, // include padding offset
          behavior: 'smooth'
        });
      }
    }
  }

  getTrackTransform(): string {
    const idx = this.activeRoundIndex();
    // In mobile, we slide by -100% per active index. On desktop, transform is disabled via CSS transform: none !important.
    return `translateX(-${idx * 100}%)`;
  }

  // Logo helpers
  onImageError(teamName: string) {
    this.imageErrors.add(teamName);
  }

  hasValidLogo(teamName: string): boolean {
    if (this.imageErrors.has(teamName)) return false;
    return !!this.getTeamLogo(teamName);
  }

  getTeamLogo(teamName: string): string | null {
    const team = this.teams().find(t => t.name === teamName);
    return team?.logo || null;
  }

  getPointsReason(points: number | undefined): string {
    if (points === 60) return 'Exact Tie Score & Penalties Winner!';
    if (points === 30) return 'Exact Full-Time Scoreline Match';
    if (points === 10) return 'Correct Outcome (Full-Time Outcome)';
    return 'Incorrect prediction';
  }

  // Prediction modal handlers
  openPredictionForm(fixture: Fixture) {
    this.selectedFixture.set(fixture);
    this.modalError.set(null);
    
    if (fixture.myPrediction) {
      this.modalScoreA = fixture.myPrediction.predScoreA;
      this.modalScoreB = fixture.myPrediction.predScoreB;
      this.modalPenaltyScoreA = fixture.myPrediction.predPenaltyScoreA ?? null;
      this.modalPenaltyScoreB = fixture.myPrediction.predPenaltyScoreB ?? null;
    } else {
      this.modalScoreA = 0;
      this.modalScoreB = 0;
      this.modalPenaltyScoreA = null;
      this.modalPenaltyScoreB = null;
    }
  }

  closePredictionForm() {
    this.selectedFixture.set(null);
    this.modalScoreA = 0;
    this.modalScoreB = 0;
    this.modalPenaltyScoreA = null;
    this.modalPenaltyScoreB = null;
    this.modalError.set(null);
  }

  submitPrediction() {
    const fixture = this.selectedFixture();
    if (!fixture) return;

    if (this.modalScoreA === null || this.modalScoreB === null || this.modalScoreA < 0 || this.modalScoreB < 0) {
      this.modalError.set('Please enter valid, non-negative scores.');
      return;
    }

    const isTie = this.modalScoreA === this.modalScoreB;
    let predPenA: number | null = null;
    let predPenB: number | null = null;

    if (isTie) {
      if (this.modalPenaltyScoreA === null || this.modalPenaltyScoreB === null || this.modalPenaltyScoreA < 0 || this.modalPenaltyScoreB < 0) {
        this.modalError.set('Please predict the penalty shootout score.');
        return;
      }
      if (this.modalPenaltyScoreA === this.modalPenaltyScoreB) {
        this.modalError.set('A penalty shootout cannot end in a draw. One team must win.');
        return;
      }
      predPenA = this.modalPenaltyScoreA;
      predPenB = this.modalPenaltyScoreB;
    }

    this.isSaving.set(true);
    this.modalError.set(null);

    this.gameService.submitPrediction(fixture._id, this.modalScoreA, this.modalScoreB, predPenA, predPenB).subscribe({
      next: (res) => {
        this.isSaving.set(false);
        this.showSuccess(res.message);
        this.closePredictionForm();
        this.loadData(); // Reload updated prediction states
      },
      error: (err) => {
        console.error(err);
        this.modalError.set(err.error?.message || 'Error saving prediction.');
        this.isSaving.set(false);
      }
    });
  }

  generateKnockoutFixtures() {
    this.isGenerating.set(true);
    this.errorMessage.set(null);
    this.successMessage.set(null);

    this.gameService.generateKnockout().subscribe({
      next: (res) => {
        this.isGenerating.set(false);
        this.showSuccess(`${res.message} (${res.createdCount} created, ${res.updatedCount} synced)`);
        this.loadData();
      },
      error: (err) => {
        console.error(err);
        this.errorMessage.set(err.error?.message || 'Failed to generate knockout bracket.');
        this.isGenerating.set(false);
      }
    });
  }

  private showSuccess(msg: string) {
    this.successMessage.set(msg);
    setTimeout(() => this.successMessage.set(null), 4000);
  }
}
