/**
 * Chỗ giữ chỗ cho tab — màn thật lên ở giai đoạn sau.
 * Có mặt từ G3 để tab bar điều hướng được và kiểm được luồng F1 đầu-cuối.
 */

import { Text, View } from 'react-native';

import { Screen } from '@/design/components';
import { useT } from '@/i18n';

export default function Screen_money() {
  const { t } = useT();
  return (
    <Screen>
      <View className="flex-1 items-center justify-center">
        <Text className="text-heading font-semibold text-ink">{t.tabs.money}</Text>
      </View>
    </Screen>
  );
}
