import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';

export interface NavItem {
  path: string;
  label: string;
  icon: string;
  badge?: string;
  exact?: boolean;
}

@Component({
  selector: 'app-sidebar',
  standalone: true,
  imports: [CommonModule, RouterModule],
  template: `
    <aside class="app-sidebar hide-mobile" role="navigation" aria-label="Main Navigation">
      <div class="nav-section">
        <div class="nav-section-title">Operations</div>
        <nav class="nav-list">
          <ng-container *ngFor="let item of primaryNav">
            <a
              *ngIf="item.path === '/mission-control'; else plannedPrimary"
              [routerLink]="item.path"
              routerLinkActive="active"
              [routerLinkActiveOptions]="{ exact: item.exact ?? false }"
              class="nav-item"
              [attr.title]="item.label"
            >
              <span class="nav-icon">{{ item.icon }}</span>
              <span class="nav-label">{{ item.label }}</span>
              <span *ngIf="item.badge" class="nav-badge font-mono">{{ item.badge }}</span>
            </a>
            <ng-template #plannedPrimary>
              <span class="nav-item unavailable" aria-disabled="true" [attr.title]="item.label + ' — planned'">
                <span class="nav-icon">{{ item.icon }}</span>
                <span class="nav-label">{{ item.label }}</span>
              </span>
            </ng-template>
          </ng-container>
        </nav>
      </div>

      <div class="nav-section">
        <div class="nav-section-title">Management</div>
        <nav class="nav-list">
          <span
            *ngFor="let item of secondaryNav"
            class="nav-item unavailable"
            aria-disabled="true"
            [attr.title]="item.label + ' — planned'"
          >
            <span class="nav-icon">{{ item.icon }}</span>
            <span class="nav-label">{{ item.label }}</span>
          </span>
        </nav>
      </div>

      <div class="sidebar-footer">
        <div class="system-status-card">
          <span class="status-indicator"></span>
          <span class="status-text">CALL-E Demo Adapter Online</span>
        </div>
      </div>
    </aside>
  `,
  styles: [`
    .app-sidebar {
      width: var(--fr-shell-desktop-sidebar);
      background: var(--fr-color-surface);
      border-right: 1px solid var(--fr-color-border);
      display: flex;
      flex-direction: column;
      height: calc(100vh - var(--fr-shell-topbar));
      position: sticky;
      top: var(--fr-shell-topbar);
      padding: var(--fr-space-md) var(--fr-space-sm);
      gap: var(--fr-space-lg);
      transition: width var(--fr-motion-normal);
      user-select: none;
    }

    @media (min-width: 768px) and (max-width: 1279px) {
      .app-sidebar {
        width: var(--fr-shell-tablet-rail);
        padding: var(--fr-space-md) 4px;
        align-items: center;
      }
      .nav-section-title,
      .nav-label,
      .nav-badge,
      .sidebar-footer {
        display: none !important;
      }
      .nav-item {
        justify-content: center;
        padding: 12px;
      }
    }

    .nav-section-title {
      font-size: 11px;
      font-weight: 700;
      color: var(--fr-color-muted);
      text-transform: uppercase;
      letter-spacing: 0.8px;
      padding: 0 var(--fr-space-xs) 6px var(--fr-space-xs);
    }
    .nav-list {
      display: flex;
      flex-direction: column;
      gap: 4px;
    }
    .nav-item {
      display: flex;
      align-items: center;
      gap: var(--fr-space-sm);
      padding: 10px 12px;
      border-radius: var(--fr-radius-md);
      color: var(--fr-color-muted);
      text-decoration: none;
      font-size: 13px;
      font-weight: 600;
      transition: all var(--fr-motion-fast);
    }
    .nav-item:hover {
      color: var(--fr-color-text);
      background: var(--fr-color-surface2);
    }
    .nav-item.active {
      color: var(--fr-color-primary-bright);
      background: var(--fr-color-surface3);
      border-left: 3px solid var(--fr-color-primary);
    }
    .nav-item.unavailable {
      cursor: not-allowed;
      opacity: 0.55;
    }
    .nav-icon {
      font-size: 16px;
      min-width: 20px;
      text-align: center;
    }
    .nav-label {
      flex: 1;
    }
    .nav-badge {
      font-size: 10px;
      font-weight: 700;
      background: var(--fr-color-surface2);
      border: 1px solid var(--fr-color-border);
      padding: 2px 6px;
      border-radius: var(--fr-radius-sm);
      color: var(--fr-color-primary-bright);
    }
    .sidebar-footer {
      margin-top: auto;
    }
    .system-status-card {
      background: var(--fr-color-surface2);
      border: 1px solid var(--fr-color-border);
      padding: var(--fr-space-sm);
      border-radius: var(--fr-radius-md);
      display: flex;
      align-items: center;
      gap: var(--fr-space-xs);
      font-size: 11px;
      color: var(--fr-color-muted);
    }
    .status-indicator {
      width: 8px;
      height: 8px;
      border-radius: 50%;
      background: var(--fr-color-success);
    }
  `]
})
export class SidebarComponent {
  primaryNav: NavItem[] = [
    { path: '/mission-control', label: 'Mission Control', icon: '🎯', badge: 'LIVE', exact: true },
    { path: '/incidents', label: 'Incidents', icon: '🚨', badge: '14' },
    { path: '/calls', label: 'Calls & AI Ops', icon: '📞', badge: '3' },
    { path: '/dispatch', label: 'Dispatch Board', icon: '🗺️' },
    { path: '/approvals', label: 'Approvals', icon: '⚖️', badge: '2' }
  ];

  secondaryNav: NavItem[] = [
    { path: '/technicians', label: 'Technicians', icon: '👷' },
    { path: '/vendors', label: 'Vendors', icon: '🏢' },
    { path: '/analytics', label: 'Analytics', icon: '📊' },
    { path: '/settings', label: 'Settings', icon: '⚙️' }
  ];
}
