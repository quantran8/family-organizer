/**
 * `nudge-snapshot-update` — nhắc cập nhật tình hình.
 *
 * **Vòng lặp thói quen chính của cả sản phẩm** (schema §14). Nghi thức cập nhật
 * là thứ duy nhất trong app có nhịp rõ, và F4 chốt rằng thông báo 09:00 mở
 * THẲNG modal Cập nhật tình hình — không qua màn trung gian nào.
 *
 * ── Ngôn ngữ ở đây quan trọng hơn code ──
 *
 * Câu nhắc KHÔNG BAO GIỜ nêu tên ai. Không *"Đã 8 ngày rồi, bạn chưa cập nhật"*,
 * không *"X chưa nhập số liệu tháng này"*. Cả hai biến một lời nhắc thành một
 * lời trách, và trong một app mà người giữ tiền vốn đã dễ thấy mình bị giám sát
 * thì đó là lý do để họ tắt thông báo — mất luôn kênh giữ chân duy nhất.
 *
 * Câu dùng nói SỰ VIỆC, không gán chủ ngữ; cùng lối với `snapshot_update` push
 * của F4: *"Tình hình tài chính gia đình vừa được cập nhật"*, không phải *"X đã
 * thay đổi số tiền"*.
 *
 * ── Nhắc CẢ NHÀ, không nhắc một người ──
 *
 * `target_member_id = null` nghĩa là cả nhà (schema §8). `snapshot_interval_days`
 * thuộc household và ai cập nhật cũng được; gửi riêng cho "người phụ trách" là
 * dựng lại đúng vai trò mà ràng buộc "hai người ngang nhau" cấm.
 *
 * ── Vì sao job này chạy 09:00 mà `build-reminders` chạy 04:30 ──
 *
 * Không phải tình cờ. `build-reminders` **xoá sạch mọi nhắc nhở tương lai chưa
 * gửi** của một nhà rồi dựng lại từ đầu (đơn giản hơn diff, và không để lại
 * lịch mồ côi). Một hàng do job này ghi lúc 09:00 hôm nay có `fire_at` cùng
 * ngày — nó nằm trong khoảng bị xoá, nên nếu ghi TRƯỚC 04:30 thì nó biến mất
 * trước khi kịp bắn.
 *
 * Chạy sau nghĩa là hàng vừa ghi sống tới lúc bắn trong ngày. Đây là loại phụ
 * thuộc thứ tự không có gì trong code nói ra, nên nó phải nằm ở đây.
 */

import { jsonResponse, serviceClient, todayInVN } from '../_shared/client.ts';

/** Giờ bắn — F4 chốt 09:00 giờ Việt Nam. */
const FIRE_HOUR_VN = 9;

interface HouseholdRow {
  id: string;
  snapshot_interval_days: number;
}

/**
 * Câu nhắc.
 *
 * Chuỗi hiển thị của Edge Function nằm ngay tại chỗ, cùng quy ước với
 * `build-reminders` (`VI` ở đầu file đó): server dựng câu vì thông báo phải đọc
 * được cả khi app chưa mở lần nào. Bảng từ vựng 04 §7 vẫn áp dụng.
 */
const VI = {
  title: 'Tình hình nhà mình',
  body: (days: number) => `Cập nhật lần cuối ${days} ngày trước.`,
};

function daysBetweenISO(from: string, to: string): number {
  const a = Date.UTC(+from.slice(0, 4), +from.slice(5, 7) - 1, +from.slice(8, 10));
  const b = Date.UTC(+to.slice(0, 4), +to.slice(5, 7) - 1, +to.slice(8, 10));
  return Math.round((b - a) / 86_400_000);
}

/** `2026-07-31` + giờ VN → ISO UTC. UTC+7 nên trừ 7 tiếng. */
function fireAtISO(day: string, hourVN: number): string {
  const [y, m, d] = day.split('-').map(Number);
  return new Date(Date.UTC(y ?? 1970, (m ?? 1) - 1, d ?? 1, hourVN - 7, 0, 0)).toISOString();
}

Deno.serve(async () => {
  const supabase = serviceClient();
  const today = todayInVN();

  const { data, error } = await supabase
    .from('households')
    .select('id, snapshot_interval_days');

  if (error) return jsonResponse({ error: error.message }, 500);

  const households = (data ?? []) as HouseholdRow[];
  let nudged = 0;
  let onTrack = 0;

  for (const hh of households) {
    // Chỉ đếm mốc NGƯỜI DÙNG tự nhập. `autosnapshot-monthly` chốt hộ một mốc để
    // lịch sử không trống, nhưng đó không phải người dùng nhìn lại con số —
    // nghi thức mới là thứ cần giữ, không phải hàng dữ liệu.
    const { data: snapshots, error: snapshotError } = await supabase
      .from('money_snapshots')
      .select('as_of_date')
      .eq('household_id', hh.id)
      .eq('is_manual', true)
      .order('as_of_date', { ascending: false })
      .limit(1);

    if (snapshotError) return jsonResponse({ error: snapshotError.message }, 500);

    const last = snapshots?.[0]?.as_of_date as string | undefined;

    // Nhà chưa bao giờ cập nhật: KHÔNG nhắc. Nhà mới lập còn đang thêm việc và
    // sự kiện, và một lời nhắc về nghi thức họ chưa từng làm chỉ là tiếng ồn.
    // Thẻ trạng thái trên màn Tiền đã mời họ làm lần đầu rồi.
    if (last === undefined) {
      onTrack += 1;
      continue;
    }

    const elapsed = daysBetweenISO(last, today);
    if (elapsed < hh.snapshot_interval_days) {
      onTrack += 1;
      continue;
    }

    const fireAt = fireAtISO(today, FIRE_HOUR_VN);

    // Đã có lời nhắc chưa gửi cho hôm nay thì thôi — chạy lại không được nhân
    // đôi. Nhận ra nó bằng `entity_id = household_id`; xem ghi chú ở phần
    // insert bên dưới về vì sao khoá đó là thứ dùng được.
    const { data: existing, error: existingError } = await supabase
      .from('reminders')
      .select('id')
      .eq('household_id', hh.id)
      .eq('entity_id', hh.id)
      .is('sent_at', null)
      .gte('fire_at', fireAt)
      .limit(1);

    if (existingError) return jsonResponse({ error: existingError.message }, 500);
    if ((existing ?? []).length > 0) {
      onTrack += 1;
      continue;
    }

    /**
     * `entity_type` phải là một giá trị của enum `entity_type`, và enum đó
     * KHÔNG có `household` — nó liệt kê bảy loại bản ghi gắn cờ/nhắc được
     * (task, event, document, asset, debt, goal, upcoming_payment).
     *
     * Lời nhắc này không thuộc bản ghi nào cả: nó nói về **cả nhà**. Dùng
     * `entity_type = 'asset'` với `entity_id = household_id` là cách rẻ nhất để
     * qua được ràng buộc, và cũng là cách để client nhận ra nó — `entity_id`
     * bằng chính `household_id` không trùng với bất kỳ tài sản nào.
     *
     * Đây là một chỗ CHẬT, và nó nên được sửa bằng migration thêm
     * `'household'` vào enum khi có dịp đụng lại schema. Ghi ra đây để lần sau
     * không ai phải đoán vì sao một lời nhắc về tình hình chung lại mang nhãn
     * `asset`.
     */
    const { error: insertError } = await supabase.from('reminders').insert({
      household_id: hh.id,
      entity_type: 'asset',
      entity_id: hh.id,
      target_member_id: null,
      fire_at: fireAt,
      title: VI.title,
      body: VI.body(elapsed),
      channel: 'local',
    });

    if (insertError) return jsonResponse({ error: insertError.message }, 500);
    nudged += 1;
  }

  return jsonResponse({ scanned: households.length, nudged, onTrack, today });
});
