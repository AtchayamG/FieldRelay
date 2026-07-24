import { Component, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { SystemStateMode } from '../../../features/mission-control/domain/mission-control.types';

@Component({
  selector: 'app-status-switch',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="state-switcher" role="region" aria-label="System State Controls">
      <span class="switcher-label">State Simulation:</span>
      <div class="pill-group">
        <button
          *ngFor="let mode of modes"
          type="button"
          class="pill-btn"
          [class.active]="currentMode === mode.id"
          (click)="onSelect(mode.id)"
          [attr.aria-pressed]="currentMode === mode.id"
        >
          {{ mode.label }}
        </button>
      </div>
    </div>
  `,
  styles: [`
    .state-switcher {
      display: inline-flex;
      align-items: center;
      gap: var(--fr-space-xs);
      background: var(--fr-color-surface2);
      padding: 4px 10px;
      border-radius: var(--fr-radius-pill);
      border: 1px solid var(--fr-color-border);
      font-size: 11px;
    }
    .switcher-label {
      color: var(--fr-color-muted);
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }
    .pill-group {
      display: flex;
      gap: 4px;
    }
    .pill-btn {
      background: transparent;
      border: none;
      color: var(--fr-color-muted);
      font-size: 11px;
      font-weight: 600;
      padding: 3px 8px;
      border-radius: var(--fr-radius-pill);
      cursor: pointer;
      transition: all var(--fr-motion-fast);
    }
    .pill-btn:hover {
      color: var(--fr-color-text);
      background: var(--fr-color-surface3);
    }
    .pill-btn.active {
      background: var(--fr-color-primary);
      color: var(--fr-color-on-accent);
    }
    @media (max-width: 767px) {
      .state-switcher {
        display: flex;
        width: 100%;
        align-items: flex-start;
        flex-direction: column;
        border-radius: var(--fr-radius-md);
      }
      .pill-group {
        width: 100%;
        flex-wrap: wrap;
      }
      .pill-btn {
        padding-inline: 7px;
      }
    }
  `]
})
export class StatusSwitchComponent {
  @Input() currentMode: SystemStateMode = 'live-connected';
  @Output() modeChange = new EventEmitter<SystemStateMode>();

  modes: { id: SystemStateMode; label: string }[] = [
    { id: 'live-connected', label: 'Live' },
    { id: 'realtime-disconnected', label: 'Disconnected' },
    { id: 'loading', label: 'Loading' },
    { id: 'empty', label: 'Empty' },
    { id: 'degraded', label: 'Degraded' }
  ];

  onSelect(mode: SystemStateMode): void {
    this.modeChange.emit(mode);
  }
}
