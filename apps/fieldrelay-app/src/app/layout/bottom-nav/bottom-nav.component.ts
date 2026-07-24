import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';

@Component({
  selector: 'app-bottom-nav',
  standalone: true,
  imports: [CommonModule, RouterModule],
  template: `
    <nav class="mobile-bottom-nav hide-desktop hide-tablet" role="navigation" aria-label="Mobile Bottom Navigation">
      <a routerLink="/mission-control" routerLinkActive="active" [routerLinkActiveOptions]="{ exact: true }" class="bottom-nav-item">
        <span class="nav-icon">🎯</span>
        <span class="nav-label">Home</span>
      </a>
      <span class="bottom-nav-item unavailable" aria-disabled="true" title="Incidents — planned">
        <span class="nav-icon">🚨</span>
        <span class="nav-label">Incidents</span>
      </span>
      <span class="bottom-nav-item unavailable" aria-disabled="true" title="Calls — planned">
        <span class="nav-icon">📞</span>
        <span class="nav-label">Calls</span>
      </span>
      <span class="bottom-nav-item unavailable" aria-disabled="true" title="Dispatch — planned">
        <span class="nav-icon">🗺️</span>
        <span class="nav-label">Dispatch</span>
      </span>
      <span class="bottom-nav-item unavailable" aria-disabled="true" title="Approvals — planned">
        <span class="nav-icon">⚖️</span>
        <span class="nav-label">Approvals</span>
      </span>
    </nav>
  `,
  styles: [`
    .mobile-bottom-nav {
      position: fixed;
      bottom: 0;
      left: 0;
      right: 0;
      height: calc(var(--fr-shell-mobile-bottom-nav) + env(safe-area-inset-bottom));
      padding-bottom: env(safe-area-inset-bottom);
      background: var(--fr-color-surface);
      border-top: 1px solid var(--fr-color-border);
      display: flex;
      justify-content: space-around;
      align-items: center;
      z-index: 1000;
      box-shadow: var(--fr-shadow-bottom-nav);
    }
    .bottom-nav-item {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      gap: 2px;
      flex: 1;
      height: 100%;
      color: var(--fr-color-muted);
      text-decoration: none;
      font-size: 10px;
      font-weight: 600;
      transition: color var(--fr-motion-fast);
    }
    .bottom-nav-item:hover,
    .bottom-nav-item.active {
      color: var(--fr-color-primary-bright);
    }
    .bottom-nav-item.unavailable {
      cursor: not-allowed;
      opacity: 0.5;
    }
    .nav-icon {
      font-size: 18px;
    }
  `]
})
export class BottomNavComponent {}
