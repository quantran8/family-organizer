/**
 * Hiện thực PaymentRepository.
 */

import { supabase } from '@/lib/supabase';
import type { UpcomingPaymentRow } from '@/lib/database.types';
import { unwrap, unwrapMaybe, unwrapVoid } from '@/data/shared/errors';
import { fromRecurrence, toPayment } from '@/data/shared/mappers';
import { currentProfileId } from '@/data/shared/session';
import { addDays } from '@nhaminh/domain';

import type { PaymentInput, PaymentRepository } from './payment-repository.interface';

function toRow(i: Partial<PaymentInput>): Record<string, unknown> {
  const r: Record<string, unknown> = {};
  if (i.name !== undefined) r.name = i.name;
  if (i.amount !== undefined) r.amount = i.amount;
  if (i.dueDate !== undefined) r.due_date = i.dueDate;
  if (i.dueMonth !== undefined) r.due_month = i.dueMonth;
  if (i.recur !== undefined) r.recur = fromRecurrence(i.recur);
  if (i.sourceDebtId !== undefined) r.source_debt_id = i.sourceDebtId;
  if (i.eventId !== undefined) r.event_id = i.eventId;
  if (i.notes !== undefined) r.notes = i.notes;
  return r;
}

export const paymentRepository: PaymentRepository = {
  async list(hh, window, today) {
    let q = supabase
      .from('upcoming_payments')
      .select('*')
      .eq('household_id', hh)
      .is('deleted_at', null);

    switch (window) {
      case '7d':
        q = q.eq('state', 'unpaid').gte('due_date', today).lte('due_date', addDays(today, 7));
        break;
      case '30d':
        q = q.eq('state', 'unpaid').gte('due_date', today).lte('due_date', addDays(today, 30));
        break;
      case 'overdue':
        q = q.eq('state', 'unpaid').lt('due_date', today);
        break;
      case 'paid':
        q = q.eq('state', 'paid');
        break;
      case 'all':
        break;
    }

    const rows = await unwrap<UpcomingPaymentRow[]>(
      q.order('due_date', { ascending: true, nullsFirst: false }),
    );
    return rows.map(toPayment);
  },

  async get(hh, id) {
    const row = await unwrapMaybe<UpcomingPaymentRow>(
      supabase
        .from('upcoming_payments')
        .select('*')
        .eq('id', id)
        .eq('household_id', hh)
        .is('deleted_at', null)
        .single(),
    );
    return row ? toPayment(row) : null;
  },

  async create(hh, input) {
    const createdBy = await currentProfileId();
    const row = await unwrap<UpcomingPaymentRow>(
      supabase
        .from('upcoming_payments')
        .insert({ ...toRow(input), household_id: hh, created_by: createdBy })
        .select()
        .single(),
    );
    return toPayment(row);
  },

  async update(hh, id, patch) {
    const row = await unwrap<UpcomingPaymentRow>(
      supabase
        .from('upcoming_payments')
        .update(toRow(patch))
        .eq('id', id)
        .eq('household_id', hh)
        .select()
        .single(),
    );
    return toPayment(row);
  },

  /**
   * BA lệnh ghi: upcoming_payments + money_events + debts. Mất mạng giữa chừng
   * mà ghép từ client thì dư nợ sai VĨNH VIỄN — đó là lý do RPC này tồn tại.
   */
  async settle(_hh, id, paidOn, note) {
    await unwrapVoid(
      supabase.rpc('settle_payment', {
        p_payment_id: id,
        p_paid_on: paidOn,
        p_note: note ?? null,
      }),
    );
  },

  async listByEvent(hh, eventId) {
    const rows = await unwrap<UpcomingPaymentRow[]>(
      supabase
        .from('upcoming_payments')
        .select('*')
        .eq('household_id', hh)
        .eq('event_id', eventId)
        .is('deleted_at', null),
    );
    return rows.map(toPayment);
  },

  async listByDebt(hh, debtId) {
    const rows = await unwrap<UpcomingPaymentRow[]>(
      supabase
        .from('upcoming_payments')
        .select('*')
        .eq('household_id', hh)
        .eq('source_debt_id', debtId)
        .is('deleted_at', null)
        .order('due_date', { ascending: false }),
    );
    return rows.map(toPayment);
  },

  async softDelete(hh, id) {
    await unwrapVoid(
      supabase
        .from('upcoming_payments')
        .update({ deleted_at: new Date().toISOString() })
        .eq('id', id)
        .eq('household_id', hh),
    );
  },
};
