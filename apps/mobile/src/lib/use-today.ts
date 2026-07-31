/**
 * "Hôm nay" cho component — giá trị ỔN ĐỊNH giữa các lần render.
 *
 * Gọi thẳng `todayInVN()` trong thân component thì mỗi lần render lại sinh một
 * chuỗi mới. Chuỗi đó đi vào query key và vào `useMemo`, nên nó biến mọi thứ
 * phụ thuộc nó thành "luôn mới" — refetch vô hạn, không phải một lỗi hiển thị.
 *
 * Vẫn phải đổi lúc nửa đêm: app mở qua đêm mà "Hôm nay" vẫn là hôm qua thì việc
 * hôm nay nằm ở nhóm "Quá hạn" và việc ngày mai nằm ở "Hôm nay". Đặt hẹn đúng
 * một lần tới 00:00 UTC+7 kế tiếp thay vì đếm mỗi phút.
 */

import type { ISODate } from '@family-organizer/domain';
import { useEffect, useState } from 'react';

import { todayInVN } from './today';

/** Số mili giây từ `now` tới 00:00 UTC+7 kế tiếp, cộng 1 giây đệm. */
function msUntilNextMidnightVN(now: Date): number {
  const shifted = new Date(now.getTime() + 7 * 60 * 60_000);
  const msIntoDay =
    shifted.getUTCHours() * 3_600_000 +
    shifted.getUTCMinutes() * 60_000 +
    shifted.getUTCSeconds() * 1_000 +
    shifted.getUTCMilliseconds();
  return 86_400_000 - msIntoDay + 1_000;
}

export function useToday(): ISODate {
  const [today, setToday] = useState<ISODate>(() => todayInVN());

  useEffect(() => {
    // setTimeout với khoảng > ~24 ngày tràn số ở JS, nhưng ở đây tối đa là 24
    // giờ nên an toàn. Đặt lại hẹn sau mỗi lần bắn để chạy tiếp qua nhiều đêm.
    const timer = setTimeout(() => setToday(todayInVN()), msUntilNextMidnightVN(new Date()));
    return () => clearTimeout(timer);
  }, [today]);

  return today;
}
