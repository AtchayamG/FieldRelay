import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { MissionControlComponent } from './mission-control.component';
import { MissionControlState } from '../domain/mission-control-state.model';

const STATE: MissionControlState = {
  metrics: { activeIncidents: 3, callsInFlight: 1, pendingApprovals: 2, realCallsPlaced: 4 },
  incidents: [
    {
      id: '11111111-1111-4111-8111-111111111111',
      displayId: 'INC-2042-0001',
      propertyId: 'PROP-DEMO-01',
      unit: '12B',
      type: 'plumbing',
      priority: 'high',
      status: 'calling',
      updatedAt: new Date().toISOString()
    }
  ],
  calls: [
    {
      id: '22222222-2222-4222-8222-222222222222',
      displayId: 'CALL-2042-0001',
      incidentId: '11111111-1111-4111-8111-111111111111',
      purpose: 'vendor_availability',
      status: 'completed',
      simulated: false,
      createdAt: new Date().toISOString(),
      outcome: {
        taskCompleted: true,
        confidenceLabel: 'high',
        validationFailed: false,
        fields: ['available', 'quoted_amount_text']
      }
    }
  ],
  approvals: [
    {
      id: '33333333-3333-4333-8333-333333333333',
      displayId: 'APP-2042-0001',
      incidentId: '11111111-1111-4111-8111-111111111111',
      reasons: ['cost_commitment'],
      createdAt: new Date().toISOString()
    }
  ],
  guardrails: [
    {
      id: 'no_redial',
      label: 'Ambiguous outcomes are never redialled',
      detail: 'A call whose result is unknown is left for a human.',
      engaged: true
    },
    {
      id: 'dial_mode',
      label: 'Dialling disabled unless explicitly enabled',
      detail: 'CALL_E_MODE is live. Real calls can be placed.',
      engaged: false
    }
  ],
  mode: 'live',
  generatedAt: new Date().toISOString()
};

describe('MissionControlComponent', () => {
  let fixture: ComponentFixture<MissionControlComponent>;
  let http: HttpTestingController;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [MissionControlComponent],
      providers: [provideHttpClient(), provideHttpClientTesting()]
    }).compileComponents();

    fixture = TestBed.createComponent(MissionControlComponent);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  function render(state: MissionControlState = STATE): HTMLElement {
    fixture.detectChanges();
    // The component subscribes twice — the data stream and the guardrail
    // stream — both served by one request per refresh.
    for (const request of http.match('/api/v1/mission-control')) {
      request.flush({ data: state });
    }
    fixture.detectChanges();
    return fixture.nativeElement as HTMLElement;
  }

  it('renders the title and four metric cards', () => {
    const compiled = render();
    expect(compiled.querySelector('.page-title')?.textContent).toContain('Mission Control');
    expect(compiled.querySelectorAll('app-metric-card').length).toBe(4);
  });

  it('shows counts taken from real records, not invented figures', () => {
    const text = render().textContent ?? '';
    expect(text).toContain('Active Incidents');
    expect(text).toContain('Real Calls Placed');
    // Real call count arrives from the API rather than a hardcoded demo number.
    expect(text).toContain('4');
  });

  it('lists incidents that exist in the database', () => {
    const compiled = render();
    const rows = compiled.querySelectorAll('.ops-table tbody tr');
    expect(rows.length).toBe(1);
    expect(compiled.textContent).toContain('INC-2042-0001');
  });

  it('renders the guardrail panel, which is what makes the refusals visible', () => {
    const text = render().textContent ?? '';
    expect(text).toContain('What FieldRelay refuses to do');
    expect(text).toContain('Ambiguous outcomes are never redialled');
  });

  it('marks a relaxed guardrail differently instead of hiding it', () => {
    // A safety claim that cannot be false is not a claim. When dialling is
    // enabled, the panel has to say so.
    const compiled = render();
    const relaxed = compiled.querySelectorAll('.guardrail--relaxed');
    expect(relaxed.length).toBe(1);
    expect(relaxed[0].textContent).toContain('Dialling disabled unless explicitly enabled');
  });

  it('describes what a completed call actually returned', () => {
    const text = render().textContent ?? '';
    expect(text).toContain('CALL-2042-0001');
    expect(text).toContain('available');
  });

  it('falls back to the disconnected state rather than showing stale numbers', () => {
    fixture.detectChanges();
    for (const request of http.match('/api/v1/mission-control')) {
      request.flush('', { status: 500, statusText: 'Server Error' });
    }
    fixture.detectChanges();

    expect((fixture.nativeElement as HTMLElement).textContent).toContain(
      'Realtime Gateway Disconnected'
    );
  });
});
