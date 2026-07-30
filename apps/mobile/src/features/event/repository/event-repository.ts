/**
 * Hiện thực EventRepository.
 */

import { unwrap, unwrapMaybe, unwrapVoid } from '@/data/shared/errors';
import { fromRecurrence, toEvent } from '@/data/shared/mappers';
import { currentProfileId } from '@/data/shared/session';
import type { EventRow } from '@/lib/database.types';
import { supabase } from '@/lib/supabase';
import type { EventInput, EventRepository } from './event-repository.interface';

function toRow(input: Partial<EventInput>): Record<string, unknown> {
  const row: Record<string, unknown> = {};
  if (input.title !== undefined) row.title = input.title;
  if (input.kind !== undefined) row.kind = input.kind;
  if (input.side !== undefined) row.side = input.side;
  if (input.location !== undefined) row.location = input.location;
  if (input.notes !== undefined) row.notes = input.notes;
  if (input.calendar !== undefined) row.calendar = input.calendar;
  if (input.solarDate !== undefined) row.solar_date = input.solarDate;
  if (input.lunarDay !== undefined) row.lunar_day = input.lunarDay;
  if (input.lunarMonth !== undefined) row.lunar_month = input.lunarMonth;
  if (input.lunarLeapMonth !== undefined) row.lunar_leap_month = input.lunarLeapMonth;
  if (input.startTime !== undefined) row.start_time = input.startTime;
  if (input.isAllDay !== undefined) row.is_all_day = input.isAllDay;
  if (input.recur !== undefined) row.recur = fromRecurrence(input.recur);
  if (input.remindLeadDays !== undefined) row.remind_lead_days = input.remindLeadDays;
  if (input.estimatedCost !== undefined) row.estimated_cost = input.estimatedCost;
  return row;
}

/**
 * Gọi Edge tính lại ngày dương sau khi sửa sự kiện.
 *
 * KHÔNG tự tính rồi ghi từ client, dù packages/domain có sẵn hàm: 03 §3 nói rõ
 * chỉ MỘT nơi được ghi next_occurrence_date. Hai đường code cùng tính lịch âm
 * là cách chắc chắn để chúng lệch nhau.
 *
 * Lỗi ở đây KHÔNG ném lên trên: sự kiện đã lưu rồi, cron đêm sẽ tính lại. Thà
 * hiện sự kiện chưa có ngày dương còn hơn báo lỗi lưu.
 */
async function refreshLunarDate(eventId: string): Promise<void> {
  try {
    await supabase.functions.invoke('refresh-lunar-dates', { body: { eventId } });
  } catch {
    // Cron đêm sẽ dọn.
  }
}

export const eventRepository: EventRepository = {
  async list(hh) {
    const rows = await unwrap<EventRow[]>(
      supabase
        .from('events')
        .select('*')
        .eq('household_id', hh)
        .is('deleted_at', null)
        .order('next_occurrence_date', { ascending: true, nullsFirst: false }),
    );
    return rows.map(toEvent);
  },

  async get(hh, id) {
    const row = await unwrapMaybe<EventRow>(
      supabase
        .from('events')
        .select('*')
        .eq('id', id)
        .eq('household_id', hh)
        .is('deleted_at', null)
        .single(),
    );
    return row ? toEvent(row) : null;
  },

  async create(hh, input) {
    const createdBy = await currentProfileId();
    const row = await unwrap<EventRow>(
      supabase
        .from('events')
        .insert({ ...toRow(input), household_id: hh, created_by: createdBy })
        .select()
        .single(),
    );
    await refreshLunarDate(row.id);
    return toEvent(row);
  },

  async update(hh, id, patch) {
    const row = await unwrap<EventRow>(
      supabase
        .from('events')
        .update(toRow(patch))
        .eq('id', id)
        .eq('household_id', hh)
        .select()
        .single(),
    );
    await refreshLunarDate(row.id);
    return toEvent(row);
  },

  async softDelete(hh, id) {
    await unwrapVoid(
      supabase
        .from('events')
        .update({ deleted_at: new Date().toISOString() })
        .eq('id', id)
        .eq('household_id', hh),
    );
  },
};
