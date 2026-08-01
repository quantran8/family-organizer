/**
 * Component riêng của feature Mua sắm.
 *
 * `ShoppingRow` cố ý KHÔNG dùng lại `TaskRow` dù nhìn giống nhau: `TaskRow` có
 * chip người phụ trách, biểu tượng lặp, và vuốt-trái-hoãn — ba thứ mà danh sách
 * mua sắm phải KHÔNG có. Dùng chung sẽ phải thêm ba prop điều kiện để tắt
 * chúng, và một prop tắt là một prop có thể bật nhầm.
 */

export { ShoppingRow, type ShoppingRowProps } from './shopping-row';
