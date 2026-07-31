/**
 * Cầu nối giữa hàng đợi upload và cache đọc.
 *
 * Store `stores/upload-queue` cố ý KHÔNG biết gì về TanStack Query: nó chạy
 * ngoài mọi component (đó là điều kiện để upload sống sót khi rời màn hình), và
 * `QueryClient` thì nằm trong cây React. Nối hai thứ đó bằng cách để store gọi
 * thẳng `queryClient` sẽ tạo một tham chiếu toàn cục tới một thứ có vòng đời
 * gắn với provider — và nó sẽ trỏ vào một client đã chết sau khi đăng xuất.
 *
 * Thay vào đó: hook này ĐỌC trạng thái hàng đợi và invalidate khi số mục `done`
 * tăng lên. Hướng phụ thuộc đi từ React sang store, không ngược lại.
 */

import type { UUID } from '@family-organizer/domain';
import { useQueryClient } from '@tanstack/react-query';
import { useEffect, useRef } from 'react';

import { queryKeys } from '@/data/queries/keys';
import { useHouseholdId } from '@/stores/session';
import { selectItemsFor, useUploadQueue, type UploadItem } from '@/stores/upload-queue';

/**
 * Hàng đợi của một giấy tờ + tự làm mới khi có file xong.
 *
 * Invalidate theo SỐ mục `done` chứ không theo từng thay đổi của mảng: mỗi bước
 * tiến trình cũng làm mảng đổi tham chiếu, và invalidate ở mỗi phần trăm sẽ bắn
 * hàng chục truy vấn cho một lần tải file.
 */
export function useDocumentUploads(documentId: UUID): {
  items: UploadItem[];
  uploading: number;
  failed: number;
  total: number;
} {
  const qc = useQueryClient();
  const hh = useHouseholdId();
  const items = useUploadQueue(selectItemsFor(documentId));

  const doneCount = items.filter((x) => x.status === 'done').length;
  const seenDone = useRef(doneCount);

  useEffect(() => {
    if (doneCount === seenDone.current) return;
    seenDone.current = doneCount;
    void qc.invalidateQueries({ queryKey: queryKeys.documents.detail(hh, documentId) });
    void qc.invalidateQueries({ queryKey: queryKeys.documents.all(hh) });
  }, [doneCount, qc, hh, documentId]);

  return {
    items,
    uploading: items.filter((x) => x.status === 'uploading' || x.status === 'queued').length,
    failed: items.filter((x) => x.status === 'failed').length,
    total: items.length,
  };
}

/**
 * Chạy lại hàng đợi lúc app khởi động.
 *
 * Đặt ở `AuthGate` (sau khi đã có phiên) chứ không ở `_layout` gốc: pha 1 và
 * pha 3 đều cần JWT, và gọi chúng trước khi phiên khôi phục xong thì mọi mục
 * đang chờ lập tức `failed` với `kind: 'auth'` — người dùng mở app lên và thấy
 * tám file báo lỗi cho một việc chưa kịp bắt đầu.
 */
export function useResumeUploads(enabled: boolean): void {
  const run = useUploadQueue((s) => s.run);
  const started = useRef(false);

  useEffect(() => {
    if (!enabled || started.current) return;
    started.current = true;
    void run();
  }, [enabled, run]);
}
