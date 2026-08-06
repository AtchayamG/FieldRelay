import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';

// A single operational figure.
//
// State used to be carried by a 4px coloured slab down the left edge. That
// construction — the "side-tab" — is the most recognisable tell of generated
// UI, and it is also poor information design: a colour bar with no label makes
// the reader guess what the colour means, and it fails outright for anyone who
// cannot separate the hues.
//
// State is now a small dot beside the label, so the meaning sits next to the
// word it modifies, and the card itself stays neutral. The figure is set in
// mono because it is a quantity someone might read aloud on a phone call.
@Component({
  selector: 'app-metric-card',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="metric-card" [attr.data-semantic]="semantic">
      <div class="metric-header">
        <span class="metric-label">
          <span class="state-dot" aria-hidden="true"></span>
          {{ label }}
        </span>
        <span
          class="metric-trend"
          [class.up]="trend === 'up'"
          [class.down]="trend === 'down'"
          *ngIf="change"
        >
          {{ change }}
        </span>
      </div>
      <div class="metric-value font-mono">{{ value }}</div>
    </div>
  `,
  styles: [
    `
      .metric-card {
        background: var(--fr-color-surface);
        border: 1px solid var(--fr-hairline);
        border-radius: var(--fr-tray-radius);
        padding: var(--fr-space-md);
        display: flex;
        flex-direction: column;
        gap: var(--fr-space-xs);
        box-shadow: var(--fr-shadow-tray), var(--fr-tray-inner-lip);
        transition: border-color var(--fr-motion-normal) var(--fr-ease);
      }
      .metric-card:hover {
        border-color: var(--fr-hairline-strong);
      }

      .metric-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        gap: var(--fr-space-xs);
      }
      .metric-label {
        display: inline-flex;
        align-items: center;
        gap: 7px;
        font-size: 11px;
        font-weight: 500;
        color: var(--fr-color-muted);
        text-transform: uppercase;
        letter-spacing: 0.09em;
        min-width: 0;
      }

      /* The whole state signal, in 6px. */
      .state-dot {
        width: 6px;
        height: 6px;
        border-radius: 50%;
        flex: none;
        background: var(--fr-color-muted);
      }
      .metric-card[data-semantic='critical'] .state-dot {
        background: var(--fr-color-danger);
      }
      .metric-card[data-semantic='aiAction'] .state-dot {
        background: var(--fr-color-signal);
      }
      .metric-card[data-semantic='waiting'] .state-dot {
        background: var(--fr-color-warning);
      }
      .metric-card[data-semantic='healthy'] .state-dot {
        background: var(--fr-color-success);
      }

      .metric-trend {
        font-size: 10px;
        font-weight: 500;
        letter-spacing: 0.02em;
        color: var(--fr-color-muted);
        white-space: nowrap;
      }
      .metric-trend.up {
        color: var(--fr-color-success);
      }
      .metric-trend.down {
        color: var(--fr-color-danger);
      }

      .metric-value {
        font-size: 30px;
        font-weight: 500;
        color: var(--fr-color-text);
        line-height: 1.1;
        /* Tabular figures so a column of metrics does not jitter as values
           change under it. */
        font-variant-numeric: tabular-nums;
        letter-spacing: -0.02em;
      }
    `
  ]
})
export class MetricCardComponent {
  @Input({ required: true }) label!: string;
  @Input({ required: true }) value!: string;
  @Input() change = '';
  @Input() trend: 'up' | 'down' | 'neutral' = 'neutral';
  @Input() semantic: 'critical' | 'aiAction' | 'waiting' | 'healthy' = 'healthy';
}
