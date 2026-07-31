/**
 * Hook đọc/ghi Tài sản.
 *
 * KHÔNG optimistic cho tạo/sửa tài sản (01 §3). Lý do khác với việc nhà: một
 * con số tiền hiện ra rồi biến mất vì lỗi mạng làm người dùng nghi ngờ toàn bộ
 * phần còn lại. Ở đây thà đợi 300ms còn hơn hiện sai một khoảnh khắc.
 */

import type { ISODate, UUID } from '@family-organizer/domain';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { invalidateFinance } from '@/data/queries/invalidate';
import { queryKeys } from '@/data/queries/keys';
import { assetRepository, type AssetInput } from '@/features/asset/repository';
import { useHouseholdId } from '@/stores/session';

export function useAssets() {
  const hh = useHouseholdId();
  return useQuery({
    queryKey: queryKeys.assets.list(hh),
    queryFn: () => assetRepository.list(hh),
  });
}

/**
 * Một khoản.
 *
 * `id` nhận `null` được, và đó là ca thật chứ không phải phòng xa:
 * `(modals)/asset-form.tsx` dùng chung cho tạo mới lẫn sửa, nên lúc tạo mới nó
 * không có id nào để đưa. Không có `enabled` thì hook bắn một câu query với id
 * rỗng — Postgres từ chối vì không phải uuid hợp lệ, và màn hình tạo mới hiện
 * một lỗi cho thứ người dùng chưa hề làm.
 */
export function useAsset(id: UUID | null) {
  const hh = useHouseholdId();
  return useQuery({
    queryKey: queryKeys.assets.detail(hh, id ?? ('' as UUID)),
    queryFn: () => assetRepository.get(hh, id as UUID),
    enabled: id !== null,
  });
}

export function useCreateAsset() {
  const hh = useHouseholdId();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: AssetInput) => assetRepository.create(hh, input),
    onSuccess: () => invalidateFinance(qc, hh),
  });
}

export function useUpdateAsset() {
  const hh = useHouseholdId();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, patch }: { id: UUID; patch: Partial<AssetInput> }) =>
      assetRepository.update(hh, id, patch),
    onSuccess: () => invalidateFinance(qc, hh),
  });
}

/**
 * Cập nhật giá trị — qua RPC `update_asset_value`, KHÔNG phải `update()`.
 *
 * Hai lệnh ghi (assets + money_events) trong một transaction. Ghép từ client mà
 * mất mạng giữa chừng sẽ để lại lịch sử sai VĨNH VIỄN — money_events append-only,
 * không sửa được sau đó.
 */
export function useUpdateAssetValue() {
  const hh = useHouseholdId();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (v: { id: UUID; value: number; asOf: ISODate; note?: string }) =>
      assetRepository.updateValue(hh, v.id, v.value, v.asOf, v.note),
    onSuccess: () => invalidateFinance(qc, hh),
  });
}

export function useCloseAsset() {
  const hh = useHouseholdId();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: UUID) => assetRepository.close(hh, id),
    onSuccess: () => invalidateFinance(qc, hh),
  });
}

export function useDeleteAsset() {
  const hh = useHouseholdId();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: UUID) => assetRepository.softDelete(hh, id),
    onSuccess: () => invalidateFinance(qc, hh),
  });
}
