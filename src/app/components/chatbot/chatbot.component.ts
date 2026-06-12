import { Component, signal, ViewChild, ElementRef, AfterViewChecked, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { GameService } from '../../services/game.service';

interface ChatMessage {
  role: 'user' | 'model';
  text: string;
}

@Component({
  selector: 'app-chatbot',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <!-- FLOATING CHATBOT TRIGGER BUTTON -->
    <button 
      class="chatbot-trigger" 
      [class.open]="isOpen()" 
      (click)="toggleChat()"
      title="Ask FIFA Predictor AI">
      <span class="bot-icon">🤖</span>
      <span class="pulse-ring"></span>
    </button>

    <!-- CHAT WINDOW CONTAINER -->
    <div class="chatbot-window" [class.open]="isOpen()">
      <!-- Header -->
      <div class="chatbot-header">
        <div class="bot-info">
          <span class="avatar-icon">🤖</span>
          <div class="header-text">
            <h4>Predictor AI</h4>
            <span class="status-online"><span class="dot"></span> Online</span>
          </div>
        </div>
        <button class="close-btn" (click)="toggleChat()" aria-label="Close Chat">×</button>
      </div>

      <!-- Messages List -->
      <div class="chatbot-messages" #scrollContainer>
        <!-- Welcome Message -->
        <div class="message model">
          <div class="message-bubble">
            👋 Hello! I am your FIFA 2026 Prediction Assistant. Ask me anything about upcoming matches, leaderboard positions, your predictions, or game rules! ⚽🏆
          </div>
        </div>

        <!-- Dynamic Messages -->
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

      <!-- Reference Questions / Suggestions -->
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
          placeholder="Ask a question..." 
          [disabled]="loading()"
          autocomplete="off">
        <button 
          type="submit" 
          class="send-btn" 
          [disabled]="!userInput.trim() || loading()">
          ➔
        </button>
      </form>
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
      font-size: 1.8rem;
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
      transform: rotate(90deg) scale(0.9);
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
      height: 520px;
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

    .chatbot-header {
      background-color: var(--bg-surface);
      border-bottom: 1px solid var(--border-color);
      padding: 14px 18px;
      display: flex;
      justify-content: space-between;
      align-items: center;
    }

    .bot-info {
      display: flex;
      align-items: center;
      gap: 10px;
    }

    .avatar-icon {
      font-size: 1.4rem;
    }

    .header-text h4 {
      margin: 0;
      font-size: 0.95rem;
      font-weight: 700;
      color: var(--text-primary);
    }

    .status-online {
      font-size: 0.75rem;
      color: var(--accent);
      display: flex;
      align-items: center;
      gap: 4px;
      font-weight: 500;
    }

    .status-online .dot {
      width: 6px;
      height: 6px;
      background-color: var(--accent);
      border-radius: 50%;
      display: inline-block;
      box-shadow: 0 0 6px var(--accent);
    }

    .close-btn {
      background: none;
      border: none;
      color: var(--text-secondary);
      font-size: 1.8rem;
      cursor: pointer;
      line-height: 1;
      padding: 0 4px;
      display: flex;
      align-items: center;
      justify-content: center;
      width: 30px;
      height: 30px;
      border-radius: 50%;
      transition: var(--transition);
    }

    .close-btn:hover {
      color: var(--text-primary);
      background-color: var(--bg-surface-hover);
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

    /* TYPING INDICATOR */
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
      background: linear-gradient(135deg, var(--primary-hover) 0%, var(--primary) 100%);
    }

    .send-btn:disabled {
      opacity: 0.5;
      cursor: not-allowed;
    }

    /* RESPONSIVE LAYOUT (Mobile Full Screen Overlay) */
    @media (max-width: 768px) {
      .chatbot-window {
        width: 100%;
        height: 100%;
        height: 100dvh;
        bottom: 0;
        right: 0;
        border-radius: 0;
        border: none;
        transform: translateY(100%);
        z-index: 10000; /* overlay all including sidebars */
      }

      .chatbot-window.open {
        transform: translateY(0);
      }

      .chatbot-trigger.open {
        display: none; /* Hide floating trigger when chat window is open on mobile */
      }

      .chatbot-trigger {
        bottom: 16px;
        right: 16px;
        width: 56px;
        height: 56px;
      }

      .chatbot-header {
        padding: 16px 20px;
      }

      .close-btn {
        width: 36px;
        height: 36px;
        font-size: 2.2rem;
      }

      .chatbot-input-row {
        padding: 16px 12px calc(12px + env(safe-area-inset-bottom, 0px));
      }
    }
  `]
})
export class ChatbotComponent implements AfterViewChecked, OnDestroy {
  @ViewChild('scrollContainer') private scrollContainer!: ElementRef;

  isOpen = signal<boolean>(false);
  messages = signal<ChatMessage[]>([]);
  userInput = '';
  loading = signal<boolean>(false);

  suggestions = [
    'Who is leading the leaderboard? 🏆',
    'Tell me about the upcoming matches ⚽',
    'What are my predictions? 🎯',
    'Explain the scoring rules 📊'
  ];

  constructor(private gameService: GameService) {}

  ngAfterViewChecked() {
    this.scrollToBottom();
  }

  ngOnDestroy() {
    // Clean up body scroll lock if component is destroyed while open
    document.body.style.overflow = '';
  }

  toggleChat() {
    this.isOpen.update(val => {
      const nextVal = !val;
      if (nextVal) {
        document.body.style.overflow = 'hidden';
      } else {
        document.body.style.overflow = '';
      }
      return nextVal;
    });
  }

  askQuestion(question: string) {
    this.userInput = question;
    this.sendMessage();
  }

  sendMessage() {
    const text = this.userInput.trim();
    if (!text || this.loading()) return;

    // Add user message
    this.messages.update(msgs => [...msgs, { role: 'user', text }]);
    this.userInput = '';
    this.loading.set(true);

    // Prepare history format
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

  private scrollToBottom(): void {
    try {
      this.scrollContainer.nativeElement.scrollTop = this.scrollContainer.nativeElement.scrollHeight;
    } catch (err) {}
  }
}
