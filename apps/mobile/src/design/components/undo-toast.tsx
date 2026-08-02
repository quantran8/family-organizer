/**
 * Thanh hoàn tác — 05 §5.1 ("xoá có hoàn tác 5 giây").
 *
 * Vì sao hoàn tác thay vì hộp xác nhận: xoá một việc nhà là thao tác thường
 * xuyên và gần như luôn đúng ý. Hỏi lại mỗi lần là bắt trả giá cho một sai lầm
 * hiếm; hoàn tác chỉ bắt trả giá khi sai lầm thật sự xảy ra.
 *
 * Việc XOÁ THẬT hoãn tới khi hết 5 giây, không phải xoá ngay rồi khôi phục —
 * khôi phục cần một API tạo-lại-với-cùng-id mà repository không có, và ghi lại
 * một bản ghi mới sẽ làm mất mọi thứ đang trỏ tới nó.
 */

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Pressable, Text, View } from 'react-native';

import { useT } from '@/i18n';

/** Cửa sổ hoàn tác. 5 giây theo 05 §5.1. */
const UNDO_MS = 5000;

export interface PendingUndo {
  /**
   * Id của bản ghi đang chờ xoá. Màn hình dùng nó để ẩn dòng NGAY, trước khi
   * lệnh xoá thật chạy — nếu dòng còn nằm đó thì "hoàn tác" không hoàn tác gì
   * người dùng nhìn thấy.
   */
  id: string;
  /** Câu đã dựng sẵn từ i18n, ví dụ "Đã xoá việc". */
  message: string;
  /** Chạy khi hết giờ mà không ai bấm hoàn tác. */
  onCommit: () => void;
  /** Chạy khi bấm hoàn tác. Tuỳ chọn: phần lớn ca chỉ cần bỏ qua commit. */
  onUndo?: () => void;
}

/**
 * Quản lý một hành động đang chờ. Chỉ giữ MỘT — hai thanh hoàn tác chồng nhau
 * thì không ai biết nút đang hoàn tác cái nào. Đặt cái mới thì cái cũ commit ngay.
 */
export function useUndo(): {
  pending: PendingUndo | null;
  /** Id đang bị ẩn khỏi danh sách. Rỗng khi không có gì chờ. */
  pendingIds: Set<string>;
  schedule: (u: PendingUndo) => void;
  undo: () => void;
} {
  const [pending, setPending] = useState<PendingUndo | null>(null);
  // Giữ trong ref để bộ đếm giờ đọc được giá trị mới nhất mà không phải đặt lại.
  const pendingRef = useRef<PendingUndo | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  // Sau khi component gỡ, `setPending` là no-op nhưng `onCommit` thì vẫn PHẢI
  // chạy — cờ này tách hai việc đó ra.
  const mounted = useRef(true);

  const clearTimer = useCallback((): void => {
    if (timer.current !== null) {
      clearTimeout(timer.current);
      timer.current = null;
    }
  }, []);

  const commitNow = useCallback((): void => {
    clearTimer();
    pendingRef.current?.onCommit();
    pendingRef.current = null;
    if (mounted.current) setPending(null);
  }, [clearTimer]);

  const schedule = useCallback(
    (u: PendingUndo): void => {
      // Cái cũ chưa commit thì commit luôn — người dùng đã bỏ qua cửa sổ của nó.
      if (pendingRef.current) commitNow();
      pendingRef.current = u;
      setPending(u);
      timer.current = setTimeout(commitNow, UNDO_MS);
    },
    [commitNow],
  );

  const undo = useCallback((): void => {
    clearTimer();
    pendingRef.current?.onUndo?.();
    pendingRef.current = null;
    setPending(null);
  }, [clearTimer]);

  // Rời màn hình trong lúc chờ: commit, không im lặng bỏ. Người dùng đã thấy
  // dòng đó biến mất và không bấm hoàn tác — bỏ commit sẽ làm nó hiện lại.
  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
      commitNow();
    };
  }, [commitNow]);

  // Tạo Set mới mỗi lần `pending` đổi là đủ: nó chỉ có 0 hoặc 1 phần tử, và
  // `pending` chỉ đổi hai lần cho mỗi lần xoá.
  const pendingIds = useMemo(
    () => (pending ? new Set([pending.id]) : new Set<string>()),
    [pending],
  );

  return { pending, pendingIds, schedule, undo };
}

export interface UndoToastProps {
  pending: PendingUndo | null;
  onUndo: () => void;
}

export function UndoToast({ pending, onUndo }: UndoToastProps) {
  const { t } = useT();
  if (!pending) return null;

  return (
    <View className="absolute inset-x-4 bottom-6 flex-row items-center justify-between rounded-control bg-ink px-4 py-3">
      <Text className="flex-1 text-label text-on-action">{pending.message}</Text>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={t.common.undo}
        hitSlop={10}
        onPress={onUndo}
        className="min-h-touch justify-center pl-4"
      >
        <Text className="text-label font-semibold text-on-action">{t.common.undo}</Text>
      </Pressable>
    </View>
  );
}
