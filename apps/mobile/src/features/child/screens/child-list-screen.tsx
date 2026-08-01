/**
 * Danh sách con — cửa vào hồ sơ từng bé (07 §4.5).
 *
 * KHÔNG BAO GIỜ đặt hai con cạnh nhau để đối chiếu (07 §4.6). Mỗi bé là một
 * dòng dẫn sang hồ sơ riêng, và dòng đó chỉ có tên với tuổi — không có số mũi
 * đã tiêm, không có chiều cao, không có gì để so.
 *
 * Cám dỗ ở đây là hiện "12/15 mũi" cho mỗi bé, vì dữ liệu có sẵn và trông có
 * ích. Nhưng đặt hai tỉ lệ đó cạnh nhau là tạo ra một bảng so sánh giữa hai đứa
 * trẻ trong cùng một nhà, và đó là thứ tệ hơn nhiều so với vài giây tiết kiệm
 * được.
 */

import { useRouter } from 'expo-router';
import { ScrollView, View } from 'react-native';

import { EmptyState, ListSkeleton, NavRow } from '@/design/components';
import { useMembers } from '@/features/member/queries/use-members';
import { childAgeText, useT } from '@/i18n';
import { useToday } from '@/lib/use-today';

export function ChildListScreen() {
  const { t } = useT();
  const router = useRouter();
  const today = useToday();

  const { data: members, isPending } = useMembers();
  const children = (members ?? []).filter((m) => m.role === 'child');

  return (
    <ScrollView
      className="flex-1"
      contentContainerClassName="px-4 pb-24 pt-4"
      showsVerticalScrollIndicator={false}
    >
      {isPending ? <ListSkeleton rows={3} /> : null}

      {children.map((c, i) => (
        <NavRow
          key={c.id}
          label={c.displayName}
          // Tuổi thôi. Không có số mũi, không có chiều cao — không có gì để so.
          value={c.birthday ? childAgeText(c.birthday, today) : null}
          last={i === children.length - 1}
          onPress={() => router.push(`/(app)/child/${c.id}`)}
        />
      ))}

      {!isPending && children.length === 0 ? (
        <View className="mt-10">
          <EmptyState title={t.child.listEmptyTitle} body={t.child.listEmptyBody} />
        </View>
      ) : null}
    </ScrollView>
  );
}
