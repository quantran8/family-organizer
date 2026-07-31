/**
 * `spawn-debt-installments` — sinh kỳ trả nợ tiếp theo.
 *
 * Một khoản nợ không phải "một con số 180tr". Nó TỰ SINH RA `upcoming_payments`
 * hằng kỳ (schema §5.2), và đó là lý do nợ đáng có bảng riêng thay vì là một
 * dòng tài sản âm: người dùng cần biết **tháng này phải chuẩn bị bao nhiêu**,
 * không phải tổng dư nợ.
 *
 * ── CHẠY LẠI ĐƯỢC, và đây là chỗ nguy hiểm nhất của cả file ──
 *
 * `upcoming_payments` KHÔNG có unique constraint nào chặn trùng (khác hẳn
 * `task_instances`, nơi `unique (task_id, due_date)` cho phép
 * `upsert ignoreDuplicates`). Nghĩa là không có lưới an toàn ở tầng DB: cron
 * chạy hai lần trong một ngày, hoặc chạy lại sau một lần lỗi giữa chừng, sẽ
 * sinh **hai kỳ trả giống hệt nhau**.
 *
 * Và hậu quả không dừng ở một dòng thừa trong danh sách: `finance_metrics`
 * cộng `dueNext30d` từ đây, nên màn Tiền sẽ nói nhà mình cần chuẩn bị gấp đôi
 * số tiền thật. Trong một app mà cả giá trị nằm ở chỗ hai người tin vào con số
 * chung, đó là kiểu sai tệ nhất.
 *
 * Nên phải TỰ kiểm trước khi ghi: đã có kỳ chưa trả nào của khoản nợ này đúng
 * ngày đó chưa. Một câu truy vấn thêm, đổi lại job an toàn khi chạy lại.
 *
 * ── Chỉ sinh kỳ SẮP TỚI, không sinh cả lịch ──
 *
 * Khác `generate-task-instances` (vật hoá 90 ngày): một khoản vay 20 năm là 240
 * kỳ, và vật hoá hết sẽ làm màn "Sắp phải trả" ngập những dòng của năm 2044.
 * Mỗi lần chỉ sinh kỳ kế tiếp; `settle_payment` đẩy `next_due_date` lên, và lần
 * chạy sau sinh kỳ tiếp theo.
 *
 * ── KHÔNG đụng `remaining_amount` ──
 *
 * Dư nợ chỉ giảm qua RPC `settle_payment` (02 §7), cùng transaction với việc
 * chốt một kỳ và ghi `money_events`. Job này chỉ tạo ra thứ **sẽ** phải trả.
 */

import { addMonthsClamped, addYearsClamped, type ISODate } from '@family-organizer/domain';

import { jsonResponse, serviceClient, todayInVN } from '../_shared/client.ts';

/**
 * Sinh trước ngần này ngày.
 *
 * Đủ sớm để người dùng thấy kỳ tới trong mục "Sắp phải trả" (cửa sổ 30 ngày của
 * `finance_metrics`) và chuẩn bị tiền, đủ muộn để không có hai kỳ cùng hiện.
 */
const LEAD_DAYS = 35;

interface DebtRow {
  id: string;
  household_id: string;
  name: string;
  installment_amount: number | null;
  installment_recur: { freq: string | null; interval_n: number | null } | null;
  next_due_date: ISODate | null;
  final_due_date: ISODate | null;
  created_by: string;
}

/** Số ngày giữa hai ngày dương lịch. */
function daysUntil(from: ISODate, to: ISODate): number {
  const a = Date.UTC(+from.slice(0, 4), +from.slice(5, 7) - 1, +from.slice(8, 10));
  const b = Date.UTC(+to.slice(0, 4), +to.slice(5, 7) - 1, +to.slice(8, 10));
  return Math.round((b - a) / 86_400_000);
}

/**
 * Kỳ kế tiếp sau `date` theo tần suất trả. `null` nếu không lặp.
 *
 * Bản `Clamped`: một khoản vay trả ngày 31 hằng tháng thì tháng Hai KHÔNG có
 * ngày 31. Không kẹp thì `2026-01-31` cộng một tháng ra `2026-03-03` — kỳ trả
 * tự nhảy sang tháng Ba và tháng Hai biến mất khỏi lịch.
 */
function advance(date: ISODate, freq: string | null, intervalN: number): ISODate | null {
  switch (freq) {
    case 'monthly':
      return addMonthsClamped(date, intervalN);
    case 'yearly':
      return addYearsClamped(date, intervalN);
    default:
      // Nợ chỉ trả hằng tháng hoặc hằng năm (form chỉ cho chọn hai cái đó).
      // `daily`/`weekly` không phải lịch trả nợ của bất kỳ khoản vay nào.
      return null;
  }
}

Deno.serve(async () => {
  const supabase = serviceClient();
  const today = todayInVN();

  const { data, error } = await supabase
    .from('debts')
    .select(
      'id, household_id, name, installment_amount, installment_recur, next_due_date, final_due_date, created_by',
    )
    .is('deleted_at', null)
    .eq('is_settled', false)
    .not('next_due_date', 'is', null);

  if (error) return jsonResponse({ error: error.message }, 500);

  const rows = (data ?? []) as DebtRow[];
  let created = 0;
  let skipped = 0;
  let advanced = 0;

  for (const debt of rows) {
    const dueDate = debt.next_due_date;
    if (dueDate === null) continue;

    // Chưa tới lúc sinh — để lần chạy sau.
    if (daysUntil(today, dueDate) > LEAD_DAYS) {
      skipped += 1;
      continue;
    }

    // Không biết mỗi kỳ bao nhiêu thì không sinh được một khoản phải trả có
    // nghĩa. Một dòng "0 ₫" trong mục Sắp phải trả tệ hơn là không có dòng nào.
    if (debt.installment_amount === null) {
      skipped += 1;
      continue;
    }

    // ── Chống trùng (xem đầu file) ──
    // Không có unique constraint nào ở DB, nên đây là lưới an toàn DUY NHẤT.
    const { data: existing, error: existingError } = await supabase
      .from('upcoming_payments')
      .select('id')
      .eq('household_id', debt.household_id)
      .eq('source_debt_id', debt.id)
      .eq('due_date', dueDate)
      .is('deleted_at', null)
      .limit(1);

    if (existingError) return jsonResponse({ error: existingError.message }, 500);

    if ((existing ?? []).length === 0) {
      const { error: insertError } = await supabase.from('upcoming_payments').insert({
        household_id: debt.household_id,
        name: debt.name,
        amount: debt.installment_amount,
        due_date: dueDate,
        source_debt_id: debt.id,
        // KHÔNG đặt `recur`: mỗi kỳ là một dòng độc lập do job này sinh ra. Đặt
        // recur ở đây sẽ để `build-reminders` nhân nó lên lần nữa.
        created_by: debt.created_by,
      });
      if (insertError) return jsonResponse({ error: insertError.message }, 500);
      created += 1;
    } else {
      skipped += 1;
    }

    // ── Đẩy `next_due_date` lên kỳ sau ──
    // Làm ở đây chứ không chờ `settle_payment`: người dùng có thể trả trễ, và
    // nếu `next_due_date` đứng yên tới lúc họ bấm "Đã trả" thì lần chạy sau sẽ
    // nhìn thấy đúng ngày cũ và không sinh được kỳ tiếp theo.
    const next = advance(
      dueDate,
      debt.installment_recur?.freq ?? null,
      debt.installment_recur?.interval_n ?? 1,
    );
    // Quá ngày tất toán dự kiến thì dừng — `next_due_date` để nguyên, khoản nợ
    // chờ người dùng chốt lần cuối.
    if (next !== null && (debt.final_due_date === null || next <= debt.final_due_date)) {
      const { error: updateError } = await supabase
        .from('debts')
        .update({ next_due_date: next })
        .eq('id', debt.id);
      if (updateError) return jsonResponse({ error: updateError.message }, 500);
      advanced += 1;
    }
  }

  return jsonResponse({ scanned: rows.length, created, skipped, advanced, today });
});
