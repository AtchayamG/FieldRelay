// Shared styles for the two reporting screens. Kept as one exported string
// rather than duplicated, because Analytics and Technicians are the same
// construction with different content, and letting them drift would be the
// first crack in the shape-consistency rule.
export const INSIGHTS_STYLES = `
  .page {
    display: flex;
    flex-direction: column;
    gap: var(--fr-space-lg);
  }
  .page__header {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    gap: var(--fr-space-lg);
    flex-wrap: wrap;
  }
  h1 {
    margin: 0 0 6px;
    font-size: 26px;
    font-weight: 600;
    letter-spacing: -0.02em;
    color: var(--fr-color-text);
  }
  .page__sub {
    margin: 0;
    max-width: 66ch;
    font-size: 13px;
    line-height: 1.55;
    color: var(--fr-color-muted);
  }
  .header-stat {
    display: flex;
    flex-direction: column;
    align-items: flex-end;
  }
  .header-stat__value {
    font-size: 22px;
    font-weight: 500;
    color: var(--fr-color-text);
    font-variant-numeric: tabular-nums;
  }
  .header-stat__label {
    font-size: 10px;
    text-transform: uppercase;
    letter-spacing: 0.09em;
    color: var(--fr-color-muted);
  }

  .notice {
    display: flex;
    gap: var(--fr-space-sm);
    align-items: flex-start;
    margin: 0;
    padding: var(--fr-space-sm) var(--fr-space-md);
    background: var(--fr-color-surface2);
    border: 1px solid var(--fr-hairline);
    border-radius: var(--fr-tray-radius-inner);
    font-size: 12.5px;
    line-height: 1.55;
    color: var(--fr-color-muted);
    max-width: 94ch;
  }
  .notice fr-icon {
    flex: none;
    margin-top: 1px;
    opacity: 0.7;
  }

  .alert {
    margin: 0;
    padding: var(--fr-space-sm) var(--fr-space-md);
    border-radius: var(--fr-tray-radius-inner);
    font-size: 13px;
  }
  .alert--danger {
    background: var(--fr-color-danger-soft);
    color: var(--fr-color-danger);
  }
  .muted {
    color: var(--fr-color-muted);
    font-size: 13px;
  }

  .grid {
    display: grid;
    gap: var(--fr-space-md);
    grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
  }

  .panel {
    background: var(--fr-color-surface);
    border: 1px solid var(--fr-hairline);
    border-radius: var(--fr-tray-radius);
    box-shadow: var(--fr-shadow-tray), var(--fr-tray-inner-lip);
    padding: var(--fr-space-lg);
    display: flex;
    flex-direction: column;
    gap: var(--fr-space-sm);
    min-width: 0;
  }
  .panel__title {
    margin: 0;
    font-size: 12px;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.08em;
    color: var(--fr-color-muted);
  }
  .panel__note {
    margin: 0;
    font-size: 11.5px;
    line-height: 1.5;
    color: var(--fr-color-muted);
  }

  .rows {
    display: flex;
    flex-direction: column;
  }
  .row {
    display: flex;
    align-items: baseline;
    justify-content: space-between;
    gap: var(--fr-space-sm);
    padding: 7px 0;
    border-bottom: 1px solid var(--fr-hairline);
  }
  .row:last-child {
    border-bottom: none;
  }
  .row__key {
    font-size: 13px;
    color: var(--fr-color-text);
    min-width: 0;
    overflow-wrap: anywhere;
  }
  .row__count {
    font-size: 15px;
    font-weight: 500;
    color: var(--fr-color-text);
    font-variant-numeric: tabular-nums;
    flex: none;
  }
  .row__empty {
    padding: 7px 0;
    font-size: 13px;
    color: var(--fr-color-muted);
  }

  .pending {
    background: var(--fr-color-surface);
    border: 1px solid var(--fr-hairline);
    border-radius: var(--fr-tray-radius);
    padding: var(--fr-space-lg);
  }
  .pending__title {
    margin: 0 0 4px;
    font-size: 15px;
    font-weight: 500;
    color: var(--fr-color-text);
  }
  .pending__lead {
    margin: 0 0 var(--fr-space-sm);
    font-size: 12.5px;
    line-height: 1.55;
    color: var(--fr-color-muted);
    max-width: 78ch;
  }
  .pending__list {
    margin: 0;
    padding: 0;
    list-style: none;
    display: flex;
    flex-direction: column;
    gap: 7px;
  }
  .pending__list li {
    padding-left: var(--fr-space-sm);
    border-left: 1px solid var(--fr-hairline);
    font-size: 12.5px;
    line-height: 1.5;
    color: var(--fr-color-muted);
  }
  .pending__metric {
    color: var(--fr-color-text);
    font-weight: 500;
  }

  .footnote {
    margin: 0;
    font-size: 11.5px;
    color: var(--fr-color-muted);
  }
`;
