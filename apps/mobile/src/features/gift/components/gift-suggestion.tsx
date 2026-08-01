/**
 * Dòng gợi ý — TOÀN BỘ lý do module sổ mừng cưới tồn tại (07 §3.3).
 *
 *     Chú Ba đã mừng nhà mình
 *     2.000.000 ₫ — cưới, 3/2023
 *     [ Dùng số này ]
 *
 * Không có dòng này thì đây chỉ là một cái Excel có màu. Có nó thì app trả lời
 * được câu hỏi mà không ai trả lời được.
 *
 * ── HAI ĐIỀU KHÔNG ĐƯỢC LÀM Ở ĐÂY ──
 *
 * 1. Không tự điền số vào ô nhập. Người dùng phải chạm "Dùng số này" — một con
 *    số tự nhảy vào ô tiền là app có ý kiến về chuyện nên đi bao nhiêu, và
 *    chuyện đó thuộc về hai vợ chồng.
 *
 * 2. Không hiện gì khi chưa từng nhận (`suggestGiftAmount` trả null). KHÔNG
 *    hiện "chưa có dữ liệu" — một dòng trống ở đây nhắc người dùng rằng app
 *    đang theo dõi ai đã mừng mình bao nhiêu, và đó là cảm giác sai cho một
 *    quyển sổ họ hàng.
 */

import { Pressable, Text, View } from 'react-native';

import type { GiftEntry } from '@family-organizer/domain';
import { giftSuggestionText, useT } from '@/i18n';

export interface GiftSuggestionProps {
  contactName: string;
  /** Kết quả `suggestGiftAmount()`. null = KHÔNG RENDER GÌ CẢ. */
  suggestion: { amount: number; basis: GiftEntry } | null;
  currency: string;
  onUse: (amount: number) => void;
}

export function GiftSuggestion({
  contactName,
  suggestion,
  currency,
  onUse,
}: GiftSuggestionProps) {
  const { t } = useT();
  if (suggestion === null) return null;

  const { line, basis } = giftSuggestionText(
    contactName,
    suggestion.amount,
    suggestion.basis.occasion,
    suggestion.basis.occurredOn,
    currency,
  );

  return (
    <View className="mt-2 rounded-control bg-soft px-4 py-3">
      <Text className="text-caption text-muted">{line}</Text>
      <Text className="mt-1 text-body text-ink">{basis}</Text>

      <Pressable
        accessibilityRole="button"
        onPress={() => onUse(suggestion.amount)}
        className="mt-3 min-h-touch justify-center self-start"
      >
        <Text className="text-label font-medium text-brand">{t.gift.suggestUse}</Text>
      </Pressable>
    </View>
  );
}
