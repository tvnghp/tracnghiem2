# 🚀 Hướng dẫn Setup Google Sheets cho GitHub Pages

## 📋 Tổng quan

Hướng dẫn này sẽ giúp bạn setup Google Sheets để lưu trữ dữ liệu từ trang web trắc nghiệm trên GitHub Pages.

## 🎯 Mục đích

- ✅ Lưu trữ kết quả làm bài của tất cả người dùng
- ✅ Hiển thị bảng xếp hạng online
- ✅ Phân tích câu hỏi khó nhất
- ✅ Thống kê tổng hợp từ nhiều người dùng

---

## 📋 BƯỚC 1: TẠO GOOGLE SHEET

### 1.1. Tạo Google Sheet mới
1. Truy cập: https://sheets.google.com
2. Click **"+ Blank"** để tạo sheet mới
3. Đặt tên: **"Quiz Statistics - Cần Thơ II"**

### 1.2. Tạo các sheet con
1. **Sheet 1**: Đổi tên thành **"Submissions"**
2. **Sheet 2**: Click **"+"** → **"Sheet"** → Đặt tên **"WrongAnswers"**

### 1.3. Import dữ liệu mẫu (Tùy chọn)
1. **Sheet "Submissions"**: 
   - File → Import → Upload → Chọn `GOOGLE_SHEET_TEMPLATE.csv`
   - Chọn "Replace data at selected cell"
   - Click "Import data"

2. **Sheet "WrongAnswers"**:
   - File → Import → Upload → Chọn `WRONG_ANSWERS_TEMPLATE.csv`
   - Chọn "Replace data at selected cell"
   - Click "Import data"

---

## 📋 BƯỚC 2: SETUP GOOGLE APPS SCRIPT

### 2.1. Mở Apps Script Editor
1. Trong Google Sheet, vào menu: **Extensions** → **Apps Script**
2. Một tab mới sẽ mở ra với code editor

### 2.2. Paste code
1. **XÓA HẾT** code mặc định trong editor
2. Mở file `google-apps-script.js` trong thư mục dự án
3. **Copy toàn bộ** nội dung file
4. **Paste** vào Apps Script editor
5. Click **Save** (Ctrl+S)

### 2.3. Deploy Web App
1. Click **Deploy** → **New deployment**
2. Chọn **Type**: **"Web app"**
3. **Execute as**: **"Me"**
4. **Who has access**: **"Anyone"**
5. Click **Deploy**
6. **Copy "Web app URL"** (sẽ cần dùng ở bước sau)

---

## 📋 BƯỚC 3: CẤU HÌNH WEBSITE

### 3.1. Cập nhật config.js
1. Mở file `config.js`
2. Thay thế dòng:
   ```javascript
   GOOGLE_SCRIPT_URL: 'PASTE_YOUR_WEB_APP_URL_HERE',
   ```
   Bằng URL bạn đã copy ở bước 2.3:
   ```javascript
   GOOGLE_SCRIPT_URL: 'https://script.google.com/macros/s/YOUR_SCRIPT_ID/exec',
   ```

### 3.2. Kiểm tra cấu hình
Đảm bảo các cấu hình sau:
```javascript
ENABLE_CLOUD_SYNC: true,  // Bật đồng bộ lên Google Sheets
AUTO_SEND: false,         // false = hỏi người dùng trước khi gửi
                          // true = tự động gửi không hỏi
```

### 3.3. Save và commit
```bash
git add config.js
git commit -m "Configure Google Sheets integration"
git push
```

---

## 📋 BƯỚC 4: TEST HỆ THỐNG

### 4.1. Test trên local
1. Mở `index.html` trong trình duyệt
2. Làm bài và nộp
3. Kiểm tra:
   - Có thông báo "✓ Đã gửi kết quả lên hệ thống thống kê" không?
   - Mở Google Sheet → Sheet "Submissions" → Có dữ liệu mới không?
   - Sheet "WrongAnswers" → Có câu sai không?

### 4.2. Test trên GitHub Pages
1. Push code lên GitHub
2. Truy cập: https://tvnghp.github.io/Tracnghiem/
3. Làm bài và nộp
4. Kiểm tra Google Sheet

### 4.3. Nếu có lỗi
**Lỗi: "Không thể gửi dữ liệu lên hệ thống"**
- Kiểm tra URL trong `config.js` có đúng không
- Kiểm tra Apps Script đã deploy chưa
- Kiểm tra quyền truy cập Web app

**Lỗi: "Google Sheets chưa được cấu hình"**
- Kiểm tra `GOOGLE_SCRIPT_URL` trong `config.js`
- Đảm bảo URL chứa `script.google.com`

---

## 📋 BƯỚC 5: XEM THỐNG KÊ

### 5.1. Xem trực tiếp trong Google Sheets
- Mở Google Sheet
- Sheet "Submissions": Xem tổng quan kết quả
- Sheet "WrongAnswers": Xem chi tiết câu sai

### 5.2. Xem bảng xếp hạng online
1. Truy cập: https://tvnghp.github.io/Tracnghiem/
2. Click **"Thống kê tổng quát"**
3. Scroll xuống phần **"🏆 Bảng xếp hạng Online"**
4. Xem bảng xếp hạng người dùng với:
   - Họ tên và đơn vị
   - Điểm số và kết quả
   - Thời gian làm bài

### 5.3. Tạo Dashboard (Nâng cao)
1. Trong Google Sheet, vào: **Insert** → **Chart**
2. Tạo các biểu đồ:
   - Biểu đồ cột: Số lần làm bài theo Topic
   - Biểu đồ tròn: Tỷ lệ đúng/sai
   - Biểu đồ đường: Điểm số theo thời gian

---

## 🔧 CẤU TRÚC DỮ LIỆU

### Sheet "Submissions"
| Cột | Mô tả | Ví dụ |
|-----|-------|-------|
| Timestamp | Thời gian nộp bài | 2025-01-10 10:30:00 |
| User ID | ID người dùng | user_1234567890 |
| Full Name | Họ tên | Nguyễn Văn A |
| Branch | Đơn vị | Chi nhánh Cần Thơ II |
| Topic ID | ID chuyên đề | topic_1 |
| Topic Name | Tên chuyên đề | Tin dụng |
| Is Exam | Có phải bài thi | No |
| Total Questions | Tổng số câu | 20 |
| Correct Answers | Số câu đúng | 18 |
| Wrong Answers | Số câu sai | 2 |
| Score (%) | Điểm phần trăm | 90 |
| Duration (minutes) | Thời gian làm bài | 15 |
| IP Address | Địa chỉ IP | 192.168.1.1 |
| User Agent | Thông tin trình duyệt | Mozilla/5.0... |

### Sheet "WrongAnswers"
| Cột | Mô tả | Ví dụ |
|-----|-------|-------|
| Timestamp | Thời gian nộp bài | 2025-01-10 10:30:00 |
| User ID | ID người dùng | user_1234567890 |
| Topic ID | ID chuyên đề | topic_1 |
| Topic Name | Tên chuyên đề | Tin dụng |
| Question | Câu hỏi | Lãi suất cơ bản... |
| Option A | Đáp án A | 3.5% |
| Option B | Đáp án B | 4.0% |
| Option C | Đáp án C | 4.5% |
| Option D | Đáp án D | 5.0% |
| User Answer | Đáp án người dùng chọn | B |
| Correct Answer | Đáp án đúng | A |
| Explanation | Giải thích | Lãi suất cơ bản... |

---

## 🚀 API ENDPOINTS

### 1. Submit Quiz Data
```
POST: https://script.google.com/macros/s/YOUR_SCRIPT_ID/exec
Content-Type: application/json

{
  "action": "submitQuiz",
  "userId": "user_1234567890",
  "fullname": "Nguyễn Văn A",
  "branch": "Chi nhánh Cần Thơ II",
  "topicId": "topic_1",
  "topicName": "Tin dụng",
  "isExam": false,
  "totalQuestions": 20,
  "correctAnswers": 18,
  "wrongAnswers": 2,
  "score": 90,
  "duration": 15,
  "wrongAnswersList": [...]
}
```

### 2. Get Statistics
```
GET: https://script.google.com/macros/s/YOUR_SCRIPT_ID/exec?action=getStatistics
```

### 3. Get Leaderboard
```
GET: https://script.google.com/macros/s/YOUR_SCRIPT_ID/exec?action=getLeaderboard
```

### 4. Get Leaderboard by Topic
```
GET: https://script.google.com/macros/s/YOUR_SCRIPT_ID/exec?action=getLeaderboard&topicId=topic_1
```

---

## 🔒 BẢO MẬT

- ✅ Dữ liệu được mã hóa khi truyền (HTTPS)
- ✅ Chỉ bạn có quyền truy cập Google Sheet
- ✅ User ID được tạo ngẫu nhiên (không lưu thông tin cá nhân)
- ✅ Có thể xóa dữ liệu bất kỳ lúc nào

---

## 📞 HỖ TRỢ

Nếu gặp vấn đề:
1. Kiểm tra console trong trình duyệt (F12)
2. Kiểm tra Apps Script logs
3. Kiểm tra Google Sheet permissions
4. Liên hệ: trungnguyenthanh1@agribank.com.vn

---

## 🎉 HOÀN THÀNH

Bây giờ hệ thống của bạn đã có thể:
✅ Tự động thu thập dữ liệu từ tất cả người dùng
✅ Lưu trữ an toàn trên Google Sheets
✅ Hiển thị bảng xếp hạng online
✅ Phân tích câu hỏi khó nhất
✅ Thống kê tổng hợp

**Chúc bạn sử dụng hiệu quả!** 🚀
