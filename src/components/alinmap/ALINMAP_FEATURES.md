# Tài liệu Chi tiết Chức năng Alinmap & Looter Game

## 1. Tổng quan
**Alinmap** là một nền tảng bản đồ kỹ thuật số (Spatial Platform) tích hợp các yếu tố xã hội và trò chơi (Gamification). Chức năng chính của nó là kết nối người dùng thông qua vị trí địa lý thực tế hoặc giả lập, đồng thời cung cấp một chế độ chơi nhập vai gọi là **Looter Game**.

---

## 2. Nền tảng Bản đồ (Spatial Core)
Nền tảng này cho phép tương tác trực quan trên giao diện bản đồ:
- **Hệ thống Node (Nút)**: Mỗi người dùng được đại diện bởi một `SelfNode`. Người dùng có thể thấy `nearbyUsers` (người dùng lân cận) hiển thị theo thời gian thực.
- **Tương tác Không gian**: 
  - Xem profile, status và gallery ảnh của người khác trực tiếp trên bản đồ.
  - Tìm kiếm địa điểm hoặc người dùng thông qua `SearchHeader`.
- **Cơ chế Điều khiển**: Hỗ trợ phóng to/thu nhỏ (zoom), xoay và kéo thả mượt mà bằng `framer-motion`.

---

## 3. Chế độ Chơi Looter Game
Đây là một trò chơi nhập vai (RPG) hành động ngay trên nền bản đồ.

### ⚓ Di chuyển & Khám phá
- **Thuyền (Boat)**: Người chơi điều khiển một chiếc thuyền di chuyển giữa các tọa độ trên bản đồ.
- **Thành trì (Fortress)**: Điểm neo đậu cố định, dùng để lưu trữ vật phẩm an toàn (`FortressStorage`) và nghỉ ngơi. Khoảng cách tương tác: **250m**.
- **Cổng dịch chuyển (Portal)**: Cho phép truy cập kho đồ từ xa hoặc di chuyển nhanh giữa các vùng.

### 💎 Thu thập vật phẩm (Looting)
- **Vật phẩm Thế giới**: Xuất hiện ngẫu nhiên trên bản đồ với nhiều loại (Trang bị, Túi đồ, Vật phẩm mở rộng ô chứa). Khoảng cách nhặt đồ: **150m**.
- **Minigames**: Một số vật phẩm yêu cầu người chơi vượt qua các trò chơi nhỏ (như giải đố, nhanh tay) để thu thập thành công. Thất bại có thể dẫn đến bị phạt "Lời nguyền".

### 🎒 Hệ thống Backpack (Túi đồ)
Hệ thống này được thiết kế theo phong cách quản lý ô chứa (Grid-based Inventory):
- **Túi Active (Active Bag)**: Chỉ những trang bị đặt trong vùng túi đang kích hoạt mới cộng chỉ số (HP, Năng lượng, Tốc độ).
- **Cơ chế Kéo thả**: Hỗ trợ xoay vật phẩm, sắp xếp tối ưu không gian túi.
- **Mở rộng túi**: Sử dụng các vật phẩm `GridExpander` hoặc mua túi mới (`BagItem`) để tăng không gian chứa đồ.

### ⚔️ Chiến đấu & Thử thách
- **Encounter**: Gặp gỡ và chiến đấu với tàu địch (Bot hoặc người chơi khác).
- **Hệ thống Chỉ số**: 
  - **HP**: Máu cơ bản là **100**, có thể tăng thêm từ trang bị.
  - **Energy**: Dùng để thực hiện các hành động đặc biệt.
- **Lời nguyền (Curses)**: 
  - Tích lũy khi di chuyển (**0.1% mỗi mét**) hoặc khi nhặt đồ (**5% flat**).
  - Khi thanh Lời nguyền đầy (100%), người chơi sẽ phải đối mặt với các hiệu ứng bất lợi hoặc thử thách khó khăn hơn.

### 📈 Cấp độ Thế giới (World Tiers)
- Có tối đa **5 Tiers**.
- Tier càng cao, vật phẩm rơi ra càng xịn nhưng đối thủ cũng mạnh hơn.
- Phí nâng cấp Tier tăng dần theo cấp độ (từ 50 đến 2500 vàng).

---

## 4. Công nghệ Tích hợp
- **Frontend**: React, TypeScript, Framer Motion.
- **Spatial Data**: Tính toán khoảng cách thực tế dựa trên kinh độ/vĩ độ (Haversine formula).
- **Real-time**: Đồng bộ hóa trạng thái qua WebSocket.

---
*Tài liệu này được tạo tự động để mô tả các chức năng hiện có của module Alinmap.*
