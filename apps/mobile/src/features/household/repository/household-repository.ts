/**
 * Hiện thực HouseholdRepository.
 *
 * Mọi truy vấn có .eq('household_id', hh) TƯỜNG MINH dù RLS đã chặn (01 §2).
 * RLS là lưới an toàn thứ hai, không phải tầng phân quyền duy nhất — nhờ vậy
 * query vẫn đúng nếu sau này chạy qua API server tự viết.
 */

import type { HomeFeedItem } from '@nhaminh/domain';

import { unwrap, unwrapMaybe } from '@/data/shared/errors';
import { toFinanceMetrics, toHomeFeedItem, toHousehold } from '@/data/shared/mappers';
import type {
  FinanceMetricsRow,
  HomeFeedRow,
  HouseholdRow,
} from '@/lib/database.types';
import { supabase } from '@/lib/supabase';
import type { HouseholdRepository } from './household-repository.interface';

export const householdRepository: HouseholdRepository = {
  async get(hh) {
    const row = await unwrapMaybe<HouseholdRow>(
      supabase.from('households').select('*').eq('id', hh).is('deleted_at', null).single(),
    );
    return row ? toHousehold(row) : null;
  },

  async update(hh, patch) {
    const row = await unwrap<HouseholdRow>(
      supabase
        .from('households')
        .update({
          ...(patch.name !== undefined ? { name: patch.name } : {}),
          ...(patch.snapshotIntervalDays !== undefined
            ? { snapshot_interval_days: patch.snapshotIntervalDays }
            : {}),
        })
        .eq('id', hh)
        .select()
        .single(),
    );
    return toHousehold(row);
  },

  async homeFeed(hh, from, to) {
    const rows = await unwrap<HomeFeedRow[]>(
      supabase
        .from('home_feed')
        .select('*')
        .eq('household_id', hh)
        .gte('on_date', from)
        .lte('on_date', to)
        .order('on_date', { ascending: true }),
    );
    return rows.map(toHomeFeedItem).filter((x): x is HomeFeedItem => x !== null);
  },

  async financeMetrics(hh) {
    const row = await unwrapMaybe<FinanceMetricsRow>(
      supabase.from('finance_metrics').select('*').eq('household_id', hh).single(),
    );
    return row ? toFinanceMetrics(row) : null;
  },
};
