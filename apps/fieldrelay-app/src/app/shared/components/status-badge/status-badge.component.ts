import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-status-badge',
  standalone: true,
  imports: [CommonModule],
  template: `
    <span class="status-badge" [attr.data-variant]="variant">
      <span class="status-dot"></span>
      <span class="status-text"><ng-content></ng-content></span>
    </span>
  `,
  styles: [`
    .status-badge {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      padding: 3px 10px;
      border-radius: var(--fr-radius-pill);
      font-size: 11px;
      font-weight: 600;
      letter-spacing: 0.3px;
      text-transform: uppercase;
      line-height: 1.4;
    }
    .status-dot {
      width: 6px;
      height: 6px;
      border-radius: 50%;
      background-color: currentColor;
    }
    .status-badge[data-variant="critical"],
    .status-badge[data-variant="CRITICAL"] {
      background: var(--fr-color-danger-soft);
      color: var(--fr-color-danger);
    }
    .status-badge[data-variant="high"],
    .status-badge[data-variant="HIGH"] {
      background: var(--fr-color-warning-soft);
      color: var(--fr-color-warning);
    }
    .status-badge[data-variant="medium"],
    .status-badge[data-variant="MEDIUM"] {
      background: var(--fr-color-info-soft);
      color: var(--fr-color-info);
    }
    .status-badge[data-variant="low"],
    .status-badge[data-variant="LOW"] {
      background: var(--fr-color-muted-soft);
      color: var(--fr-color-muted);
    }
    .status-badge[data-variant="live"],
    .status-badge[data-variant="LIVE CALL"] {
      background: var(--fr-color-cyan-soft);
      color: var(--fr-color-cyan);
    }
    .status-badge[data-variant="approval"],
    .status-badge[data-variant="AWAITING APPROVAL"],
    .status-badge[data-variant="awaiting_approval"] {
      background: var(--fr-color-primary-soft);
      color: var(--fr-color-primary-bright);
    }
    .status-badge[data-variant="dispatched"],
    .status-badge[data-variant="DISPATCHED"] {
      background: var(--fr-color-success-soft, var(--fr-color-cyan-soft));
      color: var(--fr-color-success);
    }
    .status-badge[data-variant="intake"],
    .status-badge[data-variant="triage"] {
      background: var(--fr-color-info-soft);
      color: var(--fr-color-info);
    }
    .status-badge[data-variant="calling"] {
      background: var(--fr-color-cyan-soft);
      color: var(--fr-color-cyan);
    }
    .status-badge[data-variant="resolved"] {
      background: var(--fr-color-success-soft);
      color: var(--fr-color-success);
    }
    .status-badge[data-variant="cancelled"] {
      background: var(--fr-color-muted-soft);
      color: var(--fr-color-muted);
    }
  `]
})
export class StatusBadgeComponent {
  @Input() variant: string = 'info';
}
