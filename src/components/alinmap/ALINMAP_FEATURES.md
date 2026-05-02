# Tài liệu Chi tiết Chức năng Alinmap & Looter Game

## 1. Tổng quan
**Alinmap** là một nền tảng bản đồ kỹ thuật số (Spatial Platform) tích hợp các yếu tố xã hội và trò chơi (Gamification). Chức năng chính của nó là kết nối người dùng thông qua vị trí địa lý thực tế hoặc giả lập, đồng thời cung cấp một chế độ chơi nhập vai gọi là **Looter Game**.

---

## 2. Các Chức năng Bản đồ & Xã hội

### 🔍 Tìm kiếm (Search)
Hệ thống tìm kiếm đa năng, phục vụ cả mục tiêu xã hội và nội dung:
- **Tìm kiếm Đa đối tượng**: Hỗ trợ tìm kiếm đồng thời **Người dùng (Users)** và **Bài viết (Posts)** thông qua `SearchHeader`.
- **Kết quả Thời gian thực**: Trên bản Desktop, hiển thị dropdown kết quả ngay khi nhập, cho phép truy cập nhanh vào profile hoặc bài viết.
- **Gợi ý từ khóa (Trending Tags)**: Tích hợp các hashtag thịnh hành được trích xuất từ trạng thái của những người dùng xung quanh.
- **Tích hợp Di động**: Trên điện thoại, thanh tìm kiếm liên kết trực tiếp với `BottomSheet` để hiển thị kết quả chi tiết mà không làm mất không gian bản đồ.

### 🧭 Khám phá (Explore/Discover)
Trung tâm giải trí và kết nối cộng đồng:
- **Featured Games**: Carousel hiển thị các trò chơi nổi bật, có điểm đánh giá cao hoặc đang thịnh hành.
- **Phân loại Trò chơi**: Chia thành các danh mục như **Puzzle & Logic**, **Action & Arcade**, và **Strategy**.
- **Social Discovery**: Hiển thị số lượng người dùng đang ở gần ("X users nearby") để khuyến khích tương tác.
- **Trending Tags**: Thu thập xu hướng từ status của cộng đồng xung quanh, giúp người dùng nắm bắt thông tin nhanh chóng.

### 👤 Trang cá nhân (Profile)
Cung cấp cái nhìn chi tiết và các hành động tương tác với người dùng khác:
- **Thông tin Cơ bản**: Avatar, Tên hiển thị, Tỉnh/Thành phố hiện tại, Trạng thái (Status) và các Thẻ đặc trưng (Tags).
- **Hành động Xã hội**:
    - **Add Friend**: Gửi lời mời kết bạn.
    - **Message**: Nhắn tin trực tiếp.
    - **Report**: Hệ thống báo cáo người dùng vi phạm tiêu chuẩn cộng đồng.
- **Nội dung Sáng tạo**:
    - **Posts Tab**: Xem tất cả bài viết, hình ảnh trong Gallery của người dùng.
    - **Games Tab**: Xem danh sách các trò chơi mà người dùng đó đã tạo hoặc thường xuyên chơi.
- **Tương tác Bản đồ**: Nút **Locate (Định vị)** cho phép bản đồ tự động xoay và tập trung vào vị trí của người dùng đó.

### 📍 Định vị & Vị trí (Positioning)
Hệ thống sử dụng dữ liệu không gian thực để vận hành:
- **Tọa độ Thời gian thực**: Hiển thị chính xác Kinh độ (Lat) và Vĩ độ (Lng) của người dùng.
- **Địa danh hóa**: Chuyển đổi tọa độ thô thành tên địa phương cụ thể (ví dụ: Tên quận, tỉnh thành).
- **Cấp quyền Vị trí**: Quy trình yêu cầu quyền truy cập vị trí minh bạch thông qua `LocationConsentOverlay`.
- **Dữ liệu Thời tiết**: Tự động cập nhật nhiệt độ và trạng thái thời tiết dựa trên vị trí hiện tại.

---

## 3. Chế độ Chơi Looter Game
Trò chơi nhập vai hành động ngay trên nền bản đồ.

### ⚓ Di chuyển & Khám phá
- **Thuyền (Boat)**: Người chơi điều khiển một chiếc thuyền di chuyển giữa các tọa độ trên bản đồ.
- **Thành trì (Fortress)**: Điểm neo đậu cố định, dùng để lưu trữ vật phẩm an toàn (`FortressStorage`) và nghỉ ngơi. Khoảng cách tương tác: **250m**.
- **Cổng dịch chuyển (Portal)**: Cho phép truy cập kho đồ từ xa hoặc di chuyển nhanh giữa các vùng.

### 💎 Thu thập vật phẩm (Looting)
- **Vật phẩm Thế giới**: Xuất hiện ngẫu nhiên trên bản đồ (Trang bị, Túi đồ, Vật phẩm mở rộng). Khoảng cách nhặt đồ: **150m**.
- **Minigames**: Một số vật phẩm yêu cầu vượt qua các trò chơi nhỏ để thu thập thành công.

### 🎒 Hệ thống Backpack (Túi đồ)
Quản lý ô chứa theo phong cách Grid-based:
- **Túi Active (Active Bag)**: Chỉ những trang bị đặt trong vùng túi đang kích hoạt mới cộng chỉ số (HP, Năng lượng, Tốc độ).
- **Cơ chế Kéo thả**: Hỗ trợ xoay vật phẩm, sắp xếp tối ưu không gian túi.
- **Mở rộng túi**: Sử dụng `GridExpander` hoặc mua túi mới (`BagItem`) để tăng không gian.

### ⚔️ Chiến đấu & Thử thách
- **Encounter**: Gặp gỡ và chiến đấu với tàu địch (Bot hoặc người chơi khác).
- **Hệ thống Chỉ số**: HP cơ bản là **100**, có thể tăng thêm từ trang bị.
- **Lời nguyền (Curses)**: Tích lũy khi di chuyển (**0.1% mỗi mét**) hoặc khi nhặt đồ (**5% flat**). Khi đầy 100%, người chơi sẽ gặp các hiệu ứng bất lợi.

### 📈 Cấp độ Thế giới (World Tiers)
- Có tối đa **5 Tiers**.
- Tier càng cao, vật phẩm rơi ra càng quý hiếm nhưng đối thủ cũng mạnh hơn.
- Phí nâng cấp Tier tăng dần theo cấp độ (từ 50 đến 2500 vàng).

---

## 4. Công nghệ Tích hợp
- **Frontend**: React, TypeScript, Framer Motion.
- **Spatial Data**: Tính toán khoảng cách dựa trên kinh độ/vĩ độ (Haversine formula).
- **Real-time**: Đồng bộ hóa trạng thái qua WebSocket.

---
*Tài liệu này mô tả chi tiết các chức năng hiện có của module Alinmap.*
