/**
 * Hiện thực ChildRepository.
 *
 * Mọi đường đọc mũi tiêm đều phải kèm bảng tham chiếu để dựng `displayName` —
 * tên KHÔNG được denormalize xuống hàng của người dùng (xem `toChildVaccineDose`
 * ở mappers). Đó là lý do các hàm dưới đây tải `vaccine_schedule_items` cùng
 * lượt thay vì chỉ đọc `child_vaccine_doses`.
 */

import { unwrap, unwrapVoid } from '@/data/shared/errors';
import { toChildVaccineDose, toGrowthRecord, toVaccineScheduleItem } from '@/data/shared/mappers';
import { currentProfileId } from '@/data/shared/session';
import type {
  ChildGrowthRecordRow,
  ChildVaccineDoseRow,
  VaccineScheduleItemRow,
} from '@/lib/database.types';
import { supabase } from '@/lib/supabase';
import type { ChildRepository, DoseInput } from './child-repository.interface';

/** `code` → tên hiển thị, để `toChildVaccineDose` ghép nhãn. */
async function scheduleNames(): Promise<Map<string, string>> {
  const rows = await unwrap<VaccineScheduleItemRow[]>(
    // KHÔNG lọc `is_active`: một mũi đã tiêm theo phiên bản lịch cũ vẫn phải
    // đọc được tên. Lọc ở đây thì hàng cũ tụt về hiện mã thô sau mỗi lần lịch
    // đổi phiên bản.
    supabase.from('vaccine_schedule_items').select('code, display_name, dose_label'),
  );
  return new Map(
    rows.map((r) => [
      r.code,
      r.dose_label ? `${r.display_name} — ${r.dose_label}` : r.display_name,
    ]),
  );
}

function doseRow(input: DoseInput) {
  return {
    schedule_code: input.scheduleCode,
    custom_name: input.customName ?? null,
    due_date: input.dueDate,
  };
}

export const childRepository: ChildRepository = {
  async listScheduleItems(_hh) {
    const rows = await unwrap<VaccineScheduleItemRow[]>(
      supabase
        .from('vaccine_schedule_items')
        .select('*')
        .eq('is_active', true)
        .order('sort_order', { ascending: true }),
    );
    return rows.map(toVaccineScheduleItem);
  },

  async listDoses(hh, memberId) {
    const [names, rows] = await Promise.all([
      scheduleNames(),
      unwrap<ChildVaccineDoseRow[]>(
        supabase
          .from('child_vaccine_doses')
          .select('*')
          .eq('household_id', hh)
          .eq('member_id', memberId)
          .is('deleted_at', null)
          // `nullsFirst: false` — mũi ngoài lịch chưa hẹn ngày xuống cuối, chứ
          // không chen lên đầu trước những mũi có hạn thật.
          .order('due_date', { ascending: true, nullsFirst: false }),
      ),
    ]);
    return rows.map((r) => toChildVaccineDose(r, names));
  },

  async listUpcomingDoses(hh, today, leadDays) {
    const horizon = new Date(`${today}T00:00:00Z`);
    horizon.setUTCDate(horizon.getUTCDate() + leadDays);
    const until = horizon.toISOString().slice(0, 10);

    const [names, rows] = await Promise.all([
      scheduleNames(),
      unwrap<ChildVaccineDoseRow[]>(
        supabase
          .from('child_vaccine_doses')
          .select('*')
          .eq('household_id', hh)
          .is('deleted_at', null)
          .neq('status', 'done')
          // KHÔNG có cận dưới: mũi quá lịch từ tháng trước vẫn phải hiện. Một
          // mũi trôi qua rồi biến mất khỏi màn hình là kiểu hỏng tệ nhất ở đây.
          .lte('due_date', until)
          .order('due_date', { ascending: true }),
      ),
    ]);
    return rows.map((r) => toChildVaccineDose(r, names));
  },

  async seedSchedule(hh, memberId, doses) {
    if (doses.length === 0) return;
    await unwrapVoid(
      supabase.from('child_vaccine_doses').upsert(
        doses.map((d) => ({ household_id: hh, member_id: memberId, ...doseRow(d) })),
        {
          onConflict: 'member_id,schedule_code',
          // GIỮ NGUYÊN hàng đã có. Chạy lại khi lịch lên phiên bản mới không
          // được phép xoá mất chuyện một đứa trẻ đã tiêm gì, ngày nào, ở đâu.
          ignoreDuplicates: true,
        },
      ),
    );
  },

  async addDose(hh, memberId, input) {
    const names = await scheduleNames();
    const row = await unwrap<ChildVaccineDoseRow>(
      supabase
        .from('child_vaccine_doses')
        .insert({ household_id: hh, member_id: memberId, ...doseRow(input) })
        .select()
        .single(),
    );
    return toChildVaccineDose(row, names);
  },

  async markDoseDone(hh, id, administeredOn, facility) {
    await unwrapVoid(
      supabase
        .from('child_vaccine_doses')
        .update({
          status: 'done',
          // Constraint `dose_done_has_date` ở DB đòi cột này khi status='done'.
          administered_on: administeredOn,
          ...(facility === undefined ? {} : { facility }),
        })
        .eq('id', id)
        .eq('household_id', hh),
    );
  },

  async undoDose(hh, id) {
    await unwrapVoid(
      supabase
        .from('child_vaccine_doses')
        .update({
          // Về 'planned' chứ không 'overdue': trạng thái quá lịch là thứ tính
          // ra từ ngày (doseStatus), không phải thứ ghi xuống. Ghi 'overdue' ở
          // đây thì một mũi có hạn tuần sau sẽ hiện là đã trễ.
          status: 'planned',
          administered_on: null,
        })
        .eq('id', id)
        .eq('household_id', hh),
    );
  },

  async softDeleteDose(hh, id) {
    await unwrapVoid(
      supabase
        .from('child_vaccine_doses')
        .update({ deleted_at: new Date().toISOString() })
        .eq('id', id)
        .eq('household_id', hh),
    );
  },

  // --- Chiều cao cân nặng ---

  async listGrowth(hh, memberId) {
    const rows = await unwrap<ChildGrowthRecordRow[]>(
      supabase
        .from('child_growth_records')
        .select('*')
        .eq('household_id', hh)
        .eq('member_id', memberId)
        .is('deleted_at', null)
        // Cũ → mới: màn hình vẽ theo trục thời gian, và đảo ở client mỗi lần
        // render là việc thừa.
        .order('measured_on', { ascending: true }),
    );
    return rows.map(toGrowthRecord);
  },

  async addGrowth(hh, memberId, input) {
    const createdBy = await currentProfileId();
    const row = await unwrap<ChildGrowthRecordRow>(
      supabase
        .from('child_growth_records')
        .insert({
          household_id: hh,
          member_id: memberId,
          measured_on: input.measuredOn,
          height_cm: input.heightCm ?? null,
          weight_kg: input.weightKg ?? null,
          notes: input.notes ?? null,
          created_by: createdBy,
        })
        .select()
        .single(),
    );
    return toGrowthRecord(row);
  },

  async softDeleteGrowth(hh, id) {
    await unwrapVoid(
      supabase
        .from('child_growth_records')
        .update({ deleted_at: new Date().toISOString() })
        .eq('id', id)
        .eq('household_id', hh),
    );
  },

  async updateChildInfo(hh, memberId, input) {
    await unwrapVoid(
      supabase
        .from('members')
        .update({
          ...(input.birthday === undefined ? {} : { birthday: input.birthday }),
          ...(input.schoolName === undefined ? {} : { school_name: input.schoolName }),
          ...(input.schoolClass === undefined ? {} : { school_class: input.schoolClass }),
          ...(input.healthInsuranceNo === undefined
            ? {}
            : { health_insurance_no: input.healthInsuranceNo }),
        })
        .eq('id', memberId)
        .eq('household_id', hh),
    );
  },
};
