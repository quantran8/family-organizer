/**
 * Hợp đồng đọc/ghi của Tài sản — 02 §4.
 *
 * Tài sản trả lời "tiền đang nằm ở đâu" — bảng lõi của wedge (schema §5.1).
 */

import type { Asset, AssetKind, ISODate, Liquidity, UUID } from '@nhaminh/domain';

export interface AssetInput {
  name: string;
  assetKind: AssetKind;
  /**
   * Suy ra từ assetKind bằng inferLiquidity — người dùng KHÔNG phải trả lời
   * (03 §2). Hỏi thẳng "khoản này dùng ngay được không?" là mất nguyên tắc
   * nhập-vài-giây, mà nó lại là điều kiện bắt buộc để tính được trạng thái.
   */
  liquidity: Liquidity;
  currentValue: number;
  /** Trả lời "tiền đang ở đâu", KHÔNG phải để đối chiếu hai người (05 §6.1). */
  holderMemberId: UUID | null;
  institution: string | null;
  asOfDate: ISODate;
  notes: string | null;
}

export interface AssetRepository {
  list(hh: UUID): Promise<Asset[]>;
  get(hh: UUID, id: UUID): Promise<Asset | null>;
  create(hh: UUID, input: AssetInput): Promise<Asset>;
  update(hh: UUID, id: UUID, patch: Partial<AssetInput>): Promise<Asset>;
  /** RPC nguyên tử: cập nhật giá trị + ghi money_events trong một transaction. */
  updateValue(hh: UUID, id: UUID, value: number, asOf: ISODate, note?: string): Promise<void>;
  close(hh: UUID, id: UUID): Promise<void>;
  softDelete(hh: UUID, id: UUID): Promise<void>;
}
