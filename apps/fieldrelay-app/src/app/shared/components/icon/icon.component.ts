import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, Input, computed, inject, signal } from '@angular/core';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';

// Material-style outlined icons, drawn on the same 24px grid with a uniform
// 1.75px stroke, round caps and round joins. Original geometry rather than
// copied path data, so there is no third-party licence to carry.
//
// Why a component and not an icon font or emoji:
//   - Emoji render as full-colour glyphs that ignore the theme, differ per
//     operating system, and are announced by screen readers as their unicode
//     name ("high voltage") rather than the thing they represent.
//   - These inherit `currentColor`, so a single CSS rule themes every icon in
//     dark and light modes, and they stay crisp at any size.
//
// Icons are decorative by default (`aria-hidden`), because the adjacent label
// carries the meaning. Pass `label` only when an icon stands alone.
export type IconName =
  | 'activity'
  | 'alert'
  | 'analytics'
  | 'approvals'
  | 'bell'
  | 'bolt'
  | 'building'
  | 'calendar'
  | 'check'
  | 'check-circle'
  | 'chevron-right'
  | 'clock'
  | 'close'
  | 'dispatch'
  | 'document'
  | 'filter'
  | 'incidents'
  | 'info'
  | 'lock'
  | 'mission-control'
  | 'moon'
  | 'phone'
  | 'phone-active'
  | 'plus'
  | 'refresh'
  | 'search'
  | 'settings'
  | 'shield'
  | 'sun'
  | 'technicians'
  | 'user'
  | 'wrench';

// Each entry is the inner geometry of a 24x24 outlined icon.
const PATHS: Record<IconName, string> = {
  activity: '<path d="M3 12h4l3 8 4-16 3 8h4"/>',
  alert: '<path d="M12 3 2.5 20h19L12 3Z"/><line x1="12" y1="10" x2="12" y2="14"/><circle cx="12" cy="17.2" r="0.9" fill="currentColor" stroke="none"/>',
  analytics: '<line x1="4" y1="20" x2="20" y2="20"/><rect x="6" y="12" width="3" height="6" rx="0.8"/><rect x="11" y="8" width="3" height="10" rx="0.8"/><rect x="16" y="4" width="3" height="14" rx="0.8"/>',
  approvals: '<path d="M12 3 4 6v6c0 4.4 3.2 8.1 8 9 4.8-.9 8-4.6 8-9V6l-8-3Z"/><path d="m9 12 2.2 2.2L15.5 10"/>',
  bell: '<path d="M18 9a6 6 0 1 0-12 0c0 5-2 6-2 6h16s-2-1-2-6Z"/><path d="M13.7 20a2 2 0 0 1-3.4 0"/>',
  bolt: '<path d="M13.5 2 4.5 13.5H11l-.5 8.5 9-11.5H13l.5-8.5Z"/>',
  building: '<rect x="4" y="3" width="16" height="18" rx="1.6"/><line x1="9" y1="7.5" x2="9" y2="7.5"/><line x1="15" y1="7.5" x2="15" y2="7.5"/><line x1="9" y1="12" x2="9" y2="12"/><line x1="15" y1="12" x2="15" y2="12"/><path d="M10 21v-4h4v4"/>',
  calendar: '<rect x="3.5" y="5" width="17" height="16" rx="2"/><line x1="3.5" y1="10" x2="20.5" y2="10"/><line x1="8" y1="3" x2="8" y2="6.5"/><line x1="16" y1="3" x2="16" y2="6.5"/>',
  check: '<path d="m5 12.5 4.5 4.5L19 7.5"/>',
  'check-circle': '<circle cx="12" cy="12" r="9"/><path d="m8 12.2 2.7 2.7L16 9.6"/>',
  'chevron-right': '<path d="m9.5 5 7 7-7 7"/>',
  clock: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5.2l3.4 2"/>',
  close: '<line x1="6" y1="6" x2="18" y2="18"/><line x1="18" y1="6" x2="6" y2="18"/>',
  dispatch: '<path d="m3 7 6-3 6 3 6-3v13l-6 3-6-3-6 3V7Z"/><line x1="9" y1="4" x2="9" y2="17"/><line x1="15" y1="7" x2="15" y2="20"/>',
  document: '<path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8l-5-5Z"/><path d="M14 3v5h5"/><line x1="9" y1="13" x2="15" y2="13"/><line x1="9" y1="17" x2="13" y2="17"/>',
  filter: '<path d="M3.5 5h17l-6.6 7.8V19l-3.8 2v-8.2L3.5 5Z"/>',
  incidents: '<path d="M12 2.5 3 7v6.2c0 4.6 3.7 8.4 9 9.3 5.3-.9 9-4.7 9-9.3V7l-9-4.5Z"/><line x1="12" y1="9" x2="12" y2="13.5"/><circle cx="12" cy="16.6" r="0.9" fill="currentColor" stroke="none"/>',
  info: '<circle cx="12" cy="12" r="9"/><line x1="12" y1="11" x2="12" y2="16.5"/><circle cx="12" cy="7.8" r="0.9" fill="currentColor" stroke="none"/>',
  lock: '<rect x="4.5" y="10.5" width="15" height="10" rx="2"/><path d="M8 10.5V7.6a4 4 0 0 1 8 0v2.9"/>',
  'mission-control': '<circle cx="12" cy="12" r="8.5"/><circle cx="12" cy="12" r="4"/><line x1="12" y1="1.8" x2="12" y2="5"/><line x1="12" y1="19" x2="12" y2="22.2"/><line x1="1.8" y1="12" x2="5" y2="12"/><line x1="19" y1="12" x2="22.2" y2="12"/>',
  moon: '<path d="M20 14.5A8.5 8.5 0 0 1 9.5 4a8.5 8.5 0 1 0 10.5 10.5Z"/>',
  phone: '<path d="M6.3 3.5h3l1.5 4-2 1.4a12.5 12.5 0 0 0 6.3 6.3l1.4-2 4 1.5v3a2 2 0 0 1-2.2 2A17.5 17.5 0 0 1 4.3 5.7a2 2 0 0 1 2-2.2Z"/>',
  'phone-active': '<path d="M6.3 3.5h3l1.5 4-2 1.4a12.5 12.5 0 0 0 6.3 6.3l1.4-2 4 1.5v3a2 2 0 0 1-2.2 2A17.5 17.5 0 0 1 4.3 5.7a2 2 0 0 1 2-2.2Z"/><path d="M15.5 3.2a6.5 6.5 0 0 1 5.3 5.3"/><path d="M15 6.6a3.2 3.2 0 0 1 2.4 2.4"/>',
  plus: '<line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>',
  refresh: '<path d="M20 11.5A8 8 0 0 0 6.2 6.6L3.5 9"/><path d="M4 12.5a8 8 0 0 0 13.8 4.9L20.5 15"/><path d="M3.5 4.5V9H8"/><path d="M20.5 19.5V15H16"/>',
  search: '<circle cx="11" cy="11" r="6.5"/><line x1="15.8" y1="15.8" x2="20.5" y2="20.5"/>',
  settings: '<circle cx="12" cy="12" r="3.2"/><path d="M19.4 14.6a1.6 1.6 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.6 1.6 0 0 0-1.8-.3 1.6 1.6 0 0 0-1 1.5v.2a2 2 0 0 1-4 0v-.1a1.6 1.6 0 0 0-1-1.5 1.6 1.6 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.6 1.6 0 0 0 .3-1.8 1.6 1.6 0 0 0-1.5-1H3a2 2 0 0 1 0-4h.1a1.6 1.6 0 0 0 1.5-1 1.6 1.6 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.6 1.6 0 0 0 1.8.3H9a1.6 1.6 0 0 0 1-1.5V3a2 2 0 0 1 4 0v.1a1.6 1.6 0 0 0 1 1.5 1.6 1.6 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.6 1.6 0 0 0-.3 1.8V9a1.6 1.6 0 0 0 1.5 1h.2a2 2 0 0 1 0 4h-.1a1.6 1.6 0 0 0-1.5 1Z"/>',
  shield: '<path d="M12 2.5 4 5.8v5.9c0 4.5 3.4 8.7 8 9.8 4.6-1.1 8-5.3 8-9.8V5.8l-8-3.3Z"/>',
  sun: '<circle cx="12" cy="12" r="4.2"/><line x1="12" y1="2" x2="12" y2="4.4"/><line x1="12" y1="19.6" x2="12" y2="22"/><line x1="2" y1="12" x2="4.4" y2="12"/><line x1="19.6" y1="12" x2="22" y2="12"/><line x1="5" y1="5" x2="6.7" y2="6.7"/><line x1="17.3" y1="17.3" x2="19" y2="19"/><line x1="19" y1="5" x2="17.3" y2="6.7"/><line x1="6.7" y1="17.3" x2="5" y2="19"/>',
  technicians: '<circle cx="9" cy="8" r="3.4"/><path d="M2.8 20a6.2 6.2 0 0 1 12.4 0"/><path d="M17 11.2a3 3 0 0 0 0-6"/><path d="M18.4 20a5.6 5.6 0 0 0-2.6-4.7"/>',
  user: '<circle cx="12" cy="8.2" r="3.8"/><path d="M4.8 20.5a7.2 7.2 0 0 1 14.4 0"/>',
  wrench: '<path d="M15.6 3.4a5.5 5.5 0 0 0-6.9 6.9L3 16v5h5l5.7-5.7a5.5 5.5 0 0 0 6.9-6.9l-3.2 3.2-2.9-.6-.6-2.9 3.2-3.2Z"/>'
};

@Component({
  selector: 'fr-icon',
  standalone: true,
  imports: [CommonModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <svg
      class="fr-icon"
      [attr.width]="size"
      [attr.height]="size"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      [attr.stroke-width]="strokeWidth"
      stroke-linecap="round"
      stroke-linejoin="round"
      [attr.aria-hidden]="label ? null : 'true'"
      [attr.role]="label ? 'img' : null"
      [attr.aria-label]="label || null"
      focusable="false"
      [innerHTML]="markup()"
    ></svg>
  `,
  styles: [
    `
      :host {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        line-height: 0;
      }
      .fr-icon {
        display: block;
        /* Optical alignment: outlined strokes sit a touch high next to text. */
        transform: translateY(0.5px);
      }
    `
  ]
})
export class IconComponent {
  @Input({ required: true }) set name(value: IconName) {
    this.iconName.set(value);
  }
  @Input() size = 20;
  /** Scaled with size so a large icon does not look hairline. */
  @Input() strokeWidth = 1.75;
  /** Set only when the icon carries meaning on its own. */
  @Input() label?: string;

  private readonly sanitizer = inject(DomSanitizer);
  protected readonly iconName = signal<IconName>('info');

  // The geometry comes from the compile-time PATHS constant above and never
  // from user input or an API response, so trusting it introduces no injection
  // surface. Angular's HTML sanitizer would otherwise strip SVG child elements
  // and leave an empty square.
  protected readonly markup = computed<SafeHtml>(() =>
    this.sanitizer.bypassSecurityTrustHtml(PATHS[this.iconName()] ?? PATHS.info)
  );
}
