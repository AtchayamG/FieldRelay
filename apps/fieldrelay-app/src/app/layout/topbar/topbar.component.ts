import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { ThemeService } from '../../core/services/theme.service';
import { AuthService } from '../../core/services/auth.service';
import { IconComponent } from '../../shared/components/icon/icon.component';

@Component({
  selector: 'app-topbar',
  standalone: true,
  imports: [CommonModule, RouterModule, IconComponent],
  template: `
    <header class="app-topbar" role="banner">
      <div class="topbar-left">
        <a routerLink="/mission-control" class="brand-link" aria-label="FieldRelay Home">
          <div class="brand-icon">
            <span class="pulse-ring"></span>
            <fr-icon class="icon-inner" name="bolt" [size]="18" [strokeWidth]="2" />
          </div>
          <div class="brand-text">
            <span class="brand-name">FIELD<span class="brand-accent">RELAY</span></span>
            <span class="brand-sub">Neon Ops Enterprise</span>
          </div>
        </a>

        <div class="live-pill" aria-label="Simulated operations status">
          <span class="live-dot"></span>
          <span class="live-text font-mono">DEMO OPS</span>
        </div>
      </div>

      <div class="topbar-center hide-mobile">
        <div class="global-search">
          <fr-icon class="search-icon" name="search" [size]="18" />
          <input
            type="search"
            placeholder="Search incidents, call IDs, properties, vendors..."
            aria-label="Global search"
            disabled
            title="Global search is planned"
          />
          <kbd class="search-kbd">⌘K</kbd>
        </div>
      </div>

      <div class="topbar-right">
        <button
          type="button"
          class="icon-btn theme-toggle"
          (click)="themeService.toggleTheme()"
          [attr.aria-label]="'Switch to ' + (themeService.currentTheme() === 'dark' ? 'light' : 'dark') + ' theme'"
          [title]="'Switch to ' + (themeService.currentTheme() === 'dark' ? 'light' : 'dark') + ' theme'"
        >
          <fr-icon *ngIf="themeService.currentTheme() === 'dark'" name="sun" [size]="19" />
          <fr-icon *ngIf="themeService.currentTheme() === 'light'" name="moon" [size]="19" />
        </button>

        <div class="user-session" *ngIf="authService.currentSession() as session">
          <div class="user-info hide-mobile">
            <span class="user-name">{{ session.name }}</span>
            <span class="user-role badge-demo" *ngIf="session.isDemo">SIMULATED DEMO</span>
          </div>
          <button
            type="button"
            class="signout-btn"
            (click)="authService.signOut()"
            aria-label="Sign out"
            title="Sign out"
          >
            <fr-icon name="sign-out" [size]="19" />
          </button>
        </div>
      </div>
    </header>
  `,
  styles: [`
    .app-topbar {
      height: var(--fr-shell-topbar);
      background: var(--fr-color-surface);
      border-bottom: 1px solid var(--fr-color-border);
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 0 var(--fr-space-lg);
      position: sticky;
      top: 0;
      z-index: 100;
    }
    @media (max-width: 767px) {
      .app-topbar {
        height: var(--fr-shell-mobile-topbar);
        padding: 0 var(--fr-space-md);
      }
    }
    .topbar-left {
      display: flex;
      align-items: center;
      gap: var(--fr-space-md);
    }
    .brand-link {
      display: flex;
      align-items: center;
      gap: var(--fr-space-xs);
      text-decoration: none;
      color: inherit;
    }
    .brand-icon {
      width: 38px;
      height: 38px;
      border-radius: var(--fr-radius-md);
      background: linear-gradient(135deg, var(--fr-color-primary), var(--fr-color-cyan));
      display: flex;
      align-items: center;
      justify-content: center;
      color: var(--fr-color-on-accent);
      font-size: 18px;
      position: relative;
    }
    .brand-name {
      font-weight: 800;
      font-size: 16px;
      letter-spacing: 0.5px;
    }
    .brand-accent {
      color: var(--fr-color-primary-bright);
    }
    .brand-sub {
      display: block;
      font-size: 10px;
      color: var(--fr-color-muted);
      text-transform: uppercase;
      letter-spacing: 0.8px;
    }
    .live-pill {
      display: flex;
      align-items: center;
      gap: 6px;
      padding: 3px 8px;
      border-radius: var(--fr-radius-pill);
      background: var(--fr-color-cyan-soft);
      border: 1px solid var(--fr-color-cyan-border);
      color: var(--fr-color-cyan);
      font-size: 10px;
      font-weight: 700;
    }
    .live-dot {
      width: 6px;
      height: 6px;
      border-radius: 50%;
      background: var(--fr-color-cyan);
      box-shadow: 0 0 8px var(--fr-color-cyan);
    }
    .topbar-center {
      flex: 1;
      max-width: 480px;
      margin: 0 var(--fr-space-lg);
    }
    .global-search {
      position: relative;
      display: flex;
      align-items: center;
    }
    .global-search input {
      width: 100%;
      background: var(--fr-color-surface3);
      border: 1px solid var(--fr-color-border);
      border-radius: var(--fr-radius-pill);
      padding: 8px 36px 8px 36px;
      color: var(--fr-color-text);
      font-size: 13px;
    }
    .search-icon {
      position: absolute;
      left: 12px;
      opacity: 0.6;
    }
    .search-kbd {
      position: absolute;
      right: 12px;
      background: var(--fr-color-surface2);
      border: 1px solid var(--fr-color-border);
      border-radius: 4px;
      padding: 2px 6px;
      font-size: 10px;
      color: var(--fr-color-muted);
    }
    .topbar-right {
      display: flex;
      align-items: center;
      gap: var(--fr-space-md);
    }
    .icon-btn {
      background: var(--fr-color-surface2);
      border: 1px solid var(--fr-color-border);
      border-radius: var(--fr-radius-md);
      width: 36px;
      height: 36px;
      display: flex;
      align-items: center;
      justify-content: center;
      cursor: pointer;
      font-size: 16px;
      color: var(--fr-color-text);
      transition: background var(--fr-motion-fast);
    }
    .icon-btn:hover {
      background: var(--fr-color-surface3);
    }
    .user-session {
      display: flex;
      align-items: center;
      gap: var(--fr-space-xs);
    }
    .user-info {
      display: flex;
      flex-direction: column;
      align-items: flex-end;
    }
    .user-name {
      font-size: 12px;
      font-weight: 600;
    }
    .badge-demo {
      font-size: 9px;
      font-weight: 700;
      color: var(--fr-color-primary-bright);
      background: var(--fr-color-primary-soft);
      padding: 1px 5px;
      border-radius: var(--fr-radius-sm);
    }
    .signout-btn {
      background: transparent;
      border: 1px solid var(--fr-color-border);
      border-radius: var(--fr-radius-md);
      width: 32px;
      height: 32px;
      display: flex;
      align-items: center;
      justify-content: center;
      cursor: pointer;
    }
  `]
})
export class TopbarComponent {
  themeService = inject(ThemeService);
  authService = inject(AuthService);
}
