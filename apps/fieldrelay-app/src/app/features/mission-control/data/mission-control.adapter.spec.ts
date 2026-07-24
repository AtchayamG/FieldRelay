import { describe, it, expect, beforeEach } from 'vitest';
import { firstValueFrom } from 'rxjs';
import { MissionControlDemoAdapter } from './mission-control.adapter';

describe('MissionControlDemoAdapter', () => {
  let adapter: MissionControlDemoAdapter;

  beforeEach(() => {
    adapter = new MissionControlDemoAdapter();
  });

  it('provides initial live-connected state with simulated CALL-E mission', async () => {
    const state = await firstValueFrom(adapter.getMissionControlState());
    expect(state.stateMode).toBe('live-connected');
    expect(state.metrics.length).toBe(4);
    expect(state.liveCall?.isSimulated).toBe(true);
    expect(state.liveCall?.status).toBe('SIMULATED IN PROGRESS');
  });

  it('updates state mode when requested', async () => {
    adapter.setSystemStateMode('realtime-disconnected');
    const state = await firstValueFrom(adapter.getMissionControlState());
    expect(state.stateMode).toBe('realtime-disconnected');
    expect(state.activityFeed[0].message).toContain('Realtime gateway disconnected');
  });

  it('processes human approval actions deterministically', async () => {
    await adapter.approveRequest('APP-2026-4012');
    const state = await firstValueFrom(adapter.getMissionControlState());
    const approval = state.pendingApprovals.find((a) => a.id === 'APP-2026-4012');
    expect(approval?.status).toBe('APPROVED');
  });
});
