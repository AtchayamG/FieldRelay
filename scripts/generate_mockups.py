from __future__ import annotations

import argparse
import json
import math
import os
from pathlib import Path
from textwrap import dedent

from playwright.sync_api import sync_playwright

ROOT = Path(__file__).resolve().parents[1]

PAGES = [
    ("01-login", "Secure Sign In"),
    ("02-mission-control", "Mission Control"),
    ("03-incidents", "Incidents"),
    ("04-incident-detail", "Incident Detail"),
    ("05-create-incident", "Create Incident"),
    ("06-calls-ai-ops", "Calls & AI Operations"),
    ("07-dispatch", "Dispatch Board"),
    ("08-technicians", "Technicians"),
    ("09-vendor-detail", "Vendor Detail"),
    ("10-approvals", "Approvals"),
    ("11-customers", "Customers & Properties"),
    ("12-analytics", "Analytics"),
    ("13-audit-consent", "Audit & Consent"),
    ("14-knowledge-base", "Knowledge Base"),
    ("15-settings", "Settings"),
]

THEMES = {
    "dark": {
        "bg": "#070A13",
        "bg2": "#0A0F1B",
        "surface": "#0E1422",
        "surface2": "#111A2A",
        "surface3": "#151F32",
        "border": "#24324D",
        "border2": "#1D2940",
        "text": "#F7F9FF",
        "muted": "#91A0B8",
        "muted2": "#64748B",
        "primary": "#7C3AED",
        "primary2": "#A855F7",
        "cyan": "#06B6D4",
        "green": "#14B8A6",
        "yellow": "#F59E0B",
        "red": "#F43F5E",
        "blue": "#3B82F6",
        "purple_soft": "rgba(124,58,237,.16)",
        "cyan_soft": "rgba(6,182,212,.14)",
        "green_soft": "rgba(20,184,166,.14)",
        "red_soft": "rgba(244,63,94,.14)",
        "yellow_soft": "rgba(245,158,11,.14)",
        "shadow": "0 22px 65px rgba(0,0,0,.35)",
        "map": "#0B1220",
        "grid": "rgba(148,163,184,.08)",
        "login_illustration": "linear-gradient(145deg,#081120 0%,#10172a 40%,#15102a 100%)",
    },
    "light": {
        "bg": "#F4F7FC",
        "bg2": "#EDF2FA",
        "surface": "#FFFFFF",
        "surface2": "#F9FBFF",
        "surface3": "#F1F5FB",
        "border": "#DCE5F2",
        "border2": "#E7EDF6",
        "text": "#111827",
        "muted": "#5E6B82",
        "muted2": "#8894A8",
        "primary": "#6D28D9",
        "primary2": "#8B5CF6",
        "cyan": "#0891B2",
        "green": "#0F9F8E",
        "yellow": "#D97706",
        "red": "#E11D48",
        "blue": "#2563EB",
        "purple_soft": "rgba(109,40,217,.10)",
        "cyan_soft": "rgba(8,145,178,.10)",
        "green_soft": "rgba(15,159,142,.10)",
        "red_soft": "rgba(225,29,72,.09)",
        "yellow_soft": "rgba(217,119,6,.10)",
        "shadow": "0 18px 45px rgba(34,55,94,.10)",
        "map": "#EAF0F8",
        "grid": "rgba(100,116,139,.10)",
        "login_illustration": "linear-gradient(145deg,#F9FBFF 0%,#EEF4FC 50%,#F3EEFF 100%)",
    },
}

NAV = [
    ("mission-control", "◈", "Mission Control"),
    ("incidents", "◆", "Incidents"),
    ("calls-ai-ops", "☎", "Calls & AI Ops"),
    ("dispatch", "⌖", "Dispatch"),
    ("technicians", "♙", "Technicians"),
    ("vendor-detail", "⬡", "Vendors"),
    ("approvals", "✓", "Approvals"),
    ("customers", "⌂", "Customers"),
    ("analytics", "⌁", "Analytics"),
    ("audit-consent", "⌕", "Audit & Consent"),
    ("knowledge-base", "▤", "Knowledge Base"),
    ("settings", "⚙", "Settings"),
]


def esc(text: str) -> str:
    return (
        text.replace("&", "&amp;")
        .replace("<", "&lt;")
        .replace(">", "&gt;")
        .replace('"', "&quot;")
    )


def badge(text: str, tone: str = "primary") -> str:
    return f'<span class="badge {tone}">{esc(text)}</span>'


def avatar(name: str, size: str = "md") -> str:
    initials = "".join(part[0] for part in name.split()[:2]).upper()
    return f'<span class="avatar {size}" title="{esc(name)}">{initials}</span>'


def sparkline(color_var: str = "var(--cyan)", points: str = "0,34 12,31 24,33 36,24 48,28 60,16 72,22 84,10 96,15 108,5") -> str:
    return f'''<svg class="spark" viewBox="0 0 108 40" preserveAspectRatio="none" aria-hidden="true">
      <polyline fill="none" stroke="{color_var}" stroke-width="2.4" points="{points}" />
      <polyline fill="none" stroke="{color_var}" stroke-opacity=".12" stroke-width="9" points="{points}" />
    </svg>'''


def line_chart(series: int = 2, height: int = 220) -> str:
    paths = [
        "M0 166 C60 145 76 90 142 116 S244 180 306 118 S420 48 482 78 S602 120 700 54 S820 84 940 36",
        "M0 194 C76 178 116 142 170 156 S288 90 338 112 S458 178 536 124 S652 64 724 98 S846 126 940 76",
        "M0 126 C80 108 122 132 190 96 S302 74 368 102 S482 154 560 90 S674 40 750 58 S866 80 940 48",
    ]
    colors = ["var(--primary2)", "var(--cyan)", "var(--green)"]
    body = []
    for i in range(series):
        body.append(f'<path d="{paths[i]}" fill="none" stroke="{colors[i]}" stroke-width="4" stroke-linecap="round" />')
        body.append(f'<path d="{paths[i]}" fill="none" stroke="{colors[i]}" stroke-opacity=".12" stroke-width="14" stroke-linecap="round" />')
    return f'''<svg class="chart" viewBox="0 0 940 240" style="height:{height}px" role="img" aria-label="Operational trend chart">
      <defs><pattern id="grid" width="94" height="48" patternUnits="userSpaceOnUse"><path d="M 94 0 L 0 0 0 48" fill="none" stroke="var(--grid)" stroke-width="1"/></pattern></defs>
      <rect width="940" height="240" fill="url(#grid)" />
      {''.join(body)}
      <g class="axis-labels"><text x="0" y="232">Mon</text><text x="150" y="232">Tue</text><text x="300" y="232">Wed</text><text x="450" y="232">Thu</text><text x="600" y="232">Fri</text><text x="750" y="232">Sat</text><text x="900" y="232">Sun</text></g>
    </svg>'''


def donut(value: int = 72, label: str = "Resolution", tone: str = "primary") -> str:
    color = {
        "primary": "var(--primary2)",
        "cyan": "var(--cyan)",
        "green": "var(--green)",
        "yellow": "var(--yellow)",
        "red": "var(--red)",
    }.get(tone, "var(--primary2)")
    offset = 301 - (301 * value / 100)
    return f'''<div class="donut-wrap">
      <svg viewBox="0 0 120 120" class="donut" aria-label="{esc(label)} {value} percent">
        <circle cx="60" cy="60" r="48" fill="none" stroke="var(--border2)" stroke-width="12" />
        <circle cx="60" cy="60" r="48" fill="none" stroke="{color}" stroke-width="12" stroke-linecap="round" stroke-dasharray="301" stroke-dashoffset="{offset:.1f}" transform="rotate(-90 60 60)" />
      </svg>
      <div class="donut-center"><strong>{value}%</strong><span>{esc(label)}</span></div>
    </div>'''


def section_header(title: str, subtitle: str = "", action: str = "") -> str:
    action_html = f'<button class="btn subtle">{esc(action)}</button>' if action else ""
    return f'''<div class="section-head"><div><h2>{esc(title)}</h2>{f'<p>{esc(subtitle)}</p>' if subtitle else ''}</div>{action_html}</div>'''


def metric_card(label: str, value: str, delta: str, tone: str, icon: str, chart: bool = True) -> str:
    return f'''<article class="metric-card">
      <div class="metric-top"><span class="metric-icon {tone}">{icon}</span><span class="kebab">•••</span></div>
      <p>{esc(label)}</p><strong>{esc(value)}</strong><span class="delta {tone}">{esc(delta)}</span>
      {sparkline(f'var(--{tone})') if chart else ''}
    </article>'''


def topbar(title: str) -> str:
    return f'''<header class="topbar">
      <div class="mobile-logo"><span class="logo-mark">F</span><strong>Field<span>Relay</span></strong></div>
      <div class="page-title"><h1>{esc(title)}</h1><p>Friday, July 24 · Operations online</p></div>
      <div class="global-search"><span>⌕</span><input aria-label="Global search" placeholder="Search incidents, calls, vendors…" /><kbd>⌘ K</kbd></div>
      <div class="top-actions"><button class="icon-btn" aria-label="Messages">◫</button><button class="icon-btn notify" aria-label="Notifications">♢<i>3</i></button><button class="btn primary">＋ New Incident</button>{avatar('Atchayam Ganesh','sm')}</div>
    </header>'''


def sidebar(active_slug: str) -> str:
    rows = []
    for slug, icon, name in NAV:
        active = " active" if active_slug == slug else ""
        count = '<span class="nav-count">7</span>' if slug == "approvals" else ""
        live = '<span class="nav-live">LIVE</span>' if slug == "calls-ai-ops" else ""
        rows.append(f'<a class="nav-item{active}" href="#"><span class="nav-icon">{icon}</span><span class="nav-label">{esc(name)}</span>{count}{live}</a>')
    return f'''<aside class="sidebar">
      <div class="brand"><span class="logo-mark">F</span><strong>Field<span>Relay</span></strong><button>«</button></div>
      <nav>{''.join(rows)}</nav>
      <div class="sidebar-ai"><div class="orb"></div><div><strong>AI Operator</strong><span>Online · 6 active agents</span></div></div>
      <div class="profile">{avatar('Atchayam Ganesh','md')}<div><strong>Atchayam Ganesh</strong><span>Operations Lead</span></div><span>⌄</span></div>
    </aside>'''


def bottom_nav(active_slug: str) -> str:
    primary = [
        ("mission-control", "◈", "Home"),
        ("incidents", "◆", "Incidents"),
        ("calls-ai-ops", "☎", "Calls"),
        ("dispatch", "⌖", "Dispatch"),
        ("settings", "☰", "More"),
    ]
    out = []
    for slug, icon, label in primary:
        active = " active" if slug == active_slug else ""
        out.append(f'<button class="bottom-item{active}"><span>{icon}</span><small>{label}</small></button>')
    return f'<nav class="bottom-nav">{"".join(out)}</nav>'


def app_shell(page_slug: str, title: str, body: str) -> str:
    active = page_slug.replace("01-", "").replace("02-", "").replace("03-", "").replace("04-", "").replace("05-", "").replace("06-", "").replace("07-", "").replace("08-", "").replace("09-", "").replace("10-", "").replace("11-", "").replace("12-", "").replace("13-", "").replace("14-", "").replace("15-", "")
    # map detail/create pages to main nav
    if active in {"incident-detail", "create-incident"}:
        active = "incidents"
    if active == "vendor-detail":
        active = "vendor-detail"
    return f'''<div class="app-shell">{sidebar(active)}<main class="app-main">{topbar(title)}<div class="page-content">{body}</div></main>{bottom_nav(active)}</div>'''


def incidents_rows(count: int = 7) -> str:
    data = [
        ("INC-2042-0891", "Water Leak — Unit 12B", "Downtown Tower", "Critical", "In Progress", "12m", "AquaFix"),
        ("INC-2042-0889", "Elevator Failure — Lobby", "Grand Plaza", "Critical", "Escalated", "18m", "Metro Lift"),
        ("INC-2042-0884", "Power Outage — Level 4", "Riverside Homes", "High", "Pending", "31m", "Unassigned"),
        ("INC-2042-0879", "HVAC Not Cooling", "Oakwood Apartments", "High", "Dispatched", "42m", "ProFix HVAC"),
        ("INC-2042-0871", "Fire Alarm — Floor 10", "Metro Heights", "Critical", "Open", "47m", "RapidSafe"),
        ("INC-2042-0868", "Plumbing Issue — Basement", "City Center", "Medium", "Resolved", "1h", "AquaFix"),
        ("INC-2042-0856", "Access Gate Not Working", "Sunset Villas", "Low", "Closed", "2h", "GateWorks"),
        ("INC-2042-0841", "Lighting Issue — Parking L2", "Bayview Commercial", "Medium", "In Progress", "3h", "BrightFix"),
    ]
    rows = []
    for item in data[:count]:
        iid, title, prop, priority, status, updated, owner = item
        tone = {"Critical":"red","High":"yellow","Medium":"primary","Low":"green"}[priority]
        st = {"In Progress":"blue","Escalated":"red","Pending":"yellow","Dispatched":"primary","Open":"cyan","Resolved":"green","Closed":"muted"}[status]
        rows.append(f'''<tr><td><a>{iid}</a></td><td><div class="cell-title"><strong>{title}</strong><span>{prop}</span></div></td><td>{badge(priority,tone)}</td><td>{badge(status,st)}</td><td>{owner}</td><td>{updated} ago</td><td>⋮</td></tr>''')
    return ''.join(rows)


def incident_cards_mobile(count: int = 6) -> str:
    data = [
        ("INC-2042-0891", "Water Leak — Unit 12B", "Downtown Tower", "Critical", "In Progress", "12m"),
        ("INC-2042-0889", "Elevator Failure — Lobby", "Grand Plaza", "Critical", "Escalated", "18m"),
        ("INC-2042-0884", "Power Outage — Level 4", "Riverside Homes", "High", "Pending", "31m"),
        ("INC-2042-0879", "HVAC Not Cooling", "Oakwood Apartments", "High", "Dispatched", "42m"),
        ("INC-2042-0871", "Fire Alarm — Floor 10", "Metro Heights", "Critical", "Open", "47m"),
        ("INC-2042-0868", "Plumbing Issue — Basement", "City Center", "Medium", "Resolved", "1h"),
    ]
    out=[]
    for iid,title,prop,priority,status,updated in data[:count]:
        tone = {"Critical":"red","High":"yellow","Medium":"primary","Low":"green"}[priority]
        st = {"In Progress":"blue","Escalated":"red","Pending":"yellow","Dispatched":"primary","Open":"cyan","Resolved":"green"}[status]
        out.append(f'''<article class="mobile-list-card"><div class="mobile-list-top"><a>{iid}</a><span>{updated} ago</span></div><h3>{title}</h3><p>{prop}</p><div>{badge(priority,tone)} {badge(status,st)}</div></article>''')
    return ''.join(out)


def timeline(items=None) -> str:
    items = items or [
        ("10:29", "Incident created by Ava AI", "green"),
        ("10:31", "AquaFix Plumbing accepted", "cyan"),
        ("10:35", "Tenant notified via SMS & voice", "primary"),
        ("10:46", "Technician en route — ETA 18 min", "blue"),
        ("11:04", "Technician arrived on site", "yellow"),
        ("11:26", "Repair completed — verification pending", "green"),
    ]
    out = []
    for time, text, tone in items:
        out.append(f'<li><time>{time}</time><span class="timeline-dot {tone}"></span><div><strong>{esc(text)}</strong><small>Automated event · verified</small></div></li>')
    return f'<ol class="timeline">{"".join(out)}</ol>'


def call_wave(tone: str = "primary") -> str:
    bars = []
    heights = [12,18,29,24,36,48,28,16,42,55,38,22,50,64,34,19,30,44,58,41,23,52,67,46,26,40,56,32,20,38,50,29]
    for h in heights:
        bars.append(f'<i style="height:{h}px;background:var(--{tone})"></i>')
    return f'<div class="wave">{"".join(bars)}</div>'


def vendor_compare() -> str:
    vendors = [
        ("AquaFix Plumbing", "4.8", "22 min", "$245", "98%", "green", "Best Match"),
        ("Rapid Rooter", "4.6", "38 min", "$310", "92%", "primary", "Fastest"),
        ("Metro Plumbing", "4.7", "52 min", "$220", "87%", "cyan", "Lowest Cost"),
    ]
    out=[]
    for name,rating,eta,cost,sla,tone,tag in vendors:
        out.append(f'''<article class="vendor-card"><div class="vendor-head">{avatar(name,'sm')}<div><strong>{name}</strong><span>★ {rating} · {sla} SLA</span></div>{badge(tag,tone)}</div><div class="vendor-stats"><div><small>ETA</small><strong>{eta}</strong></div><div><small>Estimate</small><strong>{cost}</strong></div><div><small>Availability</small><strong class="{tone}">Available</strong></div></div><p>Licensed, insured, background checked. Specializes in emergency leak response.</p><div class="button-row"><button class="btn primary">Select & Call</button><button class="btn subtle">View Profile</button></div></article>''')
    return ''.join(out)


def page_login() -> str:
    return '''<div class="login-page">
      <section class="login-visual">
        <div class="brand login-brand"><span class="logo-mark">F</span><strong>Field<span>Relay</span></strong></div>
        <div class="hero-copy"><span class="eyebrow">AI PHONE OPERATIONS</span><h1>Resolve field incidents.<br><em>Without the call chaos.</em></h1><p>Coordinate tenants, technicians, vendors and approvals through verified AI phone workflows.</p><div class="trust-row"><span>✓ Human approval gates</span><span>✓ Full audit trail</span><span>✓ Real-time outcomes</span></div></div>
        <div class="login-scene"><div class="orb xl"></div><div class="flow-node n1"><b>01</b><span>Incident received</span></div><div class="flow-node n2"><b>02</b><span>AI calls vendors</span></div><div class="flow-node n3"><b>03</b><span>Human approves</span></div><div class="flow-node n4"><b>04</b><span>Resolution verified</span></div><svg viewBox="0 0 700 420"><path d="M130 210 C240 50 420 70 535 160"/><path d="M170 260 C280 350 430 350 555 240"/></svg></div>
      </section>
      <section class="login-panel"><div class="login-box"><div class="mobile-logo login-mobile"><span class="logo-mark">F</span><strong>Field<span>Relay</span></strong></div><span class="eyebrow">WELCOME BACK</span><h2>Sign in to operations</h2><p>Use your organization account to continue.</p><label>Email address<input value="atchayam@fieldrelay.app" /></label><label>Password<div class="password"><input type="password" value="password123" /><span>◉</span></div></label><div class="login-meta"><label class="check"><input type="checkbox" checked /> Remember me</label><a>Forgot password?</a></div><button class="btn primary full">Sign in securely</button><div class="divider"><span>or continue with</span></div><button class="btn oauth full"><b>G</b> Google Workspace</button><small class="legal">Protected by enterprise SSO, encryption and role-based access.</small></div></section>
    </div>'''


def page_mission_control() -> str:
    metrics = ''.join([
        metric_card("Critical incidents", "12", "↑ 3 since yesterday", "red", "!"),
        metric_card("Active calls", "8", "Live now", "cyan", "☎"),
        metric_card("Open approvals", "7", "3 require action", "yellow", "✓"),
        metric_card("SLA compliance", "94%", "↑ 6% this week", "green", "↗"),
    ])
    incident_list = f'''<section class="panel incident-panel">{section_header('Incident command queue','Live priority-sorted operations','View all')}<div class="table-wrap"><table><thead><tr><th>Incident</th><th>Issue</th><th>Priority</th><th>Status</th><th>Owner</th><th>Updated</th><th></th></tr></thead><tbody>{incidents_rows(5)}</tbody></table></div><div class="mobile-cards">{incident_cards_mobile(5)}</div></section>'''
    live_call = f'''<section class="panel live-call">{section_header('Live call mission','CALL-E connected · Call ID C-48291','Open full')}<div class="call-primary"><div class="call-orb">☎</div><div><span class="live-pill">● LIVE · 00:03:42</span><h3>Water Leak — Unit 12B</h3><p>Calling AquaFix Plumbing · (512) 555-0198</p></div></div>{call_wave('cyan')}<div class="call-facts"><div><small>AI agent</small><strong>Ava Voice AI</strong></div><div><small>Sentiment</small><strong class="green">Positive</strong></div><div><small>Extracted ETA</small><strong>22 min</strong></div></div><div class="button-row"><button class="btn subtle">Mute</button><button class="btn subtle">Hold</button><button class="btn subtle">Transfer</button><button class="btn danger">End call</button></div></section>'''
    flow = '''<section class="panel span-2">''' + section_header("Orchestration flow", "Live plan for incident INC-2042-0891", "View workflow") + '''<div class="flow-grid"><div class="flow-step done"><span>1</span><strong>Intake</strong><small>Incident captured</small></div><b>→</b><div class="flow-step done"><span>2</span><strong>AI triage</strong><small>Water leak · High</small></div><b>→</b><div class="flow-step active"><span>3</span><strong>Vendor calls</strong><small>2 of 3 contacted</small></div><b>→</b><div class="flow-step"><span>4</span><strong>Human approval</strong><small>Waiting</small></div><b>→</b><div class="flow-step"><span>5</span><strong>Dispatch</strong><small>Pending</small></div></div></section>'''
    approvals = '''<section class="panel">''' + section_header("Pending approvals", "Decisions blocking field work", "View all") + '''<div class="approval-mini"><div><span class="approval-icon">$</span><div><strong>Emergency work authorization</strong><small>AquaFix · $245.00 estimate</small></div></div><div class="button-row"><button class="btn success">Approve</button><button class="btn subtle">Review</button></div></div><div class="approval-mini"><div><span class="approval-icon purple">↗</span><div><strong>Escalation to backup vendor</strong><small>Elevator outage · SLA breach risk</small></div></div><div class="button-row"><button class="btn success">Approve</button><button class="btn subtle">Review</button></div></div></section>'''
    activity = '''<section class="panel">''' + section_header("System activity", "Verified real-time events", "Full timeline") + '''<ul class="activity-list"><li><span class="dot green"></span><div><strong>AquaFix accepted incident</strong><small>10:31 AM · CALL-E structured outcome</small></div></li><li><span class="dot cyan"></span><div><strong>Tenant notified by SMS</strong><small>10:35 AM · Delivery confirmed</small></div></li><li><span class="dot yellow"></span><div><strong>SLA risk changed to high</strong><small>10:38 AM · Automation rule SLA-07</small></div></li><li><span class="dot primary"></span><div><strong>Approval requested</strong><small>10:40 AM · Atchayam Ganesh</small></div></li></ul></section>'''
    analytics = f'''<section class="panel span-2">{section_header('Operational performance','Last 7 days · All properties','Open analytics')}<div class="chart-flex"><div class="chart-main">{line_chart(2,220)}</div><div class="donut-side">{donut(78,'First-call resolution','primary')}<div class="legend"><span><i class="purple"></i>Resolved by first call</span><span><i class="cyan"></i>Required follow-up</span></div></div></div></section>'''
    return f'<div class="metric-grid">{metrics}</div><div class="dashboard-grid">{incident_list}{live_call}{flow}{approvals}{activity}{analytics}</div>'


def page_incidents() -> str:
    filters = '''<div class="filters"><button class="chip active">All 128</button><button class="chip">Critical 12</button><button class="chip">High 28</button><button class="chip">In progress 34</button><button class="chip">At SLA risk 15</button><button class="chip">Resolved today 31</button><span></span><button class="btn subtle">⚲ Filters</button><button class="btn subtle">⇩ Export</button></div>'''
    table = f'''<section class="panel">{section_header('All incidents','128 incidents across 24 properties','＋ New incident')}{filters}<div class="table-wrap roomy"><table><thead><tr><th><input type="checkbox"/></th><th>ID</th><th>Incident</th><th>Property</th><th>Priority</th><th>Status</th><th>Assigned to</th><th>SLA</th><th>Updated</th><th></th></tr></thead><tbody>{''.join(f'<tr><td><input type="checkbox"/></td>'+row[row.find('<td>')+4:] for row in incidents_rows(8).split('</tr>') if row)}</tbody></table></div><div class="mobile-cards">{incident_cards_mobile(6)}</div><div class="pagination"><span>Showing 1–8 of 128</span><div><button>‹</button><button class="active">1</button><button>2</button><button>3</button><button>…</button><button>16</button><button>›</button></div></div></section>'''
    summary = '''<div class="summary-strip"><div><span class="metric-icon red">!</span><div><strong>12 Critical</strong><small>3 breached SLA</small></div></div><div><span class="metric-icon yellow">◷</span><div><strong>15 At risk</strong><small>Next 60 minutes</small></div></div><div><span class="metric-icon cyan">☎</span><div><strong>8 Live calls</strong><small>Across 6 incidents</small></div></div><div><span class="metric-icon green">✓</span><div><strong>31 Resolved</strong><small>Today</small></div></div></div>'''
    return summary + table


def page_incident_detail() -> str:
    hero = '''<section class="incident-hero"><div><div class="breadcrumb">Incidents / INC-2042-0891</div><div class="hero-title"><h1>Water Leak — Unit 12B</h1>''' + badge("High priority","yellow") + badge("In progress","blue") + '''</div><p>Downtown Tower · 123 Main St, Austin · Reported 10:29 AM by Sarah Johnson</p></div><div class="button-row"><button class="btn subtle">Share</button><button class="btn subtle">⋮ More</button><button class="btn primary">Edit incident</button></div></section>'''
    tabs = '<div class="tabs"><button class="active">Overview</button><button>Timeline</button><button>Communications</button><button>Files</button><button>Approvals</button><button>Related</button></div>'
    details = '''<section class="panel">''' + section_header("Incident details", "Verified case information") + '''<dl class="detail-list"><div><dt>Incident type</dt><dd>Plumbing / Water leak</dd></div><div><dt>Priority</dt><dd>High</dd></div><div><dt>Reported by</dt><dd>Sarah Johnson</dd></div><div><dt>Contact</dt><dd>(512) 555-0188</dd></div><div><dt>Assigned vendor</dt><dd>AquaFix Plumbing</dd></div><div><dt>Technician</dt><dd>Alex Turner</dd></div><div><dt>Estimated arrival</dt><dd>11:08 AM</dd></div><div><dt>Estimated cost</dt><dd>$245.00</dd></div></dl><div class="description-box"><small>Description</small><p>Water leaking from bathroom ceiling for approximately one hour. Tenant shut off local valve. No visible electrical exposure.</p></div></section>'''
    commitment = '''<section class="panel span-2">''' + section_header("Commitment timeline", "What was promised, by whom and by when", "View audit") + timeline() + '''</section>'''
    ai = '''<section class="panel">''' + section_header("AI insights", "Evidence-grounded recommendations") + '''<div class="insight-list"><article><span class="metric-icon cyan">✦</span><div><strong>Likely source identified</strong><p>Pattern matches failed shower mixer valve in Unit 14B.</p></div></article><article><span class="metric-icon yellow">!</span><div><strong>Secondary damage risk</strong><p>Confirm electrical isolation if water reaches ceiling light.</p></div></article><article><span class="metric-icon green">↗</span><div><strong>Next recommended action</strong><p>Confirm access with tenant before technician arrival.</p></div></article></div></section>'''
    comms = f'''<section class="panel span-2">{section_header('Latest call','AquaFix Plumbing · completed 6m 12s','Open transcript')}<div class="transcript-preview"><div class="speaker"><span>AI</span><p>“Can you confirm your earliest arrival time and estimated price range?”</p></div><div class="speaker vendor"><span>AF</span><p>“We can arrive in about twenty-two minutes. Initial callout is approximately two hundred forty-five dollars.”</p></div></div>{call_wave('primary')}</section>'''
    health = '''<section class="panel">''' + section_header("Incident health") + '''<div class="health-stack"><div><span>SLA risk</span><strong class="red">High</strong></div><div><span>Customer sentiment</span><strong class="green">Positive</strong></div><div><span>Resolution confidence</span><strong>82%</strong></div><div class="progress"><i style="width:82%"></i></div></div></section>'''
    return hero + tabs + f'<div class="detail-grid">{details}{commitment}{ai}{comms}{health}</div>'


def page_create_incident() -> str:
    steps = '''<div class="wizard-steps"><div class="active"><span>1</span><b>Incident</b></div><i></i><div><span>2</span><b>Location</b></div><i></i><div><span>3</span><b>Contacts</b></div><i></i><div><span>4</span><b>Automation</b></div><i></i><div><span>5</span><b>Review</b></div></div>'''
    form = '''<section class="panel form-panel">''' + section_header("Incident information", "Create a verified operational record") + '''<div class="form-grid"><label class="wide">Property / location<select><option>Downtown Tower — Austin, TX</option></select></label><label>Unit / suite<input value="12B" /></label><label>Incident type<select><option>Plumbing — Water leak</option></select></label><label>Priority<select><option>High</option></select></label><label>Reported by<select><option>Tenant</option></select></label><label>Reporter name<input value="Sarah Johnson" /></label><label>Best contact number<input value="(512) 555-0188" /></label><label>Preferred contact<select><option>Voice call</option></select></label><label class="wide">Description<textarea>Water leaking from bathroom ceiling for approximately one hour. Local valve is shut off. No visible electrical exposure.</textarea></label><div class="upload-zone wide"><span>＋</span><strong>Add photos or videos</strong><small>PNG, JPG, MP4 · up to 50 MB</small></div></div></section>'''
    ai = '''<aside class="panel assistant-panel">''' + section_header("AI summary", "Generated from incident details") + '''<div class="ai-summary"><span class="eyebrow">POTENTIAL ISSUE</span><h3>Bathroom plumbing leak</h3><p>Tenant reports active ceiling leak lasting approximately one hour. Local water isolation completed.</p><hr><span class="eyebrow">PREDICTED IMPACT</span><ul><li>Unit damage risk: <b>High</b></li><li>Likely source: unit above</li><li>Category: Plumbing / urgent leak</li></ul><hr><span class="eyebrow">SUGGESTED ACTIONS</span><ol><li>Dispatch emergency plumber</li><li>Notify upstairs tenant</li><li>Document affected area</li></ol><div class="confidence"><span>Confidence</span><strong>91%</strong></div><div class="progress"><i style="width:91%"></i></div></div></aside>'''
    automation = '''<section class="panel wide-section">''' + section_header("Phone workflow", "Select what FieldRelay may do after creation") + '''<div class="automation-options"><label class="option-card selected"><input type="checkbox" checked /><span class="metric-icon primary">☎</span><div><strong>Call approved vendors</strong><p>Contact up to three authorized plumbing vendors.</p></div></label><label class="option-card selected"><input type="checkbox" checked /><span class="metric-icon cyan">⌂</span><div><strong>Confirm tenant access</strong><p>Call tenant before technician is dispatched.</p></div></label><label class="option-card"><input type="checkbox" /><span class="metric-icon yellow">$</span><div><strong>Auto-approve under limit</strong><p>Requires finance policy configuration.</p></div></label></div></section>'''
    footer = '<div class="wizard-footer"><button class="btn subtle">Save draft</button><span></span><button class="btn subtle">Cancel</button><button class="btn primary">Continue to location →</button></div>'
    return steps + f'<div class="create-grid">{form}{ai}</div>' + automation + footer


def page_calls() -> str:
    live = '''<section class="panel span-2">''' + section_header("Active calls", "8 phone workflows live now", "Open call console") + '''<div class="call-list"><article><div class="call-status"><span class="live-pill">● LIVE · 04:12</span><strong>CALL-E-7742</strong></div><div><h3>Water Leak — Unit 12B</h3><p>AquaFix Plumbing · Requesting confirmed ETA and quote</p></div>''' + call_wave('cyan') + '''<div class="button-row"><button class="btn subtle">Monitor</button><button class="btn danger">End</button></div></article><article><div class="call-status"><span class="live-pill ringing">◌ RINGING · 00:08</span><strong>CALL-E-7741</strong></div><div><h3>Elevator Failure — Lobby</h3><p>Metro Lift · Escalation and dispatch request</p></div>''' + call_wave('primary') + '''<div class="button-row"><button class="btn subtle">Monitor</button><button class="btn danger">Cancel</button></div></article><article><div class="call-status"><span class="badge green">Completed · 06:31</span><strong>CALL-E-7740</strong></div><div><h3>Power Outage — Level 4</h3><p>City Electric · Technician assigned, ETA 45 minutes</p></div>''' + call_wave('green') + '''<div class="button-row"><button class="btn subtle">Transcript</button><button class="btn subtle">Outcome</button></div></article></div></section>'''
    insights = '''<section class="panel">''' + section_header("AI extraction", "Across active calls") + '''<div class="extraction"><div><span>Water leak</span><strong>45%</strong><div class="progress"><i style="width:45%"></i></div></div><div><span>Elevator</span><strong>20%</strong><div class="progress cyan"><i style="width:20%"></i></div></div><div><span>Power outage</span><strong>15%</strong><div class="progress yellow"><i style="width:15%"></i></div></div><div><span>HVAC</span><strong>10%</strong><div class="progress green"><i style="width:10%"></i></div></div></div></section>'''
    queue = '''<section class="panel">''' + section_header("Call queue", "Scheduled and retrying", "Manage queue") + '''<ul class="queue-list"><li><span class="queue-time">10:52</span><div><strong>Confirm tenant access</strong><small>Sarah Johnson · Unit 12B</small></div>''' + badge("Scheduled","primary") + '''</li><li><span class="queue-time">10:55</span><div><strong>Retry vendor call</strong><small>Rapid Rooter · No answer</small></div>''' + badge("Retry 1/3","yellow") + '''</li><li><span class="queue-time">11:10</span><div><strong>Arrival check-in</strong><small>Alex Turner · AquaFix</small></div>''' + badge("Automated","cyan") + '''</li></ul></section>'''
    transcript = '''<section class="panel span-2">''' + section_header("Live transcript", "CALL-E-7742 · Structured extraction enabled", "Pop out") + '''<div class="transcript-full"><div class="speaker"><span>AI</span><div><b>Ava Voice AI</b><p>Hello, I’m calling on behalf of Downtown Tower regarding an urgent water leak in Unit 12B. Are you available to respond?</p></div><time>10:41:04</time></div><div class="speaker vendor"><span>AF</span><div><b>AquaFix Dispatcher</b><p>Yes, we can send Alex Turner. He is about twenty-two minutes away.</p></div><time>10:41:18</time></div><div class="speaker"><span>AI</span><div><b>Ava Voice AI</b><p>Please confirm the estimated callout cost and whether any special access is required.</p></div><time>10:41:24</time></div></div></section>'''
    structured = '''<section class="panel">''' + section_header("Structured outcome", "Validated against schema") + '''<dl class="detail-list compact"><div><dt>Availability</dt><dd class="green">Available</dd></div><div><dt>Technician</dt><dd>Alex Turner</dd></div><div><dt>ETA</dt><dd>22 minutes</dd></div><div><dt>Estimate</dt><dd>$245</dd></div><div><dt>Confidence</dt><dd>96%</dd></div></dl><button class="btn primary full">Request approval</button></section>'''
    return f'<div class="calls-grid">{live}{insights}{queue}{transcript}{structured}</div>'


def page_dispatch() -> str:
    unassigned = '''<section class="panel dispatch-list">''' + section_header("Unassigned incidents", "Drag to technician or choose best match", "Auto-assign") + '''<div class="dispatch-cards"><article><div>''' + badge("High","yellow") + '''<small>SLA 15m</small></div><h3>Water Leak — Unit 12B</h3><p>Downtown Tower · Plumbing</p><span>10:29 AM</span></article><article><div>''' + badge("Critical","red") + '''<small>SLA 8m</small></div><h3>Elevator Failure</h3><p>Grand Plaza · Elevator</p><span>10:16 AM</span></article><article><div>''' + badge("Medium","primary") + '''<small>SLA 1h</small></div><h3>Plumbing Issue</h3><p>City Center · General</p><span>10:02 AM</span></article></div></section>'''
    map_html = '''<section class="panel dispatch-map">''' + section_header("Live field map", "12 technicians · 8 active routes", "Map layers") + '''<div class="map-canvas"><svg viewBox="0 0 1000 600" aria-label="Stylized dispatch map"><g class="roads"><path d="M0 100 C250 160 400 40 1000 130"/><path d="M80 0 C120 200 70 400 150 600"/><path d="M330 0 C300 240 380 400 310 600"/><path d="M590 0 C520 180 650 390 600 600"/><path d="M860 0 C800 180 900 420 850 600"/><path d="M0 330 C220 270 420 390 1000 300"/><path d="M0 500 C300 430 600 540 1000 450"/></g><g class="blocks"><rect x="200" y="90" width="100" height="80"/><rect x="420" y="150" width="130" height="100"/><rect x="690" y="70" width="120" height="90"/><rect x="180" y="390" width="110" height="100"/><rect x="460" y="390" width="120" height="90"/><rect x="760" y="380" width="110" height="100"/></g><g class="routes"><path d="M220 460 C300 390 360 310 510 250"/><path d="M710 120 C650 180 620 250 510 250"/></g></svg><span class="map-pin red" style="left:50%;top:42%">!</span><span class="map-pin cyan" style="left:22%;top:72%">AT</span><span class="map-pin primary" style="left:72%;top:16%">DJ</span><span class="map-pin green" style="left:76%;top:67%">SM</span><div class="map-legend"><span><i class="red"></i>Critical incident</span><span><i class="cyan"></i>Available tech</span><span><i class="primary"></i>En route</span></div></div></section>'''
    techs = '''<section class="panel span-2">''' + section_header("Technician workload", "Availability and route confidence", "View schedule") + '''<div class="tech-strip"><article>''' + avatar("Alex Turner","lg") + '''<div><strong>Alex Turner</strong><span>Plumbing · 4.9 ★</span></div><div class="progress"><i style="width:72%"></i></div>''' + badge("En route","primary") + '''</article><article>''' + avatar("Mila Johnson","lg") + '''<div><strong>Mila Johnson</strong><span>Electrical · 4.8 ★</span></div><div class="progress green"><i style="width:45%"></i></div>''' + badge("Available","green") + '''</article><article>''' + avatar("Sarah Lee","lg") + '''<div><strong>Sarah Lee</strong><span>HVAC · 4.7 ★</span></div><div class="progress yellow"><i style="width:88%"></i></div>''' + badge("Busy","yellow") + '''</article><article>''' + avatar("David Chen","lg") + '''<div><strong>David Chen</strong><span>General · 4.9 ★</span></div><div class="progress cyan"><i style="width:60%"></i></div>''' + badge("Available","cyan") + '''</article></div></section>'''
    schedule = '''<section class="panel span-3">''' + section_header("Dispatch calendar", "July 24 · live schedule", "Week view") + '''<div class="calendar-grid"><div class="time-col"><span>9 AM</span><span>10 AM</span><span>11 AM</span><span>12 PM</span><span>1 PM</span><span>2 PM</span><span>3 PM</span></div><div class="day-col"><b>Alex Turner</b><article class="cal-event purple" style="top:70px;height:150px"><strong>Water leak</strong><small>Downtown Tower</small></article><article class="cal-event cyan" style="top:270px;height:120px"><strong>Valve inspection</strong><small>Sunset Villas</small></article></div><div class="day-col"><b>Mila Johnson</b><article class="cal-event green" style="top:170px;height:120px"><strong>Power outage</strong><small>Riverside Homes</small></article></div><div class="day-col"><b>Sarah Lee</b><article class="cal-event yellow" style="top:40px;height:220px"><strong>HVAC repair</strong><small>Oakwood Apartments</small></article><article class="cal-event purple" style="top:320px;height:100px"><strong>Cooling inspection</strong><small>Grand Plaza</small></article></div><div class="day-col"><b>David Chen</b><article class="cal-event cyan" style="top:120px;height:160px"><strong>Access gate</strong><small>Bayview Commercial</small></article></div></div></section>'''
    return f'<div class="dispatch-grid">{unassigned}{map_html}{techs}{schedule}</div>'


def page_technicians() -> str:
    summary = '''<div class="metric-grid compact-grid">''' + ''.join([
        metric_card("Available now", "18", "of 26 technicians", "green", "✓", False),
        metric_card("En route", "6", "avg ETA 24m", "primary", "↗", False),
        metric_card("Jobs today", "42", "31 completed", "cyan", "◆", False),
        metric_card("Avg rating", "4.8", "↑ 0.2 this month", "yellow", "★", False),
    ]) + '''</div>'''
    cards=[]
    people=[
        ("Alex Turner","Plumbing","En route","4.9","128","98%","primary"),
        ("Mila Johnson","Electrical","Available","4.8","104","96%","green"),
        ("Sarah Lee","HVAC","Busy","4.7","96","91%","yellow"),
        ("David Chen","General Maintenance","Available","4.9","112","97%","cyan"),
        ("Ravi Patel","Elevator","Offline","4.8","89","94%","muted"),
        ("Noah Williams","Security systems","Available","4.6","78","89%","green"),
    ]
    for name,trade,status,rating,jobs,sla,tone in people:
        cards.append(f'''<article class="person-card">{avatar(name,'xl')}<div class="person-main"><div><h3>{name}</h3>{badge(status,tone)}</div><p>{trade} · Austin Central</p></div><div class="person-stats"><div><small>Rating</small><strong>★ {rating}</strong></div><div><small>Jobs</small><strong>{jobs}</strong></div><div><small>SLA</small><strong>{sla}</strong></div></div><div class="skill-row"><span>Licensed</span><span>Background checked</span><span>Insured</span></div><div class="button-row"><button class="btn primary">View profile</button><button class="btn subtle">Assign job</button></div></article>''')
    roster = '''<section class="panel">''' + section_header("Technician roster", "Live availability, skill and performance", "＋ Add technician") + '<div class="filters"><button class="chip active">All</button><button class="chip">Available</button><button class="chip">Plumbing</button><button class="chip">Electrical</button><button class="chip">HVAC</button><span></span><button class="btn subtle">Sort: Best match</button></div><div class="people-grid">' + ''.join(cards) + '</div></section>'
    return summary + roster


def page_vendor_detail() -> str:
    header = '''<section class="vendor-hero"><div class="vendor-logo">AF</div><div><div class="hero-title"><h1>AquaFix Plumbing</h1>''' + badge("Preferred vendor","green") + '''</div><p>Emergency plumbing · Austin Metro · Partner since 2024</p><div class="vendor-meta"><span>★ 4.8 rating</span><span>98% on-time</span><span>Licensed & insured</span><span>24/7 response</span></div></div><div class="button-row"><button class="btn subtle">Message</button><button class="btn primary">Call vendor</button></div></section>'''
    tabs = '<div class="tabs"><button class="active">Overview</button><button>Jobs</button><button>Availability</button><button>Rates</button><button>Compliance</button><button>Reviews</button></div>'
    profile = '''<section class="panel">''' + section_header("Vendor profile") + '''<dl class="detail-list"><div><dt>Primary contact</dt><dd>James Wilson</dd></div><div><dt>Phone</dt><dd>(512) 555-0198</dd></div><div><dt>Email</dt><dd>dispatch@aquafix.com</dd></div><div><dt>Service area</dt><dd>35-mile radius</dd></div><div><dt>Minimum callout</dt><dd>$145</dd></div><div><dt>Emergency uplift</dt><dd>20%</dd></div></dl></section>'''
    score = '''<section class="panel">''' + section_header("Performance score", "Rolling 90 days") + '''<div class="score-layout">''' + donut(92,"Vendor score","green") + '''<div class="score-bars"><div><span>Response speed</span><strong>96%</strong><div class="progress green"><i style="width:96%"></i></div></div><div><span>SLA adherence</span><strong>98%</strong><div class="progress"><i style="width:98%"></i></div></div><div><span>Customer rating</span><strong>94%</strong><div class="progress cyan"><i style="width:94%"></i></div></div></div></div></section>'''
    availability = '''<section class="panel span-2">''' + section_header("Live availability", "Updated 2 minutes ago", "Request coverage") + '''<div class="availability-board"><div class="avail-day active"><strong>Today</strong><span>4 technicians</span><small>Average ETA 22m</small></div><div class="avail-day"><strong>Sat</strong><span>3 technicians</span><small>Average ETA 28m</small></div><div class="avail-day"><strong>Sun</strong><span>2 technicians</span><small>Average ETA 35m</small></div><div class="avail-day"><strong>Mon</strong><span>6 technicians</span><small>Average ETA 18m</small></div></div></section>'''
    jobs = '''<section class="panel span-2">''' + section_header("Recent jobs", "Last 30 days", "View all") + f'''<div class="table-wrap"><table><thead><tr><th>Incident</th><th>Property</th><th>Technician</th><th>Response</th><th>Cost</th><th>Outcome</th></tr></thead><tbody><tr><td><a>INC-2042-0891</a></td><td>Downtown Tower</td><td>Alex Turner</td><td>22m</td><td>$245</td><td>{badge('In progress','blue')}</td></tr><tr><td><a>INC-2042-0812</a></td><td>Sunset Villas</td><td>Alex Turner</td><td>18m</td><td>$180</td><td>{badge('Resolved','green')}</td></tr><tr><td><a>INC-2042-0798</a></td><td>Grand Plaza</td><td>Leo Martin</td><td>31m</td><td>$310</td><td>{badge('Resolved','green')}</td></tr></tbody></table></div></section>'''
    compliance = '''<section class="panel">''' + section_header("Compliance", "All documents verified") + '''<ul class="check-list"><li><span>✓</span><div><strong>Business license</strong><small>Expires Jan 18, 2027</small></div></li><li><span>✓</span><div><strong>Liability insurance</strong><small>$2M coverage · valid</small></div></li><li><span>✓</span><div><strong>Technician background checks</strong><small>All active personnel</small></div></li></ul></section>'''
    return header + tabs + f'<div class="vendor-grid">{profile}{score}{availability}{jobs}{compliance}</div>'


def page_approvals() -> str:
    stats = '''<div class="summary-strip"><div><span class="metric-icon yellow">◷</span><div><strong>7 Pending</strong><small>3 urgent</small></div></div><div><span class="metric-icon red">!</span><div><strong>$4,860 At risk</strong><small>Awaiting authorization</small></div></div><div><span class="metric-icon green">✓</span><div><strong>24 Approved</strong><small>This week</small></div></div><div><span class="metric-icon cyan">↗</span><div><strong>18m Avg decision</strong><small>↓ 5m vs last week</small></div></div></div>'''
    cards=[]
    items=[
        ("Emergency work authorization","Water Leak — Unit 12B","AquaFix Plumbing","$245.00","High","10m","red"),
        ("Vendor onboarding","ElevatorCo Services","Compliance review","—","Medium","26m","yellow"),
        ("Overage approval","Emergency drywall repair","Metro Restoration","$1,250.00","High","34m","red"),
        ("Parts replacement","HVAC compressor","ProFix HVAC","$780.00","Medium","1h","yellow"),
        ("Credit request","Tenant inconvenience credit","Downtown Tower","$300.00","Low","2h","green"),
    ]
    for title,sub,vendor,amount,priority,age,tone in items:
        cards.append(f'''<article class="approval-card"><div class="approval-card-head"><span class="approval-icon">✓</span><div><h3>{title}</h3><p>{sub}</p></div>{badge(priority,tone)}</div><dl><div><dt>Requested by</dt><dd>{vendor}</dd></div><div><dt>Amount</dt><dd>{amount}</dd></div><div><dt>Waiting</dt><dd>{age}</dd></div><div><dt>Policy</dt><dd>Human approval required</dd></div></dl><div class="approval-reason"><small>AI rationale</small><p>Urgent incident with credible SLA breach and secondary damage risk. Vendor estimate is within benchmark range.</p></div><div class="button-row"><button class="btn danger outline">Reject</button><button class="btn subtle">Request changes</button><button class="btn success">Approve</button></div></article>''')
    content='''<section class="panel">''' + section_header("Approval inbox", "Human decisions across incidents, vendors and spend", "Approval rules") + '''<div class="filters"><button class="chip active">Pending 7</button><button class="chip">Approved</button><button class="chip">Rejected</button><button class="chip">Delegated</button><span></span><button class="btn subtle">Priority: All</button></div><div class="approval-grid">''' + ''.join(cards) + '''</div></section>'''
    return stats+content


def page_customers() -> str:
    summary = '''<div class="metric-grid compact-grid">''' + ''.join([
        metric_card("Properties", "24", "6 regions", "primary", "⌂", False),
        metric_card("Active contacts", "1,842", "98% verified", "cyan", "♙", False),
        metric_card("Open incidents", "128", "12 critical", "red", "!", False),
        metric_card("Customer CSAT", "4.6/5", "↑ 0.3 this month", "green", "★", False),
    ]) + '''</div>'''
    property_cards=[]
    data=[
        ("Downtown Tower","Austin Central","482 units","18 open","4.7","primary"),
        ("Grand Plaza","Austin North","310 units","12 open","4.5","cyan"),
        ("Riverside Homes","Austin East","226 units","9 open","4.8","green"),
        ("Oakwood Apartments","Austin South","190 units","7 open","4.4","yellow"),
        ("Sunset Villas","Austin West","144 units","5 open","4.9","primary"),
        ("Bayview Commercial","Austin Central","86 suites","4 open","4.6","cyan"),
    ]
    for name,region,units,opens,csat,tone in data:
        property_cards.append(f'''<article class="property-card"><div class="property-art {tone}"><span>⌂</span></div><div class="property-main"><h3>{name}</h3><p>{region}</p></div><div class="property-stats"><span>{units}</span><span>{opens}</span><span>★ {csat}</span></div><div class="button-row"><button class="btn subtle">View contacts</button><button class="btn primary">Open property</button></div></article>''')
    properties='''<section class="panel">''' + section_header("Properties & customers", "Operational health across managed locations", "＋ Add property") + '''<div class="filters"><button class="chip active">All properties</button><button class="chip">At risk</button><button class="chip">High incident volume</button><span></span><button class="btn subtle">Region: All</button></div><div class="property-grid">''' + ''.join(property_cards) + '''</div></section>'''
    return summary+properties


def page_analytics() -> str:
    metrics = ''.join([
        metric_card("Total incidents", "236", "↑ 16% vs prior 7 days", "primary", "◆"),
        metric_card("SLA met", "92%", "↑ 6% vs prior 7 days", "green", "✓"),
        metric_card("Avg response", "38m", "↓ 12m vs prior 7 days", "cyan", "◷"),
        metric_card("First-call resolution", "75%", "↑ 5% vs prior 7 days", "yellow", "☎"),
    ])
    overview=f'''<section class="panel span-2">{section_header('Incidents & resolution trend','May 9–May 15 · All properties','Custom range')}{line_chart(3,300)}<div class="chart-legend"><span><i class="purple"></i>New incidents</span><span><i class="cyan"></i>Resolved incidents</span><span><i class="green"></i>First-call resolutions</span></div></section>'''
    category='''<section class="panel">''' + section_header("Incident categories", "This week") + '''<div class="category-layout">''' + donut(64,"236 total","primary") + '''<ul class="category-list"><li><i class="purple"></i><span>Plumbing</span><strong>34%</strong></li><li><i class="cyan"></i><span>HVAC</span><strong>22%</strong></li><li><i class="green"></i><span>Electrical</span><strong>18%</strong></li><li><i class="yellow"></i><span>Access / lock</span><strong>12%</strong></li><li><i class="red"></i><span>Other</span><strong>14%</strong></li></ul></div></section>'''
    vendors='''<section class="panel">''' + section_header("Top vendors by SLA", "Rolling 30 days", "All vendors") + '''<div class="ranking"><div><span>1</span>''' + avatar("AquaFix Plumbing","sm") + '''<div><strong>AquaFix Plumbing</strong><small>42 jobs</small></div><div class="rank-bar"><i style="width:98%"></i></div><b>98%</b></div><div><span>2</span>''' + avatar("FirstCall Electric","sm") + '''<div><strong>FirstCall Electric</strong><small>38 jobs</small></div><div class="rank-bar"><i style="width:93%"></i></div><b>93%</b></div><div><span>3</span>''' + avatar("ProFix HVAC","sm") + '''<div><strong>ProFix HVAC</strong><small>31 jobs</small></div><div class="rank-bar"><i style="width:89%"></i></div><b>89%</b></div><div><span>4</span>''' + avatar("Metro Restoration","sm") + '''<div><strong>Metro Restoration</strong><small>24 jobs</small></div><div class="rank-bar"><i style="width:76%"></i></div><b>76%</b></div></div></section>'''
    sla=f'''<section class="panel span-2">{section_header('SLA compliance over time','By priority tier','View report')}{line_chart(2,240)}</section>'''
    call_dist='''<section class="panel">''' + section_header("Call outcome distribution", "CALL-E workflows") + '''<div class="bar-chart"><div style="height:82%"><span>82</span></div><div style="height:64%"><span>64</span></div><div style="height:48%"><span>48</span></div><div style="height:33%"><span>33</span></div><div style="height:18%"><span>18</span></div></div><div class="bar-labels"><span>Answered</span><span>Resolved</span><span>Follow-up</span><span>No answer</span><span>Escalated</span></div></section>'''
    return f'<div class="metric-grid">{metrics}</div><div class="analytics-grid">{overview}{category}{vendors}{sla}{call_dist}</div>'


def page_audit() -> str:
    summary = '''<div class="summary-strip"><div><span class="metric-icon green">✓</span><div><strong>100% recorded</strong><small>Operational actions</small></div></div><div><span class="metric-icon cyan">⌕</span><div><strong>4,218 events</strong><small>Last 30 days</small></div></div><div><span class="metric-icon primary">◈</span><div><strong>98% consent</strong><small>Valid active records</small></div></div><div><span class="metric-icon yellow">!</span><div><strong>3 reviews</strong><small>Need attention</small></div></div></div>'''
    log_rows='''<tr><td>10:46:08</td><td>Atchayam Ganesh</td><td>Approval</td><td>Approved work authorization</td><td><a>APR-9384</a></td><td>Web · Austin</td><td>✓ Verified</td></tr><tr><td>10:41:24</td><td>Ava Voice AI</td><td>Call</td><td>Extracted structured outcome</td><td><a>CALL-E-7742</a></td><td>CALL-E API</td><td>✓ Signed</td></tr><tr><td>10:35:11</td><td>System</td><td>Notification</td><td>Tenant SMS delivered</td><td><a>INC-2042-0891</a></td><td>Workflow engine</td><td>✓ Verified</td></tr><tr><td>10:31:02</td><td>James Wilson</td><td>Vendor</td><td>Accepted dispatch request</td><td><a>DSP-5512</a></td><td>Phone call</td><td>✓ Recorded</td></tr><tr><td>10:29:14</td><td>Sarah Johnson</td><td>Consent</td><td>Call disclosure acknowledged</td><td><a>CNS-4491</a></td><td>Voice prompt</td><td>✓ Valid</td></tr>'''
    log='''<section class="panel span-2">''' + section_header("Immutable audit log", "Tamper-evident operational history", "Export signed report") + '''<div class="filters"><button class="chip active">All events</button><button class="chip">Calls</button><button class="chip">Approvals</button><button class="chip">Consent</button><button class="chip">Data access</button><span></span><button class="btn subtle">Date: 24 Jul</button></div><div class="table-wrap"><table><thead><tr><th>Timestamp</th><th>Actor</th><th>Type</th><th>Action</th><th>Reference</th><th>Source</th><th>Integrity</th></tr></thead><tbody>''' + log_rows + '''</tbody></table></div></section>'''
    consent='''<section class="panel">''' + section_header("Consent health", "Authorization for phone workflows") + '''<div class="consent-list"><article><span class="metric-icon green">✓</span><div><strong>Tenant contact consent</strong><p>1,806 valid · 36 expiring in 30 days</p></div>''' + badge("98% valid","green") + '''</article><article><span class="metric-icon cyan">☎</span><div><strong>Vendor call disclosure</strong><p>All active vendors acknowledge AI call use</p></div>''' + badge("Compliant","cyan") + '''</article><article><span class="metric-icon yellow">!</span><div><strong>Recording retention</strong><p>3 records exceed 90-day policy</p></div>''' + badge("Review","yellow") + '''</article></div></section>'''
    policy='''<section class="panel">''' + section_header("Data controls", "Current organization policy") + '''<dl class="detail-list compact"><div><dt>Call recording retention</dt><dd>90 days</dd></div><div><dt>Transcript retention</dt><dd>180 days</dd></div><div><dt>PII redaction</dt><dd>Enabled</dd></div><div><dt>Export approval</dt><dd>Admin required</dd></div><div><dt>Data residency</dt><dd>US Central</dd></div></dl><button class="btn subtle full">Open policy settings</button></section>'''
    return summary+f'<div class="audit-grid">{log}{consent}{policy}</div>'


def page_knowledge() -> str:
    hero='''<section class="knowledge-hero"><div><span class="eyebrow">FIELD OPERATIONS KNOWLEDGE</span><h1>Find the answer before the next call.</h1><p>Approved procedures, vendor playbooks, escalation policies and incident guides.</p><div class="knowledge-search"><span>⌕</span><input placeholder="Search procedures, policies, vendor instructions…"/><button class="btn primary">Search</button></div></div><div class="knowledge-orb"><div class="orb xl"></div><span>AI grounded in 248 approved documents</span></div></section>'''
    cats=[]
    for icon,title,count,desc,tone in [
        ("💧","Plumbing emergencies","34","Leaks, shutoff, water damage","cyan"),
        ("⚡","Electrical safety","28","Outages, exposed wiring, isolation","yellow"),
        ("❄","HVAC operations","41","Cooling, heating, ventilation","primary"),
        ("▣","Elevator response","19","Entrapment and outage procedures","red"),
        ("🔐","Access & security","32","Locks, gates, access control","green"),
        ("☎","CALL-E playbooks","22","Scripts, disclosures, escalation","cyan"),
    ]:
        cats.append(f'''<article class="knowledge-card"><span class="metric-icon {tone}">{icon}</span><div><h3>{title}</h3><p>{desc}</p></div><b>{count} docs</b><button class="btn subtle">Browse →</button></article>''')
    recent='''<section class="panel span-2">''' + section_header("Recently used", "Approved sources opened by your team", "View all") + '''<div class="document-list"><article><span>PDF</span><div><strong>Emergency water leak response — v4.2</strong><small>Operations policy · Updated Jul 18 · 8 pages</small></div>''' + badge("Approved","green") + '''</article><article><span>DOC</span><div><strong>CALL-E vendor dispatch script</strong><small>Phone playbook · Updated Jul 22 · 4 pages</small></div>''' + badge("Approved","green") + '''</article><article><span>PDF</span><div><strong>Elevator entrapment escalation matrix</strong><small>Safety procedure · Updated Jun 30 · 6 pages</small></div>''' + badge("Critical","red") + '''</article></div></section>'''
    assistant='''<section class="panel">''' + section_header("Ask Operations AI", "Answers cite approved sources") + '''<div class="assistant-chat"><div class="chat-msg user">What should we confirm before dispatching a plumber for a ceiling leak?</div><div class="chat-msg ai"><b>Based on Water Leak Response v4.2:</b><ol><li>Confirm local shutoff is closed.</li><li>Check for electrical exposure.</li><li>Confirm access to the affected and upper unit.</li></ol><small>Sources: WL-4.2 §2.1, Access Policy §3</small></div><div class="chat-input"><input placeholder="Ask a question…"/><button class="btn primary">Send</button></div></div></section>'''
    return hero+f'<div class="knowledge-grid"><section class="panel span-3">{section_header("Browse by category","248 approved documents","Manage library")}<div class="knowledge-categories">{"".join(cats)}</div></section>{recent}{assistant}</div>'


def page_settings() -> str:
    menu='''<aside class="settings-menu"><button class="active">Organization</button><button>Profile</button><button>Notifications</button><button>AI & automation</button><button>Integrations</button><button>Teams & roles</button><button>Billing</button><button>Security</button><button>Data retention</button><button>System</button></aside>'''
    general='''<section class="panel settings-panel">''' + section_header("Organization settings", "Manage identity, defaults and operational preferences") + '''<div class="settings-section"><h3>Organization profile</h3><div class="form-grid"><label>Organization name<input value="FieldRelay Operations" /></label><label>Primary region<select><option>America/Chicago</option></select></label><label>Support email<input value="ops@fieldrelay.app" /></label><label>Default currency<select><option>USD — United States Dollar</option></select></label></div><div class="button-row right"><button class="btn primary">Save changes</button></div></div><div class="settings-section"><h3>Appearance</h3><p>Choose the default experience. Users may override this in their profile.</p><div class="theme-cards"><label class="theme-option"><input type="radio" name="theme"/><div class="theme-preview light-preview"><span></span><i></i><i></i></div><strong>Light</strong></label><label class="theme-option selected"><input type="radio" name="theme" checked/><div class="theme-preview dark-preview"><span></span><i></i><i></i></div><strong>Dark</strong></label><label class="theme-option"><input type="radio" name="theme"/><div class="theme-preview system-preview"><span></span><i></i><i></i></div><strong>System</strong></label></div></div><div class="settings-section"><h3>Operational defaults</h3><div class="toggle-list"><label><div><strong>Require human approval for cost</strong><small>Always request approval above configured limits.</small></div><input type="checkbox" checked/></label><label><div><strong>Allow automated vendor retries</strong><small>Retry unavailable vendors based on incident priority.</small></div><input type="checkbox" checked/></label><label><div><strong>Record CALL-E transcripts</strong><small>Store redacted transcripts for operational audit.</small></div><input type="checkbox" checked/></label><label><div><strong>Auto-close verified incidents</strong><small>Close only when customer and technician confirm completion.</small></div><input type="checkbox"/></label></div></div></section>'''
    return f'<div class="settings-layout">{menu}{general}</div>'


PAGE_BUILDERS = {
    "01-login": page_login,
    "02-mission-control": page_mission_control,
    "03-incidents": page_incidents,
    "04-incident-detail": page_incident_detail,
    "05-create-incident": page_create_incident,
    "06-calls-ai-ops": page_calls,
    "07-dispatch": page_dispatch,
    "08-technicians": page_technicians,
    "09-vendor-detail": page_vendor_detail,
    "10-approvals": page_approvals,
    "11-customers": page_customers,
    "12-analytics": page_analytics,
    "13-audit-consent": page_audit,
    "14-knowledge-base": page_knowledge,
    "15-settings": page_settings,
}


def css(theme: dict) -> str:
    vars_css = ";".join(f"--{k.replace('_','-')}:{v}" for k, v in theme.items())
    return dedent(f'''
    :root{{{vars_css};--radius:18px;--radius-sm:12px;--sidebar:270px;--topbar:86px;--grid:var(--grid)}}
    *{{box-sizing:border-box}}
    html,body{{margin:0;background:var(--bg);color:var(--text);font-family:Inter,"Segoe UI",Arial,sans-serif;-webkit-font-smoothing:antialiased}}
    body{{min-width:320px}}
    button,input,select,textarea{{font:inherit;color:inherit}}
    button{{cursor:default}}
    a{{color:var(--cyan);font-weight:700;text-decoration:none}}
    .app-shell{{min-height:100vh;background:radial-gradient(circle at 65% -20%,var(--purple-soft),transparent 42%),var(--bg);display:grid;grid-template-columns:var(--sidebar) 1fr}}
    .sidebar{{position:sticky;top:0;height:100vh;background:color-mix(in srgb,var(--surface) 96%,transparent);border-right:1px solid var(--border2);padding:22px 16px;display:flex;flex-direction:column;z-index:10}}
    .brand,.mobile-logo{{display:flex;align-items:center;gap:12px}}
    .brand{{height:56px;padding:0 10px 18px;margin-bottom:8px;border-bottom:1px solid var(--border2)}}
    .brand strong,.mobile-logo strong{{font-size:23px;letter-spacing:-.6px}}
    .brand strong span,.mobile-logo strong span{{color:var(--cyan)}}
    .brand button{{margin-left:auto;border:0;background:none;color:var(--muted);font-size:19px}}
    .logo-mark{{width:38px;height:38px;border-radius:12px;display:grid;place-items:center;background:linear-gradient(135deg,var(--primary),var(--cyan));color:white;font-weight:900;box-shadow:0 0 0 6px var(--purple-soft)}}
    .sidebar nav{{display:flex;flex-direction:column;gap:4px;margin-top:8px}}
    .nav-item{{min-height:47px;border-radius:12px;color:var(--muted);display:flex;align-items:center;gap:13px;padding:0 13px;font-size:14px;font-weight:650;position:relative}}
    .nav-item.active{{background:linear-gradient(90deg,var(--purple-soft),var(--cyan-soft));color:var(--text);box-shadow:inset 3px 0 var(--primary2)}}
    .nav-icon{{width:22px;text-align:center;font-size:17px}}
    .nav-count{{margin-left:auto;background:var(--red);color:white;border-radius:999px;padding:2px 7px;font-size:11px}}
    .nav-live{{margin-left:auto;color:var(--cyan);border:1px solid color-mix(in srgb,var(--cyan) 45%,transparent);padding:2px 5px;border-radius:6px;font-size:9px}}
    .sidebar-ai{{margin-top:auto;border:1px solid var(--border);background:linear-gradient(135deg,var(--purple-soft),var(--cyan-soft));border-radius:14px;padding:13px;display:flex;align-items:center;gap:12px}}
    .sidebar-ai div:last-child{{display:flex;flex-direction:column;gap:3px}}
    .sidebar-ai span,.profile span{{font-size:11px;color:var(--muted)}}
    .orb{{width:34px;height:34px;border-radius:50%;background:radial-gradient(circle at 35% 35%,white 0 6%,var(--cyan) 16%,var(--primary) 52%,transparent 68%);box-shadow:0 0 32px var(--primary2)}}
    .orb.xl{{width:170px;height:170px;box-shadow:0 0 90px var(--primary2)}}
    .profile{{display:flex;align-items:center;gap:10px;padding:18px 6px 4px}}
    .profile>div{{display:flex;flex-direction:column;min-width:0}}
    .profile strong{{font-size:12px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}}
    .profile>span:last-child{{margin-left:auto}}
    .avatar{{display:inline-grid;place-items:center;border-radius:50%;font-weight:800;background:linear-gradient(135deg,var(--primary2),var(--cyan));color:white;flex:0 0 auto;box-shadow:0 0 0 3px var(--surface)}}
    .avatar.sm{{width:32px;height:32px;font-size:10px}}.avatar.md{{width:40px;height:40px;font-size:11px}}.avatar.lg{{width:52px;height:52px;font-size:13px}}.avatar.xl{{width:76px;height:76px;font-size:18px}}
    .app-main{{min-width:0}}
    .topbar{{height:var(--topbar);position:sticky;top:0;z-index:8;background:color-mix(in srgb,var(--bg) 88%,transparent);backdrop-filter:blur(24px);border-bottom:1px solid var(--border2);display:flex;align-items:center;padding:0 28px;gap:24px}}
    .page-title h1{{font-size:24px;margin:0;letter-spacing:-.5px}}.page-title p{{font-size:11px;color:var(--muted);margin:3px 0 0}}
    .global-search{{margin-left:auto;width:min(460px,32vw);height:44px;border:1px solid var(--border);border-radius:12px;background:var(--surface);display:flex;align-items:center;padding:0 13px;gap:9px}}
    .global-search input{{flex:1;background:transparent;border:0;outline:0;font-size:13px}}.global-search kbd{{font-size:10px;color:var(--muted);border:1px solid var(--border);padding:2px 6px;border-radius:6px}}
    .top-actions{{display:flex;align-items:center;gap:9px}}
    .icon-btn{{width:40px;height:40px;border-radius:11px;border:1px solid var(--border);background:var(--surface);position:relative}}
    .notify i{{position:absolute;right:-3px;top:-3px;width:17px;height:17px;background:var(--red);color:white;border-radius:50%;font-size:9px;display:grid;place-items:center;font-style:normal}}
    .mobile-logo{{display:none}}
    .page-content{{padding:26px 28px 42px;max-width:2200px;margin:0 auto}}
    h1,h2,h3,p{{margin-top:0}}h2{{font-size:16px;letter-spacing:-.2px;margin-bottom:4px}}h3{{font-size:14px}}p{{color:var(--muted);font-size:12px;line-height:1.55}}
    .panel{{background:linear-gradient(145deg,color-mix(in srgb,var(--surface) 98%,transparent),var(--surface2));border:1px solid var(--border2);border-radius:var(--radius);padding:20px;box-shadow:var(--shadow);min-width:0}}
    .section-head{{display:flex;align-items:flex-start;justify-content:space-between;gap:14px;margin-bottom:17px}}
    .section-head h2{{margin:0}}.section-head p{{margin:4px 0 0}}.section-head .btn{{margin-top:-4px}}
    .btn{{height:40px;padding:0 15px;border-radius:11px;border:1px solid var(--border);background:var(--surface);font-weight:750;font-size:12px;display:inline-flex;align-items:center;justify-content:center;gap:7px;white-space:nowrap}}
    .btn.primary{{border-color:transparent;background:linear-gradient(135deg,var(--primary),var(--primary2));color:white;box-shadow:0 9px 25px var(--purple-soft)}}
    .btn.subtle{{background:var(--surface2);color:var(--text)}}.btn.danger{{border-color:color-mix(in srgb,var(--red) 45%,var(--border));color:var(--red);background:var(--red-soft)}}.btn.success{{border-color:transparent;background:var(--green);color:white}}.btn.full{{width:100%}}.btn.oauth{{background:var(--surface);height:46px}}.btn.outline{{background:transparent}}
    .button-row{{display:flex;align-items:center;gap:9px;flex-wrap:wrap}}.button-row.right{{justify-content:flex-end}}
    .badge{{display:inline-flex;align-items:center;height:25px;padding:0 9px;border-radius:999px;font-size:10px;font-weight:800;background:var(--purple-soft);color:var(--primary2);white-space:nowrap}}
    .badge.red{{background:var(--red-soft);color:var(--red)}}.badge.yellow{{background:var(--yellow-soft);color:var(--yellow)}}.badge.green{{background:var(--green-soft);color:var(--green)}}.badge.cyan{{background:var(--cyan-soft);color:var(--cyan)}}.badge.blue{{background:rgba(59,130,246,.12);color:var(--blue)}}.badge.muted{{background:var(--surface3);color:var(--muted)}}
    .red{{color:var(--red)!important}}.yellow{{color:var(--yellow)!important}}.green{{color:var(--green)!important}}.cyan{{color:var(--cyan)!important}}.primary{{color:var(--primary2)}}
    .metric-grid{{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:15px;margin-bottom:18px}}.metric-grid.compact-grid{{margin-bottom:20px}}
    .metric-card{{position:relative;overflow:hidden;background:linear-gradient(145deg,var(--surface),var(--surface2));border:1px solid var(--border2);border-radius:var(--radius);padding:17px 18px;min-height:152px;box-shadow:var(--shadow)}}
    .metric-top{{display:flex;justify-content:space-between;align-items:center}}.kebab{{color:var(--muted2);letter-spacing:2px}}
    .metric-icon{{width:34px;height:34px;border-radius:10px;display:inline-grid;place-items:center;background:var(--purple-soft);color:var(--primary2);font-weight:900;flex:0 0 auto}}
    .metric-icon.red{{background:var(--red-soft)}}.metric-icon.yellow{{background:var(--yellow-soft)}}.metric-icon.green{{background:var(--green-soft)}}.metric-icon.cyan{{background:var(--cyan-soft)}}.metric-icon.blue{{background:rgba(59,130,246,.12)}}
    .metric-card>p{{margin:13px 0 3px;font-size:11px}}.metric-card>strong{{display:block;font-size:28px;letter-spacing:-1px}}.delta{{font-size:10px;font-weight:700}}
    .spark{{position:absolute;bottom:0;right:10px;width:44%;height:54px;opacity:.85}}
    .dashboard-grid,.calls-grid,.analytics-grid,.audit-grid,.vendor-grid,.knowledge-grid{{display:grid;grid-template-columns:1.3fr 1fr .75fr;gap:16px;align-items:start}}
    .span-2{{grid-column:span 2}}.span-3{{grid-column:span 3}}
    .table-wrap{{overflow:hidden;border:1px solid var(--border2);border-radius:13px}}.table-wrap.roomy table{{min-width:1080px}}
    table{{width:100%;border-collapse:collapse;font-size:11px}}thead{{background:var(--surface3);color:var(--muted)}}th,td{{padding:12px 13px;text-align:left;border-bottom:1px solid var(--border2);white-space:nowrap}}tbody tr:last-child td{{border-bottom:0}}tbody tr:hover{{background:var(--purple-soft)}}
    .cell-title{{display:flex;flex-direction:column;gap:3px}}.cell-title span{{font-size:10px;color:var(--muted)}}
    .mobile-cards{{display:none}}
    .live-call{{min-height:420px}}.call-primary{{display:flex;align-items:center;gap:15px}}.call-primary h3{{font-size:17px;margin:8px 0 4px}}
    .call-orb{{width:62px;height:62px;border-radius:50%;display:grid;place-items:center;border:1px solid color-mix(in srgb,var(--cyan) 40%,var(--border));background:var(--cyan-soft);color:var(--cyan);font-size:23px;box-shadow:0 0 35px var(--cyan-soft)}}
    .live-pill{{display:inline-flex;color:var(--green);font-size:10px;font-weight:800;letter-spacing:.4px}}.live-pill.ringing{{color:var(--yellow)}}
    .wave{{height:76px;display:flex;align-items:center;justify-content:center;gap:4px;margin:17px 0;border-top:1px solid var(--border2);border-bottom:1px solid var(--border2)}}.wave i{{width:4px;border-radius:99px;opacity:.75}}
    .call-facts{{display:grid;grid-template-columns:repeat(3,1fr);gap:8px;margin-bottom:17px}}.call-facts>div{{padding:11px;background:var(--surface3);border-radius:10px;display:flex;flex-direction:column;gap:4px}}.call-facts small,.vendor-stats small,.person-stats small{{color:var(--muted);font-size:9px}}
    .flow-grid{{display:grid;grid-template-columns:1fr auto 1fr auto 1fr auto 1fr auto 1fr;align-items:center;gap:10px}}.flow-grid>b{{color:var(--primary2);font-size:20px}}
    .flow-step{{min-height:116px;border:1px dashed var(--border);border-radius:13px;padding:13px;display:flex;flex-direction:column;gap:8px;background:var(--surface2)}}.flow-step span{{width:26px;height:26px;border-radius:8px;display:grid;place-items:center;background:var(--surface3);color:var(--muted);font-size:10px}}.flow-step small{{color:var(--muted)}}.flow-step.done{{border-style:solid;border-color:color-mix(in srgb,var(--green) 35%,var(--border));background:var(--green-soft)}}.flow-step.active{{border-style:solid;border-color:var(--primary2);box-shadow:0 0 30px var(--purple-soft)}}
    .approval-mini{{display:flex;align-items:center;justify-content:space-between;gap:12px;padding:13px 0;border-bottom:1px solid var(--border2)}}.approval-mini:last-child{{border-bottom:0}}.approval-mini>div:first-child{{display:flex;align-items:center;gap:11px}}.approval-mini>div>div{{display:flex;flex-direction:column;gap:4px}}.approval-mini small{{color:var(--muted);font-size:10px}}
    .approval-icon{{width:34px;height:34px;border-radius:10px;display:grid;place-items:center;background:var(--yellow-soft);color:var(--yellow);font-weight:900}}.approval-icon.purple{{background:var(--purple-soft);color:var(--primary2)}}
    .activity-list,.insight-list,.queue-list,.check-list,.consent-list,.document-list{{list-style:none;padding:0;margin:0;display:flex;flex-direction:column}}
    .activity-list li{{display:flex;gap:11px;padding:10px 0;border-bottom:1px solid var(--border2)}}.activity-list li:last-child{{border-bottom:0}}.activity-list div{{display:flex;flex-direction:column;gap:4px}}.activity-list small{{color:var(--muted);font-size:10px}}.dot{{width:8px;height:8px;border-radius:50%;margin-top:5px;background:var(--primary2)}}.dot.red{{background:var(--red)}}.dot.yellow{{background:var(--yellow)}}.dot.green{{background:var(--green)}}.dot.cyan{{background:var(--cyan)}}
    .chart-flex{{display:grid;grid-template-columns:1fr 240px;gap:20px;align-items:center}}.chart{{width:100%;display:block}}.axis-labels text{{fill:var(--muted);font-size:11px}}.donut-side{{display:flex;flex-direction:column;align-items:center}}
    .donut-wrap{{position:relative;width:150px;height:150px}}.donut{{width:100%;height:100%}}.donut-center{{position:absolute;inset:0;display:flex;align-items:center;justify-content:center;flex-direction:column}}.donut-center strong{{font-size:23px}}.donut-center span{{font-size:9px;color:var(--muted);text-align:center}}
    .legend,.chart-legend{{display:flex;gap:14px;flex-wrap:wrap;margin-top:9px}}.legend{{flex-direction:column}}.legend span,.chart-legend span{{font-size:10px;color:var(--muted);display:flex;align-items:center;gap:7px}}.legend i,.chart-legend i,.category-list i,.map-legend i{{width:8px;height:8px;border-radius:50%;display:inline-block;background:var(--primary2)}}i.purple{{background:var(--primary2)!important}}i.cyan{{background:var(--cyan)!important}}i.green{{background:var(--green)!important}}i.yellow{{background:var(--yellow)!important}}i.red{{background:var(--red)!important}}
    .summary-strip{{display:grid;grid-template-columns:repeat(4,1fr);gap:1px;background:var(--border2);border:1px solid var(--border2);border-radius:var(--radius);overflow:hidden;margin-bottom:18px;box-shadow:var(--shadow)}}.summary-strip>div{{display:flex;align-items:center;gap:12px;padding:16px;background:var(--surface)}}.summary-strip>div>div{{display:flex;flex-direction:column;gap:4px}}.summary-strip small{{color:var(--muted);font-size:10px}}
    .filters{{display:flex;align-items:center;gap:8px;flex-wrap:wrap;margin-bottom:15px}}.filters>span{{flex:1}}.chip{{height:34px;border-radius:999px;padding:0 13px;background:var(--surface2);border:1px solid var(--border);font-size:10px;color:var(--muted);font-weight:700}}.chip.active{{background:var(--purple-soft);color:var(--primary2);border-color:color-mix(in srgb,var(--primary2) 35%,var(--border))}}
    .pagination{{display:flex;justify-content:space-between;align-items:center;margin-top:15px;color:var(--muted);font-size:10px}}.pagination div{{display:flex;gap:4px}}.pagination button{{width:30px;height:30px;border-radius:8px;border:1px solid var(--border);background:var(--surface2)}}.pagination button.active{{background:var(--primary);color:white}}
    .incident-hero,.vendor-hero{{display:flex;align-items:flex-end;justify-content:space-between;gap:18px;padding:6px 2px 20px}}.breadcrumb{{font-size:10px;color:var(--muted);margin-bottom:8px}}.hero-title{{display:flex;align-items:center;gap:10px;flex-wrap:wrap}}.hero-title h1{{font-size:26px;margin:0;letter-spacing:-.7px}}.incident-hero p,.vendor-hero p{{margin:6px 0 0}}
    .tabs{{height:48px;border-bottom:1px solid var(--border2);display:flex;gap:6px;margin-bottom:18px;overflow:hidden}}.tabs button{{border:0;background:transparent;color:var(--muted);padding:0 13px;font-size:11px;font-weight:750;border-bottom:2px solid transparent}}.tabs button.active{{color:var(--primary2);border-bottom-color:var(--primary2)}}
    .detail-grid{{display:grid;grid-template-columns:.75fr 1.25fr .75fr;gap:16px;align-items:start}}.detail-list{{display:grid;gap:0;margin:0}}.detail-list>div{{display:flex;justify-content:space-between;gap:12px;padding:10px 0;border-bottom:1px solid var(--border2)}}.detail-list>div:last-child{{border-bottom:0}}.detail-list dt{{color:var(--muted);font-size:10px}}.detail-list dd{{margin:0;font-size:11px;font-weight:750;text-align:right}}.detail-list.compact>div{{padding:9px 0}}
    .description-box{{margin-top:14px;padding:13px;background:var(--surface3);border-radius:12px}}.description-box small{{color:var(--muted)}}.description-box p{{margin:5px 0 0;color:var(--text)}}
    .timeline{{list-style:none;margin:0;padding:0}}.timeline li{{display:grid;grid-template-columns:52px 18px 1fr;min-height:56px;position:relative}}.timeline li:before{{content:"";position:absolute;left:60px;top:20px;bottom:-10px;width:1px;background:var(--border)}}.timeline li:last-child:before{{display:none}}.timeline time{{font-size:10px;color:var(--muted);padding-top:4px}}.timeline-dot{{width:10px;height:10px;border-radius:50%;margin-top:3px;background:var(--primary2);box-shadow:0 0 0 5px var(--purple-soft);z-index:1}}.timeline-dot.green{{background:var(--green);box-shadow:0 0 0 5px var(--green-soft)}}.timeline-dot.cyan{{background:var(--cyan);box-shadow:0 0 0 5px var(--cyan-soft)}}.timeline-dot.yellow{{background:var(--yellow);box-shadow:0 0 0 5px var(--yellow-soft)}}.timeline-dot.blue{{background:var(--blue);box-shadow:0 0 0 5px rgba(59,130,246,.12)}}.timeline li div{{display:flex;flex-direction:column;gap:4px}}.timeline small{{font-size:9px;color:var(--muted)}}
    .insight-list article{{display:flex;gap:11px;padding:11px 0;border-bottom:1px solid var(--border2)}}.insight-list article:last-child{{border-bottom:0}}.insight-list h3,.insight-list p{{margin-bottom:3px}}
    .transcript-preview,.transcript-full{{display:flex;flex-direction:column;gap:10px}}.speaker{{display:flex;align-items:flex-start;gap:10px;padding:10px;background:var(--surface3);border-radius:12px}}.speaker>span{{width:28px;height:28px;border-radius:8px;display:grid;place-items:center;background:var(--purple-soft);color:var(--primary2);font-size:9px;font-weight:900;flex:0 0 auto}}.speaker.vendor>span{{background:var(--cyan-soft);color:var(--cyan)}}.speaker p{{margin:0;color:var(--text)}}.speaker>div{{flex:1}}.speaker time{{font-size:9px;color:var(--muted)}}
    .health-stack>div:not(.progress){{display:flex;justify-content:space-between;padding:10px 0;border-bottom:1px solid var(--border2);font-size:11px}}
    .progress,.rank-bar{{height:7px;border-radius:99px;background:var(--surface3);overflow:hidden}}.progress i,.rank-bar i{{display:block;height:100%;background:linear-gradient(90deg,var(--primary),var(--primary2));border-radius:99px}}.progress.green i{{background:var(--green)}}.progress.cyan i{{background:var(--cyan)}}.progress.yellow i{{background:var(--yellow)}}
    .wizard-steps{{display:flex;align-items:center;justify-content:center;margin:0 auto 20px;max-width:900px}}.wizard-steps>div{{display:flex;align-items:center;gap:8px;color:var(--muted);font-size:10px}}.wizard-steps>div span{{width:30px;height:30px;border-radius:50%;display:grid;place-items:center;background:var(--surface3);border:1px solid var(--border)}}.wizard-steps>div.active{{color:var(--text)}}.wizard-steps>div.active span{{background:var(--primary);color:white;border-color:transparent}}.wizard-steps>i{{height:1px;flex:1;background:var(--border);margin:0 10px}}
    .create-grid{{display:grid;grid-template-columns:1fr 330px;gap:16px;align-items:start}}.form-grid{{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:14px}}.form-grid label{{display:flex;flex-direction:column;gap:7px;font-size:10px;font-weight:750}}.form-grid .wide{{grid-column:span 2}}
    input,select,textarea{{width:100%;border:1px solid var(--border);background:var(--surface2);border-radius:10px;padding:11px 12px;outline:0;font-size:11px}}textarea{{min-height:110px;resize:none}}
    .upload-zone{{min-height:108px;border:1px dashed color-mix(in srgb,var(--primary2) 45%,var(--border));border-radius:12px;display:flex;align-items:center;justify-content:center;flex-direction:column;gap:4px;background:var(--purple-soft)}}.upload-zone span{{font-size:24px;color:var(--primary2)}}.upload-zone small{{color:var(--muted)}}
    .assistant-panel{{position:sticky;top:110px}}.ai-summary hr{{border:0;border-top:1px solid var(--border2);margin:14px 0}}.eyebrow{{font-size:9px;letter-spacing:1.4px;font-weight:900;color:var(--cyan)}}.ai-summary ul,.ai-summary ol{{padding-left:17px;color:var(--muted);font-size:11px;line-height:1.8}}.confidence{{display:flex;justify-content:space-between;margin-bottom:7px;font-size:10px}}
    .wide-section{{margin-top:16px}}.automation-options{{display:grid;grid-template-columns:repeat(3,1fr);gap:12px}}.option-card{{border:1px solid var(--border);border-radius:13px;padding:14px;display:flex;align-items:flex-start;gap:12px;background:var(--surface2)}}.option-card.selected{{border-color:color-mix(in srgb,var(--primary2) 50%,var(--border));background:var(--purple-soft)}}.option-card input{{width:auto;margin-top:8px}}.option-card p{{margin-bottom:0}}.wizard-footer{{display:flex;align-items:center;gap:9px;margin-top:16px}}.wizard-footer span{{flex:1}}
    .calls-grid{{grid-template-columns:1.1fr 1fr .75fr}}.call-list{{display:flex;flex-direction:column;gap:12px}}.call-list article{{display:grid;grid-template-columns:120px minmax(180px,1fr) 260px auto;align-items:center;gap:16px;padding:14px;background:var(--surface2);border:1px solid var(--border2);border-radius:13px}}.call-list .wave{{height:50px;margin:0;border:0}}.call-status{{display:flex;flex-direction:column;gap:7px}}.call-status strong{{font-size:10px;color:var(--muted)}}.call-list h3,.call-list p{{margin-bottom:4px}}
    .extraction>div{{display:grid;grid-template-columns:1fr auto;gap:7px;margin-bottom:15px}}.extraction .progress{{grid-column:span 2}}.queue-list li{{display:grid;grid-template-columns:52px 1fr auto;align-items:center;gap:11px;padding:12px 0;border-bottom:1px solid var(--border2)}}.queue-time{{font-weight:900;color:var(--primary2)}}.queue-list div{{display:flex;flex-direction:column;gap:3px}}.queue-list small{{color:var(--muted);font-size:9px}}
    .dispatch-grid{{display:grid;grid-template-columns:360px 1fr;gap:16px;align-items:start}}.dispatch-map{{min-height:560px}}.dispatch-cards{{display:flex;flex-direction:column;gap:10px}}.dispatch-cards article{{padding:13px;border-radius:12px;background:var(--surface2);border:1px solid var(--border2)}}.dispatch-cards article>div{{display:flex;justify-content:space-between;align-items:center}}.dispatch-cards h3{{margin:10px 0 4px}}.dispatch-cards article>span{{font-size:9px;color:var(--muted)}}
    .map-canvas{{height:475px;background:var(--map);border:1px solid var(--border2);border-radius:14px;position:relative;overflow:hidden}}.map-canvas svg{{width:100%;height:100%}}.roads path{{fill:none;stroke:color-mix(in srgb,var(--muted2) 28%,transparent);stroke-width:5}}.blocks rect{{fill:color-mix(in srgb,var(--surface3) 75%,transparent);stroke:var(--border);stroke-width:2}}.routes path{{fill:none;stroke:var(--cyan);stroke-width:6;stroke-dasharray:12 10;filter:drop-shadow(0 0 8px var(--cyan))}}.map-pin{{position:absolute;width:38px;height:38px;border-radius:50% 50% 50% 6px;transform:rotate(-45deg);display:grid;place-items:center;color:white;font-size:9px;font-weight:900;box-shadow:0 10px 25px rgba(0,0,0,.25)}}.map-pin.red{{background:var(--red)}}.map-pin.cyan{{background:var(--cyan)}}.map-pin.primary{{background:var(--primary2)}}.map-pin.green{{background:var(--green)}}.map-pin::first-letter{{transform:rotate(45deg)}}.map-legend{{position:absolute;left:14px;bottom:14px;background:color-mix(in srgb,var(--surface) 90%,transparent);border:1px solid var(--border);border-radius:10px;padding:9px 12px;display:flex;gap:13px}}.map-legend span{{font-size:9px;display:flex;align-items:center;gap:5px;color:var(--muted)}}
    .tech-strip{{display:grid;grid-template-columns:repeat(4,1fr);gap:11px}}.tech-strip article{{display:grid;grid-template-columns:auto 1fr;gap:9px;align-items:center;padding:12px;background:var(--surface2);border:1px solid var(--border2);border-radius:13px}}.tech-strip article>div:nth-child(2){{display:flex;flex-direction:column;gap:3px}}.tech-strip article .progress,.tech-strip article .badge{{grid-column:span 2}}
    .calendar-grid{{height:500px;display:grid;grid-template-columns:70px repeat(4,1fr);border:1px solid var(--border2);border-radius:14px;overflow:hidden}}.time-col{{display:flex;flex-direction:column;justify-content:space-around;background:var(--surface3);padding:30px 10px 10px}}.time-col span{{font-size:9px;color:var(--muted)}}.day-col{{position:relative;border-left:1px solid var(--border2);background:repeating-linear-gradient(to bottom,transparent 0 69px,var(--border2) 70px)}}.day-col>b{{display:block;height:38px;padding:12px;font-size:10px;background:var(--surface3)}}.cal-event{{position:absolute;left:9px;right:9px;border-radius:10px;padding:10px;background:var(--purple-soft);border-left:3px solid var(--primary2);display:flex;flex-direction:column;gap:4px}}.cal-event.cyan{{background:var(--cyan-soft);border-color:var(--cyan)}}.cal-event.green{{background:var(--green-soft);border-color:var(--green)}}.cal-event.yellow{{background:var(--yellow-soft);border-color:var(--yellow)}}.cal-event small{{color:var(--muted);font-size:9px}}
    .people-grid{{display:grid;grid-template-columns:repeat(3,1fr);gap:14px}}.person-card{{border:1px solid var(--border2);background:var(--surface2);border-radius:15px;padding:16px;display:grid;grid-template-columns:auto 1fr;gap:13px}}.person-main>div{{display:flex;align-items:center;justify-content:space-between;gap:8px}}.person-main h3{{margin:0}}.person-main p{{margin:5px 0 0}}.person-stats{{grid-column:span 2;display:grid;grid-template-columns:repeat(3,1fr);gap:8px}}.person-stats>div{{padding:9px;background:var(--surface3);border-radius:10px;display:flex;flex-direction:column;gap:3px}}.skill-row{{grid-column:span 2;display:flex;gap:6px;flex-wrap:wrap}}.skill-row span{{font-size:9px;color:var(--muted);background:var(--surface3);padding:5px 8px;border-radius:999px}}.person-card .button-row{{grid-column:span 2}}
    .vendor-logo{{width:78px;height:78px;border-radius:18px;background:linear-gradient(135deg,var(--cyan),var(--primary));display:grid;place-items:center;color:white;font-size:22px;font-weight:900}}.vendor-hero{{align-items:center;justify-content:flex-start}}.vendor-hero>div:nth-child(2){{flex:1}}.vendor-meta{{display:flex;gap:13px;flex-wrap:wrap;margin-top:10px}}.vendor-meta span{{font-size:10px;color:var(--muted)}}.vendor-grid{{grid-template-columns:.8fr 1.2fr .8fr}}.score-layout{{display:grid;grid-template-columns:160px 1fr;gap:17px;align-items:center}}.score-bars>div{{display:grid;grid-template-columns:1fr auto;gap:6px;margin-bottom:13px}}.score-bars .progress{{grid-column:span 2}}
    .availability-board{{display:grid;grid-template-columns:repeat(4,1fr);gap:10px}}.avail-day{{padding:14px;border:1px solid var(--border2);background:var(--surface2);border-radius:13px;display:flex;flex-direction:column;gap:7px}}.avail-day.active{{border-color:var(--green);background:var(--green-soft)}}.avail-day span{{font-size:18px;font-weight:900}}.avail-day small{{color:var(--muted)}}.check-list li{{display:flex;gap:10px;padding:11px 0;border-bottom:1px solid var(--border2)}}.check-list>li>span{{width:28px;height:28px;border-radius:50%;background:var(--green-soft);color:var(--green);display:grid;place-items:center}}.check-list div{{display:flex;flex-direction:column;gap:3px}}.check-list small{{color:var(--muted);font-size:9px}}
    .approval-grid{{display:grid;grid-template-columns:repeat(2,1fr);gap:14px}}.approval-card{{border:1px solid var(--border2);background:var(--surface2);border-radius:15px;padding:16px}}.approval-card-head{{display:grid;grid-template-columns:auto 1fr auto;gap:11px;align-items:start}}.approval-card-head h3{{margin:1px 0 4px}}.approval-card dl{{display:grid;grid-template-columns:repeat(2,1fr);gap:8px;margin:14px 0}}.approval-card dl>div{{background:var(--surface3);border-radius:9px;padding:9px;display:flex;flex-direction:column;gap:3px}}.approval-card dt{{font-size:9px;color:var(--muted)}}.approval-card dd{{margin:0;font-size:11px;font-weight:800}}.approval-reason{{padding:11px;border-left:3px solid var(--primary2);background:var(--purple-soft);border-radius:8px;margin-bottom:14px}}.approval-reason small{{color:var(--primary2);font-weight:800}}.approval-reason p{{color:var(--text);margin:4px 0 0}}
    .property-grid{{display:grid;grid-template-columns:repeat(3,1fr);gap:14px}}.property-card{{display:grid;grid-template-columns:70px 1fr;border:1px solid var(--border2);background:var(--surface2);border-radius:15px;overflow:hidden}}.property-art{{width:70px;height:86px;display:grid;place-items:center;background:var(--purple-soft);color:var(--primary2);font-size:23px}}.property-art.cyan{{background:var(--cyan-soft);color:var(--cyan)}}.property-art.green{{background:var(--green-soft);color:var(--green)}}.property-art.yellow{{background:var(--yellow-soft);color:var(--yellow)}}.property-main{{padding:14px 10px 0}}.property-main h3{{margin:0 0 4px}}.property-stats{{grid-column:span 2;display:grid;grid-template-columns:repeat(3,1fr);border-top:1px solid var(--border2);border-bottom:1px solid var(--border2)}}.property-stats span{{padding:10px;text-align:center;font-size:10px;border-right:1px solid var(--border2)}}.property-stats span:last-child{{border:0}}.property-card .button-row{{grid-column:span 2;padding:11px}}
    .analytics-grid{{grid-template-columns:1.15fr 1.15fr .8fr}}.category-layout{{display:grid;grid-template-columns:150px 1fr;align-items:center;gap:13px}}.category-list{{list-style:none;margin:0;padding:0}}.category-list li{{display:grid;grid-template-columns:10px 1fr auto;align-items:center;gap:7px;padding:6px 0;font-size:10px}}.ranking>div{{display:grid;grid-template-columns:22px auto 1fr 100px 36px;align-items:center;gap:9px;padding:10px 0;border-bottom:1px solid var(--border2)}}.ranking>div>span{{font-size:10px;color:var(--muted)}}.ranking>div>div:nth-child(3){{display:flex;flex-direction:column;gap:3px}}.ranking small{{font-size:9px;color:var(--muted)}}.ranking b{{font-size:10px}}
    .bar-chart{{height:230px;display:flex;align-items:flex-end;gap:16px;padding:20px 15px 0;border-left:1px solid var(--border2);border-bottom:1px solid var(--border2)}}.bar-chart>div{{flex:1;min-width:18px;background:linear-gradient(to top,var(--primary),var(--cyan));border-radius:8px 8px 0 0;position:relative}}.bar-chart span{{position:absolute;top:-18px;width:100%;text-align:center;font-size:9px}}.bar-labels{{display:grid;grid-template-columns:repeat(5,1fr);gap:4px;margin-top:8px}}.bar-labels span{{font-size:8px;text-align:center;color:var(--muted)}}
    .audit-grid{{grid-template-columns:1.2fr 1.2fr .8fr}}.consent-list article,.document-list article{{display:grid;grid-template-columns:auto 1fr auto;gap:11px;align-items:center;padding:12px 0;border-bottom:1px solid var(--border2)}}.consent-list article:last-child,.document-list article:last-child{{border-bottom:0}}.consent-list article>div,.document-list article>div{{display:flex;flex-direction:column;gap:4px}}.consent-list p{{margin:0}}.document-list>article>span{{width:42px;height:42px;border-radius:10px;background:var(--purple-soft);color:var(--primary2);display:grid;place-items:center;font-size:9px;font-weight:900}}
    .knowledge-hero{{min-height:260px;border:1px solid var(--border2);border-radius:22px;padding:30px 35px;background:linear-gradient(135deg,var(--surface),var(--purple-soft));display:grid;grid-template-columns:1fr 340px;align-items:center;margin-bottom:18px;overflow:hidden;box-shadow:var(--shadow)}}.knowledge-hero h1{{font-size:30px;margin:9px 0 8px}}.knowledge-search{{height:48px;max-width:680px;background:var(--surface);border:1px solid var(--border);border-radius:13px;display:flex;align-items:center;padding-left:13px;gap:8px}}.knowledge-search input{{border:0;background:transparent;padding:0}}.knowledge-search .btn{{height:38px;margin-right:5px}}.knowledge-orb{{display:flex;align-items:center;justify-content:center;flex-direction:column;gap:10px;color:var(--muted);font-size:10px}}
    .knowledge-grid{{grid-template-columns:1.2fr 1.2fr .8fr}}.knowledge-categories{{display:grid;grid-template-columns:repeat(3,1fr);gap:12px}}.knowledge-card{{border:1px solid var(--border2);background:var(--surface2);border-radius:14px;padding:14px;display:grid;grid-template-columns:auto 1fr auto;gap:11px;align-items:start}}.knowledge-card h3{{margin:2px 0 4px}}.knowledge-card p{{margin:0}}.knowledge-card>b{{font-size:9px;color:var(--muted)}}.knowledge-card .btn{{grid-column:2 / 4;justify-self:start}}
    .assistant-chat{{display:flex;flex-direction:column;gap:10px}}.chat-msg{{max-width:90%;padding:11px 13px;border-radius:12px;font-size:11px;line-height:1.5}}.chat-msg.user{{align-self:flex-end;background:var(--primary);color:white}}.chat-msg.ai{{align-self:flex-start;background:var(--surface3)}}.chat-msg.ai ol{{padding-left:18px;margin:7px 0;color:var(--muted)}}.chat-msg.ai small{{color:var(--cyan)}}.chat-input{{display:flex;gap:8px;margin-top:5px}}
    .settings-layout{{display:grid;grid-template-columns:240px 1fr;gap:16px;align-items:start}}.settings-menu{{display:flex;flex-direction:column;background:var(--surface);border:1px solid var(--border2);border-radius:var(--radius);padding:9px;box-shadow:var(--shadow);position:sticky;top:110px}}.settings-menu button{{height:42px;border:0;background:transparent;text-align:left;padding:0 13px;border-radius:10px;color:var(--muted);font-size:11px;font-weight:750}}.settings-menu button.active{{background:var(--purple-soft);color:var(--primary2)}}.settings-panel{{padding:24px}}.settings-section{{padding:4px 0 24px;border-bottom:1px solid var(--border2);margin-bottom:22px}}.settings-section:last-child{{border:0;margin:0;padding-bottom:0}}.theme-cards{{display:grid;grid-template-columns:repeat(3,1fr);gap:12px;max-width:680px}}.theme-option{{border:1px solid var(--border);border-radius:13px;padding:12px;background:var(--surface2);display:flex;flex-direction:column;gap:8px}}.theme-option.selected{{border-color:var(--primary2);background:var(--purple-soft)}}.theme-option input{{width:auto;position:absolute;opacity:0}}.theme-preview{{height:100px;border:1px solid var(--border);border-radius:9px;display:grid;grid-template-columns:28% 1fr;grid-template-rows:22% 1fr;gap:5px;padding:6px}}.theme-preview span{{grid-row:span 2;border-radius:5px;background:#E5E7EB}}.theme-preview i{{border-radius:5px;background:#F3F4F6}}.dark-preview{{background:#070A13}}.dark-preview span{{background:#111827}}.dark-preview i{{background:#1F2937}}.light-preview{{background:white}}.system-preview{{background:linear-gradient(90deg,#070A13 50%,white 50%)}}.toggle-list{{display:flex;flex-direction:column}}.toggle-list label{{display:grid;grid-template-columns:1fr 44px;gap:12px;padding:13px 0;border-bottom:1px solid var(--border2);align-items:center}}.toggle-list label>div{{display:flex;flex-direction:column;gap:4px}}.toggle-list small{{font-size:9px;color:var(--muted)}}.toggle-list input{{appearance:none;width:42px;height:24px;padding:0;border:0;background:var(--surface3);border-radius:99px;position:relative}}.toggle-list input:after{{content:"";position:absolute;width:18px;height:18px;border-radius:50%;background:white;top:3px;left:3px;box-shadow:0 2px 8px rgba(0,0,0,.2)}}.toggle-list input:checked{{background:var(--primary)}}.toggle-list input:checked:after{{left:21px}}
    .login-page{{min-height:100vh;display:grid;grid-template-columns:1.25fr .75fr;background:var(--bg)}}.login-visual{{position:relative;background:var(--login-illustration);padding:42px 54px;overflow:hidden;border-right:1px solid var(--border2)}}.login-brand{{border:0;padding:0;margin:0}}.hero-copy{{position:relative;z-index:3;max-width:710px;margin-top:110px}}.hero-copy h1{{font-size:56px;line-height:1.05;letter-spacing:-2px;margin:16px 0 20px}}.hero-copy h1 em{{font-style:normal;color:var(--cyan)}}.hero-copy p{{font-size:16px;max-width:640px}}.trust-row{{display:flex;gap:18px;flex-wrap:wrap;margin-top:26px}}.trust-row span{{font-size:11px;color:var(--muted)}}.login-scene{{position:absolute;right:-90px;bottom:-50px;width:780px;height:520px}}.login-scene .orb{{position:absolute;left:320px;top:160px}}.login-scene svg{{position:absolute;inset:0;width:100%;height:100%}}.login-scene path{{fill:none;stroke:var(--primary2);stroke-width:2;stroke-dasharray:10 9;opacity:.6}}.flow-node{{position:absolute;width:150px;padding:11px;border:1px solid var(--border);border-radius:12px;background:color-mix(in srgb,var(--surface) 88%,transparent);backdrop-filter:blur(12px);display:flex;gap:9px;align-items:center;box-shadow:var(--shadow)}}.flow-node b{{width:28px;height:28px;border-radius:8px;background:var(--purple-soft);color:var(--primary2);display:grid;place-items:center;font-size:9px}}.flow-node span{{font-size:10px}}.flow-node.n1{{left:80px;top:170px}}.flow-node.n2{{left:285px;top:40px}}.flow-node.n3{{right:35px;top:155px}}.flow-node.n4{{right:80px;bottom:55px}}.login-panel{{display:grid;place-items:center;padding:36px;background:var(--bg)}}.login-box{{width:min(430px,100%)}}.login-box h2{{font-size:30px;margin:10px 0 8px}}.login-box>p{{margin-bottom:28px}}.login-box>label{{display:flex;flex-direction:column;gap:8px;font-size:11px;font-weight:750;margin-bottom:15px}}.password{{position:relative}}.password span{{position:absolute;right:12px;top:11px;color:var(--muted)}}.login-meta{{display:flex;justify-content:space-between;align-items:center;margin:4px 0 18px;font-size:10px}}.check{{display:flex;align-items:center;gap:7px}}.check input{{width:auto}}.divider{{display:flex;align-items:center;gap:10px;margin:18px 0;color:var(--muted);font-size:9px}}.divider:before,.divider:after{{content:"";height:1px;flex:1;background:var(--border)}}.legal{{display:block;color:var(--muted);text-align:center;margin-top:18px;font-size:9px}}.login-mobile{{display:none}}
    .bottom-nav{{display:none}}
    @media (max-width:1300px){{
      :root{{--sidebar:86px}}
      .sidebar{{padding:18px 10px}}.brand strong,.brand button,.nav-label,.nav-count,.nav-live,.sidebar-ai div:last-child,.profile>div,.profile>span:last-child{{display:none}}.brand{{justify-content:center;padding:0 0 16px}}.nav-item{{justify-content:center;padding:0}}.nav-icon{{font-size:20px}}.sidebar-ai{{justify-content:center;padding:10px}}.profile{{justify-content:center}}.global-search{{width:min(360px,30vw)}}
      .page-content{{padding:22px}}
      .dashboard-grid,.calls-grid,.analytics-grid,.audit-grid,.vendor-grid,.knowledge-grid{{grid-template-columns:1fr 1fr}}.span-3{{grid-column:span 2}}
      .detail-grid{{grid-template-columns:1fr 1fr}}.detail-grid .span-2{{grid-column:span 1}}
      .dispatch-grid{{grid-template-columns:290px 1fr}}.tech-strip{{grid-template-columns:repeat(2,1fr)}}.people-grid,.property-grid{{grid-template-columns:repeat(2,1fr)}}
      .call-list article{{grid-template-columns:110px 1fr auto}}.call-list article .wave{{grid-column:2 / 4}}
      .knowledge-categories{{grid-template-columns:repeat(2,1fr)}}
    }}
    @media (max-width:760px){{
      :root{{--topbar:72px}}
      .app-shell{{display:block;padding-bottom:72px}}.sidebar{{display:none}}.topbar{{padding:0 14px;gap:10px}}.page-title,.global-search,.top-actions .icon-btn,.top-actions .avatar{{display:none}}.mobile-logo{{display:flex}}.mobile-logo strong{{font-size:18px}}.mobile-logo .logo-mark{{width:32px;height:32px;border-radius:9px}}.top-actions{{margin-left:auto}}.top-actions .btn{{height:38px;padding:0 11px;font-size:10px}}.page-content{{padding:14px 12px 24px}}
      .bottom-nav{{position:fixed;display:grid;grid-template-columns:repeat(5,1fr);left:0;right:0;bottom:0;height:66px;background:color-mix(in srgb,var(--surface) 94%,transparent);border-top:1px solid var(--border2);z-index:20;backdrop-filter:blur(18px)}}.bottom-item{{border:0;background:transparent;color:var(--muted);display:flex;align-items:center;justify-content:center;flex-direction:column;gap:4px}}.bottom-item span{{font-size:18px}}.bottom-item small{{font-size:8px}}.bottom-item.active{{color:var(--primary2)}}
      .metric-grid,.summary-strip{{grid-template-columns:repeat(2,1fr)}}.metric-card{{min-height:126px;padding:13px}}.metric-card>strong{{font-size:23px}}.metric-card>p{{margin-top:9px}}.metric-card .spark{{height:38px}}
      .dashboard-grid,.calls-grid,.analytics-grid,.audit-grid,.vendor-grid,.knowledge-grid,.detail-grid,.create-grid,.dispatch-grid,.settings-layout{{display:flex;flex-direction:column;width:100%;max-width:100%;min-width:0}}.dashboard-grid>*,.calls-grid>*,.analytics-grid>*,.audit-grid>*,.vendor-grid>*,.knowledge-grid>*,.detail-grid>*,.create-grid>*,.dispatch-grid>*,.settings-layout>*{{width:100%;max-width:100%;min-width:0}}.span-2,.span-3{{grid-column:auto}}
      .panel{{padding:15px;border-radius:15px}}.section-head{{margin-bottom:13px}}.section-head .btn{{display:none}}
      .table-wrap{{display:none}}.mobile-cards{{display:flex;flex-direction:column;gap:10px}}.mobile-list-card{{border:1px solid var(--border2);background:var(--surface2);border-radius:13px;padding:13px}}.mobile-list-top{{display:flex;justify-content:space-between;font-size:9px}}.mobile-list-top span{{color:var(--muted)}}.mobile-list-card h3{{font-size:13px;margin:10px 0 4px}}.mobile-list-card p{{margin-bottom:9px}}.pagination{{display:none}}
      .call-facts{{grid-template-columns:1fr 1fr}}.flow-grid{{display:flex;overflow:hidden;align-items:stretch}}.flow-grid>b{{display:none}}.flow-step{{min-width:160px;flex:1}}.chart-flex{{display:flex;flex-direction:column}}.chart-main{{width:100%}}.donut-side{{flex-direction:row;gap:15px}}.legend{{gap:8px}}
      .incident-hero,.vendor-hero{{align-items:flex-start;flex-direction:column;padding-top:2px}}.incident-hero .button-row,.vendor-hero>.button-row{{width:100%}}.hero-title h1{{font-size:21px}}.tabs{{overflow-x:auto}}.tabs button{{flex:0 0 auto}}
      .timeline li{{grid-template-columns:44px 16px 1fr}}.timeline li:before{{left:51px}}.create-grid{{gap:14px}}.form-grid{{grid-template-columns:1fr}}.form-grid .wide{{grid-column:auto}}.assistant-panel{{position:static}}.automation-options{{grid-template-columns:1fr}}.wizard-steps{{justify-content:flex-start;overflow:hidden}}.wizard-steps>div b{{display:none}}.wizard-steps>i{{min-width:25px}}.wizard-footer{{position:sticky;bottom:68px;background:var(--bg);padding:10px 0;z-index:5}}.wizard-footer .btn.subtle:first-child,.wizard-footer span{{display:none}}
      .call-list article{{display:flex;flex-direction:column;align-items:stretch}}.call-list article .wave{{width:100%}}.call-list article .button-row{{justify-content:flex-end}}.transcript-full .speaker{{display:grid;grid-template-columns:auto 1fr}}.transcript-full time{{grid-column:2}}
      .dispatch-list{{order:1}}.dispatch-map{{order:0;min-height:auto}}.map-canvas{{height:380px}}.tech-strip{{grid-template-columns:1fr}}.calendar-grid{{height:520px;grid-template-columns:52px repeat(4,190px);overflow-x:auto}}.calendar-grid .day-col{{min-width:190px}}.people-grid,.property-grid,.approval-grid{{grid-template-columns:1fr}}.availability-board{{grid-template-columns:1fr 1fr}}.score-layout{{grid-template-columns:1fr}}.score-layout .donut-wrap{{margin:auto}}.ranking>div{{grid-template-columns:20px auto 1fr 50px}}.ranking .rank-bar{{display:none}}
      .knowledge-hero{{grid-template-columns:1fr;padding:22px;min-height:auto}}.knowledge-hero h1{{font-size:24px}}.knowledge-orb{{display:none}}.knowledge-search{{height:auto;display:grid;grid-template-columns:auto 1fr}}.knowledge-search .btn{{grid-column:span 2;width:100%;margin:0 0 6px}}.knowledge-categories{{grid-template-columns:1fr}}.settings-menu{{position:static;display:flex;flex-direction:row;width:100%;overflow:hidden}}.settings-menu button{{flex:0 0 auto}}.theme-cards{{grid-template-columns:1fr 1fr}}.theme-option:last-child{{grid-column:span 2}}
      .login-page{{grid-template-columns:1fr;min-height:100vh}}.login-visual{{display:none}}.login-panel{{padding:26px 20px}}.login-mobile{{display:flex;margin-bottom:48px}}.login-box h2{{font-size:28px}}.summary-strip>div{{padding:12px}}.summary-strip .metric-icon{{display:none}}
    }}
    ''')


def build_html(page_slug: str, title: str, theme_name: str) -> str:
    theme = THEMES[theme_name]
    body = PAGE_BUILDERS[page_slug]()
    if page_slug != "01-login":
        body = app_shell(page_slug, title, body)
    return f'''<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>FieldRelay — {esc(title)}</title><style>{css(theme)}</style></head><body>{body}</body></html>'''


def write_specs() -> None:
    specs = {
        "product": "FieldRelay",
        "visual_direction": "Neon Ops Enterprise",
        "themes": list(THEMES.keys()),
        "breakpoints": {
            "desktop": {"css_viewport": [1920, 1080], "device_scale_factor": 2, "target_px": [3840, 2160]},
            "tablet": {"css_viewport": [1024, 1366], "device_scale_factor": 2, "target_px": [2048, 2732]},
            "mobile": {"css_viewport": [430, 932], "device_scale_factor": 3, "target_px_width": 1290, "capture": "full page"},
        },
        "pages": [{"slug": slug, "title": title} for slug, title in PAGES],
    }
    (ROOT / "mockup_specs" / "mockup-manifest.json").write_text(json.dumps(specs, indent=2), encoding="utf-8")


def render(selected_pages: list[str] | None = None, selected_themes: list[str] | None = None) -> None:
    write_specs()
    pages = [p for p in PAGES if selected_pages is None or p[0] in selected_pages]
    html_dir = ROOT / ".render_html"
    html_dir.mkdir(exist_ok=True)

    viewports = {
        "desktop": {"width": 1920, "height": 1080, "dpr": 2},
        "tablet": {"width": 1024, "height": 1366, "dpr": 2},
        "mobile": {"width": 430, "height": 932, "dpr": 3},
    }

    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True, executable_path="/usr/bin/chromium", args=["--font-render-hinting=none", "--no-sandbox"])
        for theme_name in THEMES:
            if selected_themes is not None and theme_name not in selected_themes:
                continue
            sessions = {}
            for device, cfg in viewports.items():
                context = browser.new_context(
                    viewport={"width": cfg["width"], "height": cfg["height"]},
                    device_scale_factor=cfg["dpr"],
                    color_scheme="dark" if theme_name == "dark" else "light",
                )
                pg = context.new_page()
                pg.emulate_media(reduced_motion="reduce")
                sessions[device] = (context, pg)
            try:
                for slug, title in pages:
                    html = build_html(slug, title, theme_name)
                    html_path = html_dir / f"{theme_name}-{slug}.html"
                    html_path.write_text(html, encoding="utf-8")
                    for device, (context, pg) in sessions.items():
                        pg.set_content(html, wait_until="load")
                        out = ROOT / "mockups" / theme_name / device / f"{slug}.png"
                        pg.screenshot(path=str(out), full_page=True, animations="disabled")
                        print(f"wrote {out.relative_to(ROOT)}", flush=True)
            finally:
                for context, _ in sessions.values():
                    context.close()
        browser.close()


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--page", action="append", dest="pages", help="Render only a page slug; repeatable")
    parser.add_argument("--theme", action="append", dest="themes", choices=list(THEMES), help="Render only a theme; repeatable")
    args = parser.parse_args()
    render(args.pages, args.themes)
