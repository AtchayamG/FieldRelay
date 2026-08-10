import { describe, it, expect, beforeEach, vi } from 'vitest';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { HttpErrorResponse } from '@angular/common/http';
import { of, throwError } from 'rxjs';
import { ApprovalsComponent } from './approvals.component';
import { ApprovalHttpAdapter } from '../data/approval-http.adapter';
import { DispatchHttpAdapter } from '../../dispatch/data/dispatch-http.adapter';
import { Approval } from '../domain/approval.model';

const PENDING: Approval = {
  id: '11111111-1111-4111-8111-111111111111',
  displayId: 'APP-2042-0001',
  incidentId: '22222222-2222-4222-8222-222222222222',
  callTaskId: '33333333-3333-4333-8333-333333333333',
  status: 'pending',
  reasons: ['cost_commitment', 'low_confidence'],
  reasonText: [
    'The vendor quoted a price. Approving commits the organisation to that cost.',
    'CALL-E was not confident it understood the answer. Read it before acting on it.'
  ],
  decidedBy: null,
  decidedAt: null,
  decisionNote: null,
  createdAt: '2026-07-26T10:00:00Z',
  outcome: {
    structuredResult: { available: 'yes', quoted_amount_text: '$360' },
    taskCompleted: true,
    confidenceScore: 0.62,
    confidenceLabel: 'medium',
    validationFailed: false
  }
};

describe('ApprovalsComponent', () => {
  let fixture: ComponentFixture<ApprovalsComponent>;
  let component: ApprovalsComponent;
  let api: { list: ReturnType<typeof vi.fn>; decide: ReturnType<typeof vi.fn> };
  let dispatchApi: { release: ReturnType<typeof vi.fn> };
  let navigate: ReturnType<typeof vi.spyOn>;

  beforeEach(async () => {
    api = {
      list: vi.fn().mockReturnValue(of({ items: [PENDING], nextCursor: null, pendingCount: 1 })),
      decide: vi.fn().mockReturnValue(of({ ...PENDING, status: 'approved' }))
    };
    dispatchApi = {
      release: vi.fn().mockReturnValue(of({ id: 'dsp-1', displayId: 'DSP-2042-0001' }))
    };
    await TestBed.configureTestingModule({
      imports: [ApprovalsComponent],
      providers: [
        provideRouter([]),
        { provide: ApprovalHttpAdapter, useValue: api },
        { provide: DispatchHttpAdapter, useValue: dispatchApi }
      ]
    }).compileComponents();

    navigate = vi.spyOn(TestBed.inject(Router), 'navigate').mockResolvedValue(true);

    fixture = TestBed.createComponent(ApprovalsComponent);
    component = fixture.componentInstance;
  });

  const text = (): string => {
    fixture.detectChanges();
    return (fixture.nativeElement as HTMLElement).textContent ?? '';
  };

  it('defaults to the pending queue, which is what an operator opens this for', () => {
    fixture.detectChanges();
    expect(api.list).toHaveBeenCalledWith('pending');
  });

  it('offers no release control while a decision is still pending', () => {
    // Releasing sends a vendor. It must not be reachable until somebody has
    // actually agreed to the cost.
    expect(text()).not.toContain('Release to vendor');
  });

  it('offers release only once the decision is approved, and sends only the id', () => {
    api.list.mockReturnValue(
      of({
        items: [{ ...PENDING, status: 'approved', decidedBy: 'ops.demo@fieldrelay.io', decidedAt: '2026-07-26T11:00:00Z' }],
        nextCursor: null,
        pendingCount: 0
      })
    );
    component.setStatus('approved');

    expect(text()).toContain('Release to vendor');

    component.release({ ...PENDING, status: 'approved' } as Approval);
    // The vendor and the amount are read from rows on the server; nothing in
    // this call can redirect the job somewhere else.
    expect(dispatchApi.release).toHaveBeenCalledWith(PENDING.id);
    expect(navigate).toHaveBeenCalledWith(['/dispatch']);
  });

  it('surfaces a refused release rather than pretending the vendor was sent', () => {
    dispatchApi.release.mockReturnValue(
      throwError(
        () =>
          new HttpErrorResponse({
            status: 409,
            error: { error: { message: 'Cannot dispatch against an approval that is rejected.' } }
          })
      )
    );

    component.release({ ...PENDING, status: 'approved' } as Approval);
    expect(component.decisionError()[PENDING.id]).toContain('rejected');
  });

  it('explains why each decision is being asked for', () => {
    // A queue that showed only "approval required" would make the operator
    // guess at what they are weighing.
    const rendered = text();
    expect(rendered).toContain('commits the organisation to that cost');
    expect(rendered).toContain('not confident it understood');
  });

  it('shows the answer being decided on, not just a reference to it', () => {
    const rendered = text();
    expect(rendered).toContain('Quoted Amount Text');
    expect(rendered).toContain('$360');
    expect(rendered).toContain('MEDIUM');
  });

  it('sends the decision with the operator note', () => {
    fixture.detectChanges();
    component.setNote(PENDING.id, '  Within the agreed rate.  ');
    component.decide(PENDING, 'approved');

    expect(api.decide).toHaveBeenCalledWith(PENDING.id, 'approved', 'Within the agreed rate.');
  });

  it('omits an empty note rather than sending whitespace', () => {
    fixture.detectChanges();
    component.setNote(PENDING.id, '   ');
    component.decide(PENDING, 'rejected');

    expect(api.decide).toHaveBeenCalledWith(PENDING.id, 'rejected', undefined);
  });

  it('reloads after deciding, because the server may have refused it as stale', () => {
    fixture.detectChanges();
    api.list.mockClear();
    component.decide(PENDING, 'approved');

    expect(api.list).toHaveBeenCalled();
  });

  it('surfaces the API refusal rather than pretending the decision landed', () => {
    api.decide.mockReturnValue(
      throwError(
        () =>
          new HttpErrorResponse({
            status: 409,
            error: { error: { message: 'The call outcome changed after this approval was raised.' } }
          })
      )
    );
    fixture.detectChanges();
    component.decide(PENDING, 'approved');
    fixture.detectChanges();

    expect((fixture.nativeElement as HTMLElement).textContent).toContain('outcome changed');
  });

  it('shows who decided once a decision exists', () => {
    api.list.mockReturnValue(
      of({
        items: [
          {
            ...PENDING,
            status: 'approved' as const,
            decidedBy: 'ops.demo@fieldrelay.io',
            decidedAt: '2026-07-26T11:00:00Z',
            decisionNote: 'Within policy.'
          }
        ],
        nextCursor: null,
        pendingCount: 0
      })
    );

    const rendered = text();
    expect(rendered).toContain('Approved by');
    expect(rendered).toContain('ops.demo@fieldrelay.io');
    expect(rendered).toContain('Within policy.');
  });

  it('explains the empty queue instead of showing a bare nothing', () => {
    api.list.mockReturnValue(of({ items: [], nextCursor: null, pendingCount: 0 }));
    const rendered = text();

    expect(rendered).toContain('Nothing awaiting a decision');
    expect(rendered).toContain('commits money');
  });
});
