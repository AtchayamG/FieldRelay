# Responsive Application Shell

## 1. Breakpoints

| Mode | Width | Shell behavior |
|---|---:|---|
| Mobile | `< 768px` | Compact top bar + bottom navigation |
| Tablet | `768–1279px` | Icon rail + condensed top bar |
| Desktop | `1280–1919px` | Expanded sidebar + full top bar |
| Wide desktop | `≥ 1920px` | Expanded sidebar + wider content canvas |

Do not depend on device names. Implement behavior using available width and container constraints.

## 2. Desktop shell

- fixed or sticky expanded sidebar: approximately 240–280 px
- sticky top bar: approximately 80–88 px
- content padding: 24–32 px
- maximum content canvas: approximately 2200 px
- global search visible
- full page title and supporting date/state visible
- primary action visible
- dense tables and dashboard grids enabled

## 3. Tablet shell

- sidebar becomes an icon rail: approximately 76–90 px
- labels appear through accessible tooltips
- top bar remains sticky
- global search remains available but may narrow
- three-column sections become two columns
- large tables may reduce visible columns or use horizontal local scrolling
- approval, call and incident actions remain available

## 4. Mobile shell

- sidebar removed
- compact top bar contains logo/product name and primary contextual action
- bottom navigation contains five high-frequency destinations
- remaining routes appear in “More”
- layout becomes single column
- tables transform into cards, not viewport-wide scrolling, unless the data cannot be represented accurately
- sticky bottom action area is allowed for a wizard or approval decision
- route content must not be hidden under bottom navigation

Suggested bottom navigation:

1. Home
2. Incidents
3. Calls
4. Dispatch
5. More

## 5. Responsive component rules

### Metric cards

- Desktop: four columns
- Tablet: two or four columns depending on available width
- Mobile: two columns; one column for long-value cards

### Incident list

- Desktop/tablet: table
- Mobile: stacked incident cards showing ID, title, property, priority, status and updated time

### Live call console

- Desktop: waveform, facts and controls in one panel
- Tablet: controls wrap below waveform
- Mobile: vertical layout with large status, waveform, structured fields and explicit controls

### Workflow graph

- Desktop: horizontal progression
- Tablet: horizontal with compressed nodes or two-row layout
- Mobile: step carousel, vertical timeline or horizontally clipped viewport with current step emphasized

### Dispatch

- Desktop: unassigned list beside live map
- Tablet: narrower incident list and map
- Mobile: map first, unassigned list below, technician workload cards, schedule as local horizontal scroller

### Forms

- Desktop: two columns where fields are related
- Tablet: two columns with larger full-width groups
- Mobile: one column
- primary wizard actions remain reachable without scrolling to the top

### Analytics

- Desktop: multi-column dashboard
- Tablet: two columns
- Mobile: one visualization per section; legends remain readable

## 6. Overflow requirements

The following widths must be tested:

- 320
- 360
- 390
- 430
- 768
- 820
- 1024
- 1280
- 1366
- 1440
- 1920

Acceptance:

- no page-level horizontal overflow
- no clipped buttons or labels
- no overlapping sticky regions
- no chart legend outside its container
- no compressed text that becomes unreadable
- local scrolling only for explicitly approved dense regions

## 7. Safe areas and Capacitor

Use CSS environment variables for mobile safe areas:

```css
padding-bottom: calc(var(--mobile-nav-height) + env(safe-area-inset-bottom));
```

Do not assume Android and iOS inset values are identical.

## 8. Keyboard and focus

Desktop and tablet must support:

- Tab / Shift+Tab navigation
- Enter/Space activation
- Escape to close modal/drawer
- visible focus ring
- logical focus restoration
- optional global search shortcut

## 9. Theme parity

A breakpoint is not complete until it passes in both themes. Light and dark screenshots must show the same:

- component inventory
- labels
- information order
- actions
- breakpoint transformation
- state meaning
