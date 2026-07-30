/**
 * Phiên đăng nhập + nhà đang mở.
 *
 * Vì sao `householdId` nằm ở store chứ không truyền qua props: gần như mọi hook
 * đọc dữ liệu đều cần nó, và luồn nó qua 5 tầng component chỉ để tới một
 * `useQuery` là thứ sẽ bị bỏ quên ở đâu đó. Nhưng **repository thì vẫn nhận
 * `householdId` tường minh** (01 §2) — biên giới đặt ở hook, không ở repository:
 * hook được phép biết ngữ cảnh, repository thì không.
 */

import type { UUID } from '@nhaminh/domain';
import type { Session } from '@supabase/supabase-js';
import { create } from 'zustand';

interface SessionState {
  session: Session | null;
  /** null = chưa biết (đang khôi phục phiên), khác với "chưa đăng nhập". */
  isRestoring: boolean;
  householdId: UUID | null;
  householdName: string | null;
  memberId: UUID | null;
  /** Đơn vị tiền của nhà — `formatMoney` cần nó tường minh (xem design/use-currency). */
  currency: string | null;

  setSession: (s: Session | null) => void;
  setRestored: () => void;
  setHousehold: (
    h: { id: UUID; name: string; memberId: UUID; currency?: string } | null,
  ) => void;
  clear: () => void;
}

export const useSessionStore = create<SessionState>((set) => ({
  session: null,
  isRestoring: true,
  householdId: null,
  householdName: null,
  memberId: null,
  currency: null,

  setSession: (session) => set({ session }),
  setRestored: () => set({ isRestoring: false }),
  setHousehold: (h) =>
    set(
      h
        ? {
            householdId: h.id,
            householdName: h.name,
            memberId: h.memberId,
            currency: h.currency ?? 'VND',
          }
        : { householdId: null, householdName: null, memberId: null, currency: null },
    ),
  clear: () =>
    set({
      session: null,
      householdId: null,
      householdName: null,
      memberId: null,
      currency: null,
    }),
}));

/**
 * `householdId` cho các hook. Ném nếu chưa có — mọi màn hình gọi hook dữ liệu
 * đều nằm sau gate `(app)/_layout.tsx`, nơi đã đảm bảo có nhà. Trả `null` rồi
 * để mỗi hook tự đoán là cách chắc chắn sẽ có chỗ quên kiểm.
 */
export function useHouseholdId(): UUID {
  const id = useSessionStore((s) => s.householdId);
  if (!id) {
    throw new Error(
      'useHouseholdId gọi ngoài phạm vi (app)/ — màn hình này phải nằm sau gate household.',
    );
  }
  return id;
}

/** Dùng ở gate, nơi chưa chắc có nhà. */
export function useOptionalHouseholdId(): UUID | null {
  return useSessionStore((s) => s.householdId);
}
