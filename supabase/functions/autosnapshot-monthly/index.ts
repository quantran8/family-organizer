/**
 * `autosnapshot-monthly` — chốt một mốc cuối tháng nếu người dùng chưa tự nhập.
 *
 * Lý do sản phẩm, không phải kỹ thuật: *niềm tin của người không giữ tiền đến
 * từ việc **thấy được thay đổi**, không phải từ con số hiện tại* (G7b). Một
 * lịch sử trống rỗng vì cả hai người đều bận suốt tháng làm màn `money/history`
 * vô dụng đúng lúc nó cần có ích nhất.
 *
 * ── `is_manual = false` là trường quan trọng nhất ở đây ──
 *
 * Nó phân biệt *"nhà mình đã ngồi lại và chốt con số"* với *"máy tự ghi lại số
 * đang có"*. Hai thứ đó **không cùng ý nghĩa** và không được trộn:
 *
 *   - `nudge-snapshot-update` chỉ đếm mốc `is_manual = true`. Nếu mốc tự động
 *     cũng tính, thì cứ cuối tháng cron chốt hộ một cái là lời nhắc im lặng
 *     luôn — và nghi thức, thứ duy nhất giữ chân người dùng, chết dần mà không
 *     ai nhận ra.
 *   - Màn lịch sử đọc `status` nguyên từ DB. Một mốc tự động mang trạng thái
 *     tính từ số liệu chưa ai xác nhận, nên nó là ghi chép, không phải cam kết.
 *
 * ── Không ghi đè mốc người dùng đã tự nhập ──
 *
 * `unique (household_id, as_of_date)` chặn ở DB, nhưng dựa vào lỗi unique để
 * điều khiển luồng là dựa vào một lỗi. Kiểm trước cho rõ ý.
 *
 * ── Số liệu lấy từ `finance_metrics`, không cộng lại ở đây ──
 *
 * Cùng nguồn với màn Tiền và với nghi thức cập nhật. Cộng lại ở đây là dựng
 * nguồn sự thật thứ hai, và hai nguồn sẽ lệch nhau đúng vào lúc có một khoản
 * vừa bị xoá mềm.
 */

import { computeFinanceStatus } from '@family-organizer/domain';

import { jsonResponse, serviceClient, todayInVN } from '../_shared/client.ts';

interface MetricsRow {
  household_id: string;
  total_usable: number;
  total_savings: number;
  total_long_term: number;
  total_debt: number;
  due_next_30d: number;
  due_next_7d_count: number;
  overdue_count: number;
  attention_count: number;
  last_updated_on: string | null;
}

/** Hôm nay có phải ngày cuối tháng không (giờ VN). */
function isLastDayOfMonth(iso: string): boolean {
  const y = +iso.slice(0, 4);
  const m = +iso.slice(5, 7);
  const d = +iso.slice(8, 10);
  // Ngày 0 của tháng sau = ngày cuối tháng này.
  return d === new Date(Date.UTC(y, m, 0)).getUTCDate();
}

Deno.serve(async (req) => {
  const supabase = serviceClient();
  const today = todayInVN();

  // Cron chạy 23:50 mỗi ngày và tự thoát nếu chưa phải cuối tháng — rẻ hơn là
  // giữ một lịch cron riêng cho từng độ dài tháng. `?force=1` để gọi tay khi
  // cần kiểm.
  const force = new URL(req.url).searchParams.get('force') === '1';
  if (!force && !isLastDayOfMonth(today)) {
    return jsonResponse({ skipped: 'not_month_end', today });
  }

  const { data, error } = await supabase.from('finance_metrics').select('*');
  if (error) return jsonResponse({ error: error.message }, 500);

  const rows = (data ?? []) as MetricsRow[];
  let created = 0;
  let skipped = 0;

  for (const m of rows) {
    const { data: existing, error: existingError } = await supabase
      .from('money_snapshots')
      .select('id')
      .eq('household_id', m.household_id)
      .eq('as_of_date', today)
      .limit(1);

    if (existingError) return jsonResponse({ error: existingError.message }, 500);
    if ((existing ?? []).length > 0) {
      skipped += 1;
      continue;
    }

    // Nhà chưa có số liệu nào: không chốt một mốc bốn số 0. Một dòng như vậy
    // trong lịch sử nói rằng nhà mình từng không có gì, trong khi thật ra là
    // chưa ai nhập gì — hai điều rất khác nhau.
    const hasAnyMoney =
      Number(m.total_usable) !== 0 ||
      Number(m.total_savings) !== 0 ||
      Number(m.total_long_term) !== 0 ||
      Number(m.total_debt) !== 0;
    if (!hasAnyMoney) {
      skipped += 1;
      continue;
    }

    // `status` tính trên số liệu VỪA đọc, cùng hàm mà client dùng. Không đọc
    // lại `status` cũ của mốc trước: đó là trạng thái của một tháng khác.
    const status = computeFinanceStatus(
      {
        totalUsable: Number(m.total_usable),
        totalSavings: Number(m.total_savings),
        totalLongTerm: Number(m.total_long_term),
        totalDebt: Number(m.total_debt),
        dueNext30d: Number(m.due_next_30d),
        dueNext7dCount: Number(m.due_next_7d_count),
        overdueCount: Number(m.overdue_count),
        attentionCount: Number(m.attention_count),
        lastUpdatedOn: m.last_updated_on,
      },
      today,
    );

    const { error: insertError } = await supabase.from('money_snapshots').insert({
      household_id: m.household_id,
      as_of_date: today,
      total_usable: m.total_usable,
      total_savings: m.total_savings,
      total_long_term: m.total_long_term,
      total_debt: m.total_debt,
      status,
      // Trường quan trọng nhất của file này — xem đầu file.
      is_manual: false,
      // `created_by` để null: KHÔNG có người nào tạo mốc này. Gán id của một
      // thành viên sẽ nói dối rằng họ đã ngồi xuống và chốt con số.
      created_by: null,
    });

    if (insertError) return jsonResponse({ error: insertError.message }, 500);
    created += 1;
  }

  return jsonResponse({ scanned: rows.length, created, skipped, today });
});
