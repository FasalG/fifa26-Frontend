import { Component, signal, ViewChild, ElementRef, AfterViewChecked, OnDestroy, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { GameService } from '../../services/game.service';
import { AuthService } from '../../services/auth.service';

interface ChatMessage {
  role: 'user' | 'model';
  text: string;
}

interface DBMessage {
  _id: string;
  sender: {
    _id: string;
    username: string;
    role: string;
  };
  recipient?: string | null;
  text: string;
  createdAt: string;
}

interface ChatPlayer {
  _id: string;
  username: string;
  role: string;
  totalPoints: number;
}

@Component({
  selector: 'app-chatbot',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <!-- FLOATING CHAT TRIGGER BUTTON -->
    <button 
      class="chatbot-trigger" 
      [class.open]="isOpen()" 
      (click)="toggleChat()"
      title="League Chat & AI Assistant">
      <span class="bot-icon" *ngIf="!isOpen()">💬</span>
      <span class="bot-icon" *ngIf="isOpen()">×</span>
      <span class="pulse-ring"></span>
    </button>

    <!-- CHAT WINDOW CONTAINER -->
    <div class="chatbot-window" [class.open]="isOpen()">
      
      <!-- HEADER WITH MODES/TABS -->
      <div class="chatbot-header-tabs">
        <button 
          class="tab-mode-btn" 
          [class.active]="activeTab() === 'ai'" 
          (click)="switchTab('ai')">
          🤖 AI Bot
        </button>
        <button 
          class="tab-mode-btn" 
          [class.active]="activeTab() === 'group'" 
          (click)="switchTab('group')">
          🌍 Group Chat
        </button>
        <button 
          class="tab-mode-btn" 
          [class.active]="activeTab() === 'private'" 
          (click)="switchTab('private')">
          👥 Private
        </button>
        <button 
          class="close-window-btn" 
          (click)="toggleChat()" 
          aria-label="Close Chat">
          ×
        </button>
      </div>

      <!-- HEADER FOR CHAT SUB-STATE (Only for Group and Private when user is selected) -->
      <div class="chatbot-sub-header" *ngIf="activeTab() === 'private' && selectedRecipient()">
        <button class="back-btn" (click)="deselectRecipient()">← Back</button>
        <div class="recipient-info">
          <span class="recipient-name">{{ selectedRecipient()?.username }}</span>
          <span class="recipient-badge" [class.admin-role]="selectedRecipient()?.role === 'admin'">
            {{ selectedRecipient()?.role === 'admin' ? 'Admin' : 'Player' }}
          </span>
        </div>
      </div>

      <!-- MAIN CONTENT AREAS BASED ON TABS -->
      
      <!-- 1. AI BOT CONTENT -->
      <ng-container *ngIf="activeTab() === 'ai'">
        <!-- Messages List -->
        <div class="chatbot-messages" #scrollContainer>
          <!-- Welcome Message -->
          <div class="message model">
            <div class="message-bubble">
              👋 Hello! I am your FIFA 2026 Prediction Assistant. Ask me anything about upcoming matches, leaderboard positions, team strengths, or game rules! ⚽🏆
            </div>
          </div>

          <div 
            *ngFor="let msg of messages()" 
            class="message" 
            [class.user]="msg.role === 'user'" 
            [class.model]="msg.role === 'model'">
            <div class="message-bubble">
              {{ msg.text }}
            </div>
          </div>

          <!-- Typing Indicator -->
          <div class="message model" *ngIf="loading()">
            <div class="message-bubble typing-bubble">
              <span class="dot"></span>
              <span class="dot"></span>
              <span class="dot"></span>
            </div>
          </div>
        </div>

        <!-- Reference Suggestions -->
        <div class="chatbot-suggestions" *ngIf="messages().length === 0 && !loading()">
          <p class="suggestions-title">💡 Ask about:</p>
          <div class="suggestions-grid">
            <button 
              *ngFor="let q of suggestions" 
              class="suggestion-btn" 
              (click)="askQuestion(q)">
              {{ q }}
            </button>
          </div>
        </div>

        <!-- Input Row -->
        <form class="chatbot-input-row" (submit)="$event.preventDefault(); sendMessage()">
          <input 
            type="text" 
            name="userInput"
            [(ngModel)]="userInput" 
            placeholder="Ask AI bot..." 
            [disabled]="loading()"
            autocomplete="off">
          <button 
            type="submit" 
            class="send-btn" 
            [disabled]="!userInput.trim() || loading()">
            ➔
          </button>
        </form>
      </ng-container>

      <!-- 2. GROUP CHAT CONTENT -->
      <ng-container *ngIf="activeTab() === 'group'">
        <div class="chatbot-messages db-messages" #scrollContainer>
          <div class="chat-welcome-notice">
            🌍 Welcome to the League Group Chat! All competitive players and admins in your league can see and chat here.
          </div>
          
          <div 
            *ngFor="let msg of dbMessages()" 
            class="message-db-wrapper"
            [class.mine]="isMyMessage(msg)">
            <div class="msg-sender-info" *ngIf="!isMyMessage(msg)">
              <span class="sender-name">{{ msg.sender?.username }}</span>
              <span class="sender-role-tag" [class.admin-tag]="msg.sender?.role === 'admin'">
                {{ msg.sender?.role === 'admin' ? 'Admin' : 'Player' }}
              </span>
            </div>
            <div class="message-bubble-db">
              <p class="msg-text">{{ msg.text }}</p>
              <span class="msg-time">{{ msg.createdAt | date:'shortTime' }}</span>
            </div>
          </div>
        </div>

        <form class="chatbot-input-row" (submit)="$event.preventDefault(); sendGroupChatMessage()">
          <input 
            type="text" 
            name="groupInput"
            [(ngModel)]="groupInput" 
            placeholder="Message league group..." 
            autocomplete="off">
          <button 
            type="submit" 
            class="send-btn" 
            [disabled]="!groupInput.trim()">
            ➔
          </button>
        </form>
      </ng-container>

      <!-- 3. PRIVATE CHAT CONTENT -->
      <ng-container *ngIf="activeTab() === 'private'">
        
        <!-- Recipient List Selection State -->
        <div class="players-list-container" *ngIf="!selectedRecipient()">
          <div class="list-title">Select a player to chat privately:</div>
          
          <div *ngIf="playersLoading" class="list-loader">
            <div class="mini-spinner"></div>
            <p>Loading players...</p>
          </div>

          <div *ngIf="!playersLoading && chatPlayers.length === 0" class="no-players-notice">
            No other players in your league yet.
          </div>

          <div class="players-list" *ngIf="!playersLoading && chatPlayers.length > 0">
            <div 
              *ngFor="let player of chatPlayers" 
              class="player-item"
              (click)="selectRecipient(player)">
              <div class="player-avatar">
                {{ player.username.substring(0, 2).toUpperCase() }}
              </div>
              <div class="player-details">
                <span class="player-name">{{ player.username }}</span>
                <span class="player-points-tag">🏆 {{ player.totalPoints || 0 }} pts</span>
              </div>
              <span class="role-badge" [class.admin-role]="player.role === 'admin'">
                {{ player.role === 'admin' ? 'Admin' : 'Player' }}
              </span>
            </div>
          </div>
        </div>

        <!-- Chat Conversation State -->
        <ng-container *ngIf="selectedRecipient()">
          <div class="chatbot-messages db-messages" #scrollContainer>
            <div class="chat-welcome-notice">
              🔐 This is a private chat with {{ selectedRecipient()?.username }}. Only the two of you can view these messages.
            </div>

            <div 
              *ngFor="let msg of dbMessages()" 
              class="message-db-wrapper"
              [class.mine]="isMyMessage(msg)">
              <div class="message-bubble-db">
                <p class="msg-text">{{ msg.text }}</p>
                <span class="msg-time">{{ msg.createdAt | date:'shortTime' }}</span>
              </div>
            </div>
          </div>

          <form class="chatbot-input-row" (submit)="$event.preventDefault(); sendPrivateChatMessage()">
            <input 
              type="text" 
              name="privateInput"
              [(ngModel)]="privateInput" 
              placeholder="Type a message..." 
              autocomplete="off">
            <button 
              type="submit" 
              class="send-btn" 
              [disabled]="!privateInput.trim()">
              ➔
            </button>
          </form>
        </ng-container>

      </ng-container>

    </div>
  `,
  styles: [`
    .chatbot-trigger {
      position: fixed;
      bottom: 24px;
      right: 24px;
      width: 60px;
      height: 60px;
      border-radius: 50%;
      background: linear-gradient(135deg, var(--primary) 0%, var(--primary-hover) 100%);
      border: none;
      color: white;
      font-size: 1.6rem;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      box-shadow: 0 4px 15px rgba(99, 102, 241, 0.4);
      z-index: 1000;
      transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
    }

    .chatbot-trigger:hover {
      transform: scale(1.08) rotate(5deg);
      box-shadow: 0 6px 20px rgba(99, 102, 241, 0.6);
    }

    .chatbot-trigger.open {
      transform: scale(0.9);
      background: var(--danger);
      box-shadow: 0 4px 12px rgba(239, 68, 68, 0.3);
    }

    .pulse-ring {
      position: absolute;
      width: 100%;
      height: 100%;
      border-radius: 50%;
      border: 2px solid var(--primary);
      animation: pulse 2.5s infinite;
      opacity: 0;
    }

    @keyframes pulse {
      0% {
        transform: scale(0.95);
        opacity: 0.8;
      }
      100% {
        transform: scale(1.4);
        opacity: 0;
      }
    }

    /* CHAT WINDOW */
    .chatbot-window {
      position: fixed;
      bottom: 96px;
      right: 24px;
      width: 380px;
      height: 540px;
      border-radius: var(--border-radius-lg);
      background-color: var(--bg-secondary);
      border: 1px solid var(--border-color);
      box-shadow: var(--card-shadow);
      z-index: 1001;
      display: flex;
      flex-direction: column;
      overflow: hidden;
      opacity: 0;
      pointer-events: none;
      transform: translateY(20px) scale(0.95);
      transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
    }

    .chatbot-window.open {
      opacity: 1;
      pointer-events: auto;
      transform: translateY(0) scale(1);
    }

    /* HEADER TABS */
    .chatbot-header-tabs {
      background-color: var(--bg-surface);
      border-bottom: 1px solid var(--border-color);
      display: flex;
      padding: 4px;
      gap: 4px;
      align-items: center;
    }

    .close-window-btn {
      background: none;
      border: none;
      color: var(--text-secondary);
      font-size: 1.6rem;
      cursor: pointer;
      line-height: 1;
      padding: 0 10px;
      display: flex;
      align-items: center;
      justify-content: center;
      transition: var(--transition);
      border-left: 1px solid var(--border-color);
      margin-left: 4px;
      height: 32px;
    }

    .close-window-btn:hover {
      color: var(--danger);
      background-color: rgba(239, 68, 68, 0.1);
      border-radius: var(--border-radius-md);
    }

    .tab-mode-btn {
      flex: 1;
      background: none;
      border: none;
      color: var(--text-secondary);
      padding: 12px 6px;
      font-size: 0.82rem;
      font-weight: 600;
      cursor: pointer;
      border-radius: var(--border-radius-md);
      transition: var(--transition);
      text-align: center;
    }

    .tab-mode-btn:hover {
      background-color: var(--bg-secondary);
      color: var(--text-primary);
    }

    .tab-mode-btn.active {
      background-color: var(--bg-secondary);
      color: var(--primary);
      box-shadow: 0 1px 3px rgba(0,0,0,0.1);
    }

    /* SUB HEADER */
    .chatbot-sub-header {
      background-color: var(--bg-secondary);
      border-bottom: 1px solid var(--border-color);
      padding: 8px 12px;
      display: flex;
      align-items: center;
      gap: 10px;
    }

    .back-btn {
      background-color: var(--bg-primary);
      border: 1px solid var(--border-color);
      color: var(--text-primary);
      padding: 4px 8px;
      font-size: 0.75rem;
      border-radius: var(--border-radius-sm);
      cursor: pointer;
      font-weight: 600;
      transition: var(--transition);
    }

    .back-btn:hover {
      background-color: var(--bg-surface-hover);
    }

    .recipient-info {
      display: flex;
      align-items: center;
      gap: 6px;
    }

    .recipient-name {
      font-size: 0.85rem;
      font-weight: 700;
      color: var(--text-primary);
    }

    .recipient-badge {
      font-size: 0.65rem;
      font-weight: 700;
      padding: 1px 4px;
      border-radius: 3px;
      background-color: var(--bg-primary);
      color: var(--text-secondary);
      border: 1px solid var(--border-color);
    }

    .recipient-badge.admin-role {
      background-color: rgba(99, 102, 241, 0.15);
      color: var(--primary);
      border-color: rgba(99, 102, 241, 0.3);
    }

    /* MESSAGES AREA */
    .chatbot-messages {
      flex: 1;
      padding: 16px;
      overflow-y: auto;
      display: flex;
      flex-direction: column;
      gap: 12px;
      background-color: var(--bg-primary);
    }

    .chat-welcome-notice {
      font-size: 0.75rem;
      color: var(--text-muted);
      text-align: center;
      background-color: var(--bg-secondary);
      padding: 8px 12px;
      border-radius: var(--border-radius-md);
      margin-bottom: 8px;
      border: 1px solid var(--border-color);
      line-height: 1.4;
    }

    .message {
      display: flex;
      max-width: 85%;
    }

    .message.model {
      align-self: flex-start;
    }

    .message.user {
      align-self: flex-end;
    }

    .message-bubble {
      padding: 10px 14px;
      border-radius: 14px;
      font-size: 0.88rem;
      line-height: 1.4;
      white-space: pre-wrap;
      word-break: break-word;
    }

    .message.model .message-bubble {
      background-color: var(--bg-surface);
      color: var(--text-primary);
      border-bottom-left-radius: 4px;
      border: 1px solid var(--border-color);
    }

    .message.user .message-bubble {
      background: linear-gradient(135deg, var(--primary) 0%, var(--primary-hover) 100%);
      color: white;
      border-bottom-right-radius: 4px;
    }

    /* DB MESSAGES FORMAT (GROUP / PRIVATE) */
    .message-db-wrapper {
      display: flex;
      flex-direction: column;
      max-width: 80%;
      align-self: flex-start;
    }

    .message-db-wrapper.mine {
      align-self: flex-end;
    }

    .msg-sender-info {
      font-size: 0.72rem;
      color: var(--text-muted);
      margin-left: 6px;
      margin-bottom: 3px;
      display: flex;
      align-items: center;
      gap: 4px;
    }

    .sender-name {
      font-weight: 700;
    }

    .sender-role-tag {
      font-size: 0.6rem;
      padding: 0px 3px;
      border-radius: 2px;
      background-color: var(--bg-secondary);
      color: var(--text-muted);
    }

    .sender-role-tag.admin-tag {
      background-color: rgba(99, 102, 241, 0.1);
      color: var(--primary);
    }

    .message-bubble-db {
      padding: 8px 12px;
      border-radius: 12px;
      font-size: 0.85rem;
      line-height: 1.35;
      background-color: var(--bg-surface);
      color: var(--text-primary);
      border-bottom-left-radius: 2px;
      border: 1px solid var(--border-color);
      position: relative;
    }

    .message-db-wrapper.mine .message-bubble-db {
      background: linear-gradient(135deg, var(--primary) 0%, var(--primary-hover) 100%);
      color: white;
      border-bottom-left-radius: 12px;
      border-bottom-right-radius: 2px;
      border: none;
    }

    .msg-text {
      margin: 0 0 4px 0;
      white-space: pre-wrap;
      word-break: break-word;
    }

    .msg-time {
      font-size: 0.65rem;
      color: var(--text-muted);
      float: right;
      display: block;
      margin-top: 2px;
    }

    .message-db-wrapper.mine .msg-time {
      color: rgba(255, 255, 255, 0.75);
    }

    /* PLAYERS LIST PRIVATE CHAT */
    .players-list-container {
      flex: 1;
      background-color: var(--bg-primary);
      padding: 16px;
      display: flex;
      flex-direction: column;
      overflow-y: auto;
    }

    .list-title {
      font-size: 0.8rem;
      font-weight: 700;
      color: var(--text-secondary);
      margin-bottom: 12px;
      text-transform: uppercase;
      letter-spacing: 0.05em;
    }

    .players-list {
      display: flex;
      flex-direction: column;
      gap: 8px;
    }

    .player-item {
      display: flex;
      align-items: center;
      padding: 10px 12px;
      background-color: var(--bg-secondary);
      border: 1px solid var(--border-color);
      border-radius: var(--border-radius-md);
      cursor: pointer;
      transition: var(--transition);
      gap: 10px;
    }

    .player-item:hover {
      background-color: var(--bg-surface-hover);
      border-color: var(--primary);
    }

    .player-avatar {
      width: 32px;
      height: 32px;
      background-color: var(--bg-primary);
      border: 1px solid var(--border-color);
      color: var(--primary);
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 0.78rem;
      font-weight: 700;
    }

    .player-details {
      flex: 1;
      display: flex;
      flex-direction: column;
    }

    .player-name {
      font-size: 0.85rem;
      font-weight: 700;
      color: var(--text-primary);
    }

    .player-points-tag {
      font-size: 0.7rem;
      color: var(--text-muted);
    }

    .role-badge {
      font-size: 0.65rem;
      font-weight: 700;
      padding: 2px 6px;
      border-radius: 3px;
      background-color: var(--bg-primary);
      color: var(--text-secondary);
    }

    .role-badge.admin-role {
      background-color: rgba(99, 102, 241, 0.15);
      color: var(--primary);
    }

    /* TYPING / SPINNERS */
    .typing-bubble {
      display: flex;
      gap: 4px;
      align-items: center;
      padding: 12px 16px;
    }

    .typing-bubble .dot {
      width: 6px;
      height: 6px;
      background-color: var(--text-secondary);
      border-radius: 50%;
      animation: bounce 1.4s infinite ease-in-out both;
    }

    .typing-bubble .dot:nth-child(1) { animation-delay: -0.32s; }
    .typing-bubble .dot:nth-child(2) { animation-delay: -0.16s; }

    @keyframes bounce {
      0%, 80%, 100% { transform: scale(0); }
      40% { transform: scale(1.0); }
    }

    .list-loader {
      text-align: center;
      padding: 30px 0;
      color: var(--text-muted);
      font-size: 0.8rem;
    }

    .mini-spinner {
      border: 3px solid var(--border-color);
      border-top: 3px solid var(--primary);
      border-radius: 50%;
      width: 20px;
      height: 20px;
      animation: spin 0.8s linear infinite;
      margin: 0 auto 10px;
    }

    .no-players-notice {
      font-size: 0.8rem;
      color: var(--text-muted);
      text-align: center;
      padding: 20px 0;
    }

    /* SUGGESTIONS PANEL */
    .chatbot-suggestions {
      padding: 10px 16px 14px;
      background-color: var(--bg-primary);
      border-top: 1px solid var(--border-color);
    }

    .suggestions-title {
      font-size: 0.75rem;
      color: var(--text-muted);
      margin-bottom: 8px;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 0.05em;
    }

    .suggestions-grid {
      display: flex;
      flex-direction: column;
      gap: 6px;
    }

    .suggestion-btn {
      background-color: var(--bg-secondary);
      border: 1px solid var(--border-color);
      color: var(--text-secondary);
      border-radius: var(--border-radius-sm);
      padding: 8px 12px;
      font-size: 0.8rem;
      cursor: pointer;
      text-align: left;
      transition: var(--transition);
      font-weight: 500;
    }

    .suggestion-btn:hover {
      background-color: var(--bg-surface-hover);
      border-color: var(--primary);
      color: var(--text-primary);
      transform: translateX(4px);
    }

    /* INPUT ROW */
    .chatbot-input-row {
      display: flex;
      padding: 12px;
      background-color: var(--bg-secondary);
      border-top: 1px solid var(--border-color);
      gap: 8px;
    }

    .chatbot-input-row input {
      flex: 1;
      background-color: var(--bg-primary);
      border: 1px solid var(--border-color);
      color: var(--text-primary);
      border-radius: var(--border-radius-md);
      padding: 10px 14px;
      font-size: 0.88rem;
      outline: none;
      transition: border-color 0.2s;
    }

    .chatbot-input-row input:focus {
      border-color: var(--primary);
    }

    .send-btn {
      background: linear-gradient(135deg, var(--primary) 0%, var(--primary-hover) 100%);
      color: white;
      border: none;
      border-radius: var(--border-radius-md);
      width: 40px;
      height: 40px;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 1.1rem;
      transition: var(--transition);
    }

    .send-btn:hover:not(:disabled) {
      transform: scale(1.05);
    }

    .send-btn:disabled {
      opacity: 0.5;
      cursor: not-allowed;
    }

    /* RESPONSIVE LAYOUT (Mobile Full Screen Overlay) */
    @media (max-width: 768px) {
      .chatbot-window {
        width: 100%;
        height: 100dvh;
        bottom: 0;
        right: 0;
        border-radius: 0;
        border: none;
        transform: translateY(100%);
        z-index: 10000;
      }

      .chatbot-window.open {
        transform: translateY(0);
      }

      .chatbot-trigger.open {
        display: block; /* keep trigger block, let close btn do closing or use trigger to close */
      }

      .chatbot-trigger {
        bottom: 16px;
        right: 16px;
        width: 56px;
        height: 56px;
      }

      .chatbot-input-row {
        padding: 16px 12px calc(12px + env(safe-area-inset-bottom, 0px));
      }
    }
  `]
})
export class ChatbotComponent implements OnInit, AfterViewChecked, OnDestroy {
  @ViewChild('scrollContainer') private scrollContainer!: ElementRef;

  // Global overlay toggle
  isOpen = signal<boolean>(false);
  activeTab = signal<'ai' | 'group' | 'private'>('ai');

  // 1. AI Assistant State
  messages = signal<ChatMessage[]>([]);
  userInput = '';
  loading = signal<boolean>(false);
  suggestions = [
    'Who is leading the leaderboard? 🏆',
    'Tell me about the upcoming matches ⚽',
    'What are my predictions? 🎯',
    'Explain the scoring rules 📊'
  ];

  // 2. Group Chat State
  groupInput = '';
  dbMessages = signal<DBMessage[]>([]);

  // 3. Private Chat State
  privateInput = '';
  chatPlayers: ChatPlayer[] = [];
  playersLoading = false;
  selectedRecipient = signal<ChatPlayer | null>(null);

  // Polling Timer
  private pollTimer: any = null;

  constructor(
    private gameService: GameService,
    public authService: AuthService
  ) {}

  ngOnInit() {
    // Initial fetch of players list for private chat in background
    this.loadChatPlayers();
  }

  ngAfterViewChecked() {
    this.scrollToBottom();
  }

  ngOnDestroy() {
    this.stopPolling();
    document.body.style.overflow = '';
  }

  toggleChat() {
    this.isOpen.update(val => {
      const nextVal = !val;
      if (nextVal) {
        document.body.style.overflow = 'hidden';
        this.resumeActiveTabPolling();
      } else {
        document.body.style.overflow = '';
        this.stopPolling();
      }
      return nextVal;
    });
  }

  switchTab(tab: 'ai' | 'group' | 'private') {
    this.activeTab.set(tab);
    this.stopPolling();

    if (tab === 'group') {
      this.fetchGroupMessages();
      this.startPolling(() => this.fetchGroupMessagesSilently());
    } else if (tab === 'private') {
      this.loadChatPlayers();
      if (this.selectedRecipient()) {
        this.fetchPrivateMessages();
        this.startPolling(() => this.fetchPrivateMessagesSilently());
      }
    }
    // Auto scroll after view update
    setTimeout(() => this.scrollToBottom(), 50);
  }

  // --- POLLING UTILS ---
  private startPolling(callback: () => void) {
    this.stopPolling();
    this.pollTimer = setInterval(callback, 4000); // poll every 4 seconds
  }

  private stopPolling() {
    if (this.pollTimer) {
      clearInterval(this.pollTimer);
      this.pollTimer = null;
    }
  }

  private resumeActiveTabPolling() {
    const tab = this.activeTab();
    if (tab === 'group') {
      this.fetchGroupMessages();
      this.startPolling(() => this.fetchGroupMessagesSilently());
    } else if (tab === 'private' && this.selectedRecipient()) {
      this.fetchPrivateMessages();
      this.startPolling(() => this.fetchPrivateMessagesSilently());
    }
  }

  // --- sender helper ---
  isMyMessage(msg: DBMessage): boolean {
    const myId = this.authService.currentUserSignal()?._id;
    const senderId = typeof msg.sender === 'object' && msg.sender ? msg.sender._id : msg.sender;
    return myId === senderId;
  }

  // --- 1. AI ASSISTANT ---
  askQuestion(question: string) {
    this.userInput = question;
    this.sendMessage();
  }

  sendMessage() {
    const text = this.userInput.trim();
    if (!text || this.loading()) return;

    this.messages.update(msgs => [...msgs, { role: 'user', text }]);
    this.userInput = '';
    this.loading.set(true);

    const history = this.messages().slice(0, -1);

    this.gameService.askChatbot(text, history).subscribe({
      next: (res) => {
        this.messages.update(msgs => [...msgs, { role: 'model', text: res.reply }]);
        this.loading.set(false);
      },
      error: (err) => {
        console.error('Chatbot error:', err);
        this.messages.update(msgs => [...msgs, { role: 'model', text: 'Sorry, I am experiencing connection issues. Please try again in a moment. 🔌' }]);
        this.loading.set(false);
      }
    });
  }

  // --- 2. GROUP CHAT ---
  fetchGroupMessages() {
    this.gameService.getGroupMessages().subscribe({
      next: (msgs) => {
        this.dbMessages.set(msgs);
        setTimeout(() => this.scrollToBottom(), 50);
      },
      error: (err) => console.error('Error fetching group messages:', err)
    });
  }

  fetchGroupMessagesSilently() {
    this.gameService.getGroupMessages().subscribe({
      next: (msgs) => {
        const currentLength = this.dbMessages().length;
        this.dbMessages.set(msgs);
        if (msgs.length > currentLength) {
          setTimeout(() => this.scrollToBottom(), 50);
        }
      }
    });
  }

  sendGroupChatMessage() {
    const text = this.groupInput.trim();
    if (!text) return;

    this.groupInput = '';
    this.gameService.sendGroupMessage(text).subscribe({
      next: (newMsg) => {
        this.dbMessages.update(msgs => [...msgs, newMsg]);
        setTimeout(() => this.scrollToBottom(), 50);
      },
      error: (err) => console.error('Error sending group message:', err)
    });
  }

  // --- 3. PRIVATE CHAT ---
  loadChatPlayers() {
    this.playersLoading = true;
    this.gameService.getChatPlayers().subscribe({
      next: (players) => {
        this.chatPlayers = players;
        this.playersLoading = false;
      },
      error: (err) => {
        console.error('Error loading chat players:', err);
        this.playersLoading = false;
      }
    });
  }

  selectRecipient(player: ChatPlayer) {
    this.selectedRecipient.set(player);
    this.fetchPrivateMessages();
    this.startPolling(() => this.fetchPrivateMessagesSilently());
  }

  deselectRecipient() {
    this.stopPolling();
    this.selectedRecipient.set(null);
    this.dbMessages.set([]);
  }

  fetchPrivateMessages() {
    const recipient = this.selectedRecipient();
    if (!recipient) return;

    this.gameService.getPrivateMessages(recipient._id).subscribe({
      next: (msgs) => {
        this.dbMessages.set(msgs);
        setTimeout(() => this.scrollToBottom(), 50);
      },
      error: (err) => console.error('Error fetching private messages:', err)
    });
  }

  fetchPrivateMessagesSilently() {
    const recipient = this.selectedRecipient();
    if (!recipient) return;

    this.gameService.getPrivateMessages(recipient._id).subscribe({
      next: (msgs) => {
        const currentLength = this.dbMessages().length;
        this.dbMessages.set(msgs);
        if (msgs.length > currentLength) {
          setTimeout(() => this.scrollToBottom(), 50);
        }
      }
    });
  }

  sendPrivateChatMessage() {
    const recipient = this.selectedRecipient();
    const text = this.privateInput.trim();
    if (!recipient || !text) return;

    this.privateInput = '';
    this.gameService.sendPrivateMessage(recipient._id, text).subscribe({
      next: (newMsg) => {
        this.dbMessages.update(msgs => [...msgs, newMsg]);
        setTimeout(() => this.scrollToBottom(), 50);
      },
      error: (err) => console.error('Error sending private message:', err)
    });
  }

  private scrollToBottom(): void {
    try {
      this.scrollContainer.nativeElement.scrollTop = this.scrollContainer.nativeElement.scrollHeight;
    } catch (err) {}
  }
}
