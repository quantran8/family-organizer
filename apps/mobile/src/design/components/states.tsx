/**
 * `EmptyState` · `ErrorState` · `Skeleton` — 04 §6.
 *
 * Trạng thái rỗng KHÔNG phải lỗi và không được trông như lỗi. Nó là lời mời làm
 * một việc cụ thể: "Thêm một việc, một ngày giỗ, hay một khoản sắp phải trả —
 * thứ nào cũng được." (04 §8). Không dùng minh hoạ to, không "Chưa có dữ liệu".
 */

import type { ReactNode } from 'react';
import { Text, View } from 'react-native';

import { Button } from './button';

export interface EmptyStateProps {
  title: string;
  body?: string;
  actionLabel?: string;
  onAction?: () => void;
  icon?: ReactNode;
}

export function EmptyState({ title, body, actionLabel, onAction, icon }: EmptyStateProps) {
  return (
    <View className="items-center px-6 py-12">
      {icon ? <View className="mb-4">{icon}</View> : null}
      <Text className="text-center text-heading font-semibold text-ink">{title}</Text>
      {body ? (
        <Text className="mt-2 text-center text-body text-muted">{body}</Text>
      ) : null}
      {actionLabel && onAction ? (
        <View className="mt-6 w-full max-w-xs">
          <Button label={actionLabel} onPress={onAction} />
        </View>
      ) : null}
    </View>
  );
}

export interface ErrorStateProps {
  /** Câu đã dựng sẵn từ i18n theo `AppError.kind` — component không tự đoán. */
  message: string;
  retryLabel?: string;
  onRetry?: () => void;
}

export function ErrorState({ message, retryLabel, onRetry }: ErrorStateProps) {
  return (
    <View className="items-center px-6 py-12">
      <Text className="text-center text-body text-ink">{message}</Text>
      {retryLabel && onRetry ? (
        <View className="mt-5 w-full max-w-xs">
          <Button label={retryLabel} variant="secondary" onPress={onRetry} />
        </View>
      ) : null}
    </View>
  );
}

/**
 * Khối xám lúc chờ.
 *
 * Cố ý KHÔNG nhấp nháy (shimmer): dữ liệu gần như luôn có sẵn trong cache và
 * skeleton chỉ hiện vài trăm ms — một hiệu ứng chuyển động trong khoảng đó chỉ
 * làm màn hình giật.
 */
export function Skeleton({ className }: { className?: string }) {
  return <View className={['rounded-control bg-soft', className].filter(Boolean).join(' ')} />;
}

/** Skeleton hình một danh sách — dùng khi chưa có gì trong cache. */
export function ListSkeleton({ rows = 3 }: { rows?: number }) {
  return (
    <View className="gap-3 py-4">
      {Array.from({ length: rows }, (_, i) => (
        <View key={i} className="flex-row items-center gap-3">
          <Skeleton className="h-6 w-6 rounded-full" />
          <View className="flex-1 gap-2">
            <Skeleton className="h-4 w-3/5" />
            <Skeleton className="h-3 w-2/5" />
          </View>
        </View>
      ))}
    </View>
  );
}
