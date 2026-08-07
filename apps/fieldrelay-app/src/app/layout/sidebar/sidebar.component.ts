import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { IconComponent, IconName } from '../../shared/components/icon/icon.component';
import { CallUsage, CallUsageService } from '../../core/services/call-usage.service';

export interface NavItem {
  path: string;
  label: string;
  icon: IconName;
  badge?: string;
  exact?: boolean;
  // Whether the route is actually built. Unbuilt destinations render disabled
  // and labelled "planned" rather than linking to an empty screen, so the
  // navigation never overstates what this build can do.
  available?: boolean;
}

@Component({
  selector: 'app-sidebar',
  standalone: true,
  imports: [CommonModule, RouterModule, IconComponent],
  template: `
    <aside class="app-sidebar hide-mobile" role="navigation" aria-label="Main Navigation">
      <div class="nav-section">
        <div class="nav-section-title">Operations</div>
        <nav class="nav-list">
          <ng-container *ngFor="let item of primaryNav">
            <a
              *ngIf="item.available; else plannedPrimary"
              [routerLink]="item.path"
              routerLinkActive="active"
              [routerLinkActiveOptions]="{ exact: item.exact ?? false }"
              class="nav-item"
              [attr.title]="item.label"
            >
              <fr-icon class="nav-icon" [name]="item.icon" [size]="20" />
              <span class="nav-label">{{ item.label }}</span>
              <span *ngIf="item.badge" class="nav-badge font-mono">{{ item.badge }}</span>
            </a>
            <ng-template #plannedPrimary>
              <span class="nav-item unavailable" aria-disabled="true" [attr.title]="item.label + ' — planned'">
                <fr-icon class="nav-icon" [name]="item.icon" [size]="20" />
                <span class="nav-label">{{ item.label }}</span>
              </span>
            </ng-template>
          </ng-container>
        </nav>
      </div>

      <div class="nav-section">
        <div class="nav-section-title">Management</div>
        <nav class="nav-list">
          <ng-container *ngFor="let item of secondaryNav">
            <a
              *ngIf="item.available; else plannedSecondary"
              [routerLink]="item.path"
              routerLinkActive="active"
              class="nav-item"
              [attr.title]="item.label"
            >
              <fr-icon class="nav-icon" [name]="item.icon" [size]="20" />
              <span class="nav-label">{{ item.label }}</span>
            </a>
            <ng-template #plannedSecondary>
              <span
                class="nav-item unavailable"
                aria-disabled="true"
                [attr.title]="item.label + ' — planned'"
              >
                <fr-icon class="nav-icon" [name]="item.icon" [size]="20" />
                <span class="nav-label">{{ item.label }}</span>
              </span>
            </ng-template>
          </ng-container>
        </nav>
      </div>

      <div class="sidebar-footer">
        <!-- Calls placed, deliberately not calls remaining: CALL-E publishes no
             balance endpoint and its stated free allowance differs between
             sources, so a "remaining" figure would be a guess shown as fact.
             Sits above the adapter card so the two read as one stacked block:
             what the adapter is, then what it has done. -->
        <p class="call-usage" *ngIf="usage() as u" [title]="usageTooltip(u)">
          {{ u.totalLiveCallsPlaced }} real {{ u.totalLiveCallsPlaced === 1 ? 'call' : 'calls' }} placed
        </p>
        <div class="system-status-card">
          <span class="status-indicator" [class.status-indicator--live]="usage()?.mode === 'live'"></span>
          <span class="status-text">
            {{ usage()?.mode === 'live' ? 'CALL-E Live Adapter' : 'CALL-E Demo Adapter' }}
          </span>
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
      /* Width is not animated. The rail/full switch happens at a media-query
         breakpoint, so the transition never actually ran on a user action — it
         only cost a layout-thrashing reflow on resize. Colour still eases. */
      transition: border-color var(--fr-motion-normal) var(--fr-ease);
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
    /* The active row is marked by a short signal rule inset into the row, not a
       slab bolted to its left edge. A full-height coloured border on a nav item
       is the single most recognisable tell of generated UI, and it also fights
       the row's own radius. */
    .nav-item.active {
      color: var(--fr-color-text);
      background: var(--fr-color-surface3);
      position: relative;
    }
    .nav-item.active::before {
      content: '';
      position: absolute;
      left: 0;
      top: 50%;
      width: 2px;
      height: 14px;
      border-radius: 1px;
      background: var(--fr-color-signal);
      /* Translate rather than animate height, and centre without a magic
         number that breaks when the row padding changes. */
      transform: translateY(-50%);
    }
    .nav-item.unavailable {
      cursor: not-allowed;
      opacity: 0.55;
    }
    .nav-icon {
      /* Fixed box so every label starts on the same optical line, whatever the
         icon's own width. */
      min-width: 20px;
      opacity: 0.78;
      transition: opacity var(--fr-motion-fast) ease;
    }
    .nav-item:hover .nav-icon,
    .nav-item.active .nav-icon {
      opacity: 1;
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
      flex-shrink: 0;
    }
    /* Live mode can reach a real telephone, so it reads as caution, not health. */
    .status-indicator--live {
      background: var(--fr-color-warning);
    }
    /* Centred over the adapter card so the two form one balanced block rather
       than two separately-aligned scraps. */
    .call-usage {
      margin: 0 0 8px;
      text-align: center;
      font-size: 10.5px;
      letter-spacing: 0.3px;
      color: var(--fr-color-muted);
      font-family: var(--fr-font-technical);
    }
  `]
})
export class SidebarComponent implements OnInit {
  private readonly usageApi = inject(CallUsageService);
  readonly usage = this.usageApi.usage;

  ngOnInit(): void {
    this.usageApi.refresh();
  }

  usageTooltip(u: CallUsage): string {
    const here = `${u.placedByThisDeployment} placed by this deployment`;
    const elsewhere = u.placedElsewhere
      ? `, ${u.placedElsewhere} placed earlier from the CLI and local runs`
      : '';
    return `Real CALL-E calls: ${here}${elsewhere}. Simulated calls are not counted.`;
  }

  primaryNav: NavItem[] = [
    {
      path: '/mission-control',
      label: 'Mission Control',
      icon: 'mission-control',
      badge: 'LIVE',
      exact: true,
      available: true
    },
    { path: '/incidents', label: 'Incidents', icon: 'incidents', available: true },
    { path: '/calls', label: 'Calls & AI Ops', icon: 'phone', available: true },
    { path: '/dispatch', label: 'Dispatch Board', icon: 'dispatch', available: true },
    { path: '/approvals', label: 'Approvals', icon: 'approvals', available: true }
  ];

  secondaryNav: NavItem[] = [
    { path: '/technicians', label: 'Technicians', icon: 'technicians' },
    { path: '/vendors', label: 'Vendors', icon: 'building' },
    { path: '/analytics', label: 'Analytics', icon: 'analytics' },
    { path: '/settings', label: 'Settings', icon: 'settings', available: true }
  ];
}
