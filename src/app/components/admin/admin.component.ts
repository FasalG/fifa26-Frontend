import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { GameService, Fixture, Team, Group } from '../../services/game.service';

@Component({
  selector: 'app-admin',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './admin.component.html',
  styleUrls: ['./admin.component.css']
})
export class AdminComponent implements OnInit {
  gameService = inject(GameService);

  fixtures = signal<Fixture[]>([]);
  teams = signal<Team[]>([]);
  players = signal<any[]>([]);
  isLoading = signal<boolean>(true);

  // Dynamic Groups list
  groups = signal<Group[]>([]);

  // Grouped teams map for rendering and filtering (key is group ID)
  groupedTeams: { [key: string]: Team[] } = {};

  // Group Form
  newGroupName = '';

  // Team Form
  newTeamName = '';
  newTeamGroup = '';
  newTeamLogo = '';

  // Editing Team State
  editingTeamId: string | null = null;
  editTeamName = '';
  editTeamGroup = '';
  editTeamLogo = '';

  // Fixture Form
  newMatchNumber: number | null = null;
  fixtureGroup = '';
  teamA = '';
  teamB = '';
  matchDate = '';
  matchTimeHour = '12';
  matchTimeMinute = '00';
  matchTimeAmpm = 'PM';
  venue = '';

  // Editing Fixture State
  editingFixtureId: string | null = null;
  editMatchNumber: number | null = null;
  editFixtureGroup = '';
  editTeamA = '';
  editTeamB = '';
  editMatchDate = '';
  editMatchTimeHour = '12';
  editMatchTimeMinute = '00';
  editMatchTimeAmpm = 'PM';
  editVenue = '';
  editStatus = 'Upcoming';

  hoursList = ['01', '02', '03', '04', '05', '06', '07', '08', '09', '10', '11', '12'];

  getUTCDateTimeString(dateStr: string, hourStr: string, minuteStr: string, ampmStr: string): string {
    if (!dateStr || !hourStr || !minuteStr) return '';
    let hour = parseInt(hourStr, 10);
    const minute = parseInt(minuteStr, 10);
    if (ampmStr === 'PM' && hour < 12) {
      hour += 12;
    } else if (ampmStr === 'AM' && hour === 12) {
      hour = 0;
    }
    const hourPad = String(hour).padStart(2, '0');
    const minPad = String(minute).padStart(2, '0');

    const localDate = new Date(`${dateStr}T${hourPad}:${minPad}:00`);
    return localDate.toISOString();
  }

  formatDateOnly(date: Date): string {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  // Player Form
  newPlayerUsername = '';
  newPlayerEmail = '';
  newPlayerPassword = '';

  // Editing Player State
  editingPlayerId: string | null = null;
  editPlayerUsername = '';
  editPlayerEmail = '';
  editPlayerPassword = '';
  editPlayerTotalPoints = 0;

  // Settlement Inputs Map
  settleScoreA: { [key: string]: number } = {};
  settleScoreB: { [key: string]: number } = {};
  settlingIds: { [key: string]: boolean } = {};

  // Status Alerts
  successMessage = signal<string | null>(null);
  errorMessage = signal<string | null>(null);

  imageErrors = new Set<string>();

  onImageError(teamName: string) {
    this.imageErrors.add(teamName);
  }

  hasValidLogo(team: Team): boolean {
    console.log("hasValidLogo", team)
    if (this.imageErrors.has(team.name)) return false;
    return !!team.logo;
  }

  ngOnInit() {
    this.loadData();
  }

  loadData() {
    this.isLoading.set(true);
    this.errorMessage.set(null);

    this.gameService.getGroups().subscribe({
      next: (groupsData) => {
        this.groups.set(groupsData);

        // Auto-select first group in forms if none selected yet
        if (groupsData.length > 0) {
          const firstGroupId = groupsData[0]._id || '';
          if (!this.newTeamGroup) this.newTeamGroup = firstGroupId;
          if (!this.editTeamGroup) this.editTeamGroup = firstGroupId;
          if (!this.fixtureGroup) this.fixtureGroup = firstGroupId;
          if (!this.editFixtureGroup) this.editFixtureGroup = firstGroupId;
        }

        this.gameService.getFixtures().subscribe({
          next: (fixturesData) => {
            this.fixtures.set(fixturesData);
            fixturesData.forEach(f => {
              if (f.scoreA !== null && f.scoreB !== null) {
                this.settleScoreA[f._id] = f.scoreA;
                this.settleScoreB[f._id] = f.scoreB;
              }
            });

            this.gameService.getTeams().subscribe({
              next: (teamsData) => {
                this.teams.set(teamsData);
                this.rebuildGroupedTeams(teamsData);

                this.gameService.getPlayers().subscribe({
                  next: (playersData) => {
                    this.players.set(playersData);
                    this.isLoading.set(false);
                  },
                  error: (err) => {
                    console.error(err);
                    this.errorMessage.set('Failed to load players.');
                    this.isLoading.set(false);
                  }
                });
              },
              error: (err) => {
                console.error(err);
                this.errorMessage.set('Failed to load teams data.');
                this.isLoading.set(false);
              }
            });
          },
          error: (err) => {
            console.error(err);
            this.errorMessage.set('Failed to load fixtures data.');
            this.isLoading.set(false);
          }
        });
      },
      error: (err) => {
        console.error(err);
        this.errorMessage.set('Failed to load groups data.');
        this.isLoading.set(false);
      }
    });
  }

  rebuildGroupedTeams(teamsList: Team[]) {
    const map: { [key: string]: Team[] } = {};
    this.groups().forEach(g => {
      if (g._id) map[g._id] = [];
    });

    teamsList.forEach(team => {
      const gId = typeof team.group === 'object' ? team.group._id : team.group;
      if (gId && map[gId]) {
        map[gId].push(team);
      }
    });

    // Sort teams under each group by points desc, goalsScored desc, then name asc
    Object.keys(map).forEach(groupId => {
      map[groupId].sort((a, b) => {
        const pointsA = a.points || 0;
        const pointsB = b.points || 0;
        if (pointsB !== pointsA) return pointsB - pointsA;

        const goalsA = a.goalsScored || 0;
        const goalsB = b.goalsScored || 0;
        if (goalsB !== goalsA) return goalsB - goalsA;

        return a.name.localeCompare(b.name);
      });
    });

    this.groupedTeams = map;
  }

  getTeamsForSelectedGroup(): Team[] {
    return this.groupedTeams[this.fixtureGroup] || [];
  }

  getTeamsForEditGroup(): Team[] {
    return this.groupedTeams[this.editFixtureGroup] || [];
  }

  onFixtureGroupChange() {
    this.teamA = '';
    this.teamB = '';
  }

  onEditFixtureGroupChange() {
    this.editTeamA = '';
    this.editTeamB = '';
  }

  // --- GROUP CRUD ---
  addGroup() {
    if (!this.newGroupName.trim()) {
      this.showAlert('Please fill in group name.', 'error');
      return;
    }

    this.gameService.createGroup(this.newGroupName.trim()).subscribe({
      next: (group) => {
        this.showAlert(`Group "${group.name}" added successfully!`, 'success');
        this.newGroupName = '';
        this.loadData();
      },
      error: (err) => {
        this.showAlert(err.error?.message || 'Error adding group.', 'error');
      }
    });
  }

  editingGroupId: string | null = null;
  editGroupName = '';

  editGroup(group: Group) {
    this.editingGroupId = group._id || null;
    this.editGroupName = group.name;
  }

  saveGroupEdit() {
    if (!this.editingGroupId || !this.editGroupName.trim()) {
      this.showAlert('Group name cannot be empty.', 'error');
      return;
    }

    this.gameService.updateGroup(this.editingGroupId, this.editGroupName.trim()).subscribe({
      next: () => {
        this.showAlert('Group updated successfully!', 'success');
        this.cancelGroupEdit();
        this.loadData();
      },
      error: (err) => {
        this.showAlert(err.error?.message || 'Error updating group.', 'error');
      }
    });
  }

  cancelGroupEdit() {
    this.editingGroupId = null;
    this.editGroupName = '';
  }

  deleteGroup(id?: string) {
    if (!id) return;
    if (!confirm('Are you sure you want to delete this group? This will cascade delete all teams, fixtures, and predictions under this group!')) return;

    this.gameService.deleteGroup(id).subscribe({
      next: () => {
        this.showAlert('Group and all associated data deleted successfully!', 'success');
        this.loadData();
      },
      error: (err) => {
        this.showAlert(err.error?.message || 'Error deleting group.', 'error');
      }
    });
  }

  // --- TEAM CRUD ---
  addTeam() {
    if (!this.newTeamName.trim() || !this.newTeamGroup) {
      this.showAlert('Please fill in team name and group.', 'error');
      return;
    }

    this.gameService.createTeam(this.newTeamName.trim(), this.newTeamGroup, this.newTeamLogo.trim()).subscribe({
      next: (team) => {
        this.showAlert(`Team "${team.name}" added successfully!`, 'success');
        this.newTeamName = '';
        this.newTeamLogo = '';
        this.loadData();
      },
      error: (err) => {
        this.showAlert(err.error?.message || 'Error adding team.', 'error');
      }
    });
  }

  editTeam(team: Team) {
    this.editingTeamId = team._id || null;
    this.editTeamName = team.name;
    this.editTeamGroup = typeof team.group === 'object' ? team.group._id || '' : team.group;
    this.editTeamLogo = team.logo || '';
  }

  saveTeamEdit() {
    if (!this.editingTeamId || !this.editTeamName.trim()) {
      this.showAlert('Team name cannot be empty.', 'error');
      return;
    }

    this.gameService.updateTeam(this.editingTeamId, this.editTeamName.trim(), this.editTeamGroup, this.editTeamLogo.trim()).subscribe({
      next: () => {
        this.showAlert('Team updated successfully!', 'success');
        this.cancelTeamEdit();
        this.loadData();
      },
      error: (err) => {
        this.showAlert(err.error?.message || 'Error updating team.', 'error');
      }
    });
  }

  cancelTeamEdit() {
    this.editingTeamId = null;
    this.editTeamName = '';
    this.editTeamLogo = '';
    this.editTeamGroup = this.groups().length > 0 ? this.groups()[0]._id || '' : '';
  }

  deleteTeam(id?: string) {
    if (!id) return;
    if (!confirm('Are you sure you want to delete this team?')) return;

    this.gameService.deleteTeam(id).subscribe({
      next: () => {
        this.showAlert('Team deleted successfully!', 'success');
        this.loadData();
      },
      error: (err) => {
        this.showAlert(err.error?.message || 'Error deleting team.', 'error');
      }
    });
  }

  // --- FIXTURE CRUD ---
  addFixture() {
    if (!this.newMatchNumber || !this.teamA || !this.teamB || !this.matchDate || !this.matchTimeHour || !this.matchTimeMinute) {
      this.showAlert('Please fill in all fixture details.', 'error');
      return;
    }

    if (this.teamA === this.teamB) {
      this.showAlert('Team A and Team B cannot be the same team.', 'error');
      return;
    }

    const utcDate = this.getUTCDateTimeString(this.matchDate, this.matchTimeHour, this.matchTimeMinute, this.matchTimeAmpm);

    this.gameService.createFixture(
      this.newMatchNumber,
      this.teamA,
      this.teamB,
      utcDate,
      this.venue.trim()
    ).subscribe({
      next: (fixture) => {
        this.showAlert(`Match #${fixture.matchNumber} created!`, 'success');
        this.newMatchNumber = null;
        this.teamA = '';
        this.teamB = '';
        this.matchDate = '';
        this.matchTimeHour = '12';
        this.matchTimeMinute = '00';
        this.matchTimeAmpm = 'PM';
        this.venue = '';
        this.loadData();
      },
      error: (err) => {
        this.showAlert(err.error?.message || 'Error creating fixture.', 'error');
      }
    });
  }

  editFixture(fixture: Fixture) {
    this.editingFixtureId = fixture._id;
    this.editMatchNumber = fixture.matchNumber;

    // Find the group of the team
    const team = this.teams().find(t => t.name === fixture.teamA);
    this.editFixtureGroup = team ? (typeof team.group === 'object' ? team.group._id || '' : team.group) : '';

    this.editTeamA = fixture.teamA;
    this.editTeamB = fixture.teamB;

    const localDate = new Date(fixture.matchTime);
    this.editMatchDate = this.formatDateOnly(localDate);

    let hours = localDate.getHours();
    const ampm = hours >= 12 ? 'PM' : 'AM';
    hours = hours % 12;
    hours = hours ? hours : 12;

    this.editMatchTimeHour = String(hours).padStart(2, '0');
    this.editMatchTimeMinute = String(localDate.getMinutes()).padStart(2, '0');
    this.editMatchTimeAmpm = ampm;

    this.editVenue = fixture.venue;
    this.editStatus = fixture.status;
  }

  saveFixtureEdit() {
    if (!this.editingFixtureId || !this.editMatchNumber || !this.editTeamA || !this.editTeamB || !this.editMatchDate || !this.editMatchTimeHour || !this.editMatchTimeMinute) {
      this.showAlert('Please fill in all required fixture fields.', 'error');
      return;
    }

    if (this.editTeamA === this.editTeamB) {
      this.showAlert('Team A and Team B cannot be the same.', 'error');
      return;
    }

    const utcDate = this.getUTCDateTimeString(this.editMatchDate, this.editMatchTimeHour, this.editMatchTimeMinute, this.editMatchTimeAmpm);

    this.gameService.updateFixture(
      this.editingFixtureId,
      this.editMatchNumber,
      this.editTeamA,
      this.editTeamB,
      utcDate,
      this.editVenue.trim(),
      this.editStatus
    ).subscribe({
      next: () => {
        this.showAlert('Fixture updated successfully!', 'success');
        this.cancelFixtureEdit();
        this.loadData();
      },
      error: (err) => {
        this.showAlert(err.error?.message || 'Error updating fixture.', 'error');
      }
    });
  }

  cancelFixtureEdit() {
    this.editingFixtureId = null;
    this.editMatchNumber = null;
    this.editTeamA = '';
    this.editTeamB = '';
    this.editMatchDate = '';
    this.editMatchTimeHour = '12';
    this.editMatchTimeMinute = '00';
    this.editMatchTimeAmpm = 'PM';
    this.editVenue = '';
    this.editStatus = 'Upcoming';
  }

  deleteFixture(id: string) {
    if (!confirm('Are you sure you want to delete this fixture? All predictions for this fixture will be deleted.')) return;

    this.gameService.deleteFixture(id).subscribe({
      next: () => {
        this.showAlert('Fixture deleted successfully!', 'success');
        this.loadData();
      },
      error: (err) => {
        this.showAlert(err.error?.message || 'Error deleting fixture.', 'error');
      }
    });
  }

  // --- PLAYER CRUD ---
  addPlayer() {
    if (!this.newPlayerUsername.trim() || !this.newPlayerEmail.trim() || !this.newPlayerPassword.trim()) {
      this.showAlert('Please fill in all player details.', 'error');
      return;
    }

    this.gameService.createPlayer(
      this.newPlayerUsername.trim(),
      this.newPlayerEmail.trim(),
      this.newPlayerPassword.trim()
    ).subscribe({
      next: (player) => {
        this.showAlert(`Player "${player.username}" added successfully!`, 'success');
        this.newPlayerUsername = '';
        this.newPlayerEmail = '';
        this.newPlayerPassword = '';
        this.loadData();
      },
      error: (err) => {
        this.showAlert(err.error?.message || 'Error adding player.', 'error');
      }
    });
  }

  editPlayer(player: any) {
    this.editingPlayerId = player._id;
    this.editPlayerUsername = player.username;
    this.editPlayerEmail = player.email;
    this.editPlayerTotalPoints = player.totalPoints;
    this.editPlayerPassword = ''; // leave empty unless resetting
  }

  savePlayerEdit() {
    if (!this.editingPlayerId || !this.editPlayerUsername.trim() || !this.editPlayerEmail.trim()) {
      this.showAlert('Username and Email are required.', 'error');
      return;
    }

    this.gameService.updatePlayer(
      this.editingPlayerId,
      this.editPlayerUsername.trim(),
      this.editPlayerEmail.trim(),
      this.editPlayerPassword.trim() || undefined,
      this.editPlayerTotalPoints
    ).subscribe({
      next: () => {
        this.showAlert('Player details updated successfully!', 'success');
        this.cancelPlayerEdit();
        this.loadData();
      },
      error: (err) => {
        this.showAlert(err.error?.message || 'Error updating player.', 'error');
      }
    });
  }

  cancelPlayerEdit() {
    this.editingPlayerId = null;
    this.editPlayerUsername = '';
    this.editPlayerEmail = '';
    this.editPlayerPassword = '';
    this.editPlayerTotalPoints = 0;
  }

  deletePlayer(id: string) {
    if (!confirm('Are you sure you want to delete this player? All predictions will be removed.')) return;

    this.gameService.deletePlayer(id).subscribe({
      next: () => {
        this.showAlert('Player deleted successfully!', 'success');
        this.loadData();
      },
      error: (err) => {
        this.showAlert(err.error?.message || 'Error deleting player.', 'error');
      }
    });
  }

  // --- SETTLEMENT ---
  settleMatch(fixture: Fixture) {
    const scoreA = this.settleScoreA[fixture._id];
    const scoreB = this.settleScoreB[fixture._id];

    if (scoreA === undefined || scoreB === undefined || scoreA === null || scoreB === null || scoreA < 0 || scoreB < 0) {
      this.showAlert('Please enter valid, non-negative scores to settle the match.', 'error');
      return;
    }

    this.settlingIds[fixture._id] = true;
    this.gameService.settleMatch(fixture._id, scoreA, scoreB).subscribe({
      next: () => {
        this.settlingIds[fixture._id] = false;
        this.showAlert(`Match #${fixture.matchNumber} settled! Leaderboard updated and WhatsApp alert sent.`, 'success');
        this.loadData();
      },
      error: (err) => {
        this.settlingIds[fixture._id] = false;
        this.showAlert(err.error?.message || 'Error settling match.', 'error');
      }
    });
  }

  // --- UTILS ---
  formatDateTimeLocal(isoString: string): string {
    if (!isoString) return '';
    const d = new Date(isoString);
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    const hours = String(d.getHours()).padStart(2, '0');
    const minutes = String(d.getMinutes()).padStart(2, '0');
    return `${year}-${month}-${day}T${hours}:${minutes}`;
  }

  private showAlert(msg: string, type: 'success' | 'error') {
    if (type === 'success') {
      this.successMessage.set(msg);
      setTimeout(() => this.successMessage.set(null), 4000);
    } else {
      this.errorMessage.set(msg);
      setTimeout(() => this.errorMessage.set(null), 5000);
    }
  }

  // --- MANUAL BROADCAST ---
  shareLeaderboardToWhatsApp() {
    const sortedPlayers = [...this.players()].sort((a, b) => b.totalPoints - a.totalPoints);

    let text = `🏆 *FIFA 2026 WORLD CUP PREDICTIONS* 🏆\n---------------------------------------------\n⭐ *CURRENT LEADERBOARD* ⭐\n\n`;

    if (sortedPlayers.length === 0) {
      text += `No players registered yet.\n`;
    } else {
      const medals = ['🥇', '🥈', '🥉'];
      let currentRank = 0;
      let lastPoints = -1;

      sortedPlayers.forEach((p, index) => {
        if (index === 0 || p.totalPoints !== lastPoints) {
          currentRank++;
        }
        lastPoints = p.totalPoints;

        let prefix = '';
        if (currentRank <= 3) {
          prefix = medals[currentRank - 1];
        } else {
          prefix = `   ${currentRank}.`;
        }

        text += `${prefix} *${p.username}* - ${p.totalPoints} pts\n`;
      });
    }

    text += `\nKeep predicting to climb the charts! ⚽🔥\n`;

    const encodedText = encodeURIComponent(text);
    const whatsappUrl = `https://api.whatsapp.com/send?text=${encodedText}`;
    window.open(whatsappUrl, '_blank');
  }

  shareMatchPredictionsToWhatsApp(fixture: Fixture) {
    this.gameService.getFixturePredictions(fixture._id).subscribe({
      next: (predictions) => {
        const scoreA = fixture.scoreA;
        const scoreB = fixture.scoreB;
        
        let text = `⚽ *MATCH COMPLETED: ${fixture.teamA} ${scoreA} - ${scoreB} ${fixture.teamB}* ⚽\n`;
        text += `---------------------------------------------\n`;
        text += `🏆 *Match Settlement Points Distribution* 🏆\n\n`;

        const exactScorePlayers = predictions.filter(p => p.pointsEarned === 30).map(p => p.userId?.username || 'Unknown');
        const outcomePlayers = predictions.filter(p => p.pointsEarned === 10).map(p => p.userId?.username || 'Unknown');
        const incorrectPlayers = predictions.filter(p => p.pointsEarned === 0).map(p => p.userId?.username || 'Unknown');

        text += `🎯 *30 Points (Exact Score):*\n`;
        if (exactScorePlayers.length > 0) {
          exactScorePlayers.forEach(name => text += `• *${name}*\n`);
        } else {
          text += `• None\n`;
        }

        text += `\n🏅 *10 Points (Outcome):*\n`;
        if (outcomePlayers.length > 0) {
          outcomePlayers.forEach(name => text += `• *${name}*\n`);
        } else {
          text += `• None\n`;
        }

        // text += `\n❌ *0 Points (Incorrect):*\n`;
        // if (incorrectPlayers.length > 0) {
        //   incorrectPlayers.forEach(name => text += `• *${name}*\n`);
        // } else {
        //   text += `• None\n`;
        // }

        text += `\nKeep predicting to climb the charts! ⚽🔥\n`;

        const encodedText = encodeURIComponent(text);
        const whatsappUrl = `https://api.whatsapp.com/send?text=${encodedText}`;
        window.open(whatsappUrl, '_blank');
      },
      error: (err) => {
        this.showAlert(err.error?.message || 'Error fetching predictions for share.', 'error');
      }
    });
  }

  sharePredictionReminderToWhatsApp(fixture: Fixture) {
    const kickoffTime = new Date(fixture.matchTime);
    const options: Intl.DateTimeFormatOptions = {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hour12: true
    };
    const formattedTime = kickoffTime.toLocaleString('en-US', options);

    let text = `🔴🔴⏰⏰ *PREDICTION DEADLINE WARNING!* ⏰⏰🔴🔴\n`;
    text += `---------------------------------------------\n`;
    text += `🚨🚨 *DON'T FORGET TO PREDICT!* 🚨🚨\n\n`;
    text += `⚽ *Upcoming Match:* *${fixture.teamA}* vs *${fixture.teamB}* (Match #${fixture.matchNumber})\n`;
    if (fixture.venue) {
      text += `🏟️ *Venue:* ${fixture.venue}\n`;
    }
    text += `📅 *Kickoff:* ${formattedTime}\n\n`;
    text += `⚠️ *Predictions lock exactly 60 minutes before kickoff!*\n`;
    text += `Don't forget to submit your predictions on the portal to score points and climb the leaderboard! 🏆🔥\n\n`;
    text += `👉 *Predict Now:* ${window.location.origin}\n`;

    const encodedText = encodeURIComponent(text);
    const whatsappUrl = `https://api.whatsapp.com/send?text=${encodedText}`;
    window.open(whatsappUrl, '_blank');
  }

  shareAllPredictionsToWhatsApp(fixture: Fixture) {
    this.gameService.getFixturePredictions(fixture._id).subscribe({
      next: (predictions) => {
        let text = `⚽ *PREDICTIONS LIST: ${fixture.teamA} vs ${fixture.teamB}* ⚽\n`;
        text += `---------------------------------------------\n`;
        if (fixture.status === 'Completed') {
          text += `📊 *Actual Score:* *${fixture.teamA} ${fixture.scoreA} - ${fixture.scoreB} ${fixture.teamB}*\n\n`;
        }
        text += `📋 *What everyone predicted (Match #${fixture.matchNumber})*\n\n`;

        const activePlayers = this.players().filter(p => p.role === 'player');

        if (activePlayers.length === 0) {
          text += `No players registered yet.\n`;
        } else {
          activePlayers.forEach(player => {
            const pred = predictions.find(p => p.userId && (p.userId._id === player._id || p.userId === player._id));
            if (pred) {
              text += `• *${player.username}:* ${pred.predScoreA} - ${pred.predScoreB}\n`;
            } else {
              text += `• *${player.username}:* No prediction ❌\n`;
            }
          });
        }

        text += `\nGood luck to everyone! 🏆⚽🔥\n`;

        const encodedText = encodeURIComponent(text);
        const whatsappUrl = `https://api.whatsapp.com/send?text=${encodedText}`;
        window.open(whatsappUrl, '_blank');
      },
      error: (err) => {
        this.showAlert(err.error?.message || 'Error fetching predictions for sharing.', 'error');
      }
    });
  }
}
