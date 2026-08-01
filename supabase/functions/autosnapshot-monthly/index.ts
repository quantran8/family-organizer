/**
 * `autosnapshot-monthly` — chốt một mốc lịch sử vào cuối mỗi tháng.
 *
 * Lý do sản phẩm, không phải kỹ thuật: *niềm tin của người không giữ tiền đến
 * từ việc **thấy được thay đổi**, không phải từ con số hiện tại* (G7b, 08 §1).
 *
 * ── ĐÂY LÀ ĐƯỜNG DUY NHẤT tạo money_snapshots (06 §1) ──
 *
 * `is_manual` đã bị bỏ ở migration 0004. Trước đây cột đó phân biệt *"nhà mình
 * đã ngồi lại và chốt con số"* với *"máy tự ghi lại số đang có"* — nhưng nghi
 * thức cập nhật định kỳ đã bị loại bỏ, nên vế thứ nhất không còn tồn tại và
 * cột chỉ có một giá trị.
 *
 * `money_snapshots` giờ là **lịch sử dẫn xuất**: người dùng không bao giờ nhìn
 * thấy hành động tạo snapshot, và không có màn hình nào để tạo nó. Nó phục vụ
 * "trí nhớ năm ngoái", không phải một vòng lặp thói quen.
 *
 * ── Chạy lại trong cùng ngày không tạo mốc thứ hai ──
 *
 * `unique (household_id, as_of_date)` chặn ở DB, nhưng dựa vào lỗi unique để
 * điều khiển luồng là dựa vào một lỗi. Kiểm trước cho rõ ý.
 *
 * ── Số liệu lấy từ `finance_metrics` + `upcoming_needs`, không cộng lại ở đây ──
 *
 * Cùng nguồn với màn Tiền. Cộng lại ở đây là dựng nguồn sự thật thứ hai, và hai
 * nguồn sẽ lệch nhau đúng vào lúc có một khoản vừa bị xoá mềm.
 */

import { computeFinanceStatus, type UpcomingNeed } from '@family-organizer/domain';

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
  last_usable_updated_on: string | null;
  last_updated_on: string | null;
  record_threshold_amount: number | null;
  currency: string;
}

interface NeedRow {
  source: UpcomingNeed['source'];
  id: string;
  household_id: string;
  title: string;
  on_date: string;
  amount: number;
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

  // `computeFinanceStatus` nhận thêm `needs` từ v2: chi phí sự kiện và phí gia
  // hạn giấy tờ phải được tính vào con số "cần chuẩn bị" (06 §0.2). Đọc một
  // lần cho mọi nhà rồi gom theo household_id — cron chạy cho TẤT CẢ household
  // nên một query kèm nhóm ở bộ nhớ rẻ hơn N query.
  const { data: needsData, error: needsError } = await supabase
    .from('upcoming_needs')
    .select('*');
  if (needsError) return jsonResponse({ error: needsError.message }, 500);

  const needsByHousehold = new Map<string, UpcomingNeed[]>();
  for (const n of (needsData ?? []) as NeedRow[]) {
    const need: UpcomingNeed = {
      source: n.source,
      id: n.id,
      title: n.title,
      amount: Number(n.amount),
      onDate: n.on_date,
    };
    const bucket = needsByHousehold.get(n.household_id);
    if (bucket) bucket.push(need);
    else needsByHousehold.set(n.household_id, [need]);
  }

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
        lastUsableUpdatedOn: m.last_usable_updated_on,
        lastUpdatedOn: m.last_updated_on,
        currency: m.currency,
        recordThresholdAmount:
          m.record_threshold_amount === null ? null : Number(m.record_threshold_amount),
      },
      needsByHousehold.get(m.household_id) ?? [],
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
      // `created_by` để null: KHÔNG có người nào tạo mốc này. Gán id của một
      // thành viên sẽ nói dối rằng họ đã ngồi xuống và chốt con số.
      created_by: null,
    });

    if (insertError) return jsonResponse({ error: insertError.message }, 500);
    created += 1;
  }

  return jsonResponse({ scanned: rows.length, created, skipped, today });
});
