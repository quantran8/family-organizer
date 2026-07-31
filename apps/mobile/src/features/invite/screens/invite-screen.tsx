/**
 * Mời người thứ hai — 05 §8, F2 (luồng SỐNG-CÒN).
 *
 * "Nếu người thứ hai không tham gia được thì mọi thứ xây thêm đều vô nghĩa"
 * (05 §9). Đó là lý do màn này lên ở bước 3, trước cả tính năng khác biệt nhất.
 *
 * Hai đường chia sẻ, cố ý cả hai:
 *   - **Share sheet hệ thống** — đường chính. Zalo là kênh thật của người Việt
 *     và nó nằm trong share sheet, nên không cần tích hợp SDK Zalo riêng.
 *   - **Sao chép mã** — đường lui khi hai người đang nói chuyện trực tiếp hoặc
 *     qua điện thoại. Mã bỏ `0 O 1 I` chính là để đọc qua điện thoại không nhầm.
 *
 * Mã hiện TO và giãn ký tự: nó tồn tại để được đọc to lên cho người khác nghe.
 */

import * as Clipboard from 'expo-clipboard';
import * as Haptics from 'expo-haptics';
import * as Linking from 'expo-linking';
import { useState } from 'react';
import { Pressable, Share, Text, View } from 'react-native';

import { Button, ErrorState, Screen, Skeleton } from '@/design/components';
import { useInviteCode } from '@/features/invite/queries/use-invite';
import { useT } from '@/i18n';
import { useSessionStore } from '@/stores/session';

export function InviteScreen() {
  const { t, f } = useT();
  const { data: code, isPending, isError, refetch } = useInviteCode();
  const householdName = useSessionStore((s) => s.householdName);
  const [copied, setCopied] = useState(false);

  if (isError) {
    return (
      <Screen>
        <ErrorState
          message={t.error.unknown}
          retryLabel={t.common.retry}
          onRetry={() => void refetch()}
        />
      </Screen>
    );
  }

  const copy = (): void => {
    if (!code) return;
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    void Clipboard.setStringAsync(code);
    setCopied(true);
    // Nhãn tự trở lại sau 2 giây. Một dòng "Đã sao chép" nằm mãi sẽ thành một
    // phần của giao diện và mất nghĩa ở lần sao chép sau.
    setTimeout(() => setCopied(false), 2000);
  };

  const share = (): void => {
    if (!code) return;
    // `Linking.createURL` dựng đúng scheme cho cả dev (exp://) lẫn bản đã build
    // (family://). Ghép chuỗi tay thì link chỉ chạy ở bản build và im lặng
    // không mở gì trong lúc phát triển.
    const url = Linking.createURL(`/join/${code}`);
    void Share.share({
      message: f(t.settings.inviteShareMessage, {
        household: householdName || t.app.name,
        code,
        url,
      }),
    });
  };

  return (
    <Screen scroll>
      <Text className="mt-2 text-body text-muted">{t.settings.inviteBody}</Text>

      <View className="my-8 items-center rounded-card border border-iris-100 bg-iris-50 py-8">
        {isPending || !code ? (
          <Skeleton className="h-10 w-48" />
        ) : (
          <Text
            // `selectable` để người dùng bôi đen chép tay được — có người sẽ
            // làm vậy trước khi tìm thấy nút Sao chép.
            selectable
            accessibilityLabel={code.split('').join(' ')}
            className="text-display font-semibold tracking-[8px] text-ink"
            style={{ fontVariant: ['tabular-nums'] }}
          >
            {code}
          </Text>
        )}
      </View>

      <View className="gap-3">
        <Button label={t.settings.inviteShare} disabled={!code} onPress={share} />
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={t.settings.inviteCopy}
          disabled={!code}
          onPress={copy}
          className="min-h-touch items-center justify-center"
        >
          <Text className="text-label font-medium text-iris-500">
            {copied ? t.settings.inviteCopied : t.settings.inviteCopy}
          </Text>
        </Pressable>
      </View>

      <Text className="mt-8 text-caption text-tertiary">{t.settings.inviteExpiry}</Text>
    </Screen>
  );
}
