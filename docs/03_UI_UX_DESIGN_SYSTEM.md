# UI/UX Design System — Neon Ops Enterprise

## 1. Design intent

FieldRelay should feel like a modern enterprise operations product with controlled real-time energy. It must communicate urgency and intelligence without looking like a game interface, crypto dashboard, science-fiction prop, or generic admin template.

## 2. Design principles

1. **Operational clarity before decoration**
2. **Dense but calm information hierarchy**
3. **Actions near the evidence that justifies them**
4. **Status visible without opening detail pages**
5. **Human approval presented as a deliberate decision**
6. **Dark and light themes are equal products**
7. **Responsive behavior changes layout, not capability**
8. **Colour reinforces meaning but never carries it alone**
9. **Every live state includes time and provenance**
10. **Animation explains state change; it does not entertain**

## 3. Typography

### Primary font

`Inter`, followed by a modern system sans-serif fallback.

### Optional technical font

`JetBrains Mono` for identifiers, call IDs, timestamps, JSON previews, hashes and log data.

### Type hierarchy

| Role | Typical size | Weight |
|---|---:|---:|
| Page title | 24–30 px | 700 |
| Section title | 16–18 px | 700 |
| Card title | 13–15 px | 650–700 |
| Body | 12–14 px | 400–500 |
| Metadata | 10–12 px | 500 |
| Operational ID | 10–12 px mono | 600 |

Avoid ultra-light text and excessive all-caps. All-caps is reserved for short eyebrow labels.

## 4. Colour tokens

### Dark theme

| Token | Value | Use |
|---|---|---|
| `bg` | `#070A13` | Application background |
| `surface` | `#0E1422` | Primary surface |
| `surface-2` | `#111A2A` | Secondary surface |
| `surface-3` | `#151F32` | Inputs and nested regions |
| `border` | `#24324D` | Visible boundaries |
| `text` | `#F7F9FF` | Primary text |
| `muted` | `#91A0B8` | Secondary text |
| `primary` | `#7C3AED` | Primary action |
| `primary-bright` | `#A855F7` | Active/accent |
| `cyan` | `#06B6D4` | Live voice/communication |
| `success` | `#14B8A6` | Healthy/completed |
| `warning` | `#F59E0B` | Waiting/at risk |
| `danger` | `#F43F5E` | Critical/destructive |
| `info` | `#3B82F6` | In progress/informational |

### Light theme

| Token | Value | Use |
|---|---|---|
| `bg` | `#F4F7FC` | Application background |
| `surface` | `#FFFFFF` | Primary surface |
| `surface-2` | `#F9FBFF` | Secondary surface |
| `surface-3` | `#F1F5FB` | Inputs and nested regions |
| `border` | `#DCE5F2` | Visible boundaries |
| `text` | `#111827` | Primary text |
| `muted` | `#5E6B82` | Secondary text |
| `primary` | `#6D28D9` | Primary action |
| `primary-bright` | `#8B5CF6` | Active/accent |
| `cyan` | `#0891B2` | Live voice/communication |
| `success` | `#0F9F8E` | Healthy/completed |
| `warning` | `#D97706` | Waiting/at risk |
| `danger` | `#E11D48` | Critical/destructive |
| `info` | `#2563EB` | In progress/informational |

## 5. Semantic colour map

- Green/teal: verified, healthy, approved, completed
- Amber: waiting, attention, SLA at risk
- Red/pink: critical, failed, destructive, breached
- Violet: AI action, active navigation, orchestration
- Cyan: call, communication, realtime connection
- Blue: dispatched, in progress, informational

Every coloured status must include text or an icon label.

## 6. Surfaces

- Background uses the lowest visual emphasis.
- Primary panels use one-pixel borders and subtle elevation.
- Nested areas should use surface contrast rather than multiple shadows.
- Radius: 12–18 px depending on component scale.
- Heavy blur and transparent glass are prohibited for core content.
- Glow is limited to AI orb, active workflow node and critical live indicator.

## 7. Core components

### Navigation

- Desktop sidebar
- Tablet icon rail with tooltips
- Mobile bottom navigation
- Global search
- Notification indicator
- New Incident primary action

### Data and status

- Metric card
- Status badge
- SLA indicator
- Progress bar
- Incident table/card
- Timeline
- Call waveform
- Structured outcome panel
- Vendor comparison card
- Approval card
- Audit row
- Donut and line charts

### Forms

- Text input
- Select
- Textarea
- Phone input with validation
- Contact authorization control
- Upload zone
- Segmented option
- Toggle
- Wizard step indicator

## 8. Interaction states

Every interactive component must define:

- default
- hover
- focus-visible
- active/pressed
- disabled
- loading
- success
- validation error where applicable

Focus rings must remain visible in both themes.

## 9. Motion

Recommended durations:

- hover/focus transition: 120–160 ms
- panel expand/collapse: 180–220 ms
- route content transition: 180 ms maximum
- toast enter/exit: 200 ms
- workflow state progression: 240–320 ms

Respect `prefers-reduced-motion`.

Do not animate chart values continuously or pulse large areas of the page.

## 10. Content design

Use operational language:

- “Request approval” instead of “Proceed”
- “Call authorized vendors” instead of “Start AI”
- “No answer — retry scheduled” instead of “Error”
- “Structured outcome requires review” instead of “Low confidence” alone

Destructive actions require explicit labels and confirmation.

## 11. Accessibility

- target WCAG 2.2 AA
- minimum touch target 44 × 44 CSS px for mobile primary actions
- keyboard navigation for all controls
- visible focus indicators
- status text and icon pairing
- charts include accessible summaries
- form errors associate with controls
- screen-reader announcements for live workflow state
- no information communicated by colour alone
- support 200% browser zoom without horizontal page scroll on standard routes

## 12. Theme implementation

Use centralized CSS custom properties or Ionic theme tokens. Do not duplicate page styles by theme.

```scss
:root {
  --fr-bg: #f4f7fc;
  --fr-surface: #ffffff;
  --fr-text: #111827;
  --fr-primary: #6d28d9;
}

[data-theme='dark'] {
  --fr-bg: #070a13;
  --fr-surface: #0e1422;
  --fr-text: #f7f9ff;
  --fr-primary: #7c3aed;
}
```

Ionic components must be themed centrally. Feature SCSS must use tokens, never literal colour values.
