/**
 * Hook cho danh sách mua sắm — 06 §4.
 *
 * Bề mặt hằng ngày duy nhất của app. Vòng lặp: mở app trong siêu thị → tick →
 * đóng. Mọi thứ ở đây phải chịu được việc lặp lại vài chục lần một tuần mà
 * không làm ai bực.
 *
 * `useToggleShoppingItem` BẮT BUỘC optimistic: nó là thao tác một chạm, và một
 * ô tròn chờ round-trip trên sóng 3G trong siêu thị là thao tác hỏng.
 *
 * `useAddShoppingItem` KHÔNG optimistic — xem ghi chú tại chỗ.
 */

import type { ShoppingItem, UUID } from '@family-organizer/domain';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { queryKeys } from '@/data/queries/keys';
import { shoppingRepository } from '@/features/shopping/repository';
import { useHouseholdId, useSessionStore } from '@/stores/session';

export function useShoppingItems() {
  const hh = useHouseholdId();
  return useQuery({
    queryKey: queryKeys.shopping.list(hh),
    queryFn: () => shoppingRepository.list(hh),
  });
}

/**
 * Thêm một món.
 *
 * KHÔNG optimistic, dù nó là thao tác nhanh: id do DB sinh, nên một dòng lạc
 * quan phải mang id giả rồi bị thay — và nếu người dùng tick đúng dòng đó trong
 * khoảng giữa, lệnh tick sẽ bắn với một id không tồn tại. Ô nhập đã tự xoá ngay
 * khi gửi nên cảm giác vẫn tức thì; dòng hiện ra sau ~200ms không ai thấy chậm.
 */
export function useAddShoppingItem() {
  const hh = useHouseholdId();
  const memberId = useSessionStore((s) => s.memberId);
  const qc = useQueryClient();

  return useMutation({
    mutationFn: (title: string) => shoppingRepository.add(hh, title, memberId),
    onSettled: () => {
      void qc.invalidateQueries({ queryKey: queryKeys.shopping.all(hh) });
    },
  });
}

/**
 * Tick / bỏ tick. Optimistic BẮT BUỘC (01 §3).
 *
 * Mục đã tick KHÔNG biến mất khỏi danh sách ngay: nó mờ đi và ở lại 24h. Tick
 * nhầm là chuyện thường xuyên khi vừa đẩy xe vừa cầm điện thoại, và một món
 * biến mất tức thì là một thao tác không hoàn tác được.
 */
export function useToggleShoppingItem() {
  const hh = useHouseholdId();
  const memberId = useSessionStore((s) => s.memberId);
  const qc = useQueryClient();

  return useMutation({
    mutationFn: ({ id, done }: { id: UUID; done: boolean }) =>
      shoppingRepository.toggle(hh, id, done, memberId),

    onMutate: async ({ id, done }) => {
      const listKey = queryKeys.shopping.list(hh);
      // Huỷ refetch đang bay: nó trả dữ liệu CŨ sau khi ta đã sửa cache và sẽ
      // ghi đè ngược, làm ô tròn nhấp nháy về trạng thái trước.
      await qc.cancelQueries({ queryKey: listKey });

      const prevList = qc.getQueryData<ShoppingItem[]>(listKey);
      if (prevList) {
        qc.setQueryData<ShoppingItem[]>(
          listKey,
          prevList.map((it) =>
            it.id === id
              ? // `doneAt` phải đổi cùng `isDone`: màn hình dùng nó để biết mục
                // nào sắp bị cron dọn, và để nguyên giá trị cũ sẽ làm một mục
                // vừa bỏ tick trông như đã tick từ hôm qua.
                { ...it, isDone: done, doneAt: done ? new Date().toISOString() : null }
              : it,
          ),
        );
      }
      return { prevList, listKey };
    },

    onError: (_e, _vars, ctx) => {
      if (ctx?.prevList) qc.setQueryData(ctx.listKey, ctx.prevList);
    },

    // Nhà mình có card CẦN MUA đếm số món chưa mua → phải đồng bộ theo.
    onSettled: () => {
      void qc.invalidateQueries({ queryKey: queryKeys.shopping.all(hh) });
      void qc.invalidateQueries({ queryKey: queryKeys.household.all(hh) });
    },
  });
}

export function useDeleteShoppingItem() {
  const hh = useHouseholdId();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: UUID) => shoppingRepository.softDelete(hh, id),
    onSettled: () => {
      void qc.invalidateQueries({ queryKey: queryKeys.shopping.all(hh) });
      void qc.invalidateQueries({ queryKey: queryKeys.household.all(hh) });
    },
  });
}
