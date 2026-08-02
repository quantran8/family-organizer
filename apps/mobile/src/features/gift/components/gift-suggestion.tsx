/**
 * Dòng gợi ý — TOÀN BỘ lý do module sổ hiếu hỉ tồn tại (07 §3.4).
 *
 *     Chú Ba đã mừng nhà mình
 *     2.000.000 ₫ — cưới, 3/2023
 *     [ Dùng số này ]
 *
 * Không có dòng này thì đây chỉ là một cái Excel có màu. Có nó thì app trả lời
 * được câu hỏi mà không ai trả lời được.
 *
 * ── BA ĐIỀU KHÔNG ĐƯỢC LÀM Ở ĐÂY ──
 *
 * 1. Không tự điền số vào ô nhập. Người dùng phải chạm "Dùng số này" — một con
 *    số tự nhảy vào ô tiền là app có ý kiến về chuyện nên đi bao nhiêu, và
 *    chuyện đó thuộc về hai vợ chồng.
 *
 * 2. Không hiện gì khi chưa từng nhận (`suggestGiftAmount` trả null). KHÔNG
 *    hiện "chưa có dữ liệu" — một dòng trống ở đây nhắc người dùng rằng app
 *    đang theo dõi ai đã mừng mình bao nhiêu, và đó là cảm giác sai cho một
 *    quyển sổ họ hàng.
 *
 * 3. Không hiện nút khi `amount === null` (khác dịp, tang lễ, hoặc quà hiện
 *    vật). Dữ kiện vẫn hiện — nhà đó đã mừng mình, và trạng thái đáp lễ — nhưng
 *    không có con số nào được đề xuất. Mức tiền gắn với DỊP, không gắn với NHÀ:
 *    hai triệu ở đám cưới không dịch được sang mừng tân gia, và đề xuất nó là
 *    app nói sai một cách tự tin (07 §3.4).
 */

import { Pressable, Text, View } from 'react-native';

import type { GiftSuggestion as Suggestion } from '@family-organizer/domain';
import { giftSuggestionText, useT } from '@/i18n';

export interface GiftSuggestionProps {
  contactName: string;
  /** Kết quả `suggestGiftAmount()`. null = KHÔNG RENDER GÌ CẢ. */
  suggestion: Suggestion | null;
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

  const { amount, status } = suggestion;
  const { line, basis } = giftSuggestionText(
    contactName,
    // Căn cứ luôn hiện số của bản ghi gốc; `amount` chỉ quyết định có NÚT hay
    // không. Giấu số của khoản đã nhận là giấu đúng dữ kiện người dùng cần.
    suggestion.basis.amount,
    suggestion.basis.occasion,
    suggestion.basis.occurredOn,
    currency,
  );

  return (
    <View className="mt-2 rounded-control bg-soft px-4 py-3">
      <Text className="text-caption text-muted">{line}</Text>
      <Text className="mt-1 text-body text-ink">{basis}</Text>

      {/* Trạng thái đáp lễ của khoản căn cứ — KHÔNG KÈM SỐ TIỀN. Phép thử ở
          07 §3.6: bỏ số tiền đi mà câu vẫn còn giá trị thì đó là nghĩa vụ, chứ
          không phải sổ nợ. */}
      {status === 'outstanding' ? (
        <Text className="mt-1 text-caption text-muted">{t.gift.outstanding}</Text>
      ) : null}

      {amount === null ? null : (
        <Pressable
          accessibilityRole="button"
          onPress={() => onUse(amount)}
          className="mt-3 min-h-touch justify-center self-start"
        >
          <Text className="text-label font-medium text-brand">{t.gift.suggestUse}</Text>
        </Pressable>
      )}
    </View>
  );
}
