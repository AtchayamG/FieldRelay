import { describe, it, expect, beforeEach } from 'vitest';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { IconComponent, IconName } from './icon.component';

const ALL_ICONS: IconName[] = [
  'activity', 'alert', 'analytics', 'approvals', 'bell', 'bolt', 'building',
  'calendar', 'check', 'check-circle', 'chevron-right', 'clock', 'close',
  'dispatch', 'document', 'download', 'edit', 'filter', 'folder', 'forbidden',
  'incidents', 'info', 'link', 'lock', 'mission-control', 'moon', 'phone',
  'phone-active', 'plus', 'refresh', 'search', 'settings', 'shield',
  'sign-out', 'sun', 'technicians', 'user', 'wrench'
];

describe('IconComponent', () => {
  let fixture: ComponentFixture<IconComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({ imports: [IconComponent] }).compileComponents();
    fixture = TestBed.createComponent(IconComponent);
  });

  function render(name: IconName): SVGElement {
    fixture.componentRef.setInput('name', name);
    fixture.detectChanges();
    return (fixture.nativeElement as HTMLElement).querySelector('svg') as SVGElement;
  }

  it.each(ALL_ICONS)('renders real geometry for "%s"', (name) => {
    const svg = render(name);
    // Guards the sanitizer trap: Angular's HTML sanitizer strips SVG children,
    // which would leave a correctly sized but completely empty square.
    expect(svg.children.length).toBeGreaterThan(0);
  });

  it('inherits colour from CSS rather than hard-coding one', () => {
    const svg = render('phone');
    expect(svg.getAttribute('stroke')).toBe('currentColor');
    expect(svg.getAttribute('fill')).toBe('none');
  });

  it('is hidden from assistive technology unless given a label', () => {
    const svg = render('bell');
    expect(svg.getAttribute('aria-hidden')).toBe('true');
    expect(svg.getAttribute('role')).toBeNull();
  });

  it('becomes an labelled image when it stands alone', () => {
    fixture.componentRef.setInput('name', 'bell');
    fixture.componentRef.setInput('label', 'Notifications');
    fixture.detectChanges();
    const svg = (fixture.nativeElement as HTMLElement).querySelector('svg') as SVGElement;

    expect(svg.getAttribute('role')).toBe('img');
    expect(svg.getAttribute('aria-label')).toBe('Notifications');
    expect(svg.getAttribute('aria-hidden')).toBeNull();
  });

  it('scales without distorting the 24px grid', () => {
    fixture.componentRef.setInput('name', 'settings');
    fixture.componentRef.setInput('size', 32);
    fixture.detectChanges();
    const svg = (fixture.nativeElement as HTMLElement).querySelector('svg') as SVGElement;

    expect(svg.getAttribute('width')).toBe('32');
    expect(svg.getAttribute('height')).toBe('32');
    expect(svg.getAttribute('viewBox')).toBe('0 0 24 24');
  });
});
