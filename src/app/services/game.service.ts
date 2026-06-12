import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { AuthService } from './auth.service';
import { environment } from '../../environments/environment';

export interface Prediction {
  _id?: string;
  userId: string;
  matchId: string;
  predScoreA: number;
  predScoreB: number;
  pointsEarned: number;
  timestamp: string;
}

export interface Fixture {
  _id: string;
  matchNumber: number;
  teamA: string;
  teamB: string;
  matchTime: string; // ISO UTC DateTime
  venue: string;
  status: 'Upcoming' | 'Live' | 'Completed';
  scoreA: number | null;
  scoreB: number | null;
  winner: 'A' | 'B' | 'Tie' | null;
  isLocked: boolean;
  myPrediction: Prediction | null;
}

export interface Group {
  _id?: string;
  name: string;
}

export interface Team {
  _id?: string;
  name: string;
  group: string | Group;
  logo?: string;
  points?: number;
  goalsScored?: number;
  played?: number;
  won?: number;
  lost?: number;
  draw?: number;
}

export interface LeaderboardUser {
  _id: string;
  username: string;
  totalPoints: number;
  role: string;
}

@Injectable({
  providedIn: 'root'
})
export class GameService {
  private apiUrl = environment.apiUrl;

  constructor(
    private http: HttpClient,
    private authService: AuthService
  ) {}

  getFixtures(): Observable<Fixture[]> {
    return this.http.get<Fixture[]>(`${this.apiUrl}/fixtures`, {
      headers: this.authService.getAuthHeaders()
    });
  }

  submitPrediction(matchId: string, predScoreA: number, predScoreB: number): Observable<{ message: string; prediction: Prediction }> {
    return this.http.post<{ message: string; prediction: Prediction }>(
      `${this.apiUrl}/predictions`,
      { matchId, predScoreA, predScoreB },
      { headers: this.authService.getAuthHeaders() }
    );
  }

  getLeaderboard(): Observable<LeaderboardUser[]> {
    return this.http.get<LeaderboardUser[]>(`${this.apiUrl}/leaderboard`, {
      headers: this.authService.getAuthHeaders()
    });
  }

  getTeams(): Observable<Team[]> {
    return this.http.get<Team[]>(`${this.apiUrl}/teams`, {
      headers: this.authService.getAuthHeaders()
    });
  }

  getGroups(): Observable<Group[]> {
    return this.http.get<Group[]>(`${this.apiUrl}/groups`, {
      headers: this.authService.getAuthHeaders()
    });
  }

  settleMatch(matchId: string, scoreA: number, scoreB: number): Observable<any> {
    return this.http.post<any>(
      `${this.apiUrl}/admin/settle-match`,
      { matchId, scoreA, scoreB },
      { headers: this.authService.getAuthHeaders() }
    );
  }

  createFixture(matchNumber: number, teamA: string, teamB: string, matchTime: string, venue: string): Observable<Fixture> {
    return this.http.post<Fixture>(
      `${this.apiUrl}/admin/fixtures`,
      { matchNumber, teamA, teamB, matchTime, venue },
      { headers: this.authService.getAuthHeaders() }
    );
  }

  updateFixture(id: string, matchNumber: number, teamA: string, teamB: string, matchTime: string, venue: string, status: string): Observable<Fixture> {
    return this.http.put<Fixture>(
      `${this.apiUrl}/admin/fixtures/${id}`,
      { matchNumber, teamA, teamB, matchTime, venue, status },
      { headers: this.authService.getAuthHeaders() }
    );
  }

  deleteFixture(id: string): Observable<any> {
    return this.http.delete<any>(
      `${this.apiUrl}/admin/fixtures/${id}`,
      { headers: this.authService.getAuthHeaders() }
    );
  }

  createTeam(name: string, group: string, logo?: string): Observable<Team> {
    return this.http.post<Team>(
      `${this.apiUrl}/admin/teams`,
      { name, group, logo },
      { headers: this.authService.getAuthHeaders() }
    );
  }

  updateTeam(id: string, name: string, group: string, logo?: string): Observable<Team> {
    return this.http.put<Team>(
      `${this.apiUrl}/admin/teams/${id}`,
      { name, group, logo },
      { headers: this.authService.getAuthHeaders() }
    );
  }

  deleteTeam(id: string): Observable<any> {
    return this.http.delete<any>(
      `${this.apiUrl}/admin/teams/${id}`,
      { headers: this.authService.getAuthHeaders() }
    );
  }

  createPlayer(username: string, email: string, password: string): Observable<any> {
    return this.http.post<any>(
      `${this.apiUrl}/admin/players`,
      { username, email, password },
      { headers: this.authService.getAuthHeaders() }
    );
  }

  getPlayers(): Observable<any[]> {
    return this.http.get<any[]>(
      `${this.apiUrl}/admin/players`,
      { headers: this.authService.getAuthHeaders() }
    );
  }

  updatePlayer(id: string, username: string, email: string, password?: string, totalPoints?: number): Observable<any> {
    const body: any = { username, email };
    if (password) body.password = password;
    if (totalPoints !== undefined) body.totalPoints = totalPoints;
    return this.http.put<any>(
      `${this.apiUrl}/admin/players/${id}`,
      body,
      { headers: this.authService.getAuthHeaders() }
    );
  }

  deletePlayer(id: string): Observable<any> {
    return this.http.delete<any>(
      `${this.apiUrl}/admin/players/${id}`,
      { headers: this.authService.getAuthHeaders() }
    );
  }

  createGroup(name: string): Observable<Group> {
    return this.http.post<Group>(
      `${this.apiUrl}/admin/groups`,
      { name },
      { headers: this.authService.getAuthHeaders() }
    );
  }

  updateGroup(id: string, name: string): Observable<Group> {
    return this.http.put<Group>(
      `${this.apiUrl}/admin/groups/${id}`,
      { name },
      { headers: this.authService.getAuthHeaders() }
    );
  }

  deleteGroup(id: string): Observable<any> {
    return this.http.delete<any>(
      `${this.apiUrl}/admin/groups/${id}`,
      { headers: this.authService.getAuthHeaders() }
    );
  }

  getFixturePredictions(id: string): Observable<any[]> {
    return this.http.get<any[]>(
      `${this.apiUrl}/admin/fixtures/${id}/predictions`,
      { headers: this.authService.getAuthHeaders() }
    );
  }

  askChatbot(message: string, history: any[]): Observable<{ reply: string }> {
    return this.http.post<{ reply: string }>(
      `${this.apiUrl}/chat`,
      { message, history },
      { headers: this.authService.getAuthHeaders() }
    );
  }
}
