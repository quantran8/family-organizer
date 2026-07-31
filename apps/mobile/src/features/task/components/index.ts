/**
 * Component riêng của feature Việc.
 *
 * Khác `@/design/components`: những thứ ở đó là primitive không biết gì về
 * nghiệp vụ (`Button`, `Field`, `MoneyText`), còn ở đây là component chỉ có
 * nghĩa trong ngữ cảnh một việc nhà.
 *
 * `TaskRow` nhận toàn giá trị nguyên thuỷ chứ không nhận `Task`, và đó là cố ý —
 * `home/index.tsx` cần dựng nó từ `HomeFeedItem` chứ không phải từ `Task`. Nhưng
 * nó vẫn thuộc về đây: ô tròn đánh dấu xong, chip người phụ trách, và biểu tượng
 * việc lặp chỉ có nghĩa với một việc nhà. Đặt ở `design/` thì primitive lại biết
 * về nghiệp vụ, và ranh giới mất luôn ý nghĩa.
 */

export { TaskRow, type TaskRowProps } from './task-row';
