/**
 * Dựng bảng `reminders` — 03 §5, 01 §7.
 *
 * `reminders` là NGUỒN SỰ THẬT để client sync về rồi đặt lại lịch local. Client
 * không tự tính ngày nhắc: hai người trong cùng một nhà phải được nhắc cùng
 * một lúc về cùng một thứ, và hai máy tự tính sẽ lệch nhau ngay lần đầu một
 * người sửa ngày đến hạn khi máy kia đang offline.
 *
 * GỘP TRƯỚC KHI BẮN (03 §5): nhiều mục cùng ngày → MỘT thông báo. Không gộp thì
 * người dùng tắt thông báo trong tuần đầu và mất luôn kênh giữ chân duy nhất.
 *
 * Chạy lại được: mỗi lần chạy XOÁ các nhắc nhở tương lai chưa gửi rồi dựng lại
 * từ đầu, đúng như cách client "huỷ toàn bộ local notification rồi schedule lại"
 * (01 §7). Diff từng dòng phức tạp hơn và để lại lịch mồ côi khi một việc bị xoá.
 * Nhắc nhở ĐÃ GỬI (`sent_at` khác null) không bao giờ bị đụng tới — chúng là
 * lịch sử, không phải kế hoạch.
 *
 * Cron: mỗi ngày, sau `generate-task-instances` (nó đọc `task_instances`).
 */

import {
  buildReminders,
  capPerDay,
  type FamilyDocument,
  type FamilyEvent,
  type ISODate,
  type ReminderDraft,
  type TaskInstance,
  type UpcomingPayment,
} from '@family-organizer/domain';

import { jsonResponse, serviceClient, todayInVN } from '../_shared/client.ts';

/** Tầm nhìn: dựng lịch nhắc cho 90 ngày tới, cùng cửa sổ với task_instances. */
const HORIZON_DAYS = 90;

/**
 * Chuỗi thông báo.
 *
 * CỐ Ý lặp lại ở đây thay vì import `apps/mobile/src/i18n`: Edge chạy trên Deno
 * và chỉ được phép phụ thuộc `packages/domain`, còn i18n nằm trong app Expo
 * cùng React và NativeWind (01 §1). Bù lại bằng kỷ luật: mọi chuỗi ở đây phải
 * qua bảng từ vựng 04 §7 — không "nhiệm vụ", không "cảnh báo", không "quá hạn
 * nghiêm trọng".
 */
const VI = {
  /** Một mục: dùng thẳng tên nó. */
  single: (title: string) => title,
  /** Nhiều mục cùng ngày — một dòng, không liệt kê hết. */
  many: (count: number) => `Nhà mình có ${count} việc cần chuẩn bị`,
  bodyMany: (titles: string[]) => titles.join(' · '),
} as const;

function addDaysISO(d: ISODate, n: number): ISODate {
  const [y, m, day] = d.split('-').map(Number);
  return new Date(Date.UTC(y ?? 1970, (m ?? 1) - 1, (day ?? 1) + n)).toISOString().slice(0, 10);
}

/** `fireOn` + giờ địa phương → timestamptz. UTC+7, cùng quy ước cả app. */
function fireAtISO(fireOn: ISODate, fireHour: number): string {
  const [y, m, d] = fireOn.split('-').map(Number);
  return new Date(
    Date.UTC(y ?? 1970, (m ?? 1) - 1, d ?? 1, fireHour - 7, 0, 0),
  ).toISOString();
}

interface Row {
  household_id: string;
  entity_type: string;
  entity_id: string;
  target_member_id: string | null;
  fire_at: string;
  title: string;
  body: string | null;
  channel: 'local';
}

/**
 * Một draft đã gộp → một dòng `reminders`.
 *
 * `entity_type`/`entity_id` trỏ vào mục ĐẦU TIÊN (đến hạn sớm nhất): chạm vào
 * thông báo phải mở ra một thứ cụ thể, và mục sắp tới nhất là thứ đúng nhất để
 * mở.
 *
 * `target_member_id` lấy NGUYÊN từ draft (03 §5, 06 §7):
 *   null   = cả nhà — sự kiện, giấy tờ, khoản tiền, và việc không gán ai
 *   có id  = việc CÓ người phụ trách, nhắc CHỈ người đó
 *
 * Trước đây cột này bị ghi cứng `null`, tức là một việc gán riêng cho vợ vẫn
 * bắn cho cả hai. KHÔNG BAO GIỜ được tồn tại thông báo dạng "X chưa làm Y":
 * khoảnh khắc app báo cho người thứ hai rằng người thứ nhất chưa làm, nó thôi
 * thay việc nhắc và bắt đầu THAY LỜI TỐ.
 */
function toRow(householdId: string, draft: ReminderDraft): Row | null {
  const first = draft.items[0];
  if (!first) return null;

  const many = draft.items.length > 1;
  return {
    household_id: householdId,
    entity_type: first.entityType,
    entity_id: first.entityId,
    target_member_id: draft.targetMemberId,
    fire_at: fireAtISO(draft.fireOn, draft.fireHour),
    title: many ? VI.many(draft.items.length) : VI.single(first.title),
    body: many ? VI.bodyMany(draft.items.map((i) => i.title)) : null,
    channel: 'local',
  };
}

Deno.serve(async () => {
  const supabase = serviceClient();
  const today = todayInVN();
  const horizon = addDaysISO(today, HORIZON_DAYS);

  const { data: households, error: hhError } = await supabase.from('households').select('id');
  if (hhError) return jsonResponse({ error: hhError.message }, 500);

  let inserted = 0;
  const failures: { household: string; error: string }[] = [];

  for (const hh of households ?? []) {
    const id = hh.id as string;
    try {
      inserted += await rebuildForHousehold(supabase, id, today, horizon);
    } catch (e) {
      // Một nhà lỗi KHÔNG được dừng cả cron: các nhà còn lại vẫn phải có lịch
      // nhắc. Ghi lại rồi đi tiếp.
      failures.push({ household: id, error: e instanceof Error ? e.message : String(e) });
    }
  }

  return jsonResponse({
    households: households?.length ?? 0,
    inserted,
    failures,
    window: { from: today, to: horizon },
  });
});

async function rebuildForHousehold(
  supabase: ReturnType<typeof serviceClient>,
  hh: string,
  today: ISODate,
  horizon: ISODate,
): Promise<number> {
  const [events, documents, payments, instances, tasks] = await Promise.all([
    supabase
      .from('events')
      .select('*')
      .eq('household_id', hh)
      .is('deleted_at', null)
      .not('next_occurrence_date', 'is', null),
    supabase
      .from('documents')
      .select('*')
      .eq('household_id', hh)
      .is('deleted_at', null)
      .not('expiry_date', 'is', null),
    supabase.from('upcoming_payments').select('*').eq('household_id', hh).eq('state', 'unpaid'),
    supabase
      .from('task_instances')
      .select('*')
      .eq('household_id', hh)
      .eq('status', 'todo')
      .eq('skipped', false)
      .gte('due_date', today)
      .lte('due_date', horizon),
    // Việc KHÔNG lặp không có instance — chúng phải vào lịch nhắc bằng đường
    // riêng, nếu không thì "nộp học phí ngày 15" không bao giờ được nhắc.
    supabase
      .from('tasks')
      .select('id, title, due_date, status, recur, assignee_id')
      .eq('household_id', hh)
      .is('deleted_at', null)
      .eq('status', 'todo')
      .not('due_date', 'is', null)
      .gte('due_date', today)
      .lte('due_date', horizon),
  ]);

  for (const r of [events, documents, payments, instances, tasks]) {
    if (r.error) throw new Error(r.error.message);
  }

  const taskTitles: Record<string, string> = {};
  // Người phụ trách của từng việc. Thiếu bản ghi = việc không gán ai = nhắc cả
  // nhà. Xem quy tắc người nhận ở `toRow` và 03 §5.
  const taskAssignees: Record<string, string | null> = {};
  const oneOffInstances: TaskInstance[] = [];

  for (const row of (tasks.data ?? []) as {
    id: string;
    title: string;
    due_date: ISODate;
    recur: { freq: string | null } | null;
    assignee_id: string | null;
  }[]) {
    taskTitles[row.id] = row.title;
    taskAssignees[row.id] = row.assignee_id;
    const repeats = row.recur !== null && row.recur.freq !== null && row.recur.freq !== 'none';
    if (repeats) continue;
    // Việc một lần được bọc thành TaskInstance để đi cùng một đường với việc
    // lặp trong `buildReminders` — id giữ nguyên id của task, nên chạm vào
    // thông báo vẫn mở đúng bản ghi.
    oneOffInstances.push({
      id: row.id,
      taskId: row.id,
      dueDate: row.due_date,
      status: 'todo',
      completedBy: null,
      skipped: false,
    });
  }

  const repeatInstances = ((instances.data ?? []) as {
    id: string;
    task_id: string;
    due_date: ISODate;
    status: string;
    completed_by: string | null;
    skipped: boolean;
  }[]).map((r): TaskInstance => ({
    id: r.id,
    taskId: r.task_id,
    dueDate: r.due_date,
    status: r.status === 'done' ? 'done' : 'todo',
    completedBy: r.completed_by,
    skipped: r.skipped,
  }));

  // Tên cho instance của việc lặp: chúng không nằm trong truy vấn `tasks` ở
  // trên (việc lặp không lọc theo due_date), nên tra thêm một lượt.
  const missingTaskIds = [
    ...new Set(repeatInstances.map((i) => i.taskId).filter((id) => !(id in taskTitles))),
  ];
  if (missingTaskIds.length > 0) {
    const { data, error } = await supabase
      .from('tasks')
      .select('id, title, assignee_id')
      .eq('household_id', hh)
      .in('id', missingTaskIds);
    if (error) throw new Error(error.message);
    for (const row of (data ?? []) as {
      id: string;
      title: string;
      assignee_id: string | null;
    }[]) {
      taskTitles[row.id] = row.title;
      taskAssignees[row.id] = row.assignee_id;
    }
  }

  const drafts = capPerDay(
    buildReminders(
      {
        events: mapRows<FamilyEvent>(events.data, toEvent),
        documents: mapRows<FamilyDocument>(documents.data, toDocument),
        payments: mapRows<UpcomingPayment>(payments.data, toPayment),
        tasks: [...repeatInstances, ...oneOffInstances],
        taskTitles,
        taskAssignees,
      },
      today,
      HORIZON_DAYS,
    ),
  );

  // Xoá lịch TƯƠNG LAI chưa gửi rồi dựng lại. `sent_at is null` là điều kiện
  // không thể thiếu: nhắc nhở đã gửi là lịch sử.
  const { error: delError } = await supabase
    .from('reminders')
    .delete()
    .eq('household_id', hh)
    .is('sent_at', null)
    .gte('fire_at', new Date().toISOString());
  if (delError) throw new Error(delError.message);

  const rows = drafts.map((d) => toRow(hh, d)).filter((r): r is Row => r !== null);
  if (rows.length === 0) return 0;

  const { error: insError } = await supabase.from('reminders').insert(rows);
  if (insError) throw new Error(insError.message);
  return rows.length;
}

function mapRows<T>(data: unknown[] | null, map: (r: Record<string, unknown>) => T): T[] {
  return (data ?? []).map((r) => map(r as Record<string, unknown>));
}

/**
 * Map tối thiểu: `buildReminders` chỉ đọc `id`, `title`/`name`, ngày, và
 * `remindLeadDays`. Các trường còn lại ép kiểu cho khớp interface chứ không
 * được dùng — nên chúng nhận giá trị trung tính thay vì đọc từ row.
 */
function toEvent(r: Record<string, unknown>): FamilyEvent {
  return {
    id: String(r.id),
    title: String(r.title),
    kind: 'other',
    side: null,
    location: null,
    notes: null,
    calendar: 'solar',
    solarDate: null,
    lunarDay: null,
    lunarMonth: null,
    lunarLeapMonth: false,
    startTime: null,
    isAllDay: true,
    recur: null,
    remindLeadDays: Number(r.remind_lead_days ?? 0),
    nextOccurrenceDate: (r.next_occurrence_date as ISODate | null) ?? null,
    estimatedCost: null,
  };
}

function toDocument(r: Record<string, unknown>): FamilyDocument {
  return {
    id: String(r.id),
    title: String(r.title),
    type: 'other',
    ownerMemberId: null,
    issuedDate: null,
    expiryDate: (r.expiry_date as ISODate | null) ?? null,
    remindLeadDays: Number(r.remind_lead_days ?? 0),
    physicalLocation: null,
    externalLink: null,
    renewalCost: null,
    eventId: null,
    debtId: null,
    extra: {},
    files: [],
  };
}

function toPayment(r: Record<string, unknown>): UpcomingPayment {
  return {
    id: String(r.id),
    name: String(r.name),
    amount: Number(r.amount ?? 0),
    dueDate: (r.due_date as ISODate | null) ?? null,
    dueMonth: (r.due_month as ISODate | null) ?? null,
    recur: null,
    state: 'unpaid',
    sourceDebtId: null,
    eventId: null,
    notes: null,
  };
}
