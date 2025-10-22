// Cấu hình Google Sheets
// HƯỚNG DẪN SETUP - ĐỌC KỸ TRƯỚC KHI SỬ DỤNG:
// 
// BƯỚC 1: Tạo Google Sheet
// - Truy cập: https://sheets.google.com
// - Tạo sheet mới tên "Quiz Statistics"
// - Tạo 2 sheets con:
//   + Sheet 1: "Submissions" (Lưu kết quả làm bài)
//   + Sheet 2: "WrongAnswers" (Lưu câu trả lời sai)
//
// BƯỚC 2: Setup Google Apps Script
// - Trong Google Sheet, vào: Extensions > Apps Script
// - Xóa code mặc định, paste code từ file "google-apps-script.js" (sẽ tạo ở bước sau)
// - Click "Deploy" > "New deployment"
// - Chọn type: "Web app"
// - Execute as: "Me"
// - Who has access: "Anyone"
// - Click "Deploy"
// - Copy "Web app URL" và paste vào GOOGLE_SCRIPT_URL bên dưới
//
// BƯỚC 3: Cấu hình
const CONFIG = {
  // Paste Web app URL của bạn vào đây (sau khi deploy Apps Script)
  GOOGLE_SCRIPT_URL: 'https://script.google.com/macros/s/AKfycbyu_KfkYkyeI7Wa4lS_zBONHe7OGXYbz43t-7S19Vl3-B25UTZmAgT2-0wc3FM4aVuG/exec',
  
  // Bật/tắt tính năng gửi dữ liệu lên Google Sheets
  // false = CHỈ lưu LOCAL (localStorage), KHÔNG gửi lên Google Sheets
  // true = Lưu local VÀ có thể gửi lên Google Sheets
  ENABLE_CLOUD_SYNC: true,
  
  // Tự động gửi khi nộp bài (true) hoặc hỏi người dùng (false)
  AUTO_SEND: false,
  
  // Thông tin hiển thị
  APP_NAME: 'Hệ thống ôn luyện trắc nghiệm Cần Thơ II',
  CONTACT_EMAIL: 'trungnguyenthanh1@agribank.com.vn',
  CONTACT_PHONE: '0947.86.86.82',
  
  // ⚠️ QUAN TRỌNG: Tăng số này MỖI KHI thay đổi topics.json để buộc tải dữ liệu mới
  // Ví dụ: Thêm câu hỏi mới, sửa đề thi → tăng từ 1 lên 2, 3, 4...
  DATA_VERSION: 1
};

// Kiểm tra cấu hình
function isConfigured() {
  return CONFIG.GOOGLE_SCRIPT_URL && 
         CONFIG.GOOGLE_SCRIPT_URL !== 'PASTE_YOUR_WEB_APP_URL_HERE' &&
         CONFIG.GOOGLE_SCRIPT_URL.includes('script.google.com');
}

// Export config
window.QUIZ_CONFIG = CONFIG;
window.isConfigured = isConfigured;
