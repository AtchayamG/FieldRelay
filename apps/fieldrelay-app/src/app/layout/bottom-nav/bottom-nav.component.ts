import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { IconComponent } from '../../shared/components/icon/icon.component';

@Component({
  selector: 'app-bottom-nav',
  standalone: true,
  imports: [CommonModule, RouterModule, IconComponent],
  template: `
    <nav class="mobile-bottom-nav hide-desktop hide-tablet" role="navigation" aria-label="Mobile Bottom Navigation">
      <a routerLink="/mission-control" routerLinkActive="active" [routerLinkActiveOptions]="{ exact: true }" class="bottom-nav-item">
        <fr-icon class="nav-icon" name="mission-control" [size]="22" />
        <span class="nav-label">Home</span>
      </a>
      <a routerLink="/incidents" routerLinkActive="active" class="bottom-nav-item">
        <fr-icon class="nav-icon" name="incidents" [size]="22" />
        <span class="nav-label">Incidents</span>
      </a>
      <a routerLink="/calls" routerLinkActive="active" class="bottom-nav-item">
        <fr-icon class="nav-icon" name="phone" [size]="22" />
        <span class="nav-label">Calls</span>
      </a>
      <span class="bottom-nav-item unavailable" aria-disabled="true" title="Dispatch — planned">
        <fr-icon class="nav-icon" name="dispatch" [size]="22" />
        <span class="nav-label">Dispatch</span>
      </span>
      <span class="bottom-nav-item unavailable" aria-disabled="true" title="Approvals — planned">
        <fr-icon class="nav-icon" name="approvals" [size]="22" />
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
      opacity: 0.75;
      transition: opacity var(--fr-motion-fast) ease;
    }
    .bottom-nav-item.active .nav-icon {
      opacity: 1;
    }
  `]
})
export class BottomNavComponent {}
