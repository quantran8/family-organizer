/**
 * Điểm vào `/`.
 *
 * AuthGate ở root layout giữ splash và replace sang sign-in, setup hoặc home
 * sau khi khôi phục session. Route rỗng này bảo đảm Expo Router luôn có màn
 * hợp lệ trong khoảng thời gian bootstrap ngắn đó.
 */
export default function IndexScreen() {
  return null;
}
