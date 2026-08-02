/**
 * QueryClient + persist — 01 §3.
 *
 * Mặc định ở đây được chọn cho một app mà hai người dùng chung dữ liệu và mở ra
 * vài lần mỗi ngày, không phải cho một dashboard thời gian thực.
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import { createAsyncStoragePersister } from '@tanstack/query-async-storage-persister';
import { QueryClient } from '@tanstack/react-query';

import { EPHEMERAL_KEY_SEGMENT } from '@/data/queries/keys';
import { isAuthError } from '@/data/shared/errors';

/** Dữ liệu gia đình không đổi từng giây. Một phút là đủ tươi. */
const STALE_TIME = 60_000;
/** Giữ trong bộ nhớ một ngày: mở lại app buổi tối vẫn thấy ngay dữ liệu sáng. */
const GC_TIME = 24 * 60 * 60 * 1000;
/** Cache trên đĩa 7 ngày — đủ để mở app sau một tuần vẫn có gì đó để nhìn. */
const PERSIST_MAX_AGE = 7 * 24 * 60 * 60 * 1000;

export function createQueryClient(): QueryClient {
  return new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: STALE_TIME,
        gcTime: GC_TIME,
        /**
         * KHÔNG retry lỗi auth: phiên hết hạn thì thử lại 3 lần cũng hỏng, chỉ
         * làm người dùng chờ thêm vài giây trước khi thấy màn đăng nhập.
         */
        retry: (count, error) => !isAuthError(error) && count < 3,
        retryDelay: (attempt) => Math.min(1000 * 2 ** attempt, 30_000),
        /**
         * Mở lại app → refetch. Người kia có thể vừa sửa gì đó trong lúc mình
         * để máy trong túi; đây chính là lúc dữ liệu dễ cũ nhất.
         */
        refetchOnReconnect: true,
        refetchOnWindowFocus: false,
      },
      mutations: {
        /**
         * Mutation KHÔNG tự retry. Ghi trùng còn tệ hơn ghi hụt — hai lần
         * `settle_payment` là dư nợ giảm hai lần. Thao tác lỗi do mất mạng đi
         * vào hàng đợi ở `stores/mutationQueue`, nơi có kiểm trùng.
         */
        retry: false,
      },
    },
  });
}

export const queryPersister = createAsyncStoragePersister({
  storage: AsyncStorage,
  key: 'family-organizer.query-cache',
  throttleTime: 2_000,
});

export const persistOptions = {
  persister: queryPersister,
  maxAge: PERSIST_MAX_AGE,
  /**
   * Đổi khi hình dạng dữ liệu cache đổi. Cache cũ không khớp type mới sẽ render
   * ra màn hình vỡ trước khi refetch kịp — tăng số này là cách rẻ nhất để vứt
   * nó đi.
   */
  buster: 'v2',
  dehydrateOptions: {
    /**
     * Hai điều kiện, cả hai đều bắt buộc.
     *
     * 1. CHỈ persist query đã thành công. Query lỗi hoặc đang chạy mà ghi xuống
     *    đĩa thì lần mở sau sẽ khôi phục lại đúng trạng thái lỗi đó, và người
     *    dùng thấy màn lỗi trước cả khi có cơ hội thử lại.
     *
     * 2. KHÔNG persist URL đã ký (`documents.fileUrls`). Chữ ký R2 sống 15
     *    phút, cache đĩa sống 7 ngày — khôi phục nó nghĩa là một màn hình đầy
     *    ảnh vỡ mà truy vấn vẫn báo "thành công", nên không có gì kích hoạt việc
     *    tải lại. Đây là lý do key đó mang sẵn một đoạn để nhận ra ở đây.
     */
    shouldDehydrateQuery: (query: { state: { status: string }; queryKey: readonly unknown[] }) =>
      query.state.status === 'success' &&
      !query.queryKey.includes(EPHEMERAL_KEY_SEGMENT),
  },
} as const;
