# TÀI LIỆU KỸ THUẬT & HỆ THỐNG HOÀNG HẬU CÁT TƯỜNG (HHCT)

Tài liệu tổng hợp toàn bộ thông tin kiến trúc backend, danh sách máy chủ, cơ chế đăng nhập và các API của tựa game **Hoàng Hậu Cát Tường** (HHCT) do MuuGame phát hành.

---

## 1. Thông Tin Nhận Diện Trò Chơi

- **Tên trò chơi:** Hoàng Hậu Cát Tường (HHCT)
- **Nhà phát hành:** MuuGame (Công ty TNHH Mạng Mộc Dục Hạ Môn - Xiamen Muyou Network)
- **Trang chủ chính thức:** `https://hhct.muugame.com`
- **Cộng đồng Fanpage:** `https://www.facebook.com/vnggtt` (Gặp Gỡ Tôn Thượng / Hoàng Hậu Cát Tường)
- **Cổng thanh toán & dịch vụ:** `https://zhifu.muugame.com`, `https://pay.mgolgames.com`
- **Gói ứng dụng (Package Name):**
  - Android APK: `com.muugame.hhjx` hoặc `com.flower.vnhh2`
  - iOS App ID: `6463768133`
  - Link file APK trực tiếp: `https://apk.muugame.com/hhjxA1_muyou_MUYOUA_android01___1.apk`

---

## 2. Phân Hệ Game Trong Hệ Thống Backend MuuGame

Hệ thống quản lý tài khoản và cổng thanh toán của MuuGame phân định các game qua mã `game_id`:

| Game ID | Tên Game Trong Hệ Thống | Ghi Chú |
| :---: | :--- | :--- |
| **20** | **hoàng hậu cát tường-Android** | **Mục tiêu phân tích hiện tại** |
| 15 | Hoàng Hậu Giá Đáo (hhjxA1) | Game cùng backend hạ tầng |
| 31 | Giang Sơn Mỹ Nhân | Game cùng NPH |
| 33 | Tình yêu Thanh Cung | Game cùng NPH |
| 10, 11 | Hoàng Hậu Giá Lâm (Android, iOS) | Game cùng NPH |
| 28 | Phượng Lâm Thiên Hạ-iOS | Game cùng NPH |

---

## 3. Thông Số Máy Chủ `tiền_đồ_sáng_1`

Hệ thống MuuGame quản lý máy chủ qua 2 trường ID:
1. `cp_sid`: ID máy chủ thực tế trong game (Game Server ID).
2. `serverId`: ID máy chủ trên cổng dịch vụ / Gateway Portal (Billing Server ID).

### Chi tiết Server `tiền_đồ_sáng_1`:
- **Tên hiển thị:** `tiền_đồ_sáng_1(Android)`
- **Game Server ID (`cp_sid`):** **`661`**
- **Gateway / Portal Server ID (`serverId`):** **`422021`**
- **Cụm liên server:** Tiền Đồ Sáng (TĐS)

### Một số server khác trong cùng hệ thống để đối chiếu:
- `Mộ_Vân_10(Android)`: `serverId = 420952` | `cp_sid = 580`
- `Tri_Hoạ_5(Android)`: `serverId = 421474` | `cp_sid = 585`
- `Chân_Hoàn_10(Android)`: `serverId = 421630` | `cp_sid = 600`
- `tiền_đồ_sáng_1(Android)`: `serverId = 422021` | `cp_sid = 661`

---

## 4. Dữ Liệu Nhân Vật Mẫu Đã Xác Thực

Dữ liệu truy vấn từ tài khoản mẫu (`maimuoi051075@gmail.com`) tại server `tiền_đồ_sáng_1`:
- **Tên nhân vật:** `Dĩnh Bảo`
- **ID nhân vật trong game (`cp_roleid`):** `693109697`
- **ID tài khoản vai trò (`roleId`):** `9266363`
- **Cấp độ hiển thị:** `0` (chưa cập nhật qua API web)

---

## 5. Quy Trình Gọi API Xác Thực & Đọc Dữ Liệu

### Bước 1: Đăng nhập hệ thống MuuGame
- **Endpoint:** `POST https://zhifu.muugame.com/login/doLogin`
- **Headers:** `Content-Type: application/x-www-form-urlencoded; charset=UTF-8`
- **Body:**
  ```text
  game_id=20&username={email}&password={password}
  ```
- **Phản hồi:**
  - HTTP 200: `{ "code": 200, "msg": "Thành công.(200)", "data": [] }`
  - Header trả về phiên đăng nhập: `Set-Cookie: PHPSESSID={session_id}; path=/`

### Bước 2: Lấy danh sách máy chủ đã chơi
- **Endpoint:** `GET https://zhifu.muugame.com/main/pay`
- **Headers:** `Cookie: PHPSESSID={session_id}`
- **Dữ liệu trả về:** HTML chứa thẻ `<select name="server" id="server">` liệt kê toàn bộ máy chủ mà tài khoản đã tạo nhân vật kèm `value` (`serverId`) và thuộc tính `cp_sid`.

### Bước 3: Lấy thông tin nhân vật theo máy chủ
- **Endpoint:** `POST https://zhifu.muugame.com/main/findRole`
- **Headers:**
  - `Cookie: PHPSESSID={session_id}`
  - `Content-Type: application/x-www-form-urlencoded; charset=UTF-8`
- **Body:**
  ```text
  serverId={serverId}
  ```
  *(Ví dụ: `serverId=422021` cho máy chủ `tiền_đồ_sáng_1`)*
- **Phản hồi:**
  ```json
  {
    "code": 200,
    "msg": "Thành công.(200)",
    "data": {
      "role_info": "<option value=0>Hãy chọn vai</option><option value='9266363' cp_roleid='693109697' role_level='0'>Dĩnh Bảo</option>"
    }
  }
  ```

---

## 6. Mối Quan Hệ Giữa HHCT Và Hoàng Hậu Giá Đáo (HHGL)

1. **Chung nhà cung cấp dịch vụ Backend:** Cả hai trò chơi đều thuộc hạ tầng của MuuGame và hệ thống mạng 52look (`h5s3.52look.com`, `yxgl-sdk.muugamevn.com`, `mgolgames.com`).
2. **Khác biệt về định danh game:**
   - Hoàng Hậu Giá Đáo: `game_id = 15`, `gameSimpleName = hhjxA1`, server dạng `Hoàng_Hậu_1..100` (`1001..1100`) và `Mẫu_Nghi_1..6` (`1101..1106`).
   - Hoàng Hậu Cát Tường: `game_id = 20`, server dạng `cp_sid` 3 chữ số (`580`, `585`, `600`, `661`), đặt tên theo cụm thơ văn/phim cung đấu (`Mộ Vân`, `Tri Họa`, `Chân Hoàn`, `Tiền Đồ Sáng`...).
3. **Mô hình giao thức Client - Gateway:** Tương tự như HHGL, HHCT sử dụng Gateway phân phối danh sách máy chủ và mã `rcode` để kết nối WebSocket vào Game Server với xác thực token từ SDK của MuuGame.
