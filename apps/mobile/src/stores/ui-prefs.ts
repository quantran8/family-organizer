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

/**
 * Thứ tự CÓ Ý NGHĨA: Việc | Mua sắm | Sự kiện (05 §5).
 *
 * Mua sắm nằm giữa vì nó là bề mặt hằng ngày; đặt nó cuối thì thao tác thường
 * xuyên nhất lại là thao tác xa nhất.
 */
export type PlanTab = 'task' | 'shopping' | 'event';

/** Cùng union với `DocumentFilter` ở repository — khai lại để store không phụ
 *  thuộc vào tầng dữ liệu chỉ vì một union ba chuỗi. */
export type DocFilter = 'all' | 'expiring' | 'no_expiry';

interface UIPrefsState {
  planTab: PlanTab;
  setPlanTab: (tab: PlanTab) => void;
  docFilter: DocFilter;
  setDocFilter: (filter: DocFilter) => void;
  /**
   * Ngày (ISO) mà dòng hỏi lại số dư ở màn "Sắp tới" được phép hiện lại.
   * null = chưa từng bỏ qua.
   *
   * Ở đây chứ không ở DB vì đây là trạng thái của MỘT MÁY: người kia bỏ qua
   * trên máy họ không có nghĩa mình cũng đã thấy câu hỏi. Đẩy lên server sẽ
   * biến một cử chỉ "để tôi yên" thành một quyết định thay cho cả hai người.
   */
  refreshAskSnoozedUntil: string | null;
  snoozeRefreshAsk: (until: string) => void;
}

export const useUIPrefs = create<UIPrefsState>()(
  persist(
    (set) => ({
      // Mặc định là Việc: nó là vòng lặp hằng ngày (F3), sự kiện thì thưa hơn.
      planTab: 'task',
      setPlanTab: (planTab) => set({ planTab }),

      // Mặc định "Tất cả", KHÔNG phải "Sắp hết hạn": nhà mới dùng app chưa có
      // giấy tờ nào sắp hết hạn, và mở tab ra thấy trống rỗng trong khi mình
      // vừa lưu ba giấy tờ trông như app làm mất dữ liệu.
      docFilter: 'all',
      setDocFilter: (docFilter) => set({ docFilter }),

      refreshAskSnoozedUntil: null,
      snoozeRefreshAsk: (refreshAskSnoozedUntil) => set({ refreshAskSnoozedUntil }),
    }),
    {
      name: 'family-organizer.ui-prefs',
      storage: createJSONStorage(() => AsyncStorage),
    },
  ),
);
