/**
 * Ảnh chụp tổng của cả nhà — VÒNG LẶP THÓI QUEN của app.
 *
 *   reminder hằng tuần → nhập nhanh 4 con số → ghi 1 snapshot.
 *
 * Vòng lặp duy nhất trong toàn sản phẩm có nhịp rõ ràng (schema §5.7).
 *
 * Khác money_events: đây là TỔNG của cả nhà theo thời điểm, không phải lịch sử
 * từng khoản. Hai tầng lịch sử khác nhau, cần cả hai.
 */

import type { FinanceStatus, ISODate, MoneySnapshot, UUID } from '@nhaminh/domain';

export interface SnapshotInput {
  asOfDate: ISODate;
  totalUsable: number;
  totalSavings: number;
  totalLongTerm: number;
  totalDebt: number;
  /** Tính sẵn ở client bằng computeFinanceStatus (02 §4). */
  status: FinanceStatus;
  note: string | null;
}

export interface SnapshotRepository {
  latest(hh: UUID): Promise<MoneySnapshot | null>;
  history(hh: UUID, limit: number): Promise<MoneySnapshot[]>;
  create(hh: UUID, input: SnapshotInput): Promise<MoneySnapshot>;
}
