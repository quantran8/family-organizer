/**
 * Nhà mình — 05 §4.
 *
 * Trạng thái rỗng KHÔNG ép nhập dữ liệu ban đầu. Không có màn "hãy thêm 3 tài
 * sản để bắt đầu": app phải dùng được ngay cả khi chưa có gì, và giá trị đầu
 * tiên phải đến trước khi đòi hỏi đầu tiên.
 *
 * G3 dừng ở đây — trạng thái rỗng + FAB. Nội dung thật (home_feed, thẻ trạng
 * thái tài chính, nhóm HÔM NAY/CUỐI TUẦN/CẦN CHÚ Ý) lên ở G4 khi đã có việc để
 * hiển thị.
 */

import { useRouter } from 'expo-router';
import { Text, View } from 'react-native';

import { EmptyState, FAB, Screen } from '@/design/components';
import { useT } from '@/i18n';
import { useSessionStore } from '@/stores/session';

export default function HomeScreen() {
  const { t } = useT();
  const router = useRouter();
  const householdName = useSessionStore((s) => s.householdName);

  return (
    <Screen>
      <View className="flex-row items-center justify-between pt-2">
        <Text className="text-title1 font-semibold text-ink">
          {householdName || t.app.name}
        </Text>
      </View>

      <View className="flex-1 justify-center">
        <EmptyState
          title={t.home.emptyTitle}
          body={t.home.emptyBody}
          actionLabel={t.home.emptyAddTask}
          onAction={() => router.push('/(modals)/quick-add')}
        />
      </View>

      <FAB onPress={() => router.push('/(modals)/quick-add')} />
    </Screen>
  );
}
