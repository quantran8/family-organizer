/**
 * Hiện thực TaskRepository.
 *
 * "Quá hạn" SUY RA từ due_date, không lưu. "Tạm hoãn" = đổi due_date.
 */

import { unwrap, unwrapMaybe, unwrapVoid } from '@/data/shared/errors';
import { fromRecurrence, toTask, toTaskInstance } from '@/data/shared/mappers';
import { currentProfileId } from '@/data/shared/session';
import type { TaskInstanceRow, TaskRow } from '@/lib/database.types';
import { supabase } from '@/lib/supabase';
import type { TaskInput, TaskRepository } from './task-repository.interface';

function toRow(input: Partial<TaskInput>): Record<string, unknown> {
  const row: Record<string, unknown> = {};
  if (input.title !== undefined) row.title = input.title;
  if (input.notes !== undefined) row.notes = input.notes;
  if (input.list !== undefined) row.list = input.list;
  if (input.assigneeId !== undefined) row.assignee_id = input.assigneeId;
  if (input.dueDate !== undefined) row.due_date = input.dueDate;
  if (input.dueTime !== undefined) row.due_time = input.dueTime;
  if (input.recur !== undefined) row.recur = fromRecurrence(input.recur);
  if (input.remindLeadDays !== undefined) row.remind_lead_days = input.remindLeadDays;
  if (input.eventId !== undefined) row.event_id = input.eventId;
  return row;
}

export const taskRepository: TaskRepository = {
  async list(hh, taskList) {
    // Xây query rồi mới thêm điều kiện: `.eq()` trả về builder mới, nên gán lại
    // là cách duy nhất giữ được kiểu mà vẫn lọc có điều kiện.
    let q = supabase
      .from('tasks')
      .select('*')
      .eq('household_id', hh)
      .is('deleted_at', null);
    if (taskList !== undefined) q = q.eq('list', taskList);

    const rows = await unwrap<TaskRow[]>(
      q.order('due_date', { ascending: true, nullsFirst: false }),
    );
    return rows.map(toTask);
  },

  async get(hh, id) {
    const row = await unwrapMaybe<TaskRow>(
      supabase
        .from('tasks')
        .select('*')
        .eq('id', id)
        .eq('household_id', hh)
        .is('deleted_at', null)
        .single(),
    );
    return row ? toTask(row) : null;
  },

  async create(hh, input) {
    const createdBy = await currentProfileId();
    const row = await unwrap<TaskRow>(
      supabase
        .from('tasks')
        .insert({ ...toRow(input), household_id: hh, created_by: createdBy })
        .select()
        .single(),
    );
    return toTask(row);
  },

  async update(hh, id, patch) {
    const row = await unwrap<TaskRow>(
      supabase
        .from('tasks')
        .update(toRow(patch))
        .eq('id', id)
        .eq('household_id', hh)
        .select()
        .single(),
    );
    return toTask(row);
  },

  async setDone(hh, id, done, memberId) {
    await unwrapVoid(
      supabase
        .from('tasks')
        .update({
          status: done ? 'done' : 'todo',
          completed_at: done ? new Date().toISOString() : null,
          completed_by: done ? memberId : null,
        })
        .eq('id', id)
        .eq('household_id', hh),
    );
  },

  async setInstanceDone(hh, instanceId, done, memberId) {
    await unwrapVoid(
      supabase
        .from('task_instances')
        .update({
          status: done ? 'done' : 'todo',
          completed_at: done ? new Date().toISOString() : null,
          completed_by: done ? memberId : null,
        })
        .eq('id', instanceId)
        .eq('household_id', hh),
    );
  },

  /** Hoãn = đổi ngày. Không có state "tạm hoãn" riêng. */
  async reschedule(hh, id, dueDate) {
    await unwrapVoid(
      supabase.from('tasks').update({ due_date: dueDate }).eq('id', id).eq('household_id', hh),
    );
  },

  async listInstances(hh, from, to) {
    const rows = await unwrap<TaskInstanceRow[]>(
      supabase
        .from('task_instances')
        .select('*')
        .eq('household_id', hh)
        .gte('due_date', from)
        .lte('due_date', to)
        .eq('skipped', false)
        .order('due_date', { ascending: true }),
    );
    return rows.map(toTaskInstance);
  },

  /** 5 lần gần nhất đã xong — trả lời "tuần trước có đổ rác không" (05 §5.2). */
  async recentDoneInstances(hh, taskId, limit) {
    const rows = await unwrap<TaskInstanceRow[]>(
      supabase
        .from('task_instances')
        .select('*')
        .eq('household_id', hh)
        .eq('task_id', taskId)
        .eq('status', 'done')
        .order('due_date', { ascending: false })
        .limit(limit),
    );
    return rows.map(toTaskInstance);
  },

  async listByEvent(hh, eventId) {
    const rows = await unwrap<TaskRow[]>(
      supabase
        .from('tasks')
        .select('*')
        .eq('household_id', hh)
        .eq('event_id', eventId)
        .is('deleted_at', null)
        .order('due_date', { ascending: true, nullsFirst: false }),
    );
    return rows.map(toTask);
  },

  async softDelete(hh, id) {
    await unwrapVoid(
      supabase
        .from('tasks')
        .update({ deleted_at: new Date().toISOString() })
        .eq('id', id)
        .eq('household_id', hh),
    );
  },
};
