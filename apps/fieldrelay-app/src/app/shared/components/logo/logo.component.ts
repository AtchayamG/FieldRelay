import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, Input } from '@angular/core';

// The FieldRelay mark: "Signal and Gate".
//
// An incident (the filled dot) sends a call outward as two arcs, and the call
// stops dead against a solid bar. The mark is the product thesis rather than a
// decoration: the call goes out, the answer comes back, and nothing passes the
// gate without a person.
//
// Deliberately NOT a glyph inside a rounded-square tile on a purple gradient,
// which is what this replaced. That construction is the single most recognisable
// tell of generated UI, and it said "energy" about a product that is really
// about restraint.
//
// Geometry is original and drawn on a 48-unit grid. Strokes thicken as the mark
// gets smaller so it survives a 16px favicon; the trailing arc drops out below
// 18px because at that size it reads as noise rather than a second wave.
@Component({
  selector: 'fr-logo',
  standalone: true,
  imports: [CommonModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <span class="fr-logo" [class.with-wordmark]="showWordmark">
      <svg
        class="fr-logo-mark"
        [attr.width]="size"
        [attr.height]="size"
        viewBox="0 0 48 48"
        fill="none"
        role="img"
        [attr.aria-label]="showWordmark ? null : 'FieldRelay'"
        [attr.aria-hidden]="showWordmark ? 'true' : null"
      >
        <!-- The incident. The only element that carries the signal colour. -->
        <circle cx="9" cy="24" [attr.r]="dotRadius" class="mark-origin" />

        <!-- The call going out. -->
        <path
          d="M17 15.5a12 12 0 0 1 0 17"
          class="mark-wave"
          [attr.stroke-width]="strokeWidth"
          stroke-linecap="round"
        />
        <path
          *ngIf="size >= 18"
          d="M24.5 10a19.5 19.5 0 0 1 0 28"
          class="mark-wave mark-wave-far"
          [attr.stroke-width]="strokeWidth"
          stroke-linecap="round"
        />

        <!-- The gate. Solid, unbroken, full height: nothing gets past it. -->
        <rect
          [attr.x]="37"
          [attr.y]="gateInset"
          [attr.width]="strokeWidth * 1.25"
          [attr.height]="48 - gateInset * 2"
          [attr.rx]="(strokeWidth * 1.25) / 2"
          class="mark-gate"
        />
      </svg>

      <span class="fr-logo-word" *ngIf="showWordmark">
        <span class="word-name">FIELDRELAY</span>
        <span class="word-sub">{{ subtitle }}</span>
      </span>
    </span>
  `,
  styles: [
    `
      :host {
        display: inline-flex;
      }
      .fr-logo {
        display: inline-flex;
        align-items: center;
        gap: 10px;
        min-width: 0;
      }
      .fr-logo-mark {
        display: block;
        flex: none;
      }
      .mark-origin {
        fill: var(--fr-color-signal);
      }
      .mark-wave {
        stroke: currentColor;
        fill: none;
      }
      /* The far wave sits back so the eye reads outward travel, not two bars. */
      .mark-wave-far {
        opacity: 0.45;
      }
      .mark-gate {
        fill: currentColor;
      }

      .fr-logo-word {
        display: flex;
        flex-direction: column;
        min-width: 0;
        line-height: 1;
      }
      /* These read from the real token names. An earlier version referenced
         --fr-color-text-primary and --fr-color-text-tertiary, which do not
         exist in this system, so both silently fell back to their hardcoded
         near-white defaults and the wordmark was invisible in light theme.
         A var() fallback hides a typo instead of surfacing it. */
      .word-name {
        font-size: 13px;
        font-weight: 600;
        letter-spacing: 0.11em;
        color: var(--fr-color-text);
        white-space: nowrap;
      }
      .word-sub {
        margin-top: 3px;
        font-size: 8px;
        font-weight: 500;
        letter-spacing: 0.16em;
        text-transform: uppercase;
        color: var(--fr-color-muted);
        white-space: nowrap;
      }

      /* The subtitle is the first thing to go when space is tight — the mark
         and the name carry the brand on their own. */
      @media (max-width: 640px) {
        .word-sub {
          display: none;
        }
      }
    `
  ]
})
export class LogoComponent {
  @Input() size = 24;
  @Input() showWordmark = false;
  @Input() subtitle = 'Operations Console';

  // Small marks need proportionally heavier strokes to hold their weight.
  get strokeWidth(): number {
    if (this.size <= 20) return 4.2;
    if (this.size <= 32) return 3.4;
    return 2.6;
  }

  get dotRadius(): number {
    return this.size <= 20 ? 4 : 3.4;
  }

  get gateInset(): number {
    return this.size <= 20 ? 9 : 8;
  }
}
