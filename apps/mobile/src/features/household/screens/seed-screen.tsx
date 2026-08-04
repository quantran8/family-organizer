/**
 * Gói khởi tạo — 05 §3.4, 06 §10.
 *
 * Danh sách tick, KHÔNG PHẢI FORM. Dưới 20 giây.
 *
 * Vì sao bước này tồn tại dù `05 §3.3` nói "không ép nhập dữ liệu ban đầu":
 * tick một danh sách gợi ý không phải nhập liệu. App phụ thuộc mật độ dữ liệu —
 * một household trống ngày đầu là một household chết, vì mọi màn hình đều trả
 * lời "chưa có gì" và người dùng không thấy được app làm gì cho mình.
 *
 * Mục cần ngày (giỗ, học phí, đăng kiểm…) được tạo ở trạng thái CHƯA CÓ NGÀY
 * và hiện trong CẦN CHÚ Ý cho tới khi được bổ sung. Hỏi ngày ngay tại đây sẽ
 * biến danh sách tick thành sáu form liên tiếp — đúng thứ mục này nói là không
 * phải.
 *
 * Người vào bằng MÃ MỜI không thấy màn này (05 §3.2): nhà đã có dữ liệu rồi,
 * và gợi ý thêm sáu sự kiện vào một nhà đang chạy là thêm việc dọn dẹp.
 */

import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Pressable, Text, View } from 'react-native';

import {
  buildStarterPack,
  defaultCheckedKeys,
  STARTER_PACK_ITEMS,
  type StarterPackKey,
} from '@family-organizer/domain';

import { Button, Checkbox, Screen } from '@/design/components';
import { useCreateEvent } from '@/features/event/queries/use-events';
import { useT } from '@/i18n';
import { todayInVN } from '@/lib/today';

export function SeedScreen() {
  const { t } = useT();
  const router = useRouter();
  const createEvent = useCreateEvent();
  const [selected, setSelected] = useState<Set<StarterPackKey>>(
    () => new Set(defaultCheckedKeys()),
  );
  const [saving, setSaving] = useState(false);

  const finish = () => router.replace('/(app)/(tabs)/home');

  const toggle = (key: StarterPackKey) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  const submit = async () => {
    const drafts = buildStarterPack([...selected], todayInVN());
    // Không tick gì mà bấm "Thêm vào" thì cứ đi tiếp, đừng bắt bấm nút kia:
    // hai nút này khác nhau ở ý định, không khác ở kết quả khi danh sách rỗng.
    if (drafts.length === 0) {
      finish();
      return;
    }

    setSaving(true);
    try {
      // Tuần tự, KHÔNG `Promise.all`: sáu lệnh insert song song vào cùng một
      // household làm invalidate của `useCreateEvent` chạy sáu lần chồng lên
      // nhau, và màn Nhà mình phía sau nháy sáu lượt. Sáu round-trip ở bước
      // onboarding là chấp nhận được — nó chạy đúng một lần trong đời một nhà.
      for (const d of drafts) {
        await createEvent.mutateAsync({
          title: d.title,
          kind: d.kind,
          side: null,
          location: null,
          notes: null,
          calendar: d.calendar,
          solarDate: d.solarDate,
          lunarDay: d.lunarDay,
          lunarMonth: d.lunarMonth,
          lunarLeapMonth: false,
          startTime: null,
          isAllDay: true,
          // CỐ Ý không lặp: "Tết Nguyên đán" thì đúng là hằng năm, nhưng đăng
          // kiểm xe thì tuỳ loại xe và bảo hiểm thì tuỳ hợp đồng. Đoán sai một
          // chu kỳ lặp tạo ra một lời nhắc sai mỗi năm, mà người dùng sẽ tắt
          // thông báo chứ không đi sửa. Người dùng bật lặp khi sửa sự kiện.
          recur: null,
          remindLeadDays: 3,
          // CỐ Ý không đặt nhắc chuẩn bị: cùng lý do với `recur` ở trên. Gói
          // khởi tạo không biết dịp nào cần chuẩn bị gì, và một việc "chuẩn bị
          // cho đăng kiểm xe" tự mọc ra trong danh sách của một nhà vừa mở app
          // lần đầu là thứ họ không xin. Người dùng bật khi sửa sự kiện.
          prepLeadDays: null,
          childMemberId: null,
          estimatedCost: null,
        });
      }
      finish();
    } catch {
      // Lỗi giữa chừng: vẫn đi tiếp. Đây là bước onboarding bỏ qua được, và
      // giữ người dùng lại ở một màn hình báo lỗi cho một danh sách gợi ý là
      // đổi một phiền toái nhỏ lấy một chỗ bỏ cuộc.
      finish();
    } finally {
      setSaving(false);
    }
  };

  return (
    <Screen scroll>
      <View className="flex-1 py-12">
        <Text className="text-title1 font-semibold text-ink">{t.seed.title}</Text>
        <Text className="mt-3 text-body text-subtle">{t.seed.body}</Text>

        <View className="mt-8 gap-1">
          {STARTER_PACK_ITEMS.map((item) => {
            const checked = selected.has(item.key);
            // Một câu chung cho mọi mục cần ngày, không phải sáu chuỗi gần
            // giống nhau: chúng nói đúng một chuyện, và sáu bản sao là sáu chỗ
            // để lệch nhau khi sửa câu chữ.
            const hint = item.needsDate ? t.seed.needsDateHint : null;
            return (
              <Pressable
                key={item.key}
                accessibilityRole="checkbox"
                accessibilityState={{ checked }}
                onPress={() => toggle(item.key)}
                className="min-h-touch flex-row items-center gap-3 py-2"
              >
                <Checkbox checked={checked} onToggle={() => toggle(item.key)} />
                <View className="flex-1">
                  <Text className="text-body text-ink">{t.seed[item.key]}</Text>
                  {hint ? <Text className="text-caption text-muted">{hint}</Text> : null}
                </View>
              </Pressable>
            );
          })}
        </View>

        <View className="mt-8">
          <Button label={t.seed.submit} loading={saving} onPress={() => void submit()} />
        </View>

        <Pressable
          accessibilityRole="button"
          onPress={finish}
          disabled={saving}
          className="mt-4 min-h-touch items-center justify-center"
        >
          <Text className="text-label font-medium text-muted">{t.seed.skip}</Text>
        </Pressable>
      </View>
    </Screen>
  );
}
