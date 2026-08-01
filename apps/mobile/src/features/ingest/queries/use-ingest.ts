/**
 * Nhập nhanh bằng AI — 06 §6.
 *
 * KHÔNG optimistic ở bất kỳ mutation nào. `01 §3` chỉ cho optimistic với thao
 * tác MỘT CHẠM, và không có thao tác nào ở đây là một chạm: gửi ảnh phải chờ
 * model, còn xác nhận/bỏ nháp là những nút bấm sau khi đã đọc kết quả. Một bản
 * nháp hiện ra lạc quan rồi bị thay bằng nội dung khác khi server trả về là
 * đúng thứ tệ nhất có thể làm ở màn này — người dùng vừa đọc một ngày giỗ rồi
 * nó đổi số dưới tay họ.
 */

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { canUseCapture, captureQuotaFor, type CanUseCaptureResult, type UUID } from '@family-organizer/domain';

import { queryKeys } from '@/data/queries/keys';
import { useHousehold } from '@/features/household/queries/use-household';
import { ingestRepository, type SubmitCaptureInput } from '@/features/ingest/repository';
import { useHouseholdId } from '@/stores/session';

export function useIngestDraft(draftId: UUID | null) {
  const hh = useHouseholdId();
  return useQuery({
    queryKey: queryKeys.ingest.detail(hh, draftId ?? 'none'),
    queryFn: () => (draftId ? ingestRepository.get(hh, draftId) : null),
    enabled: draftId !== null,
    // Bản nháp KHÔNG đổi sau khi đã tạo — không có gì để refetch. Quan trọng
    // hơn: một refetch giữa chừng sẽ đổi nội dung form dưới tay người dùng
    // đang gõ, cùng lý do với `pendingCostAsk` ở G14.
    staleTime: Infinity,
  });
}

export function useCaptureUsage() {
  const hh = useHouseholdId();
  return useQuery({
    queryKey: queryKeys.ingest.quota(hh),
    queryFn: () => ingestRepository.usage(hh),
  });
}

/**
 * Còn dùng được không — kiểm ở client để NÓI SỚM, không phải để bảo vệ.
 *
 * Edge `parse-capture` chạy lại đúng `canUseCapture` này và nó mới là chỗ
 * quyết định. Cùng một hàm thuần ở hai runtime.
 */
export function useCanUseCapture(): CanUseCaptureResult | null {
  const { data: household } = useHousehold();
  const { data: usage } = useCaptureUsage();
  if (!household || usage === undefined) return null;
  return canUseCapture(household, usage.usedThisMonth);
}

/** Số lượt còn lại trong tháng — để nói cụ thể, không doạ (04 §8). */
export function useCapturesLeft(): number | null {
  const { data: household } = useHousehold();
  const { data: usage } = useCaptureUsage();
  if (!household || usage === undefined) return null;
  return Math.max(0, captureQuotaFor(household) - usage.usedThisMonth);
}

export function useSubmitCapture() {
  const hh = useHouseholdId();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: SubmitCaptureInput) => ingestRepository.submit(hh, input),
    onSuccess: (draft) => {
      qc.setQueryData(queryKeys.ingest.detail(hh, draft.id), draft);
      // Quota vừa tiêu một suất. Không invalidate thì dòng "còn 3 lượt" đứng
      // im cho tới lần mở app sau, và người dùng bị chặn ở một con số họ vừa
      // đọc thấy là còn.
      void qc.invalidateQueries({ queryKey: queryKeys.ingest.quota(hh) });
    },
  });
}

export function useDiscardDraft() {
  const hh = useHouseholdId();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: UUID) => ingestRepository.discard(hh, id),
    onSuccess: (_r, id) => {
      void qc.invalidateQueries({ queryKey: queryKeys.ingest.detail(hh, id) });
    },
  });
}

/**
 * Đánh dấu nháp đã dùng để tạo bản ghi thật.
 *
 * KHÔNG tạo bản ghi — chỗ gọi đã tạo qua repo của entity tương ứng rồi và
 * truyền `createdEntityId` vào đây. Xem lý do ở đầu `ingest-repository.interface`.
 */
export function useConfirmDraft() {
  const hh = useHouseholdId();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, createdEntityId }: { id: UUID; createdEntityId: UUID }) =>
      ingestRepository.confirm(hh, id, createdEntityId),
    onSuccess: (_r, { id }) => {
      void qc.invalidateQueries({ queryKey: queryKeys.ingest.detail(hh, id) });
    },
  });
}
