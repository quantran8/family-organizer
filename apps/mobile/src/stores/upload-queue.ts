/**
 * Hàng đợi upload — persist, chạy nền, rời màn hình được (01 §6).
 *
 * Tình huống thật phải chịu được, trích thẳng từ 01 §6:
 *
 *   *chụp 8 ảnh hồ sơ rồi khoá máy đi làm việc khác.*
 *
 * Câu đó quyết định gần như mọi lựa chọn trong file này. Nó nghĩa là: upload
 * không được gắn vào vòng đời của một component, trạng thái phải sống qua một
 * lần process bị giết, và một file hỏng giữa chừng không được kéo bảy file kia
 * theo.
 *
 * ── Vì sao là store chứ không phải mutation của TanStack Query ──
 *
 * Mutation gắn với component gọi nó: rời màn hình chi tiết là mutation bị huỷ.
 * `client.ts` cũng cố ý đặt **mutation không tự retry** (ghi trùng tệ hơn ghi
 * hụt) — đúng cho một lệnh ghi DB, nhưng sai cho upload: một file lên dở dang
 * PHẢI thử lại được, và thử lại không tạo bản ghi trùng vì hàng
 * `document_files` đã có sẵn từ pha 1.
 *
 * ── Vì sao persist ──
 *
 * `UploadTask` với `sessionType: 'background'` giao việc cho hệ điều hành, và
 * nó chạy tiếp khi app bị treo. Nhưng Expo nói rõ: JS instance KHÔNG sống lại
 * nếu app bị giết hẳn, nên promise ở `putToSignedUrl` có thể không bao giờ
 * resolve dù file đã lên tới nơi. Trạng thái nằm trên đĩa là cách duy nhất để
 * lần mở app sau biết còn việc gì dang dở.
 *
 * Chính vì vậy pha 3 (`confirm-upload`) mới là chỗ chốt sự thật: nó HEAD lên R2
 * để hỏi file có thật ở đó không, thay vì tin một trạng thái trong RAM đã mất.
 * Một mục ở trạng thái `uploaded` sau khi app khởi động lại được confirm lại —
 * và Edge trả về `alreadyConfirmed` chứ không phải lỗi.
 *
 * ── Vì sao KHÔNG persist `uploadUrl` ──
 *
 * URL đã ký sống 5 phút. Lưu nó xuống đĩa rồi dùng lại sau khi mở app hôm sau
 * là dùng một chữ ký đã chết, và R2 trả 403 — một lỗi trông như lỗi quyền chứ
 * không như lỗi hết hạn. Mỗi lần chạy lại xin chữ ký mới; nó rẻ, và pha 1 là
 * pha duy nhất không tốn băng thông.
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import type { UUID } from '@family-organizer/domain';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

import { documentRepository } from '@/features/document/repository';
import { prepareForUpload } from '@/lib/upload/prepare';
import { putToSignedUrl } from '@/lib/upload/put';

export type UploadStatus =
  /** Đã chọn file, chưa làm gì. */
  | 'queued'
  /** Đang nén / đang PUT. */
  | 'uploading'
  /** Đã lên R2, chờ pha 3. Trạng thái này sống qua một lần app bị giết. */
  | 'uploaded'
  | 'done'
  | 'failed';

export interface UploadItem {
  /** Id cục bộ — không phải `document_files.id`, thứ chỉ có sau pha 1. */
  id: string;
  documentId: UUID;
  /** URI gốc trên máy, trước khi nén. */
  uri: string;
  filename: string;
  mime: string;
  pageOrder: number;
  status: UploadStatus;
  /** 0–1, chỉ có nghĩa khi `uploading`. Không persist ý nghĩa gì sau restart. */
  progress: number;
  /** Có sau pha 1. Cần cho pha 3 khi chạy lại. */
  documentFileId: UUID | null;
  /** `kind` của AppError hoặc chuỗi lỗi từ Edge — để hiện đúng câu. */
  errorKind: string | null;
  /**
   * Số lần đã thử. Dùng để dừng vòng lặp tự chạy lại, KHÔNG dùng để cấm người
   * dùng bấm Thử lại: họ có thể vừa đổi sang wifi.
   */
  attempts: number;
}

/** Quá số này thì thôi tự chạy lại; nút Thử lại vẫn bấm được. */
const MAX_AUTO_ATTEMPTS = 3;

interface UploadQueueState {
  items: UploadItem[];
  /** Chặn hai vòng chạy chồng nhau. Không persist — luôn false lúc khởi động. */
  isRunning: boolean;

  enqueue: (
    documentId: UUID,
    files: { uri: string; filename: string; mime: string }[],
    startPageOrder: number,
  ) => void;
  remove: (id: string) => void;
  retry: (id: string) => void;
  /** Dọn những mục đã xong — gọi khi rời màn hình chi tiết. */
  clearDone: (documentId?: UUID) => void;
  run: () => Promise<void>;
}

let nextLocalId = 0;
/**
 * Id cục bộ không đi qua mạng và không cần chống trùng toàn cục — nhưng nó PHẢI
 * ổn định qua một lần persist, nếu không hai mục khôi phục từ đĩa có thể trùng
 * id với một mục vừa thêm. Ghép mốc thời gian với một bộ đếm là đủ.
 */
function localId(): string {
  nextLocalId += 1;
  return `u${Date.now().toString(36)}-${nextLocalId}`;
}

export const useUploadQueue = create<UploadQueueState>()(
  persist(
    (set, get) => ({
      items: [],
      isRunning: false,

      enqueue: (documentId, files, startPageOrder) => {
        const added: UploadItem[] = files.map((f, i) => ({
          id: localId(),
          documentId,
          uri: f.uri,
          filename: f.filename,
          mime: f.mime,
          pageOrder: startPageOrder + i,
          status: 'queued',
          progress: 0,
          documentFileId: null,
          errorKind: null,
          attempts: 0,
        }));
        set((s) => ({ items: [...s.items, ...added] }));
        void get().run();
      },

      remove: (id) => set((s) => ({ items: s.items.filter((x) => x.id !== id) })),

      retry: (id) => {
        set((s) => ({
          items: s.items.map((x) =>
            // `attempts` về 0: người dùng bấm Thử lại thường vì vừa đổi mạng,
            // nên vòng tự chạy lại xứng đáng có đủ lượt từ đầu.
            x.id === id ? { ...x, status: 'queued', errorKind: null, attempts: 0 } : x,
          ),
        }));
        void get().run();
      },

      clearDone: (documentId) =>
        set((s) => ({
          items: s.items.filter(
            (x) => x.status !== 'done' || (documentId !== undefined && x.documentId !== documentId),
          ),
        })),

      /**
       * Chạy tuần tự, MỘT file một lúc.
       *
       * Không chạy song song có chủ ý: tám ảnh cùng lúc trên 3G làm mọi file
       * chậm đi và không file nào xong sớm, còn thanh tiến trình thì nhảy loạn.
       * Tuần tự cho ra "3/8" tăng đều — thứ đọc được từ xa, đúng thứ cần khi
       * người dùng đã rời màn hình.
       */
      run: async () => {
        if (get().isRunning) return;
        set({ isRunning: true });

        try {
          for (;;) {
            const next = get().items.find(
              (x) =>
                (x.status === 'queued' || x.status === 'uploaded') &&
                x.attempts < MAX_AUTO_ATTEMPTS,
            );
            if (!next) break;

            const patch = (p: Partial<UploadItem>): void => {
              set((s) => ({
                items: s.items.map((x) => (x.id === next.id ? { ...x, ...p } : x)),
              }));
            };

            patch({ status: 'uploading', attempts: next.attempts + 1, errorKind: null });

            try {
              // Mục `uploaded` khôi phục từ đĩa: file đã lên R2 ở lần chạy
              // trước, chỉ còn thiếu pha 3. Bỏ qua nén và PUT — làm lại sẽ tốn
              // băng thông cho một thứ đã có ở đó.
              if (next.status === 'uploaded' && next.documentFileId) {
                await documentRepository.confirmUpload(next.documentFileId);
                patch({ status: 'done', progress: 1 });
                continue;
              }

              // ── Pha 0: nén + thumbnail ──
              const prepared = await prepareForUpload(next.uri, next.filename, next.mime);

              // ── Pha 1: xin chữ ký (server kiểm premium + quota) ──
              const presign = await documentRepository.presignUpload({
                documentId: next.documentId,
                filename: prepared.filename,
                mime: prepared.mime,
                sizeBytes: prepared.sizeBytes,
                pageOrder: next.pageOrder,
                withThumb: prepared.thumbUri !== null,
                thumbSizeBytes: prepared.thumbSizeBytes,
              });
              patch({ documentFileId: presign.documentFileId });

              // ── Pha 2: PUT thẳng lên R2 ──
              const put = await putToSignedUrl(
                prepared.uri,
                presign.uploadUrl,
                prepared.mime,
                (fraction) => patch({ progress: fraction }),
              );
              if (!put.ok) throw new Error(`r2_put_${put.status}`);

              // Thumbnail hỏng KHÔNG làm file trượt: bản gốc mới là thứ cần
              // giữ, và `confirm-upload` tự xoá `thumb_key` khi HEAD không thấy.
              if (prepared.thumbUri && presign.thumbUploadUrl) {
                await putToSignedUrl(
                  prepared.thumbUri,
                  presign.thumbUploadUrl,
                  'image/jpeg',
                ).catch(() => undefined);
              }

              // Ghi `uploaded` TRƯỚC pha 3: app bị giết đúng lúc này thì lần mở
              // sau chỉ phải gọi confirm, không phải tải lại cả file.
              patch({ status: 'uploaded', progress: 1 });

              // ── Pha 3: xác nhận ──
              await documentRepository.confirmUpload(presign.documentFileId);
              patch({ status: 'done' });
            } catch (e) {
              patch({ status: 'failed', errorKind: errorKindOf(e) });
            }
          }
        } finally {
          set({ isRunning: false });
        }
      },
    }),
    {
      name: 'family-organizer.upload-queue',
      storage: createJSONStorage(() => AsyncStorage),
      /**
       * `isRunning` KHÔNG persist: nó khôi phục thành `true` sau một lần app bị
       * giết giữa chừng và `run()` sẽ thoát ngay ở dòng đầu — hàng đợi đứng im
       * vĩnh viễn mà không có lỗi nào để nhìn thấy.
       */
      partialize: (s) => ({ items: s.items }),
      onRehydrateStorage: () => (state) => {
        if (!state) return;
        // File đang dở lúc app bị giết: `uploading` là trạng thái của một tiến
        // trình không còn tồn tại. Đẩy về `queued` để vòng chạy nhặt lại. Mục
        // `uploaded` giữ nguyên — nó chỉ còn thiếu pha 3.
        state.items = state.items.map((x) =>
          x.status === 'uploading' ? { ...x, status: 'queued', progress: 0, attempts: 0 } : x,
        );
      },
    },
  ),
);

function errorKindOf(e: unknown): string {
  if (typeof e === 'object' && e !== null && 'error' in e) {
    const inner = (e as { error?: { kind?: string } }).error;
    if (inner?.kind) return inner.kind;
  }
  if (e instanceof Error) return e.message;
  return 'unknown';
}

/** Mục của một giấy tờ, cho màn chi tiết. */
export function selectItemsFor(documentId: UUID) {
  return (s: UploadQueueState): UploadItem[] =>
    s.items.filter((x) => x.documentId === documentId);
}
