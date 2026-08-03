/**
 * Hiện thực FundRepository.
 */

import { supabase } from '@/lib/supabase';
import type {
  FundEntryRow,
  FundMonthContributorRow,
  FundMonthSummaryRow,
  FundRow,
} from '@/lib/database.types';
import { unwrap, unwrapMaybe, unwrapVoid } from '@/data/shared/errors';
import { toFund, toFundEntry, toFundMonthSummary } from '@/data/shared/mappers';
import { currentProfileId } from '@/data/shared/session';
import type { FundPatch, FundRepository } from './fund-repository.interface';

/** Ngày đầu tháng chứa `d`. Hai view gom theo `date_trunc('month', …)`. */
function monthStart(d: string): string {
  return `${d.slice(0, 7)}-01`;
}

/** Ngày đầu tháng KẾ TIẾP — cận trên nửa mở cho truy vấn khoảng. */
function nextMonthStart(d: string): string {
  const year = Number(d.slice(0, 4));
  const month = Number(d.slice(5, 7));
  return month === 12
    ? `${year + 1}-01-01`
    : `${year}-${String(month + 1).padStart(2, '0')}-01`;
}

function toRow(i: FundPatch): Record<string, unknown> {
  const r: Record<string, unknown> = {};
  if (i.name !== undefined) r.name = i.name;
  return r;
}

export const fundRepository: FundRepository = {
  async list(hh) {
    const rows = await unwrap<FundRow[]>(
      supabase
        .from('funds')
        .select('*')
        .eq('household_id', hh)
        .is('deleted_at', null)
        .eq('is_archived', false)
        .order('created_at', { ascending: true }),
    );
    return rows.map(toFund);
  },

  async get(hh, id) {
    const row = await unwrapMaybe<FundRow>(
      supabase
        .from('funds')
        .select('*')
        .eq('id', id)
        .eq('household_id', hh)
        .is('deleted_at', null)
        .single(),
    );
    return row ? toFund(row) : null;
  },

  async create(hh, input) {
    const createdBy = await currentProfileId();
    const row = await unwrap<FundRow>(
      supabase
        .from('funds')
        .insert({ ...toRow(input), household_id: hh, created_by: createdBy })
        .select()
        .single(),
    );
    return toFund(row);
  },

  async update(hh, id, patch) {
    const row = await unwrap<FundRow>(
      supabase
        .from('funds')
        .update(toRow(patch))
        .eq('id', id)
        .eq('household_id', hh)
        .select()
        .single(),
    );
    return toFund(row);
  },

  /**
   * Lọc bằng khoảng nửa mở `[đầu tháng, đầu tháng sau)`.
   *
   * Không dùng `like '2026-09%'`: `occurred_on` là `date`, và so khớp chuỗi trên
   * cột ngày buộc Postgres ép kiểu từng hàng, bỏ qua index
   * `fund_entries_month_idx`.
   */
  async entriesForMonth(hh, fundId, month) {
    const rows = await unwrap<FundEntryRow[]>(
      supabase
        .from('fund_entries')
        .select('*')
        .eq('household_id', hh)
        .eq('fund_id', fundId)
        .gte('occurred_on', monthStart(month))
        .lt('occurred_on', nextMonthStart(month))
        .is('deleted_at', null)
        .order('occurred_on', { ascending: true }),
    );
    return rows.map(toFundEntry);
  },

  /**
   * Hai truy vấn, CẢ HAI lọc theo đúng một tháng.
   *
   * `fund_month_contributors` là ngoại lệ duy nhất của lệnh cấm "tổng tiền theo
   * người" (03 §9 ngoại lệ 2), và nó chỉ hợp lệ nhờ điều kiện `.eq('month', …)`
   * ngay dưới đây. Bỏ dòng đó ra là dựng một số dư nợ giữa hai vợ chồng —
   * PHÉP THỬ: con số này có vắt qua nhiều hơn một tháng không? Có → sai.
   */
  async monthSummary(hh, fundId, month) {
    const start = monthStart(month);

    const [summary, contributors] = await Promise.all([
      unwrapMaybe<FundMonthSummaryRow>(
        supabase
          .from('fund_month_summary')
          .select('*')
          .eq('household_id', hh)
          .eq('fund_id', fundId)
          .eq('month', start)
          .maybeSingle(),
      ),
      unwrap<FundMonthContributorRow[]>(
        supabase
          .from('fund_month_contributors')
          .select('*')
          .eq('household_id', hh)
          .eq('fund_id', fundId)
          .eq('month', start),
      ),
    ]);

    return toFundMonthSummary(summary, contributors, start);
  },

  /**
   * Chỉ để dựng bộ chọn tháng. Trả ngày đầu mỗi tháng có bản ghi, mới nhất
   * trước — KHÔNG phải để lặp qua rồi cộng lại: cộng nhiều tháng chính là thứ
   * ngoại lệ 03 §9 cấm.
   */
  async monthsPresent(hh, fundId) {
    const rows = await unwrap<Pick<FundMonthSummaryRow, 'month'>[]>(
      supabase
        .from('fund_month_summary')
        .select('month')
        .eq('household_id', hh)
        .eq('fund_id', fundId)
        .order('month', { ascending: false }),
    );
    return rows.map((r) => r.month);
  },

  /**
   * Ba lệnh ghi (fund_entries + funds.current_amount + money_events) → RPC.
   * Ghép từ client thì mất mạng giữa chừng làm số dư sai vĩnh viễn.
   */
  async recordEntry(_hh, fundId, input) {
    return unwrap<string>(
      supabase.rpc('record_fund_entry', {
        p_fund_id: fundId,
        p_kind: input.kind,
        p_amount: input.amount,
        p_occurred_on: input.occurredOn,
        p_purpose: input.purpose,
        // Tên người bỏ vào chỉ có nghĩa khi NẠP. Rút thì không hỏi ai rút —
        // tiền đã vào quỹ là tiền chung, và ghi tên người rút là mở đúng cánh
        // cửa mà cả module này đóng.
        p_contributor: input.kind === 'deposit' ? input.contributorName : null,
        p_note: input.note,
      }),
    );
  },

  async deleteEntry(_hh, entryId) {
    await unwrapVoid(supabase.rpc('delete_fund_entry', { p_entry_id: entryId }));
  },

  async archive(hh, id) {
    await unwrapVoid(
      supabase.from('funds').update({ is_archived: true }).eq('id', id).eq('household_id', hh),
    );
  },

  async softDelete(hh, id) {
    await unwrapVoid(
      supabase
        .from('funds')
        .update({ deleted_at: new Date().toISOString() })
        .eq('id', id)
        .eq('household_id', hh),
    );
  },
};
