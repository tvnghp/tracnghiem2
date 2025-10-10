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
  GOOGLE_SCRIPT_URL: 'https://script.google.com/macros/s/AKfycbwMlA1bsXBOiIGCsfEPmqicd4RuSlI9L5S0dgUSZl2Zr_r5hmCfCa3FCL1x-Riz5zAs/exec',
  
  // Bật/tắt tính năng gửi dữ liệu lên Google Sheets
  ENABLE_CLOUD_SYNC: true,
  
  // Tự động gửi khi nộp bài (true) hoặc hỏi người dùng (false)
  AUTO_SEND: false,
  
  // Thông tin hiển thị
  APP_NAME: 'Hệ thống ôn luyện trắc nghiệm Cần Thơ II',
  CONTACT_EMAIL: 'trungnguyenthanh1@agribank.com.vn',
  CONTACT_PHONE: '0947.86.86.82'
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
