/**
 * Component riêng của feature Sự kiện.
 *
 * `EventRow` nhận thẳng `FamilyEvent` — nó là ví dụ rõ nhất cho ranh giới:
 * một component biết cấu trúc một thực thể nghiệp vụ thì không thể là primitive.
 *
 * `LunarDatePicker` chỉ `event-form` dùng, và nó gọi `nextLunarOccurrence` để
 * dựng dòng xem trước. Một bộ chọn ngày biết về lịch âm và về "lần kế tiếp rơi
 * vào ngày nào" thuộc về sự kiện, không thuộc về hộp công cụ chung.
 */

export { EventRow, type EventRowProps } from './event-row';
export { EventCalendar, type EventCalendarProps } from './event-calendar';
export { LunarDatePicker, type LunarDatePickerProps } from './lunar-date-picker';
