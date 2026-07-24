import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-metric-card',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="metric-card" [attr.data-semantic]="semantic">
      <div class="metric-header">
        <span class="metric-label">{{ label }}</span>
        <span class="metric-trend" [class.up]="trend === 'up'" [class.down]="trend === 'down'">
          {{ change }}
        </span>
      </div>
      <div class="metric-value font-mono">{{ value }}</div>
    </div>
  `,
  styles: [`
    .metric-card {
      background: var(--fr-color-surface);
      border: 1px solid var(--fr-color-border);
      border-radius: var(--fr-radius-md);
      padding: var(--fr-space-md);
      display: flex;
      flex-direction: column;
      gap: var(--fr-space-xs);
      box-shadow: var(--fr-shadow-card);
      transition: border-color var(--fr-motion-normal);
    }
    .metric-card[data-semantic="critical"] {
      border-left: 4px solid var(--fr-color-danger);
    }
    .metric-card[data-semantic="aiAction"] {
      border-left: 4px solid var(--fr-color-primary);
    }
    .metric-card[data-semantic="waiting"] {
      border-left: 4px solid var(--fr-color-warning);
    }
    .metric-card[data-semantic="healthy"] {
      border-left: 4px solid var(--fr-color-success);
    }
    .metric-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
    }
    .metric-label {
      font-size: 13px;
      font-weight: 600;
      color: var(--fr-color-muted);
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }
    .metric-trend {
      font-size: 11px;
      font-weight: 600;
      padding: 2px 6px;
      border-radius: var(--fr-radius-sm);
      background: var(--fr-color-surface2);
      color: var(--fr-color-muted);
    }
    .metric-trend.up {
      color: var(--fr-color-success);
    }
    .metric-trend.down {
      color: var(--fr-color-danger);
    }
    .metric-value {
      font-size: 26px;
      font-weight: 700;
      color: var(--fr-color-text);
      line-height: 1.2;
    }
  `]
})
export class MetricCardComponent {
  @Input({ required: true }) label!: string;
  @Input({ required: true }) value!: string;
  @Input() change = '';
  @Input() trend: 'up' | 'down' | 'neutral' = 'neutral';
  @Input() semantic: 'critical' | 'aiAction' | 'waiting' | 'healthy' = 'healthy';
}
