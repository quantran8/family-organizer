/**
 * URL đọc có hạn cho file giấy tờ.
 *
 * Bucket R2 không công khai (xem Edge `sign-download`), nên mọi thumbnail và
 * mọi bản gốc đều phải ký trước khi hiện. Hook này gom cả màn hình vào MỘT lần
 * gọi.
 *
 * ── `staleTime` phải ngắn hơn TTL của chữ ký ──
 *
 * Edge ký 15 phút. `client.ts` đặt mặc định `staleTime 60s` / `gcTime 24h` /
 * persist 7 ngày — đúng cho dữ liệu, SAI hoàn toàn cho thứ này: một URL đã ký
 * nằm trong cache đĩa và được dùng lại sau một ngày là một URL chết, và màn
 * hình hiện đúng số ô ảnh, đúng bố cục, chỉ mọi ảnh đều vỡ. Không có lỗi nào để
 * nhìn thấy vì truy vấn đã "thành công".
 *
 * Nên: `staleTime` 10 phút (dưới 15), `gcTime` 15 phút, và **không persist**.
 */

import type { UUID } from '@family-organizer/domain';
import { useMutation, useQuery } from '@tanstack/react-query';

import { queryKeys } from '@/data/queries/keys';
import { documentRepository } from '@/features/document/repository';
import { useHouseholdId } from '@/stores/session';

/** Dưới TTL 15 phút của chữ ký, có biên an toàn cho một lần cuộn dài. */
const URL_STALE_MS = 10 * 60 * 1000;
const URL_GC_MS = 15 * 60 * 1000;

/**
 * Ký URL BẢN GỐC cho đúng một file, ngay lúc người dùng chạm vào nó.
 *
 * Tách khỏi `useFileUrls` vì nó là một hành động chứ không phải một truy vấn:
 * ký sẵn bản gốc cho cả lưới sẽ phá đúng ràng buộc "danh sách chỉ tải
 * thumbnail" (01 §6). `useMutation` là hình dạng đúng — nó chạy khi được gọi,
 * không chạy khi component render.
 */
export function useOpenFileUrl() {
  return useMutation({
    mutationFn: async (fileId: UUID): Promise<string | null> => {
      const urls = await documentRepository.signDownloads([fileId], 'original');
      return urls[fileId] ?? null;
    },
  });
}

export function useFileUrls(
  fileIds: UUID[],
  kind: 'thumb' | 'original' = 'thumb',
): Record<UUID, string> {
  const hh = useHouseholdId();
  // Sắp xếp để thứ tự file không làm sinh ra hai key cho cùng một tập ảnh.
  const ids = [...fileIds].sort();

  const { data } = useQuery({
    queryKey: queryKeys.documents.fileUrls(hh, kind, ids),
    queryFn: () => documentRepository.signDownloads(ids, kind),
    enabled: ids.length > 0,
    staleTime: URL_STALE_MS,
    gcTime: URL_GC_MS,
    /**
     * Chữ ký hết hạn trong lúc màn hình vẫn mở (người dùng để app đó rồi quay
     * lại): xin lại khi app trở lại foreground. Không có nó thì ảnh vỡ cho tới
     * khi người dùng tự kéo để làm mới.
     */
    refetchOnWindowFocus: true,
  });

  return data ?? {};
}
