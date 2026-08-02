/**
 * Tab con — `Việc | Sự kiện` (05 §5).
 *
 * Không dùng thư viện tab: hai tab con không cần cử chỉ vuốt ngang, và vuốt
 * ngang ở đây sẽ giành cử chỉ với vuốt-để-hoãn trên từng dòng việc.
 */

import { Pressable, Text, View } from 'react-native';

export interface SegmentedOption<T extends string> {
  value: T;
  label: string;
}

export interface SegmentedProps<T extends string> {
  options: readonly SegmentedOption<T>[];
  value: T;
  onChange: (next: T) => void;
}

export function Segmented<T extends string>({ options, value, onChange }: SegmentedProps<T>) {
  return (
    <View className="flex-row rounded-control bg-soft p-1">
      {options.map((o) => {
        const active = o.value === value;
        return (
          <Pressable
            key={o.value}
            accessibilityRole="tab"
            accessibilityState={{ selected: active }}
            accessibilityLabel={o.label}
            onPress={() => onChange(o.value)}
            className={`min-h-touch flex-1 items-center justify-center rounded-control ${
              active ? 'bg-surface' : ''
            }`}
          >
            <Text
              className={`text-label ${active ? 'font-semibold text-ink' : 'font-medium text-muted'}`}
            >
              {o.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}
