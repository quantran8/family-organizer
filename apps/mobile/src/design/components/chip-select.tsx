/**
 * Chọn một trong vài giá trị bằng hàng chip.
 *
 * Thay cho `Picker` / danh sách thả xuống ở những trường có ít lựa chọn: người
 * phụ trách (2–4 người), tần suất lặp (5 giá trị). Một menu thả xuống giấu lựa
 * chọn sau một chạm và một hoạt ảnh; chip cho thấy hết mọi thứ cùng lúc.
 *
 * Trường nào cũng cho phép giá trị "không chọn" — nó là một lựa chọn thật
 * ("Chưa phân", "Không lặp"), nên nó là một chip, không phải trạng thái ẩn.
 */

import { Pressable, ScrollView, Text, View } from 'react-native';

export interface ChipOption<T> {
  value: T;
  label: string;
}

export interface ChipSelectProps<T> {
  options: readonly ChipOption<T>[];
  value: T;
  onChange: (next: T) => void;
  /** Nhiều hơn ~4 chip thì cuộn ngang thay vì xuống dòng. */
  scroll?: boolean;
}

export function ChipSelect<T>({ options, value, onChange, scroll = false }: ChipSelectProps<T>) {
  const chips = options.map((o) => {
    const active = o.value === value;
    return (
      <Pressable
        key={String(o.value)}
        accessibilityRole="button"
        accessibilityState={{ selected: active }}
        accessibilityLabel={o.label}
        onPress={() => onChange(o.value)}
        className={`min-h-touch justify-center rounded-full border px-4 ${
          active ? 'border-iris-500 bg-iris-50' : 'border-line bg-white active:bg-subtle'
        }`}
      >
        <Text className={`text-label font-medium ${active ? 'text-iris-600' : 'text-ink'}`}>
          {o.label}
        </Text>
      </Pressable>
    );
  });

  if (scroll) {
    return (
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerClassName="gap-2 pr-4"
      >
        {chips}
      </ScrollView>
    );
  }

  return <View className="flex-row flex-wrap gap-2">{chips}</View>;
}
