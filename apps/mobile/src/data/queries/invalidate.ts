/**
 * Làm mới cache sau khi ghi.
 *
 * Gom ở đây thay vì lặp ở mỗi feature: mọi thao tác tiền đều kéo theo cùng một
 * chùm key, và bỏ sót một key làm hai màn hình hiện hai con số khác nhau về
 * cùng một khoản — thứ phá niềm tin nhanh nhất trong một app về tiền chung.
 */

import type { UUID } from '@nhaminh/domain';
import type { QueryClient } from '@tanstack/react-query';

import { financeAffectedKeys, queryKeys } from './keys';

/** Sau mọi thao tác đụng tới một con số tiền. */
export function invalidateFinance(qc: QueryClient, hh: UUID): void {
  for (const key of financeAffectedKeys(hh)) {
    void qc.invalidateQueries({ queryKey: key });
  }
}

/** Sau thao tác đổi thứ hiện trên Nhà mình (việc, sự kiện, giấy tờ, cờ). */
export function invalidateHomeFeed(qc: QueryClient, hh: UUID): void {
  void qc.invalidateQueries({ queryKey: queryKeys.household.all(hh) });
}
