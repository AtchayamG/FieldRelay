import { describe, it, expect, beforeEach } from 'vitest';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MissionControlComponent } from './mission-control.component';
import { MissionControlPort } from '../application/mission-control.port';
import { MissionControlDemoAdapter } from '../data/mission-control.adapter';

describe('MissionControlComponent', () => {
  let fixture: ComponentFixture<MissionControlComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [MissionControlComponent],
      providers: [
        { provide: MissionControlPort, useClass: MissionControlDemoAdapter }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(MissionControlComponent);
    fixture.detectChanges();
  });

  it('renders Mission Control title and all 4 metrics', () => {
    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.querySelector('.page-title')?.textContent).toContain('Mission Control');
    const metricCards = compiled.querySelectorAll('app-metric-card');
    expect(metricCards.length).toBe(4);
  });

  it('renders live SIMULATED CALL-E mission tag', () => {
    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.querySelector('.simulated-tag')?.textContent).toContain('SIMULATED CALL-E AGENT MISSION');
  });

  it('renders Incident Command Queue table with active incidents', () => {
    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.querySelector('.ops-table')).not.toBeNull();
    const rows = compiled.querySelectorAll('.ops-table tbody tr');
    expect(rows.length).toBeGreaterThan(0);
  });
});
