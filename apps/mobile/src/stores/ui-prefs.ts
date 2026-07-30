/**
 * Lựa chọn hiển thị nhớ giữa các lần mở app.
 *
 * Khác `stores/session`: đây là sở thích cục bộ của MÁY này, không phải dữ liệu
 * của nhà. Không đồng bộ, không lên server — người kia không cần biết mình đang
 * mở tab con nào.
 *
 * "Ghi nhớ tab con đã chọn lần trước" (05 §5) không phải chi tiết nhỏ: người
 * dùng chủ yếu quan tâm sự kiện sẽ phải chạm thêm một lần mỗi lần mở app, và
 * cái chạm đó lặp lại mỗi ngày.
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

export type PlanTab = 'task' | 'event';

interface UIPrefsState {
  planTab: PlanTab;
  setPlanTab: (tab: PlanTab) => void;
}

export const useUIPrefs = create<UIPrefsState>()(
  persist(
    (set) => ({
      // Mặc định là Việc: nó là vòng lặp hằng ngày (F3), sự kiện thì thưa hơn.
      planTab: 'task',
      setPlanTab: (planTab) => set({ planTab }),
    }),
    {
      name: 'nhaminh.ui-prefs',
      storage: createJSONStorage(() => AsyncStorage),
    },
  ),
);
