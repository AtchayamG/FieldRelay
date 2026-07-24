import { Observable } from 'rxjs';
import { MissionControlData, SystemStateMode } from '../domain/mission-control.types';

export abstract class MissionControlPort {
  abstract getMissionControlState(): Observable<MissionControlData>;
  abstract setSystemStateMode(mode: SystemStateMode): void;
  abstract approveRequest(approvalId: string): Promise<boolean>;
  abstract rejectRequest(approvalId: string): Promise<boolean>;
  abstract refreshState(): void;
}
