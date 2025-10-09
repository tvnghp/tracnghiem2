// ===================================================================
// GOOGLE APPS SCRIPT - PASTE CODE NÀY VÀO GOOGLE SHEETS
// ===================================================================
// 
// HƯỚNG DẪN:
// 1. Mở Google Sheet của bạn
// 2. Vào: Extensions > Apps Script
// 3. Xóa code mặc định
// 4. Copy toàn bộ code này và paste vào
// 5. Click Save (Ctrl+S)
// 6. Click Deploy > New deployment
// 7. Chọn type: "Web app"
// 8. Execute as: "Me"
// 9. Who has access: "Anyone"
// 10. Click "Deploy" và copy URL
// ===================================================================

function doPost(e) {
  try {
    const data = JSON.parse(e.postData.contents);
    const action = data.action;
    
    if (action === 'submitQuiz') {
      return handleSubmitQuiz(data);
    } else if (action === 'getStatistics') {
      return handleGetStatistics(data);
    }
    
    return createResponse(false, 'Unknown action');
  } catch (error) {
    return createResponse(false, 'Error: ' + error.message);
  }
}

function doGet(e) {
  const action = e.parameter.action;
  
  if (action === 'getStatistics') {
    return handleGetStatistics(e.parameter);
  } else if (action === 'getLeaderboard') {
    return handleGetLeaderboard(e.parameter);
  } else if (action === 'test') {
    return ContentService.createTextOutput('Google Apps Script is working!');
  }
  
  return ContentService.createTextOutput('Quiz Statistics API is running');
}

// Xử lý submit quiz
function handleSubmitQuiz(data) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  
  // Sheet 1: Submissions
  let submissionsSheet = ss.getSheetByName('Submissions');
  if (!submissionsSheet) {
    submissionsSheet = ss.insertSheet('Submissions');
    submissionsSheet.appendRow([
      'Timestamp', 'User ID', 'Full Name', 'Branch', 'Topic ID', 'Topic Name', 'Is Exam', 
      'Total Questions', 'Correct Answers', 'Wrong Answers', 'Score (%)', 
      'Duration (minutes)', 'IP Address', 'User Agent'
    ]);
  }
  
  // Thêm dữ liệu submission
  submissionsSheet.appendRow([
    new Date(),
    data.userId || 'Anonymous',
    data.fullname || 'Người dùng ẩn danh',
    data.branch || 'Không xác định',
    data.topicId,
    data.topicName,
    data.isExam ? 'Yes' : 'No',
    data.totalQuestions,
    data.correctAnswers,
    data.wrongAnswers,
    data.score,
    data.duration || 0,
    data.ipAddress || '',
    data.userAgent || ''
  ]);
  
  // Sheet 2: Wrong Answers
  if (data.wrongAnswersList && data.wrongAnswersList.length > 0) {
    let wrongAnswersSheet = ss.getSheetByName('WrongAnswers');
    if (!wrongAnswersSheet) {
      wrongAnswersSheet = ss.insertSheet('WrongAnswers');
      wrongAnswersSheet.appendRow([
        'Timestamp', 'User ID', 'Topic ID', 'Topic Name', 
        'Question', 'Option A', 'Option B', 'Option C', 'Option D',
        'User Answer', 'Correct Answer', 'Explanation'
      ]);
    }
    
    // Thêm từng câu sai
    data.wrongAnswersList.forEach(function(answer) {
      wrongAnswersSheet.appendRow([
        new Date(),
        data.userId || 'Anonymous',
        data.topicId,
        data.topicName,
        answer.question,
        answer.optionA || '',
        answer.optionB || '',
        answer.optionC || '',
        answer.optionD || '',
        answer.userAnswer,
        answer.correctAnswer,
        answer.explanation || ''
      ]);
    });
  }
  
  return createResponse(true, 'Data saved successfully');
}

// Lấy thống kê
function handleGetStatistics(params) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const submissionsSheet = ss.getSheetByName('Submissions');
  const wrongAnswersSheet = ss.getSheetByName('WrongAnswers');
  
  if (!submissionsSheet) {
    return createResponse(false, 'No data available');
  }
  
  // Lấy dữ liệu submissions
  const submissionsData = submissionsSheet.getDataRange().getValues();
  const headers = submissionsData[0];
  const rows = submissionsData.slice(1);
  
  // Chuyển đổi sang JSON
  const submissions = rows.map(function(row) {
    const obj = {};
    headers.forEach(function(header, index) {
      obj[header] = row[index];
    });
    return obj;
  });
  
  // Thống kê theo topic
  const topicStats = {};
  submissions.forEach(function(sub) {
    const topicId = sub['Topic ID'];
    if (!topicStats[topicId]) {
      topicStats[topicId] = {
        topicId: topicId,
        topicName: sub['Topic Name'],
        isExam: sub['Is Exam'] === 'Yes',
        attempts: 0,
        totalQuestions: 0,
        totalCorrect: 0,
        totalWrong: 0,
        avgScore: 0,
        bestScore: 0
      };
    }
    
    topicStats[topicId].attempts++;
    topicStats[topicId].totalQuestions += sub['Total Questions'];
    topicStats[topicId].totalCorrect += sub['Correct Answers'];
    topicStats[topicId].totalWrong += sub['Wrong Answers'];
    topicStats[topicId].bestScore = Math.max(topicStats[topicId].bestScore, sub['Score (%)']);
  });
  
  // Tính điểm trung bình
  Object.keys(topicStats).forEach(function(topicId) {
    const stat = topicStats[topicId];
    stat.avgScore = Math.round((stat.totalCorrect / stat.totalQuestions) * 100);
  });
  
  // Lấy câu sai thường gặp
  let frequentWrongAnswers = [];
  if (wrongAnswersSheet) {
    const wrongData = wrongAnswersSheet.getDataRange().getValues();
    const wrongHeaders = wrongData[0];
    const wrongRows = wrongData.slice(1);
    
    // Đếm số lần sai của mỗi câu
    const questionCount = {};
    wrongRows.forEach(function(row) {
      const question = row[4]; // Question column
      if (question) {
        if (!questionCount[question]) {
          questionCount[question] = {
            question: question,
            topicName: row[3],
            optionA: row[5],
            optionB: row[6],
            optionC: row[7],
            optionD: row[8],
            correctAnswer: row[10],
            count: 0
          };
        }
        questionCount[question].count++;
      }
    });
    
    // Sắp xếp theo số lần sai
    frequentWrongAnswers = Object.values(questionCount)
      .sort(function(a, b) { return b.count - a.count; })
      .slice(0, 20); // Top 20
  }
  
  const result = {
    topicStats: Object.values(topicStats),
    frequentWrongAnswers: frequentWrongAnswers,
    totalSubmissions: submissions.length,
    lastUpdate: new Date().toISOString()
  };
  
  return createResponse(true, 'Success', result);
}

// Lấy bảng xếp hạng người dùng
function handleGetLeaderboard(params) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const submissionsSheet = ss.getSheetByName('Submissions');
  
  if (!submissionsSheet) {
    return createResponse(false, 'No data available');
  }
  
  // Lấy dữ liệu submissions
  const submissionsData = submissionsSheet.getDataRange().getValues();
  const headers = submissionsData[0];
  const rows = submissionsData.slice(1);
  
  // Chuyển đổi sang JSON
  const submissions = rows.map(function(row) {
    const obj = {};
    headers.forEach(function(header, index) {
      obj[header] = row[index];
    });
    return obj;
  });
  
  // Lọc theo topic nếu có
  let filteredSubmissions = submissions;
  if (params.topicId) {
    filteredSubmissions = submissions.filter(function(sub) {
      return sub['Topic ID'] === params.topicId;
    });
  }
  
  // Sắp xếp theo điểm giảm dần, sau đó theo thời gian (mới nhất)
  filteredSubmissions.sort(function(a, b) {
    if (b['Score (%)'] !== a['Score (%)']) {
      return b['Score (%)'] - a['Score (%)'];
    }
    return new Date(b['Timestamp']) - new Date(a['Timestamp']);
  });
  
  // Tạo bảng xếp hạng
  const leaderboard = filteredSubmissions.map(function(sub, index) {
    return {
      rank: index + 1,
      userId: sub['User ID'],
      fullname: sub['Full Name'] || 'Người dùng ẩn danh',
      branch: sub['Branch'] || 'Không xác định',
      topicId: sub['Topic ID'],
      topicName: sub['Topic Name'],
      score: sub['Score (%)'],
      correctAnswers: sub['Correct Answers'],
      totalQuestions: sub['Total Questions'],
      timestamp: sub['Timestamp'],
      isExam: sub['Is Exam'] === 'Yes'
    };
  });
  
  // Thống kê tổng quan
  const totalAttempts = filteredSubmissions.length;
  const avgScore = totalAttempts > 0 ? 
    Math.round(filteredSubmissions.reduce(function(sum, sub) { return sum + sub['Score (%)']; }, 0) / totalAttempts) : 0;
  const bestScore = totalAttempts > 0 ? Math.max(...filteredSubmissions.map(function(sub) { return sub['Score (%)']; })) : 0;
  
  const result = {
    leaderboard: leaderboard.slice(0, 50), // Top 50
    totalAttempts: totalAttempts,
    avgScore: avgScore,
    bestScore: bestScore,
    lastUpdate: new Date().toISOString()
  };
  
  return createResponse(true, 'Success', result);
}

// Tạo response
function createResponse(success, message, data) {
  const response = {
    success: success,
    message: message,
    data: data || null
  };
  
  return ContentService
    .createTextOutput(JSON.stringify(response))
    .setMimeType(ContentService.MimeType.JSON);
}
