# Cơ chế Click Di chuyển và Lấy Target trong Looter Game

Tài liệu này mô tả chi tiết quy trình từ khi người dùng click trên màn hình cho đến khi nhân vật (thuyền) di chuyển và tương tác với các đối tượng trong thế giới Looter.

## 1. Nhận diện Thao tác (Input Handling)
Hệ thống sử dụng các sự kiện Pointer để phân biệt giữa việc "Click/Tap" và "Kéo bản đồ":
- **PointerDown & PointerUp**: Lưu vị trí bắt đầu và kết thúc.
- **Tolerance Check**: Nếu khoảng cách giữa điểm Down và Up nhỏ hơn `30px`, hệ thống xác định đây là một cú Tap hợp lệ để di chuyển hoặc tương tác. Nếu lớn hơn, hệ thống coi đó là thao tác Pan (kéo bản đồ) và bỏ qua.

## 2. Xác định Mục tiêu (Hit-testing)
Khi một cú Tap được xác nhận, hàm `handleMapClick` sẽ thực hiện kiểm tra va chạm theo thứ tự ưu tiên:
1.  **Pháo đài (Fortress)**: Kiểm tra xem click có trúng khu vực Pháo đài không.
2.  **Vật phẩm (World Items)**: Quét danh sách vật phẩm đang hiển thị (Hòm, Cổng dịch chuyển, Túi đồ...). 
    *   *Lưu ý*: Do vật phẩm hiển thị dạng đứng (Billboard), hitbox được kéo dài lên phía trên tọa độ gốc để khớp với hình ảnh hiển thị 3D.
3.  **Bản đồ (Map Ground)**: Nếu không trúng đối tượng nào, vị trí click sẽ được coi là đích đến di chuyển tự do.

## 3. Chuyển đổi Tọa độ (Screen to World Projection)
Đây là bước phức tạp nhất do bản đồ đang hiển thị ở chế độ 2.5D (nghiêng):
- **Bước 1 (Affine Inverse)**: Chuyển tọa độ Pixel màn hình (tương đối với tâm) ngược lại qua góc nghiêng (`Tilt`) và độ thu phóng (`Scale`) để lấy tọa độ trên mặt phẳng bản đồ phẳng.
- **Bước 2 (Mercator Reverse)**: Chuyển tọa độ mặt phẳng sang Kinh độ/Vĩ độ (Lat/Lng) dựa trên công thức Mercator và mức Zoom hiện tại của bản đồ.

## 4. Kiểm tra Khoảng cách Tương tác (Proximity Check)
Hệ thống sử dụng bán kính tương tác chuẩn là **250 mét**:
- **Trường hợp ở Gần (<= 250m)**: Thuyền dừng lại ngay lập tức (nếu đang đi) và thực hiện hành động tương tác (Mở kho, Nhặt đồ, Chơi Minigame).
- **Trường hợp ở Xa (> 250m)**: 
    1.  Ghi nhớ hành động tương tác vào hàng đợi (`onArrivalAction`).
    2.  Kích hoạt di chuyển thuyền đến tọa độ của đối tượng.

## 5. Logic Di chuyển (Movement Engine)
Quá trình di chuyển được chia làm 2 phần để đảm bảo hiệu suất:
- **Animation (Client-side)**: Thuyền trượt mượt mà trên bản đồ bằng Framer Motion. Thời gian di chuyển được tính toán dựa trên khoảng cách thực tế và chỉ số tốc độ của thuyền (`speedMultiplier`).
- **Logic Sync (Server-side)**: Chỉ khi thuyền đã dừng lại tại đích (hoặc bị người dùng dừng thủ công), vị trí mới được cập nhật lên hệ thống logic để tính toán các hệ quả (trừ năng lượng, tăng lời nguyền, sinh quái vật).

## 6. Hành động khi cập bến (Arrival Action)
Khi thuyền kết thúc quá trình di chuyển (Animation hoàn tất):
- Hệ thống kiểm tra xem có hành động nào đang chờ (`ArrivalAction`) không.
- Nếu có, hành động đó sẽ được thực thi tự động (ví dụ: Tự động mở hòm đồ ngay khi thuyền vừa đi tới nơi).
- Nếu trên đường đi thuyền gặp quái vật (Encounter) hoặc người dùng click điểm khác, hành động chờ này sẽ bị hủy bỏ.

## 7. Cơ chế Tự giải thoát (Safety Reset)
Nếu người dùng click liên tục vào bản đồ trong khi đang bị kẹt ở một giao diện nào đó (như Minigame hoặc Kết quả trận đấu), sau 3 lần click liên tiếp, hệ thống sẽ tự động đóng các giao diện đó để người dùng có thể tiếp tục di chuyển.
