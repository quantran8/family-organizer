/**
 * Mục tiêu tài chính chung.
 *
 * Giải thích cho người không giữ tiền: vì sao tiền không phải để tiêu ngay.
 * KHÔNG phân loại, KHÔNG mức ưu tiên — hai thứ đó không đổi hành vi nào
 * (schema §5.4).
 */

import type { Goal, ISODate, UUID } from '@family-organizer/domain';

export interface GoalInput {
  name: string;
  targetAmount: number;
  currentAmount: number;
  targetDate: ISODate | null;
}

export interface GoalRepository {
  list(hh: UUID): Promise<Goal[]>;
  get(hh: UUID, id: UUID): Promise<Goal | null>;
  create(hh: UUID, input: GoalInput): Promise<Goal>;
  update(hh: UUID, id: UUID, patch: Partial<GoalInput>): Promise<Goal>;
  contribute(hh: UUID, id: UUID, amount: number, on: ISODate): Promise<void>;
  softDelete(hh: UUID, id: UUID): Promise<void>;
}
