/**
 * Thêm nhanh — 05 §5.1.
 *
 * G3 mới dựng khung: sheet mở ra, đóng lại được. Nội dung thật (một ô tên việc,
 * lưu xong đóng ngay) lên ở G4 cùng với tầng Việc.
 */

import { useRouter } from 'expo-router';
import { Text, View } from 'react-native';

import { Button, Screen } from '@/design/components';
import { useT } from '@/i18n';

export default function QuickAddScreen() {
  const { t } = useT();
  const router = useRouter();

  return (
    <Screen>
      <View className="flex-1 justify-center gap-6">
        <Text className="text-title2 font-semibold text-ink">{t.common.add}</Text>
        <Button label={t.common.close} variant="secondary" onPress={() => router.back()} />
      </View>
    </Screen>
  );
}
