# 👑 QUY CHUẨN KIẾN TRÚC BOT (100% SERVER-AUTHORITATIVE STATE SYNC)

Tài liệu này là **QUY TẮC BẮT BUỘC VÀ BẤT KHẢ XÂM PHẠM** (Always-On Workspace Rule) áp dụng cho mọi lượt tương tác, lập trình, bảo trì và mở rộng hệ thống Bot Game (`hhgl`, `hhgl-dau-tai-nghe`, `hhgl-ngan`, `hhgl-dk`, `hhgl-source`).

---

## 🚫 1. NGUYÊN TẮC BẤT KHẢ XÂM PHẠM: CẤM LƯU FILE TRẠNG THÁI TĨNH

1. **Tuyệt đối KHÔNG ghi trạng thái game ra file đĩa cục bộ:**
   - ❌ **CẤM:** Không tạo các file như `daily_state.json`, `game_state.json`, `cache_state.json` để lưu cờ "đã bái kiến", "đã nhận quà", "đã thỉnh an", v.v.
   - ❌ **Lý do:** Khi người chơi đăng nhập trên điện thoại, máy tính khác hoặc khi server reset ngày/rollback, các file tĩnh trên máy sẽ bị lệch pha với Server dẫn đến mất đồng bộ, bỏ sót quà hoặc gửi request sai lệch.
2. **Server Game là Nguồn Chân Lý Duy Nhất (Single Source of Truth):**
   - Mọi quyết định hành động đều phải dựa trên dữ liệu thời gian thực được Server trả về qua các gói tin WebSocket Protocol.

---

## 🔄 2. QUY TRÌNH 4 BƯỚC BẮT BUỘC CHO MỌI SERVICE

Mỗi khi một Service bắt đầu thực thi một tác vụ (Bái kiến, Thỉnh an, Nhận quà 7 ngày, Thành tựu, Thu hoạch, Vượt ải, Vườn hoa, Nông trại, Học viện, Bang hội, Nuôi mèo, Câu cá, Đấu tài nghệ...), code **BẮT BUỘC** phải tuân theo chu trình 4 bước:

```
[ 1. Send Request Query ] ──► [ 2. Await Server Response ]
                                         │
                                         ▼
[ 4. Execute & Log Result ] ◄── [ 3. Validate Server Flags ]
```

### Bước 1: Gửi Request truy vấn dữ liệu mới nhất
- Luôn gửi gói tin truy vấn thông tin trước khi hành động (Ví dụ: `113101` cho BXH, `114101` cho Hoàng Cung, `162101` cho 7 Ngày, `125102` cho Thành Tựu, `102101` cho Nội Vụ, `153101` cho Vườn Hoa, `142101` cho Trang Viên, `250101` cho Đấu Tài Nghệ, `160101` cho Nuôi Mèo, `170101` cho Câu Cá).
- Reset biến tạm trước khi gửi để đảm bảo không đọc nhầm dữ liệu cũ:
  ```javascript
  this.client.rankLocalInfo = null;
  this.send(113101, {});
  await this.sleepRandom(1.2, 2.0);
  ```

### Bước 2: Đợi & Bắt gói tin Response từ Server
- Trong `GameClient.js`, định tuyến chính xác mã `msgId` của Response và gán vào thuộc tính tương ứng của client.

### Bước 3: Kiểm tra cờ trạng thái thật từ Server
- Đọc trực tiếp các trường trạng thái được định nghĩa trong Protobuf của Server:
  - **Bái Kiến BXH (`113201`):** Kiểm tra `serverRank.isWorship === 1` (Đã bái) hay `0` (Chưa bái).
  - **Thỉnh An Hoàng Cung (`114201`):** Kiểm tra `palaceInfo.isHi === true` (Đã thỉnh an) hay `false`.
  - **Mục Tiêu 7 Ngày (`162201`):** Kiểm tra `t.status === 1` và `!rewardList.includes(t.id)`.
  - **Thành Tựu Cung Đình (`125202`):** Kiểm tra `a.state === 1` (Đủ điều kiện nhận thưởng).
  - **Báo Danh Hàng Ngày (`102201`):** Kiểm tra `attrMap[114]` (1 = đã báo danh, 0 = chưa).
  - **Vườn Hoa (`153201`, `153217`):** Đọc `canStealIds` để hái trộm, `canAssistantIds` để chăm hoa.
  - **Đấu Tài Nghệ (`250201`):** Kiểm tra `isEgg === true` để nhặt trứng, kiểm tra lượt thi đấu `remainTimes > 0`.
  - **Nuôi Mèo (`160201`):** Đọc trạng thái no đói (`satiety < 100`), trạng thái du ngoạn và trưởng thành.

### Bước 4: Thực thi hành động & In Log Minh Bạch 100% (Không In ID Số Trần Trụi)
- Luôn in rõ ràng kết quả phản hồi từ Server kèm Tên / Mô Tả Tiếng Việt:
  - ❌ **CẤM IN ID SỐ TRẦN:** Tuyệt đối không in các mã số như `[ID: 10012001]`, `[ID: 10014]`, `[Mục Tiêu 10012001]`, `[Thành Tựu 101001]`.
  - ✅ **BẮT BUỘC IN TÊN / MÔ TẢ TIẾNG VIỆT:** Phải map ID sang Tên/Nội dung trong file cấu hình (Ví dụ: `👉 Đang nhận: [Tổng tư chất Tùy Tùng đạt 10]...`, `👉 Đang nhận: [Thế Lực đạt 5,000]...`, `📝 Xử lý sự vụ: "Vườn Thuốc có một tiệm thuốc chưa tu sửa..."`).
  - Nếu nhận quà thành công $\rightarrow$ Bóc tách gói tin và in rõ chi tiết: `🎉 Nhận THÀNH CÔNG: +10 Vàng, +50,000 Bạc, +2 Ngân Phiếu`.
  - Nếu Server trả mã lỗi $\rightarrow$ Báo rõ mã lỗi để chẩn đoán.

---

## 📋 3. BẢNG TRA CỨU PROTOCOL ĐỒNG BỘ CÁC PHÂN HỆ

| Phân Hệ | Gói Request | Gói Response | Trường Trạng Thái Cần Kiểm Tra |
| :--- | :---: | :---: | :--- |
| 🏛️ **Hoàng Cung** | `114101` | `114201` | `isHi: bool` (`true`: đã thỉnh an, `false`: chưa). Lệnh nhận: `114102 { palaceId: 1 }`. |
| 👑 **Bái Kiến BXH** | `113101` | `113201` | `isWorship: int32` (`1`: đã bái, `0`: chưa). Lệnh nhận: `113103 { type: id }`. |
| 🎯 **Mục Tiêu 7 Ngày** | `162101` | `162201` | `targetList [ { id, status: 1 } ]` và `rewardList [ id ]`. Lệnh nhận: `162102 { id }`. |
| 🏆 **Thành Tựu** | `125102` | `125202` | `achievementList [ { achievementId, state: 1 } ]`. Lệnh nhận: `125103 { achievement: id }`. |
| 🌸 **Báo Danh** | `102102` | `102202` | `attrMap[114]` (`1`: đã điểm danh). |
| ⏳ **Thưởng Online** | `151101` | `151201` | `sec: int64` & `rewardList: [idx]` các mốc đã nhận. |
| 📅 **Đăng Nhập 7 Ngày** | `152101` | `152201` | `day: int32` & `rewardList: [id]`. Lệnh nhận: `152102 { id: day - 1 }`. |
| 👑 **Điểm Danh Tích Lũy** | `211101` | `211201` | `totalSignDay: int32` & `rewardSidList: [sid]`. Lệnh nhận: `211102 { rewardSid }`. |
| 🌳 **Cầu Nguyện Miễn Phí** | `128102` | `128202` | `YBCdTime: int32` (`0`: có lượt miễn phí). Lệnh quay: `128101`. |
| 🌸 **Vườn Hoa & Thêu Hoa** | `153101, 153113` | `153201, 153217` | `canStealIds` (trộm hoa), `canAssistantIds` (chăm hoa), thu hoạch `153103`, thêu `153110`. |
| 🌾 **Trang Viên Nông Trại** | `142101` | `142201` | `manorFuncDataInfo`. Thu hoạch `142105`, gieo hạt `142110`. |
| 📚 **Thư Viện / Học Viện** | `217107, 217108` | `217208` | `academyInfo`. Cho tùy tùng học `217104`, tốt nghiệp `217105`. |
| 🏰 **Bang Hội / Liên Minh** | `146113, 146124` | `146213, 146224` | Cống hiến bang `146118`, đánh boss bang `146126`. |
| 💼 **Nội Vụ (Thu Hoạch)** | `102101` | `102206` | `tradeInfoList [ { type, num > 0 } ]`. Lệnh thu: `102101 { type }`. |
| 📜 **Sự Vụ Triều Đình** | `105101` | `105201` | `workList [ { id } ]`. Lệnh duyệt: `105103 { id, choose }`. |
| 🎒 **Túi Đồ (Đan Dược)** | `104102` | `104202` | `propList [ { configId, num > 0 } ]`. Lệnh dùng: `104101 { propId, propNum }`. |
| ⚔️ **Tùy Tùng** | `103101` | `103201` | `helperInfoList [ { helperId, lv, exp } ]`. Lệnh nâng cấp: `103102`. |
| ⚔️ **Vượt Ải Cốt Truyện** | `112101` | `112201` | `sceneInfo` & `helperStateList`. Lệnh đánh: `112102` / `112103` / `112109`. |
| 💕 **Hậu Cung & Tri Kỷ** | `106111, 106119` | `106211, 106219` | `wifeInfoList` & `wifeEnergyFuncDataInfo.num > 0`. Lệnh vấn an: `106104`. |
| 📬 **Hộp Thư** | `107101` | `107201` | `mailList [ { id, state: 1 } ]`. Lệnh nhận: `107103 { id }`. |
| 👑 **Đấu Tài Nghệ (BigBoss)** | `250101, 250102` | `250201, 250202` | Báo danh Top 4 Tùy Tùng: `250102 { helperIds }`. Nhặt trứng: `250101`. So tài: `250104`. Nhận thưởng: `250106 { type }`. |
| 🐱 **Nuôi Mèo (Tổ Ấm)** | `160101` | `160201` | Cho ăn: `160102 { id, foodId }`. Lễ thành niên: `160103 { id }`. Du ngoạn: `160104`. |
| 🎣 **Câu Cá (Chợ Đêm)** | `170101` | `170201` | Kiểm tra điểm tuần (trần 6.000 Đồng), câu cá: `170102 { type }`. |

---

## ⚡ 4. QUY TẮC CẬP NHẬT TRẠNG THÁI MỚI (FRESH STATE RE-SYNC)

Khi tài khoản trải qua các hoạt động làm thay đổi thuộc tính (như vượt ải thành công, thăng quan, tăng Binh lực/Thế lực, dùng đan dược):
- **Luôn truy vấn lại Server:** Sau khi kết thúc chuỗi hành động tăng trưởng, các Service nhận thưởng (Thành tựu, 7 Ngày, Nhiệm vụ) phải gửi lại lệnh query (`125102`, `162101`) để bắt kịp các mốc thành tựu mới mà Server vừa đôn lên.
- **Không giả định trạng thái:** Tuyệt đối không tự tính toán trong Client rồi suy ra trạng thái, luôn đợi gói tin xác nhận từ Server.

---

## 📏 5. QUY TẮC GIỚI HẠN DÒNG MÃ NGUỒN (MAX 1000 LINES PER FILE)

1. **Tuyệt đối KHÔNG ĐƯỢC để bất kỳ file mã nguồn logic nào (`.js`, `.html`, `.css`,...) vượt quá 1000 dòng code:**
   - ❌ **CẤM:** Không viết file "God Object" hay nhồi nhét HTML/CSS/JS chung vào một file JavaScript lớn vượt quá 1000 dòng.
   - ❌ **Lý do:** File quá dài sẽ khiến AI quét không hết, tràn token context window, dễ gây sót logic, khó bảo trì và dễ sinh lỗi khi chỉnh sửa.
2. **Quy chuẩn module hóa bắt buộc:**
   - Khi một file có dấu hiệu tiếp cận ngưỡng 500 - 800 dòng, **BẮT BUỘC** phải chủ động tách nhỏ ra các module con (Component, Controller, View, Router, Helper, Config) độc lập.
   - Các file UI Web phải tách riêng `index.html`, `style.css`, `app.js` thay vì nhúng template string khổng lồ trong file server.
   - Ngoại lệ duy nhất: Các file từ điển/dữ liệu tĩnh JSON thuần dữ liệu từ game (`item_names.json`, `main_tasks.json`, `proto.json`) đóng vai trò là cơ sở dữ liệu tra cứu lớn.

---

## 🛑 6. QUY TẮC QUẢN LÝ GIT COMMIT & PUSH: CHỈ COMMIT KHI USER YÊU CẦU

1. **Tuyệt đối KHÔNG tự ý thực hiện `git commit` hay `git push`:**
   - ❌ **CẤM:** Không tự động tạo git commit sau khi sửa đổi code nếu chưa có lệnh rõ ràng từ người dùng.
   - ❌ **CẤM:** Tuyệt đối KHÔNG chạy `git push` trong mọi tình huống trừ khi người dùng chỉ thị rõ ràng.
2. **Chỉ commit khi người dùng yêu cầu trực tiếp:**
   - Chỉ khi người dùng nói cụ thể (ví dụ: "commit đi", "commit giúp", "lưu commit này",...), AI mới được phép thực thi lệnh `git commit`.

---

## 🔒 7. QUY TẮC BẢO MẬT & BIẾN MÔI TRƯỜNG: CẤM FALLBACK VÀ LỘ ENV VÀO CODE

1. **Tuyệt đối KHÔNG sử dụng Fallback (`||`, `&&`, hoặc toán tử 3 ngôi `? :` để gán giá trị mặc định cho biến môi trường / trạng thái):**
   - ❌ **CẤM:** Không viết kiểu `process.env.VAR || 'default'`, `process.env.VAR ? process.env.VAR : 'default'`.
   - ❌ **CẤM:** Không dùng fallback cho logic nghiệp vụ khiến mã nguồn che giấu lỗi thiếu dữ liệu (`let x = a || b`). Mọi biến số và điều kiện phải được kiểm tra kiểu (`typeof`, `if/else`) tường minh và chuẩn mực.
2. **Tuyệt đối KHÔNG gán cứng (hardcode) giá trị bí mật / cấu hình `.env` vào mã nguồn:**
   - ❌ **CẤM:** Không chèn URL, mật khẩu, ID bí mật, auth token hay thông số game làm giá trị fallback/dự phòng trong file mã nguồn.
   - ❌ **Lý do:** Lộ giá trị vào code khiến file `.env` bị vô hiệu hóa, gây rò rỉ bảo mật khi chia sẻ code và làm sai lệch cấu hình thực tế khi deploy lên server/cloud (như Render).
3. **Kiểm định 100% biến môi trường bắt buộc khi khởi động (Fail-Fast):**
   - Toàn bộ tham số cấu hình phải được nạp trực tiếp 100% từ `process.env`.
   - Bắt buộc kiểm tra danh sách biến môi trường ngay khi ứng dụng khởi chạy. Nếu thiếu bất kỳ biến nào trong file `.env`, hệ thống phải ném lỗi (`throw new Error(...)`) và dừng ngay lập tức để người vận hành bổ sung kịp thời, tuyệt đối không âm thầm chạy với giá trị dự phòng.

---

## 🛡️ 8. NGUYÊN TẮC BẢO TOÀN TÀI NGUYÊN & QUẢN LÝ PHIÊN (ZERO RESOURCE CONSUMPTION & AUTO-OFF)

1. **Bảo toàn tài nguyên game 100%:**
   - Tuyệt đối KHÔNG tự ý dùng Vàng, Bạc, Đan dược quý trừ các tính năng mua miễn phí hoặc lượt quay free mỗi ngày.
   - Không tự ý mua thêm lượt hay nâng cấp tốn phí nếu không có lệnh rõ ràng từ người dùng.
2. **Xử lý ngắt kết nối an toàn khi bị đăng nhập nơi khác (`101203 ResSubstitute`):**
   - Khi phát hiện mã `101203` (chủ tài khoản đăng nhập trên điện thoại/web khác) $\rightarrow$ Ngắt socket ngay lập tức, OFF bot luôn để tránh tranh chấp session làm ảnh hưởng trải nghiệm người dùng thật.
3. **Quản lý vòng đời phiên & giải phóng bộ nhớ (No Memory Leak):**
   - Với các module chạy theo phase / sự kiện hạn giờ: Thực thi xong task thì phải đóng WebSocket (`client.close()`) ngay lập tức, không treo kết nối rỗng hàng giờ.
   - Dọn sạch timer heartbeat, ping-pong, timeout và listeners khi ngắt kết nối để đảm bảo tiến trình chạy 24/7 ổn định, không rò rỉ bộ nhớ RAM.

---

## 💬 9. QUY TẮC CHÚ THÍCH & COMMENT TỐI GIẢN (NO DECORATIVE BANNERS)

1. **Loại bỏ chú thích thừa và trang trí hoa văn:**
   - ❌ **CẤM:** Không viết các comment dạng hoa văn trang trí như `// ------------`, `// ============`, `# ============`, các dải phân cách dài dòng hay banner nghệ thuật chiếm diện tích trong file code/config.
   - ❌ **CẤM:** Không viết comment lặp lại hiển nhiên hành động của code (ví dụ: `// Khởi tạo biến a` trên dòng `let a = 1;`).
2. **Tối ưu viết chú thích ngắn gọn, súc tích:**
   - Viết ngắn gọn trong một vài dòng hoặc tối ưu thành đúng 1 dòng mô tả ngắn gọn, dễ hiểu.
   - Chỉ giữ lại chú thích giải thích lý do (Why) hoặc bối cảnh logic phi trực quan thật sự cần thiết.
