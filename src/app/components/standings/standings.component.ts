import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { GameService, Team, Group, Fixture } from '../../services/game.service';

interface TeamWithForm extends Team {
  gd: number; // Goal Difference
  form: ('W' | 'L' | 'D')[]; // Last 5 match outcomes
}

interface GroupStandings {
  groupName: string;
  teams: TeamWithForm[];
}

@Component({
  selector: 'app-standings',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="standings-container animate-fade">
      <div class="page-header">
        <h1>Group Standings</h1>
        <p class="subtitle">Track live group tables, stats, and team forms</p>
      </div>

      <div *ngIf="loading" class="loading-state glass-panel">
        <div class="spinner"></div>
        <p>Loading standings...</p>
      </div>

      <div *ngIf="!loading && groups.length === 0" class="empty-state glass-panel">
        <span class="icon">🏆</span>
        <h3>No Standings Available</h3>
        <p>Get started by adding groups and teams in the Admin Panel.</p>
      </div>

      <div *ngIf="!loading && groups.length > 0" class="groups-grid">
        <div *ngFor="let g of groups" class="group-card glass-panel">
          <div class="group-header">
            <h3>{{ g.groupName }}</h3>
          </div>
          
          <div class="table-responsive">
            <table class="standings-table">
              <thead>
                <tr>
                  <th class="col-rank">#</th>
                  <th class="col-team">Team</th>
                  <th class="col-stat" title="Matches Played">MP</th>
                  <th class="col-stat" title="Won">W</th>
                  <th class="col-stat" title="Draw">D</th>
                  <th class="col-stat" title="Lost">L</th>
                  <th class="col-stat" title="Goals For">GF</th>
                  <th class="col-stat" title="Goals Against">GA</th>
                  <th class="col-stat" title="Goal Difference">GD</th>
                  <th class="col-stat col-pts" title="Points">Pts</th>
                  <th class="col-form">Last 5</th>
                </tr>
              </thead>
              <tbody>
                <tr *ngFor="let team of g.teams; let i = index" [class.qualification-zone]="i < 2">
                  <td class="col-rank">
                    <span class="rank-badge" [class.top-two]="i < 2">{{ i + 1 }}</span>
                  </td>
                  <td class="col-team">
                    <div class="team-info">
                      <img 
                        *ngIf="team.logo && !imageErrors.has(team.name)" 
                        [src]="'assets/' + team.logo" 
                        [alt]="team.name" 
                        class="team-flag"
                        (error)="onImageError(team.name)">
                      <span *ngIf="!team.logo || imageErrors.has(team.name)" class="flag-placeholder">
                        {{ team.name.substring(0, 3).toUpperCase() }}
                      </span>
                      <span class="team-name">{{ team.name }}</span>
                    </div>
                  </td>
                  <td class="col-stat">{{ team.played || 0 }}</td>
                  <td class="col-stat">{{ team.won || 0 }}</td>
                  <td class="col-stat">{{ team.draw || 0 }}</td>
                  <td class="col-stat">{{ team.lost || 0 }}</td>
                  <td class="col-stat">{{ team.goalsScored || 0 }}</td>
                  <td class="col-stat">{{ team.goalsConceded || 0 }}</td>
                  <td class="col-stat" [class.positive]="team.gd > 0" [class.negative]="team.gd < 0">
                    {{ team.gd > 0 ? '+' : '' }}{{ team.gd }}
                  </td>
                  <td class="col-stat col-pts"><strong>{{ team.points || 0 }}</strong></td>
                  <td class="col-form">
                    <div class="form-indicators">
                      <span 
                        *ngFor="let outcome of team.form" 
                        class="form-circle" 
                        [class.win]="outcome === 'W'" 
                        [class.loss]="outcome === 'L'" 
                        [class.draw]="outcome === 'D'"
                        [attr.title]="outcome === 'W' ? 'Win' : (outcome === 'L' ? 'Loss' : 'Draw')">
                        {{ outcome === 'W' ? '✓' : (outcome === 'L' ? '×' : '−') }}
                      </span>
                      <!-- Empty slots to make up 5 circles -->
                      <span 
                        *ngFor="let dummy of [].constructor(5 - team.form.length)" 
                        class="form-circle empty">
                      </span>
                    </div>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .standings-container {
      padding: 24px;
      max-width: 1200px;
      margin: 0 auto;
    }
    .page-header {
      margin-bottom: 30px;
      text-align: left;
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
    .groups-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(450px, 1fr));
      gap: 24px;
      align-items: start;
    }
    @media (max-width: 992px) {
      .groups-grid {
        grid-template-columns: 1fr;
      }
      .standings-container {
        padding: 16px;
      }
    }
    .group-card {
      background-color: var(--bg-secondary);
      border: 1px solid var(--border-color);
      border-radius: var(--border-radius-lg);
      padding: 20px;
      box-shadow: var(--card-shadow);
    }
    .group-header {
      border-bottom: 1px solid var(--border-color);
      padding-bottom: 12px;
      margin-bottom: 16px;
    }
    .group-header h3 {
      margin: 0;
      font-size: 1.2rem;
      font-weight: 700;
      color: var(--text-primary);
    }
    .table-responsive {
      width: 100%;
      overflow-x: auto;
      -webkit-overflow-scrolling: touch;
    }
    .standings-table {
      width: 100%;
      border-collapse: collapse;
      text-align: left;
      font-size: 0.88rem;
    }
    .standings-table th {
      color: var(--text-muted);
      font-weight: 600;
      text-transform: uppercase;
      font-size: 0.72rem;
      letter-spacing: 0.05em;
      padding: 10px 6px;
      border-bottom: 1px solid var(--border-color);
      text-align: center;
    }
    .standings-table th.col-team {
      text-align: left;
    }
    .standings-table td {
      padding: 12px 6px;
      border-bottom: 1px solid var(--border-color);
      vertical-align: middle;
      color: var(--text-primary);
      text-align: center;
    }
    .standings-table td.col-team {
      text-align: left;
    }
    .standings-table tr:last-child td {
      border-bottom: none;
    }
    .col-rank {
      width: 25px;
      text-align: center;
    }
    .rank-badge {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      width: 20px;
      height: 20px;
      border-radius: 50%;
      font-size: 0.75rem;
      font-weight: 700;
      color: var(--text-secondary);
      background-color: var(--bg-primary);
    }
    .rank-badge.top-two {
      background-color: rgba(99, 102, 241, 0.15);
      color: var(--primary);
    }
    .qualification-zone {
      background-color: rgba(99, 102, 241, 0.02);
      border-left: 3px solid var(--primary);
    }
    .col-team {
      min-width: 130px;
    }
    .team-info {
      display: flex;
      align-items: center;
      gap: 8px;
    }
    .team-flag {
      width: 24px;
      height: 16px;
      object-fit: cover;
      border-radius: 2px;
      box-shadow: 0 1px 3px rgba(0,0,0,0.15);
    }
    .flag-placeholder {
      font-size: 0.65rem;
      font-weight: 700;
      color: var(--text-muted);
      background-color: var(--bg-primary);
      padding: 2px 4px;
      border-radius: 2px;
      border: 1px solid var(--border-color);
      display: inline-block;
    }
    .team-name {
      font-weight: 500;
      color: var(--text-primary);
    }
    .col-stat {
      width: 30px;
    }
    .col-pts {
      width: 40px;
    }
    .col-pts strong {
      font-size: 0.9rem;
      font-weight: 800;
      color: var(--text-primary);
    }
    .col-form {
      min-width: 110px;
      text-align: right;
    }
    .form-indicators {
      display: inline-flex;
      gap: 3px;
      align-items: center;
      justify-content: flex-end;
      width: 100%;
    }
    .form-circle {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      width: 16px;
      height: 16px;
      border-radius: 50%;
      font-size: 0.65rem;
      font-weight: 700;
      color: white;
    }
    .form-circle.win {
      background-color: var(--accent);
      box-shadow: 0 0 4px var(--accent);
    }
    .form-circle.loss {
      background-color: var(--danger);
      box-shadow: 0 0 4px var(--danger);
    }
    .form-circle.draw {
      background-color: #f59e0b;
      box-shadow: 0 0 4px #f59e0b;
    }
    .form-circle.empty {
      background-color: var(--bg-primary);
      border: 1px solid var(--border-color);
    }
    .positive {
      color: var(--accent);
      font-weight: 600;
    }
    .negative {
      color: var(--danger);
      font-weight: 600;
    }
    .loading-state, .empty-state {
      text-align: center;
      padding: 40px;
    }
    .spinner {
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
  `]
})
export class StandingsComponent implements OnInit {
  groups: GroupStandings[] = [];
  loading = true;
  imageErrors = new Set<string>();

  constructor(private gameService: GameService) {}

  ngOnInit() {
    this.loadStandings();
  }

  onImageError(teamName: string) {
    this.imageErrors.add(teamName);
  }

  loadStandings() {
    this.loading = true;
    
    // Fetch Groups, Teams, and Fixtures in parallel
    this.gameService.getGroups().subscribe({
      next: (groupsData) => {
        this.gameService.getTeams().subscribe({
          next: (teamsData) => {
            this.gameService.getFixtures().subscribe({
              next: (fixturesData) => {
                this.calculateStandings(groupsData, teamsData, fixturesData);
                this.loading = false;
              },
              error: (err) => {
                console.error('Error fetching fixtures:', err);
                this.loading = false;
              }
            });
          },
          error: (err) => {
            console.error('Error fetching teams:', err);
            this.loading = false;
          }
        });
      },
      error: (err) => {
        console.error('Error fetching groups:', err);
        this.loading = false;
      }
    });
  }

  private calculateStandings(groups: Group[], teams: Team[], fixtures: Fixture[]) {
    const completedFixtures = fixtures.filter(f => f.status === 'Completed');
    
    // Create standings grouping
    const groupMap = new Map<string, TeamWithForm[]>();
    
    // Pre-initialize groups
    groups.forEach(g => {
      if (g._id) groupMap.set(g._id, []);
    });

    // Populate and compute stats for each team
    teams.forEach(team => {
      const gId = typeof team.group === 'object' ? team.group._id : team.group;
      if (!gId) return;

      const gd = (team.goalsScored || 0) - (team.goalsConceded || 0);

      // Compute Form
      const teamFixtures = completedFixtures
        .filter(f => f.teamA === team.name || f.teamB === team.name)
        .sort((a, b) => a.matchNumber - b.matchNumber); // Sort chronologically

      // Take last 5 matches
      const last5 = teamFixtures.slice(-5);
      const form: ('W' | 'L' | 'D')[] = last5.map(f => {
        if (f.teamA === team.name) {
          if (Number(f.scoreA) > Number(f.scoreB)) return 'W';
          if (Number(f.scoreA) < Number(f.scoreB)) return 'L';
          return 'D';
        } else {
          if (Number(f.scoreB) > Number(f.scoreA)) return 'W';
          if (Number(f.scoreB) < Number(f.scoreA)) return 'L';
          return 'D';
        }
      });

      const teamWithForm: TeamWithForm = {
        ...team,
        gd,
        form
      };

      if (!groupMap.has(gId)) {
        groupMap.set(gId, []);
      }
      groupMap.get(gId)!.push(teamWithForm);
    });

    // Map to GroupStandings and sort
    const result: GroupStandings[] = [];
    groups.forEach(g => {
      if (!g._id) return;
      const groupTeams = groupMap.get(g._id) || [];
      
      // Sort teams by:
      // 1. Points (descending)
      // 2. Goal Difference (descending)
      // 3. Goals Scored (descending)
      // 4. Team Name (alphabetical)
      groupTeams.sort((a, b) => {
        if ((b.points || 0) !== (a.points || 0)) {
          return (b.points || 0) - (a.points || 0);
        }
        if (b.gd !== a.gd) {
          return b.gd - a.gd;
        }
        if ((b.goalsScored || 0) !== (a.goalsScored || 0)) {
          return (b.goalsScored || 0) - (a.goalsScored || 0);
        }
        return a.name.localeCompare(b.name);
      });

      result.push({
        groupName: g.name,
        teams: groupTeams
      });
    });

    // Sort groups alphabetically by name
    this.groups = result.sort((a, b) => a.groupName.localeCompare(b.groupName));
  }
}
