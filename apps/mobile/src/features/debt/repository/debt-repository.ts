/**
 * Hiện thực DebtRepository.
 */

import { supabase } from '@/lib/supabase';
import type { DebtRow } from '@/lib/database.types';
import { unwrap, unwrapMaybe, unwrapVoid } from '@/data/shared/errors';
import { fromRecurrence, toDebt } from '@/data/shared/mappers';
import { currentProfileId } from '@/data/shared/session';
import type { DebtInput, DebtRepository } from './debt-repository.interface';

function toRow(i: Partial<DebtInput>): Record<string, unknown> {
  const r: Record<string, unknown> = {};
  if (i.name !== undefined) r.name = i.name;
  if (i.lender !== undefined) r.lender = i.lender;
  if (i.borrowerMemberId !== undefined) r.borrower_member_id = i.borrowerMemberId;
  if (i.principalAmount !== undefined) r.principal_amount = i.principalAmount;
  if (i.remainingAmount !== undefined) r.remaining_amount = i.remainingAmount;
  if (i.interestRatePct !== undefined) r.interest_rate_pct = i.interestRatePct;
  if (i.installmentAmount !== undefined) r.installment_amount = i.installmentAmount;
  if (i.installmentRecur !== undefined) r.installment_recur = fromRecurrence(i.installmentRecur);
  if (i.nextDueDate !== undefined) r.next_due_date = i.nextDueDate;
  if (i.finalDueDate !== undefined) r.final_due_date = i.finalDueDate;
  if (i.asOfDate !== undefined) r.as_of_date = i.asOfDate;
  return r;
}

export const debtRepository: DebtRepository = {
  async list(hh) {
    const rows = await unwrap<DebtRow[]>(
      supabase
        .from('debts')
        .select('*')
        .eq('household_id', hh)
        .is('deleted_at', null)
        .order('next_due_date', { ascending: true, nullsFirst: false }),
    );
    return rows.map(toDebt);
  },

  async get(hh, id) {
    const row = await unwrapMaybe<DebtRow>(
      supabase
        .from('debts')
        .select('*')
        .eq('id', id)
        .eq('household_id', hh)
        .is('deleted_at', null)
        .single(),
    );
    return row ? toDebt(row) : null;
  },

  async create(hh, input) {
    const createdBy = await currentProfileId();
    const row = await unwrap<DebtRow>(
      supabase
        .from('debts')
        .insert({ ...toRow(input), household_id: hh, created_by: createdBy })
        .select()
        .single(),
    );
    return toDebt(row);
  },

  async update(hh, id, patch) {
    const row = await unwrap<DebtRow>(
      supabase
        .from('debts')
        .update(toRow(patch))
        .eq('id', id)
        .eq('household_id', hh)
        .select()
        .single(),
    );
    return toDebt(row);
  },

  async softDelete(hh, id) {
    await unwrapVoid(
      supabase
        .from('debts')
        .update({ deleted_at: new Date().toISOString() })
        .eq('id', id)
        .eq('household_id', hh),
    );
  },
};
