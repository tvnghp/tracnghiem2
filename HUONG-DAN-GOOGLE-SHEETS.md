# 📊 HƯỚNG DẪN CÀI ĐẶT GOOGLE SHEETS - THU THẬP DỮ LIỆU TỰ ĐỘNG

## 🎯 Mục đích
Hệ thống sẽ tự động gửi kết quả làm bài của tất cả người dùng lên Google Sheets để bạn có thể:
- ✅ Xem thống kê tổng hợp từ nhiều người dùng
- ✅ Phân tích câu hỏi nào khó nhất (nhiều người sai)
- ✅ Theo dõi tiến độ học tập
- ✅ Xuất báo cáo Excel từ Google Sheets

---

## 📋 BƯỚC 1: TẠO GOOGLE SHEET

### 1.1. Tạo Sheet mới
1. Truy cập: https://sheets.google.com
2. Click **"Blank"** để tạo sheet mới
3. Đặt tên: **"Quiz Statistics - Tracnghiem Cần Thơ II"**

### 1.2. Tạo 2 sheets con
**Sheet 1: Submissions** (Lưu kết quả làm bài)
- Click vào tab sheet ở dưới cùng
- Đổi tên thành: **Submissions**
- Thêm header row (dòng đầu tiên):
  ```
  Timestamp | User ID | Topic ID | Topic Name | Is Exam | Total Questions | Correct Answers | Wrong Answers | Score (%) | Duration (minutes) | IP Address | User Agent
  ```

**Sheet 2: WrongAnswers** (Lưu câu trả lời sai)
- Click dấu **+** ở cuối các tabs
- Đổi tên thành: **WrongAnswers**
- Thêm header row:
  ```
  Timestamp | User ID | Topic ID | Topic Name | Question | Option A | Option B | Option C | Option D | User Answer | Correct Answer | Explanation
  ```

### 1.3. Format đẹp (Tùy chọn)
- Chọn dòng header → **Bold** (Ctrl+B)
- Chọn dòng header → **Background color**: Màu xanh nhạt
- Chọn dòng header → **Text alignment**: Center
- Freeze header row: View → Freeze → 1 row

---

## 📋 BƯỚC 2: SETUP GOOGLE APPS SCRIPT

### 2.1. Mở Apps Script Editor
1. Trong Google Sheet, vào menu: **Extensions** → **Apps Script**
2. Một tab mới sẽ mở ra với code editor

### 2.2. Paste code
1. **XÓA HẾT** code mặc định trong editor
2. Mở file `google-apps-script.js` trong thư mục dự án
3. **COPY TOÀN BỘ** code trong file đó
4. **PASTE** vào Apps Script Editor
5. Click **Save** (hoặc Ctrl+S)
6. Đặt tên project: **"Quiz Statistics API"**

### 2.3. Test code (Quan trọng!)
1. Chọn function: **doGet** trong dropdown
2. Click **Run** (▶️)
3. Lần đầu sẽ yêu cầu quyền:
   - Click **Review permissions**
   - Chọn tài khoản Google của bạn
   - Click **Advanced** → **Go to Quiz Statistics API (unsafe)**
   - Click **Allow**
4. Nếu thành công, bạn sẽ thấy "Execution completed"

---

## 📋 BƯỚC 3: DEPLOY WEB APP

### 3.1. Deploy
1. Click nút **Deploy** (góc trên bên phải) → **New deployment**
2. Click biểu tượng **⚙️ Settings** bên cạnh "Select type"
3. Chọn: **Web app**
4. Cấu hình:
   - **Description**: "Quiz Statistics API v1"
   - **Execute as**: **Me** (your-email@gmail.com)
   - **Who has access**: **Anyone**
5. Click **Deploy**
6. Sẽ có popup xác nhận quyền → Click **Authorize access**
7. Chọn tài khoản → Allow

### 3.2. Copy Web App URL
1. Sau khi deploy thành công, bạn sẽ thấy:
   ```
   Web app
   URL: https://script.google.com/macros/s/AKfycby.../exec
   ```
2. **COPY URL này** (rất quan trọng!)
3. Click **Done**

---

## 📋 BƯỚC 4: CẤU HÌNH HỆ THỐNG QUIZ

### 4.1. Mở file config.js
1. Trong thư mục dự án, mở file: `config.js`
2. Tìm dòng:
   ```javascript
   GOOGLE_SCRIPT_URL: 'PASTE_YOUR_WEB_APP_URL_HERE',
   ```
3. **PASTE URL** bạn vừa copy vào giữa dấu nháy đơn:
   ```javascript
   GOOGLE_SCRIPT_URL: 'https://script.google.com/macros/s/AKfycby.../exec',
   ```

### 4.2. Bật tính năng đồng bộ
Đảm bảo các cấu hình sau:
```javascript
ENABLE_CLOUD_SYNC: true,  // Bật đồng bộ lên Google Sheets
AUTO_SEND: false,         // false = hỏi người dùng trước khi gửi
                          // true = tự động gửi không hỏi
```

### 4.3. Save và commit
1. Save file `config.js`
2. Commit và push lên GitHub:
   ```bash
   git add config.js
   git commit -m "Configure Google Sheets integration"
   git push
   ```

---

## 📋 BƯỚC 5: TEST HỆ THỐNG

### 5.1. Test trên local
1. Mở `index.html` trong trình duyệt
2. Chọn một chuyên đề và làm bài
3. Nộp bài
4. Kiểm tra:
   - Có thông báo "✓ Đã gửi kết quả lên hệ thống thống kê" không?
   - Mở Google Sheet → Sheet "Submissions" → Có dữ liệu mới không?
   - Sheet "WrongAnswers" → Có câu sai không?

### 5.2. Test trên GitHub Pages
1. Push code lên GitHub
2. Truy cập: https://tvnghp.github.io/Tracnghiem/index.html
3. Làm bài và nộp
4. Kiểm tra Google Sheet

### 5.3. Nếu có lỗi
**Lỗi: "Không thể gửi dữ liệu lên hệ thống"**
- Kiểm tra URL trong `config.js` có đúng không
- Kiểm tra Apps Script đã deploy chưa
- Mở Console (F12) xem lỗi chi tiết

**Lỗi: "CORS"**
- Đảm bảo trong code có: `mode: 'no-cors'`
- Đảm bảo Apps Script deploy với "Who has access: Anyone"

---

## 📊 BƯỚC 6: XEM THỐNG KÊ

### 6.1. Xem trực tiếp trong Google Sheets
- Mở Google Sheet
- Sheet "Submissions": Xem tổng quan kết quả
- Sheet "WrongAnswers": Xem chi tiết câu sai

### 6.2. Tạo Dashboard (Nâng cao)
1. Trong Google Sheet, vào: **Insert** → **Chart**
2. Tạo các biểu đồ:
   - Biểu đồ cột: Số lần làm bài theo Topic
   - Biểu đồ tròn: Tỷ lệ đúng/sai
   - Biểu đồ đường: Điểm số theo thời gian

### 6.3. Xuất báo cáo
1. **File** → **Download** → **Microsoft Excel (.xlsx)**
2. Hoặc sử dụng Google Data Studio để tạo dashboard chuyên nghiệp

---

## 🔧 CÁC TÍNH NĂNG BỔ SUNG

### Tự động gửi email báo cáo
Thêm vào Apps Script:
```javascript
function sendDailyReport() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName('Submissions');
  const data = sheet.getDataRange().getValues();
  
  // Tạo nội dung email
  const subject = 'Báo cáo thống kê Quiz - ' + new Date().toLocaleDateString('vi-VN');
  const body = 'Tổng số bài làm hôm nay: ' + (data.length - 1);
  
  // Gửi email
  MailApp.sendEmail('your-email@gmail.com', subject, body);
}
```

Sau đó setup trigger:
1. Apps Script Editor → **Triggers** (⏰ icon)
2. **Add Trigger**
3. Function: `sendDailyReport`
4. Event: Time-driven → Day timer → 6pm to 7pm

---

## ❓ TROUBLESHOOTING

### Vấn đề 1: Không thấy dữ liệu trong Sheet
**Nguyên nhân:** Apps Script chưa có quyền ghi
**Giải pháp:**
1. Vào Apps Script Editor
2. Run function `doPost` một lần để cấp quyền
3. Hoặc re-deploy Web App

### Vấn đề 2: Dữ liệu bị trùng
**Nguyên nhân:** Người dùng làm bài nhiều lần
**Giải pháp:** Đây là hành vi bình thường, mỗi lần làm bài sẽ tạo 1 record mới

### Vấn đề 3: Sheet bị đầy
**Giải pháp:**
1. Tạo sheet mới cho tháng mới
2. Hoặc archive data cũ sang file khác
3. Google Sheets hỗ trợ tối đa 10 triệu cells

---

## 📞 HỖ TRỢ

Nếu gặp vấn đề, liên hệ:
- **Email**: trungnguyenthanh1@agribank.com.vn
- **Phone**: 0947.86.86.82

---

## 🎉 HOÀN TẤT!

Bây giờ hệ thống của bạn đã có thể:
✅ Tự động thu thập dữ liệu từ tất cả người dùng
✅ Lưu trữ an toàn trên Google Sheets
✅ Xem thống kê tổng hợp
✅ Xuất báo cáo Excel
✅ Phân tích câu hỏi khó

**Chúc bạn sử dụng hiệu quả!** 🚀
