// Admin credentials - now using IndexedDB via quizStorage
async function getAdminCredentials() {
  // Wait for quizStorage to be ready
  let retries = 50;
  while (!window.quizStorage && retries > 0) {
    await new Promise(resolve => setTimeout(resolve, 100));
    retries--;
  }
  
  if (!window.quizStorage) {
    return { username: 'admin', password: 'admin123' }; // Default fallback
  }
  
  return await window.quizStorage.getAdminCredentials();
}

async function setAdminCredentials(username, password) {
  // Wait for quizStorage to be ready
  let retries = 50;
  while (!window.quizStorage && retries > 0) {
    await new Promise(resolve => setTimeout(resolve, 100));
    retries--;
  }
  
  if (!window.quizStorage) {
    return false;
  }
  
  return await window.quizStorage.setAdminCredentials(username, password);
}

let ADMIN_CREDENTIALS = null;

async function checkAuth() {
  // window.db and window.quizStorage should already be ready by DOMContentLoaded
  if (!window.quizStorage) {
    console.error('❌ checkAuth called but window.quizStorage not available');
    return false;
  }
  
  try {
    return await window.quizStorage.isAdminAuthenticated();
  } catch (error) {
    console.error('❌ Error checking auth:', error);
    return false;
  }
}

async function handleLogin(e) {
  e.preventDefault();
  const username = document.getElementById('username').value;
  const password = document.getElementById('password').value;
  
  // Wait for quizStorage to be ready
  let retries = 50;
  while (!window.quizStorage && retries > 0) {
    await new Promise(resolve => setTimeout(resolve, 100));
    retries--;
  }
  
  if (!window.quizStorage) {
    alert('❌ Lỗi: IndexedDB chưa sẵn sàng. Vui lòng refresh trang!');
    return;
  }
  
  // Get current credentials from IndexedDB
  const currentCreds = await getAdminCredentials();
  
  if (username === currentCreds.username && password === currentCreds.password) {
    await window.quizStorage.setAdminAuthenticated(true);
    showAdminPanel();
  } else {
    alert('Tên đăng nhập hoặc mật khẩu không đúng!');
  }
}

async function handleLogout() {
  // Wait for quizStorage to be ready
  let retries = 50;
  while (!window.quizStorage && retries > 0) {
    await new Promise(resolve => setTimeout(resolve, 100));
    retries--;
  }
  
  if (window.quizStorage) {
    await window.quizStorage.setAdminAuthenticated(false);
  }
  showLoginForm();
}

function showAdminPanel() {
  document.getElementById('login-container').style.display = 'none';
  document.getElementById('admin-container').style.display = 'block';
  renderTopics();
}

function showLoginForm() {
  document.getElementById('login-container').style.display = 'block';
  document.getElementById('admin-container').style.display = 'none';
  document.getElementById('login-form').reset();
}

async function getTopics() {
  try {
    if (!window.quizStorage) {
      console.error('❌ window.quizStorage not available');
      return [];
    }
    
    console.log('🔍 Getting topics from quizStorage...');
    const topicsJson = await window.quizStorage.getTopics();
    console.log('📊 Topics JSON:', topicsJson ? 'Found data' : 'No data');
    
    const topics = JSON.parse(topicsJson || '[]');
    console.log('✅ Parsed topics:', topics.length, 'items');
    return topics;
  } catch (error) {
    console.error('❌ Error getting topics:', error);
    return [];
  }
}

async function saveTopics(topics) {
  await window.quizStorage.saveTopics(topics);
}

async function checkAndInitializeData() {
  console.log('🔍 Checking and initializing data...');
  
  try {
    // Kiểm tra phiên bản dữ liệu để buộc tải lại khi có thay đổi
    let shouldForceReload = false;
    try {
      const storedVersion = await window.db.getConfig('data_version');
      const currentVersion = window.QUIZ_CONFIG?.DATA_VERSION || 1;
      
      if (storedVersion) {
        const storedVer = parseInt(storedVersion);
        if (storedVer < currentVersion) {
          console.log(`⚠️ Phát hiện phiên bản dữ liệu mới: ${storedVer} → ${currentVersion}. Buộc tải lại...`);
          shouldForceReload = true;
          // Xóa cache cũ
          await window.db.deleteConfig('quiz_topics');
          await window.db.clearTopics();
          console.log('✅ Đã xóa cache cũ');
        }
      } else {
        // Lần đầu tiên hoặc chưa có version
        shouldForceReload = true;
      }
    } catch (e) {
      console.error('Error checking data version:', e);
    }
    
    // Check if we have any topics in IndexedDB
    const topics = await getTopics();
    console.log('📊 Current topics in IndexedDB:', topics.length);
    
    if (topics.length === 0 || shouldForceReload) {
      if (shouldForceReload) {
        console.log('🔄 Bỏ qua cache, tải dữ liệu mới từ server...');
      } else {
        console.log('⚠️ No topics found, trying to load from topics.json...');
      }
      
      // Try to load from topics.json file
      try {
        // Add cache busting
        const url = new URL('./topics.json', location.href);
        url.searchParams.set('v', Date.now());
        
        const response = await fetch(url, { 
          cache: 'no-store',
          headers: {
            'Accept': 'application/json'
          }
        });
        
        if (response.ok) {
          const topicsData = await response.json();
          console.log('✅ Loaded topics from topics.json:', topicsData.length);
          
          if (topicsData.length > 0) {
            // Save to IndexedDB
            await saveTopics(topicsData);
            console.log('✅ Saved topics to IndexedDB');
            
            // Lưu phiên bản hiện tại
            const currentVersion = window.QUIZ_CONFIG?.DATA_VERSION || 1;
            await window.db.setConfig('data_version', currentVersion.toString());
            console.log(`✅ Đã lưu dữ liệu mới với phiên bản ${currentVersion}`);
            
            // Show success message
            const msgEl = document.getElementById('topic-msg');
            if (msgEl) {
              msgEl.textContent = `Đã tải ${topicsData.length} chuyên đề từ topics.json (v${currentVersion})`;
              msgEl.className = 'ml-2 success';
              setTimeout(() => {
                msgEl.textContent = '';
                msgEl.className = '';
              }, 3000);
            }
          }
        } else {
          console.error('❌ Failed to fetch topics.json:', response.status);
        }
      } catch (error) {
        console.error('❌ Error loading topics.json:', error);
      }
    } else {
      console.log('✅ Topics already exist in IndexedDB');
    }
  } catch (error) {
    console.error('❌ Error checking/initializing data:', error);
  }
}

function uuid() {
  return 'topic-' + Math.random().toString(36).substr(2, 9) + Date.now();
}

function parseExcelFile(file, callback) {
  const reader = new FileReader();
  reader.onload = function(evt) {
    try {
      const workbook = XLSX.read(evt.target.result, {
        type: 'binary',
        cellText: false,
        cellDates: true,
        cellStyles: false,
        sheetStubs: false
      });
      const firstSheet = workbook.SheetNames[0];
      const sheet = workbook.Sheets[firstSheet];
      const rows = XLSX.utils.sheet_to_json(sheet, {
        defval: '',
        blankrows: false,
        raw: false,
        dateNF: 'dd/mm/yyyy'
      });
      
      if (!rows || !rows.length) {
        callback({ error: 'File không có dữ liệu!' });
        return;
      }
      
      function getCol(row, name) {
        name = name.trim().toLowerCase();
        for (let k in row) {
          if (k.trim().toLowerCase() === name) return row[k];
        }
        return '';
      }
      
      const testRow = rows[0];
      function hasCol(name) {
        return Object.keys(testRow).some(k => k.trim().toLowerCase() === name.trim().toLowerCase());
      }
      
      if (!(hasCol('câu hỏi') && hasCol('đáp án a') && hasCol('đáp án b') && 
            hasCol('đáp án c') && hasCol('đáp án d') && hasCol('đáp án đúng') && hasCol('giải thích'))) {
        callback({ error: 'File thiếu cột hoặc không đúng định dạng mẫu!' });
        return;
      }
      
      const questions = rows.map((row, idx) => {
        let rawAnswer = getCol(row, 'đáp án đúng').toString();
        let cols = [
          {label: "A", value: getCol(row, 'đáp án a')},
          {label: "B", value: getCol(row, 'đáp án b')},
          {label: "C", value: getCol(row, 'đáp án c')},
          {label: "D", value: getCol(row, 'đáp án d')}
        ];
        
        let options = [];
        let optionLabels = [];
        cols.forEach(col => {
          if (col.value && col.value.toString().trim() !== "") {
            options.push(col.value);
            optionLabels.push(col.label);
          }
        });
        
        if (!getCol(row, 'câu hỏi')) return null;
        if (!rawAnswer) return null;

        // Parse answer(s): support tokens like A, 1, A/1 and multiple separated by commas (e.g., A/1,c/3)
        const labelsArray = (optionLabels || []).slice(); // e.g., ["A","B","C","D"] but only for non-empty options
        const toLabel = (token) => {
          if (!token) return null;
          const t = String(token).replace(/[\u00A0\s]+/g, '').trim();
          if (!t) return null;
          const parts = t.split('/').map(p => p.trim()).filter(Boolean);
          let letter = null;
          let number = null;
          parts.forEach(p => {
            if (/^[A-Za-z]$/.test(p)) letter = p.toUpperCase();
            else if (/^\d+$/.test(p)) number = parseInt(p, 10);
          });
          if (letter && labelsArray.includes(letter)) return letter;
          if (Number.isFinite(number) && number >= 1 && number <= labelsArray.length) return labelsArray[number - 1];
          // If token is just letter or number without '/'
          const upper = t.toUpperCase();
          if (/^[A-D]$/.test(upper) && labelsArray.includes(upper)) return upper;
          const asNum = parseInt(t, 10);
          if (!Number.isNaN(asNum) && asNum >= 1 && asNum <= labelsArray.length) return labelsArray[asNum - 1];
          return null;
        };

        // Accept separators: comma, full-width comma, ideographic comma, semicolon; also allow descriptions before ';'
        let s = rawAnswer || '';
        if (s.includes(';')) s = s.substring(s.lastIndexOf(';') + 1);
        const seps = /[\,\uFF0C；;、]/g;
        const tokens = s.split(seps).map(x => x.trim()).filter(Boolean);
        const mapped = Array.from(new Set(tokens.map(toLabel).filter(Boolean)));
        if (mapped.length === 0) return null; // no valid answers parsed

        // Validate: every mapped label must correspond to an available option label
        const allValid = mapped.every(lbl => labelsArray.includes(lbl));
        if (!allValid) return null;

        // Convert to single string if only one answer, else array
        const answer = mapped.length === 1 ? mapped[0] : mapped;
        
        return {
          question: getCol(row, 'câu hỏi'),
          options: options,
          optionLabels: optionLabels,
          answer: answer,
          explain: getCol(row, 'giải thích')
        };
      }).filter(q => q);
      
      if (!questions.length) {
        callback({ error: 'Không có câu hỏi hợp lệ trong file!' });
        return;
      }
      
      callback({ questions });
    } catch (err) {
      console.error(err);
      callback({ error: 'Lỗi khi đọc file. Vui lòng thử lại.' });
    }
  };
  reader.onerror = () => callback({ error: 'Không đọc được file Excel!' });
  reader.readAsBinaryString(file);
}

async function renderTopics() {
  console.log('🎨 Starting renderTopics...');
  const topics = await getTopics();
  console.log('📋 Topics to render:', topics.length);
  
  const selector = document.getElementById('topic-selector');
  const detailContainer = document.getElementById('topic-detail-container');
  const gridContainer = document.getElementById('topic-list-container');
  
  if (topics.length === 0) {
    console.log('⚠️ No topics found, showing empty state');
    selector.innerHTML = '<option value="">-- Chưa có chuyên đề --</option>';
    detailContainer.style.display = 'none';
    if (gridContainer) gridContainer.innerHTML = '<div class="empty-state"><i class="material-icons">folder_open</i><p>Chưa có chuyên đề nào</p></div>';
    const eb = document.getElementById('exam-topic-percents');
    if (eb) eb.innerHTML = '<p>Chưa có chuyên đề để chọn.</p>';
    renderExams([]);
    return;
  }
  
  const normalTopics = topics.filter(t => !t.isExam);
  const exams = topics.filter(t => t.isExam === true);
  
  // Sort topics by name (extract number prefix for proper ordering)
  const sortTopics = (topics) => {
    return topics.sort((a, b) => {
      // Extract number prefix (e.g., "1. Tín dụng..." -> 1)
      const getNumber = (name) => {
        const match = name.match(/^(\d+)\./);
        return match ? parseInt(match[1]) : 999;
      };
      
      const numA = getNumber(a.name);
      const numB = getNumber(b.name);
      
      // If both have numbers, sort by number
      if (numA !== 999 && numB !== 999) {
        return numA - numB;
      }
      
      // If only one has number, number comes first
      if (numA !== 999) return -1;
      if (numB !== 999) return 1;
      
      // If neither has number, sort alphabetically
      return a.name.localeCompare(b.name, 'vi');
    });
  };
  
  // Sort both topics and exams
  const sortedNormalTopics = sortTopics(normalTopics);
  const sortedExams = sortTopics(exams);
  
  // Filter out review topics (created from wrong answers) for exam builder
  const examBuilderTopics = sortedNormalTopics.filter(topic => 
    !topic.name.includes('Ôn tập câu sai') && 
    !topic.createdFrom
  );

  // Filter out review topics and exam-like topics for topic selector (edit topic dropdown)
  const topicSelectorTopics = sortedNormalTopics.filter(topic => 
    !topic.name.includes('Ôn tập câu sai') && 
    !topic.createdFrom &&
    !topic.name.includes('(Bài thi')
  );

  // Populate topic selector dropdown
  selector.innerHTML = '<option value="">-- Chọn chuyên đề --</option>' + 
    topicSelectorTopics.map(topic => `<option value="${topic.id}">${topic.name} (${topic.questions.length} câu)</option>`).join('');
  
  // Clear detail on re-render
  detailContainer.style.display = 'none';
  
  // Populate grid view
  if (gridContainer) {
    gridContainer.innerHTML = topicSelectorTopics.map(topic => `
      <div class="topic-item">
        <div class="topic-info">
          <h3>${topic.name}</h3>
          <div class="topic-meta">${topic.questions.length} câu hỏi</div>
        </div>
        <div>
          <button onclick="openEditTopic('${topic.id}')" class="btn btn-outline" style="margin-right:8px;">
            <i class="material-icons">edit</i> Sửa
          </button>
          <button onclick="delTopic('${topic.id}')" class="btn btn-delete">
            <i class="material-icons">delete</i> Xóa
          </button>
        </div>
      </div>
    `).join('');
  }

  renderExamBuilderTopics(examBuilderTopics);
  renderExams(sortedExams);
}

function updateExamView(exam) {
  const editBtn = document.getElementById('edit-exam-btn');
  const deleteBtn = document.getElementById('delete-exam-btn');
  const detailContainer = document.getElementById('exam-detail-container');
  
  if (!exam) {
    if (detailContainer) detailContainer.style.display = 'none';
    if (editBtn) editBtn.disabled = true;
    if (deleteBtn) deleteBtn.disabled = true;
    return;
  }
  
  const total = exam.examConfig?.total ?? (exam.questions ? exam.questions.length : 0);
  const duration = (typeof exam.durationMinutes === 'number' && exam.durationMinutes > 0)
    ? exam.durationMinutes : 0;
  
  document.getElementById('selected-exam-name').textContent = exam.name;
  document.getElementById('selected-exam-questions').textContent = total;
  document.getElementById('selected-exam-duration').textContent = duration;
  
  if (detailContainer) detailContainer.style.display = 'block';
  if (editBtn) {
    editBtn.disabled = false;
    editBtn.onclick = () => openEditExam(exam.id);
  }
  if (deleteBtn) {
    deleteBtn.disabled = false;
    deleteBtn.onclick = () => delTopic(exam.id);
  }
}

function renderExams(exams) {
  const selector = document.getElementById('exam-selector');
  const detailContainer = document.getElementById('exam-detail-container');
  const gridContainer = document.getElementById('exam-list-container');
  
  if (!selector) return;
  
  if (!exams || exams.length === 0) {
    selector.innerHTML = '<option value="">-- Chưa có bài thi --</option>';
    detailContainer.style.display = 'none';
    if (gridContainer) gridContainer.innerHTML = '<div class="empty-state"><i class="material-icons">assignment</i><p>Chưa có bài thi nào</p></div>';
    updateExamView(null);
    return;
  }
  
  // Populate exam selector dropdown
  selector.innerHTML = '<option value="">-- Chọn bài thi --</option>' + 
    exams.map(exam => {
      const total = exam.examConfig?.total ?? (exam.questions ? exam.questions.length : 0);
      const duration = (typeof exam.durationMinutes === 'number' && exam.durationMinutes > 0)
        ? `${exam.durationMinutes}p` : 'N/A';
      return `<option value="${exam.id}">${exam.name} (${total} câu, ${duration})</option>`;
    }).join('');
  
  // Clear detail on re-render
  detailContainer.style.display = 'none';
  updateExamView(null);
  
  // Setup selector change event
  selector.onchange = (e) => {
    const examId = e.target.value;
    const exam = exams.find(ex => ex.id === examId);
    updateExamView(exam);
  };
  
  // Populate grid view
  if (gridContainer) {
    gridContainer.innerHTML = exams.map(exam => {
      const total = exam.examConfig?.total ?? (exam.questions ? exam.questions.length : 0);
      const duration = (typeof exam.durationMinutes === 'number' && exam.durationMinutes > 0)
        ? `${exam.durationMinutes} phút` : 'Không đặt thời gian';
      return `
      <div class="topic-item" data-id="${exam.id}">
        <div class="topic-info">
          <h3>${exam.name}</h3>
          <div class="topic-meta">${total} câu • ${duration}${exam.allowPause ? ' • Cho phép tạm dừng' : ''}</div>
        </div>
        <div class="topic-actions">
          <button onclick="openEditExam('${exam.id}')" class="btn btn-outline btn-sm">
            <i class="material-icons">edit</i>
          </button>
          <button onclick="delTopic('${exam.id}')" class="btn btn-delete btn-sm">
            <i class="material-icons">delete</i>
          </button>
        </div>
      </div>`;
    }).join('');
  }
}

// ===== Edit Topic Logic =====
window.openEditTopic = async function(topicId) {
  const topics = await getTopics();
  const topic = topics.find(t => t.id === topicId && !t.isExam);
  if (!topic) return;
  
  document.getElementById('edit-topic-id').value = topic.id;
  document.getElementById('edit-topic-name').value = topic.name || '';
  document.getElementById('edit-topic-file').value = '';
  document.getElementById('edit-topic-msg').textContent = '';
  document.getElementById('edit-topic-modal').classList.remove('hidden');
}

async function saveEditTopic(e) {
  e.preventDefault();
  const msg = document.getElementById('edit-topic-msg');
  msg.textContent = '';
  
  const id = document.getElementById('edit-topic-id').value;
  const name = document.getElementById('edit-topic-name').value.trim();
  const fileInput = document.getElementById('edit-topic-file');
  
  if (!name) {
    msg.textContent = 'Vui lòng nhập tên chuyên đề!';
    return;
  }
  
  const topics = await getTopics();
  const idx = topics.findIndex(t => t.id === id && !t.isExam);
  if (idx === -1) {
    msg.textContent = 'Không tìm thấy chuyên đề!';
    return;
  }
  
  const file = fileInput.files[0];
  if (!file) {
    // Chỉ đổi tên
    topics[idx].name = name;
    await saveTopics(topics);
    await renderTopics();
    document.getElementById('edit-topic-modal').classList.add('hidden');
    return;
  }
  
  // Đổi tên + thay câu hỏi
  parseExcelFile(file, async (result) => {
    if (result.error) {
      msg.textContent = result.error;
      return;
    }
    topics[idx].name = name;
    topics[idx].questions = result.questions;
    await saveTopics(topics);
    await renderTopics();
    document.getElementById('edit-topic-modal').classList.add('hidden');
  });
}

// ===== Edit Exam Logic =====
window.openEditExam = async function(examId) {
  const topics = await getTopics();
  const exam = topics.find(t => t.id === examId && t.isExam);
  if (!exam) return;
  
  document.getElementById('edit-exam-id').value = exam.id;
  document.getElementById('edit-exam-name').value = exam.name || '';
  document.getElementById('edit-exam-total').value = exam.examConfig?.total || (exam.questions?.length || 0);
  document.getElementById('edit-exam-duration').value = exam.durationMinutes || '';
  document.getElementById('edit-exam-allow-pause').checked = !!exam.allowPause;
  renderEditExamTopics(topics.filter(t => !t.isExam), exam);
  document.getElementById('edit-exam-msg').textContent = '';
  document.getElementById('edit-exam-modal').classList.remove('hidden');
}

function renderEditExamTopics(allTopics, exam) {
  const holder = document.getElementById('edit-exam-topic-percents');
  if (!holder) return;
  
  // Sort topics by name (extract number prefix for proper ordering)
  const sortTopics = (topics) => {
    return topics.sort((a, b) => {
      // Extract number prefix (e.g., "1. Tín dụng..." -> 1)
      const getNumber = (name) => {
        const match = name.match(/^(\d+)\./);
        return match ? parseInt(match[1]) : 999;
      };
      
      const numA = getNumber(a.name);
      const numB = getNumber(b.name);
      
      // If both have numbers, sort by number
      if (numA !== 999 && numB !== 999) {
        return numA - numB;
      }
      
      // If only one has number, number comes first
      if (numA !== 999) return -1;
      if (numB !== 999) return 1;
      
      // If neither has number, sort alphabetically
      return a.name.localeCompare(b.name, 'vi');
    });
  };
  
  // Filter out review topics (created from wrong answers) and sort
  const filteredTopics = sortTopics(allTopics.filter(topic => 
    !topic.name.includes('Ôn tập câu sai') && 
    !topic.createdFrom
  ));
  
  if (!filteredTopics || filteredTopics.length === 0) {
    holder.innerHTML = '<div style="text-align: center; padding: 20px; color: #6c757d;"><i class="material-icons" style="font-size: 2rem; margin-bottom: 8px; display: block;">folder_open</i>Chưa có chuyên đề để chọn.</div>';
    return;
  }
  
  const distMap = {};
  (exam.examConfig?.distribution || []).forEach(d => distMap[d.id] = d.percent);
  
  holder.innerHTML = filteredTopics.map(t => `
    <div class="topic-item">
      <label>
        <input type="checkbox" class="edit-eb-topic-check" value="${t.id}" ${distMap[t.id] ? 'checked' : ''}>
        <span class="topic-name">${t.name}</span>
        <span class="topic-count">(${t.questions.length} câu)</span>
      </label>
      <div class="percent-input-container">
        <input type="number" class="edit-eb-topic-percent" data-id="${t.id}" min="0" max="100" step="1" value="${distMap[t.id] || 0}" ${!distMap[t.id] ? 'disabled' : ''}>
        <span class="percent-symbol">%</span>
      </div>
    </div>
  `).join('');

  // Add event listeners for percent inputs
  holder.querySelectorAll('.edit-eb-topic-percent').forEach(inp => {
    inp.addEventListener('input', (e) => {
      const id = e.target.getAttribute('data-id');
      const chk = holder.querySelector(`.edit-eb-topic-check[value="${id}"]`);
      if (chk && parseFloat(e.target.value || '0') > 0) {
        chk.checked = true;
        inp.disabled = false;
      } else if (chk && parseFloat(e.target.value || '0') === 0) {
        chk.checked = false;
        inp.disabled = true;
      }
      updateEditExamPercentSummary();
    });
    inp.addEventListener('blur', () => {
      normalizePercents(holder);
      updateEditExamPercentSummary();
    });
  });
  
  // Add event listeners for checkboxes
  holder.querySelectorAll('.edit-eb-topic-check').forEach(chk => {
    chk.addEventListener('change', (e) => {
      const id = e.target.value;
      const percentInput = holder.querySelector(`.edit-eb-topic-percent[data-id="${id}"]`);
      if (e.target.checked) {
        percentInput.disabled = false;
        if (parseFloat(percentInput.value || '0') === 0) {
          percentInput.value = '0';
        }
      } else {
        percentInput.disabled = true;
        percentInput.value = '0';
      }
      normalizePercents(holder);
      updateEditExamPercentSummary();
    });
  });
  
  // Add percent summary
  updateEditExamPercentSummary();
}

function updateEditExamPercentSummary() {
  const holder = document.getElementById('edit-exam-topic-percents');
  if (!holder) return;
  
  const inputs = holder.querySelectorAll('.edit-eb-topic-percent:not([disabled])');
  let total = 0;
  
  inputs.forEach(input => {
    total += parseFloat(input.value || '0');
  });
  
  // Remove existing summary if any
  const existingSummary = holder.querySelector('.percent-summary');
  if (existingSummary) {
    existingSummary.remove();
  }
  
  // Add new summary
  const summary = document.createElement('div');
  summary.className = 'percent-summary';
  summary.style.cssText = `
    margin-top: 16px;
    padding: 12px 16px;
    border-radius: 8px;
    text-align: center;
    font-weight: 600;
    font-size: 0.95rem;
    ${total === 100 ? 
      'background: #d4edda; color: #155724; border: 1px solid #c3e6cb;' : 
      total > 100 ? 
        'background: #f8d7da; color: #721c24; border: 1px solid #f5c6cb;' :
        'background: #fff3cd; color: #856404; border: 1px solid #ffeaa7;'
    }
  `;
  
  summary.innerHTML = `
    <i class="material-icons" style="font-size: 1.2rem; vertical-align: middle; margin-right: 4px;">
      ${total === 100 ? 'check_circle' : total > 100 ? 'error' : 'warning'}
    </i>
    Tổng tỷ lệ: <strong>${total.toFixed(1)}%</strong>
    ${total === 100 ? ' ✓' : total > 100 ? ' (Vượt quá 100%)' : ` (Còn thiếu ${(100 - total).toFixed(1)}%)`}
  `;
  
  holder.appendChild(summary);
}

async function saveEditExam(e) {
  e.preventDefault();
  const msg = document.getElementById('edit-exam-msg');
  msg.textContent = '';
  
  const id = document.getElementById('edit-exam-id').value;
  const name = document.getElementById('edit-exam-name').value.trim();
  const total = parseInt(document.getElementById('edit-exam-total').value, 10);
  const durationMinutes = parseInt(document.getElementById('edit-exam-duration').value, 10);
  const allowPause = !!document.getElementById('edit-exam-allow-pause').checked;

  if (!name) { msg.textContent = 'Vui lòng nhập tên bài thi!'; return; }
  if (!Number.isFinite(total) || total <= 0) { msg.textContent = 'Tổng số câu phải > 0!'; return; }
  if (!Number.isFinite(durationMinutes) || durationMinutes <= 0) { msg.textContent = 'Thời gian phải > 0!'; return; }

  const holder = document.getElementById('edit-exam-topic-percents');
  const checks = Array.from(holder.querySelectorAll('.edit-eb-topic-check'));
  const selected = checks.filter(c => c.checked).map(c => c.value);
  if (selected.length === 0) { msg.textContent = 'Vui lòng chọn ít nhất 1 chuyên đề!'; return; }

  const percInputs = Array.from(holder.querySelectorAll('.edit-eb-topic-percent'));
  const dist = [];
  let sumPercent = 0;
  for (const inp of percInputs) {
    const tid = inp.getAttribute('data-id');
    const p = parseFloat(inp.value || '0');
    if (!selected.includes(tid)) continue;
    if (p < 0 || p > 100 || !Number.isFinite(p)) { msg.textContent = 'Tỷ lệ phải 0-100!'; return; }
    sumPercent += p;
    dist.push({ id: tid, percent: p });
  }
  if (Math.round(sumPercent) !== 100) { msg.textContent = 'Tổng tỷ lệ phải bằng 100%'; return; }

  const topics = await getTopics();
  const idx = topics.findIndex(t => t.id === id && t.isExam);
  if (idx === -1) { msg.textContent = 'Không tìm thấy bài thi!'; return; }
  
  topics[idx].name = name;
  topics[idx].durationMinutes = durationMinutes;
  topics[idx].allowPause = allowPause;
  topics[idx].examConfig = { total, distribution: dist };
  await saveTopics(topics);
  
  await window.quizStorage.deleteExamQuestions(id);
  await renderTopics();
  document.getElementById('edit-exam-modal').classList.add('hidden');
}

window.delTopic = async function(id) {
  if (!confirm('Bạn có chắc chắn muốn xóa chuyên đề này?')) return;
  const all = await getTopics();
  const removed = all.find(topic => topic.id === id);
  const topics = all.filter(topic => topic.id !== id);
  await saveTopics(topics);
  if (removed && removed.isExam === true) {
    await window.quizStorage.deleteExamQuestions(id);
  }
  
  // Reset selectors after deletion
  document.getElementById('topic-selector').value = '';
  document.getElementById('exam-selector').value = '';
  document.getElementById('topic-detail-container').style.display = 'none';
  document.getElementById('exam-detail-container').style.display = 'none';
  
  await renderTopics();
};

function shuffleArray(arr) {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

function renderExamBuilderTopics(topics) {
  const holderDropdown = document.getElementById('exam-topic-percents');
  const holderGrid = document.getElementById('exam-topic-percents-grid');
  
  if (!topics || topics.length === 0) {
    if (holderDropdown) holderDropdown.innerHTML = '<p style="color: #666; padding: 20px; text-align: center;">Chưa có chuyên đề để chọn. Vui lòng tạo chuyên đề trước.</p>';
    if (holderGrid) holderGrid.innerHTML = '<p style="color: #666; padding: 20px; text-align: center;">Chưa có chuyên đề để chọn. Vui lòng tạo chuyên đề trước.</p>';
    return;
  }

  // Store topics globally for both views
  window.examBuilderTopics = topics;

  // Render dropdown view (simple interface)
  if (holderDropdown) {
    holderDropdown.innerHTML = `
      <div id="exam-builder-combobox-rows" style="display: flex; flex-direction: column; gap: 12px;"></div>
      <div id="percent-summary" style="padding: 12px; background: #e3f2fd; border-radius: 8px; text-align: center; font-weight: 500; margin-top: 16px;">
        Tổng tỷ lệ: <span id="total-percent">0</span>%
      </div>
    `;

    // Initialize with first empty row
    renderComboboxRows();
  }


  // Render grid view (cards)
  if (holderGrid) {
    holderGrid.innerHTML = `
      <div style="display: grid; grid-template-columns: repeat(auto-fill, minmax(300px, 1fr)); gap: 16px;">
        ${topics.map(t => `
          <div class="topic-item" style="padding: 16px; background: #f8f9fa; border-radius: 12px; border: 1px solid #e9ecef;">
            <div style="display:flex; align-items:center; gap:12px; margin-bottom: 12px;">
              <input type="checkbox" class="eb-topic-check-grid" value="${t.id}" style="width: 20px; height: 20px;">
              <div style="flex: 1;">
                <h4 style="margin: 0 0 4px; color: #800020; font-size: 1.1rem;">${t.name}</h4>
                <small style="color:#666">${t.questions.length} câu hỏi</small>
              </div>
            </div>
            <div style="display:flex; align-items:center; gap:8px;">
              <label style="font-weight: 500; min-width: 60px; color: #666;">Tỷ lệ:</label>
              <input type="number" class="eb-topic-percent-grid" data-id="${t.id}" min="0" max="100" step="1" value="0" style="width:100px; padding: 8px; border-radius: 6px; border: 1px solid #ddd; font-size: 14px;" disabled>
              <span style="font-weight: 500; color: #666;">%</span>
            </div>
          </div>
        `).join('')}
      </div>
      <div id="grid-percent-summary" style="padding: 12px; background: #e3f2fd; border-radius: 8px; text-align: center; font-weight: 500; margin-top: 16px;">
        Tổng tỷ lệ: <span id="grid-total-percent">0</span>%
      </div>
    `;

    // Add event listeners for grid view
    const gridCheckboxes = holderGrid.querySelectorAll('.eb-topic-check-grid');
    const gridInputs = holderGrid.querySelectorAll('.eb-topic-percent-grid');
    
    gridCheckboxes.forEach(checkbox => {
      checkbox.addEventListener('change', function() {
        const percentInput = holderGrid.querySelector(`.eb-topic-percent-grid[data-id="${this.value}"]`);
        if (percentInput) {
          percentInput.disabled = !this.checked;
          if (!this.checked) {
            percentInput.value = '0';
          }
        }
        updateGridPercentSummary();
        syncExamBuilderViews();
      });
    });
    
    gridInputs.forEach(input => {
      input.addEventListener('input', function() {
        updateGridPercentSummary();
        syncExamBuilderViews();
      });
      input.addEventListener('change', function() {
        const checkbox = holderGrid.querySelector(`.eb-topic-check-grid[value="${this.getAttribute('data-id')}"]`);
        if (checkbox && parseFloat(this.value || '0') > 0) {
          checkbox.checked = true;
        }
        updateGridPercentSummary();
        syncExamBuilderViews();
      });
    });
    
    // Auto-distribute for grid view
    function autoDistributeGrid() {
      const checked = Array.from(gridCheckboxes).filter(cb => cb.checked);
      if (checked.length > 0) {
        const percentPerTopic = Math.floor(100 / checked.length);
        const remainder = 100 - (percentPerTopic * checked.length);
        
        checked.forEach((checkbox, index) => {
          const percentInput = holderGrid.querySelector(`.eb-topic-percent-grid[data-id="${checkbox.value}"]`);
          if (percentInput) {
            let percent = percentPerTopic;
            if (index < remainder) percent += 1;
            percentInput.value = percent;
          }
        });
        updateGridPercentSummary();
        syncExamBuilderViews();
      }
    }
    
    // Add auto-distribute button for grid view
    const gridAutoBtn = document.createElement('button');
    gridAutoBtn.type = 'button';
    gridAutoBtn.textContent = 'Phân bổ đều';
    gridAutoBtn.className = 'btn btn-outline';
    gridAutoBtn.style.marginTop = '12px';
    gridAutoBtn.onclick = autoDistributeGrid;
    holderGrid.appendChild(gridAutoBtn);
  }

  // Function to update grid percent summary
  function updateGridPercentSummary() {
    const summary = document.getElementById('grid-percent-summary');
    const totalSpan = document.getElementById('grid-total-percent');
    if (!summary || !totalSpan || !holderGrid) return;
    
    const inputs = holderGrid.querySelectorAll('.eb-topic-percent-grid');
    let total = 0;
    
    inputs.forEach(input => {
      if (!input.disabled) {
        total += parseFloat(input.value || '0');
      }
    });
    
    totalSpan.textContent = total.toFixed(1);
    
    // Disable unchecked checkboxes if total >= 100%
    const gridCheckboxes = holderGrid.querySelectorAll('.eb-topic-check-grid');
    gridCheckboxes.forEach(checkbox => {
      if (!checkbox.checked && total >= 100) {
        checkbox.disabled = true;
        checkbox.style.opacity = '0.5';
        checkbox.style.cursor = 'not-allowed';
      } else if (!checkbox.checked) {
        checkbox.disabled = false;
        checkbox.style.opacity = '1';
        checkbox.style.cursor = 'pointer';
      }
    });
    
    // Change color based on total
    if (total === 100) {
      summary.style.background = '#d4edda';
      summary.style.color = '#155724';
      summary.style.border = '1px solid #c3e6cb';
    } else if (total > 100) {
      summary.style.background = '#f8d7da';
      summary.style.color = '#721c24';
      summary.style.border = '1px solid #f5c6cb';
    } else {
      summary.style.background = '#fff3cd';
      summary.style.color = '#856404';
      summary.style.border = '1px solid #ffeaa7';
    }
  }
}

// Render dynamic dropdown rows for exam builder
function renderExamBuilderDropdownRows(preserveFocus = false) {
  const container = document.getElementById('exam-builder-dropdown-rows');
  if (!container || !window.examBuilderTopics) return;
  
  // Get current selections and focused element
  const rows = Array.from(container.querySelectorAll('.eb-dropdown-row'));
  const focusedElement = document.activeElement;
  const focusedIndex = focusedElement?.closest('.eb-dropdown-row') ? 
    rows.indexOf(focusedElement.closest('.eb-dropdown-row')) : -1;
  const focusedClass = focusedElement?.className || '';
  
  const selections = rows.map(row => {
    const select = row.querySelector('.eb-topic-select');
    const percentInput = row.querySelector('.eb-topic-percent-input');
    return {
      topicId: select?.value || '',
      percent: parseFloat(percentInput?.value || '0')
    };
  }).filter(s => s.topicId);
  
  // Calculate total percent
  const totalPercent = selections.reduce((sum, s) => sum + s.percent, 0);
  const remaining = 100 - totalPercent;
  
  // Get already selected topic IDs
  const selectedIds = selections.map(s => s.topicId);
  
  // Check if we need to add a new row
  const needNewRow = remaining > 0 && selectedIds.length < window.examBuilderTopics.length;
  const currentRowCount = rows.length;
  const expectedRowCount = selections.length + (needNewRow ? 1 : 0);
  
  // Only rebuild if row count changed
  if (currentRowCount !== expectedRowCount) {
    container.innerHTML = '';
    
    // Add existing selections
    selections.forEach((sel, index) => {
      addExamBuilderDropdownRow(container, sel.topicId, sel.percent, selectedIds, index);
    });
    
    // Add new row if not at 100%
    if (needNewRow) {
      addExamBuilderDropdownRow(container, '', 0, selectedIds, selections.length);
    }
    
    // Restore focus if needed
    if (preserveFocus && focusedIndex >= 0 && focusedIndex < container.children.length) {
      const newRow = container.children[focusedIndex];
      const elementToFocus = newRow?.querySelector('.' + focusedClass);
      if (elementToFocus) {
        setTimeout(() => elementToFocus.focus(), 0);
      }
    }
  }
  
  // Update remaining display
  updateRemainingPercent(remaining);
}

function addExamBuilderDropdownRow(container, selectedId = '', percent = 0, excludeIds = [], rowIndex = 0) {
  const topics = window.examBuilderTopics || [];
  const availableTopics = topics.filter(t => !excludeIds.includes(t.id) || t.id === selectedId);
  
  const row = document.createElement('div');
  row.className = 'eb-dropdown-row';
  row.style.cssText = 'display: flex; align-items: center; gap: 10px; margin-bottom: 10px; padding: 10px; background: #fafafa; border-radius: 6px;';
  
  row.innerHTML = `
    <div style="flex: 1;">
      <select class="eb-topic-select" style="width: 100%; padding: 8px; border-radius: 5px; border: 1px solid #ccc;">
        <option value="">-- Chọn chuyên đề --</option>
        ${availableTopics.map(t => `
          <option value="${t.id}" ${t.id === selectedId ? 'selected' : ''}>
            ${t.name} (${t.questions.length} câu)
          </option>
        `).join('')}
      </select>
    </div>
    <div style="display: flex; align-items: center; gap: 6px;">
      <input type="number" class="eb-topic-percent-input" min="0" max="100" step="0.01" value="${percent}" 
             style="width: 100px; padding: 8px; border-radius: 5px; border: 1px solid #ccc;" 
             ${!selectedId ? 'disabled' : ''}>
      <span style="font-weight: 500;">%</span>
    </div>
    ${selectedId ? `
      <button type="button" class="eb-remove-row" style="padding: 6px 10px; background: #c72c41; color: white; border: none; border-radius: 5px; cursor: pointer;">
        <i class="material-icons" style="font-size: 18px;">close</i>
      </button>
    ` : ''}
  `;
  
  container.appendChild(row);
  
  // Add event listeners
  const select = row.querySelector('.eb-topic-select');
  const percentInput = row.querySelector('.eb-topic-percent-input');
  const removeBtn = row.querySelector('.eb-remove-row');
  
  select.addEventListener('change', () => {
    if (select.value) {
      percentInput.disabled = false;
      setTimeout(() => percentInput.focus(), 0);
    } else {
      percentInput.disabled = true;
      percentInput.value = '0';
    }
    renderExamBuilderDropdownRows(true);
    syncExamBuilderViews();
  });
  
  // Only update display while typing, don't rebuild
  percentInput.addEventListener('input', () => {
    const container = document.getElementById('exam-builder-dropdown-rows');
    if (!container) return;
    
    const rows = Array.from(container.querySelectorAll('.eb-dropdown-row'));
    const selections = rows.map(row => {
      const sel = row.querySelector('.eb-topic-select');
      const pct = row.querySelector('.eb-topic-percent-input');
      return {
        topicId: sel?.value || '',
        percent: parseFloat(pct?.value || '0')
      };
    }).filter(s => s.topicId);
    
    const totalPercent = selections.reduce((sum, s) => sum + s.percent, 0);
    const remaining = 100 - totalPercent;
    updateRemainingPercent(remaining);
  });
  
  percentInput.addEventListener('blur', () => {
    // Rebuild rows on blur to add new row if needed
    renderExamBuilderDropdownRows(false);
    syncExamBuilderViews();
  });
  
  if (removeBtn) {
    removeBtn.addEventListener('click', () => {
      row.remove();
      renderExamBuilderDropdownRows();
      syncExamBuilderViews();
    });
  }
}

function updateRemainingPercent(remaining) {
  let display = document.getElementById('eb-remaining-display');
  if (!display) {
    const container = document.getElementById('exam-builder-dropdown-rows');
    if (!container) return;
    
    display = document.createElement('div');
    display.id = 'eb-remaining-display';
    display.style.cssText = 'margin-top: 10px; padding: 10px; background: #f0f0f0; border-radius: 6px; font-weight: 500;';
    container.parentNode.insertBefore(display, container.nextSibling);
  }
  
  const color = remaining === 0 ? '#28a745' : remaining < 0 ? '#dc3545' : '#666';
  display.innerHTML = `
    <span style="color: ${color};">
      ${remaining === 0 ? '✓ Đã đủ 100%' : `Còn lại: ${remaining.toFixed(1)}%`}
    </span>
  `;
}

// Sync values between dropdown and grid views
function syncExamBuilderViews() {
  const dropdownView = document.getElementById('exam-builder-dropdown-view');
  const gridView = document.getElementById('exam-builder-grid-view');
  const currentView = localStorage.getItem('admin_exam_builder_view') || 'dropdown';
  
  if (currentView === 'dropdown' && dropdownView) {
    // Sync from dropdown rows to grid
    const rows = Array.from(dropdownView.querySelectorAll('.eb-dropdown-row'));
    const selections = rows.map(row => {
      const select = row.querySelector('.eb-topic-select');
      const percentInput = row.querySelector('.eb-topic-percent-input');
      return {
        topicId: select?.value || '',
        percent: parseFloat(percentInput?.value || '0')
      };
    }).filter(s => s.topicId);
    
    // Update grid view
    if (gridView) {
      gridView.querySelectorAll('.eb-topic-check-grid').forEach(chk => {
        const sel = selections.find(s => s.topicId === chk.value);
        chk.checked = !!sel;
        const percentInput = gridView.querySelector(`.eb-topic-percent-grid[data-id="${chk.value}"]`);
        if (percentInput) percentInput.value = sel ? sel.percent : 0;
      });
    }
  } else if (currentView === 'grid' && gridView) {
    // Sync from grid to dropdown - rebuild dropdown rows
    const checksGrid = Array.from(gridView.querySelectorAll('.eb-topic-check-grid:checked'));
    const selections = checksGrid.map(chk => {
      const percentInput = gridView.querySelector(`.eb-topic-percent-grid[data-id="${chk.value}"]`);
      return {
        topicId: chk.value,
        percent: parseFloat(percentInput?.value || '0')
      };
    });
    
    // Rebuild dropdown view
    const container = document.getElementById('exam-builder-dropdown-rows');
    if (container) {
      container.innerHTML = '';
      const selectedIds = selections.map(s => s.topicId);
      selections.forEach((sel, index) => {
        addExamBuilderDropdownRow(container, sel.topicId, sel.percent, selectedIds, index);
      });
      
      const totalPercent = selections.reduce((sum, s) => sum + s.percent, 0);
      const remaining = 100 - totalPercent;
      if (remaining > 0 && selectedIds.length < (window.examBuilderTopics?.length || 0)) {
        addExamBuilderDropdownRow(container, '', 0, selectedIds, selections.length);
      }
      updateRemainingPercent(remaining);
    }
  }
}

function normalizePercents(scopeEl, viewType = 'dropdown') {
  const root = scopeEl || document;
  const checkClass = viewType === 'grid' ? '.eb-topic-check-grid' : '.eb-topic-check';
  const percentClass = viewType === 'grid' ? '.eb-topic-percent-grid' : '.eb-topic-percent';
  
  const checks = Array.from(root.querySelectorAll(checkClass)).filter(c => c.checked);
  const percInputs = (id) => root.querySelector(`${percentClass}[data-id="${id}"]`);
  if (checks.length === 0) return;

  const lastId = checks[checks.length - 1].value;
  let sumOthers = 0;
  checks.forEach(c => {
    const id = c.value;
    const inp = percInputs(id);
    const val = parseFloat(inp && inp.value ? inp.value : '0');
    if (id !== lastId) sumOthers += (Number.isFinite(val) ? val : 0);
  });

  let remain = 100 - Math.round(sumOthers);
  remain = Math.max(0, Math.min(100, remain));
  const lastInp = percInputs(lastId);
  if (lastInp) lastInp.value = String(remain);
}

async function buildCompositeExam(e) {
  e.preventDefault();
  const msg = document.getElementById('exam-builder-msg');
  msg.textContent = '';

  const name = document.getElementById('exam-name').value.trim();
  const total = parseInt(document.getElementById('exam-total').value, 10);
  const durationMinutes = parseInt(document.getElementById('exam-duration').value, 10);
  const allowPause = !!document.getElementById('exam-allow-pause').checked;
  const allTopics = await getTopics();

  if (!name) { msg.textContent = 'Vui lòng nhập tên bộ đề!'; return; }
  if (!Number.isFinite(total) || total <= 0) { msg.textContent = 'Tổng số câu hỏi phải là số > 0!'; return; }
  if (!Number.isFinite(durationMinutes) || durationMinutes <= 0) { msg.textContent = 'Thời gian làm bài phải là số phút > 0!'; return; }

  // Get data from exam builder form
  let dist = [];
  let sumPercent = 0;
  
  // Try to get from combobox interface first
  const comboboxSelections = getComboboxSelections();

  if (comboboxSelections.length > 0) {
    // Get from dropdown view (combobox interface)
    for (const sel of comboboxSelections) {
      const p = sel.percent;
      if (p < 0 || p > 100 || !Number.isFinite(p)) { 
        msg.textContent = 'Tỷ lệ phải trong khoảng 0-100!'; 
        return; 
      }
      sumPercent += p;
      dist.push({ id: sel.id, percent: p });
    }
  } else {
    // Try to get from grid view
    const gridChecks = Array.from(document.querySelectorAll('.eb-topic-check-grid'));
    const gridInputs = Array.from(document.querySelectorAll('.eb-topic-percent-grid'));
    
    if (gridChecks.length > 0) {
      // Get from grid view
      const selected = gridChecks.filter(c => c.checked).map(c => c.value);
      if (selected.length === 0) { msg.textContent = 'Vui lòng chọn ít nhất 1 chuyên đề!'; return; }
      
      for (const input of gridInputs) {
        const id = input.getAttribute('data-id');
        const p = parseFloat(input.value || '0');
        if (!selected.includes(id)) continue;
        if (p < 0 || p > 100 || !Number.isFinite(p)) { 
          msg.textContent = 'Tỷ lệ phải trong khoảng 0-100!'; 
          return; 
        }
        sumPercent += p;
        dist.push({ id, percent: p });
      }
    } else {
    // Try to get from dropdown rows
    const rows = Array.from(document.querySelectorAll('.eb-dropdown-row'));
    if (rows.length > 0) {
      // Get from dropdown rows
      const selections = rows.map(row => {
        const select = row.querySelector('.eb-topic-select');
        const percentInput = row.querySelector('.eb-topic-percent-input');
        return {
          id: select?.value || '',
          percent: parseFloat(percentInput?.value || '0')
        };
      }).filter(s => s.id);
      
      if (selections.length === 0) { msg.textContent = 'Vui lòng chọn ít nhất 1 chuyên đề!'; return; }
      
      for (const sel of selections) {
        if (sel.percent < 0 || sel.percent > 100 || !Number.isFinite(sel.percent)) {
          msg.textContent = 'Tỷ lệ phải trong khoảng 0-100!';
          return;
        }
        sumPercent += sel.percent;
        dist.push({ id: sel.id, percent: sel.percent });
      }
    } else {
      // Fallback to simple form approach - use all topics with equal distribution
      const normalTopics = allTopics.filter(t => !t.isExam);
      if (normalTopics.length === 0) { 
        msg.textContent = 'Chưa có chuyên đề nào để tạo đề thi!'; 
        return; 
      }
      
      // Distribute equally among all topics
      const percentPerTopic = Math.floor(100 / normalTopics.length);
      const remainder = 100 - (percentPerTopic * normalTopics.length);
      normalTopics.forEach((topic, index) => {
        let percent = percentPerTopic;
        if (index < remainder) percent += 1; // Distribute remainder to first few topics
        dist.push({ id: topic.id, percent: Math.round(percent) });
        sumPercent += Math.round(percent);
      });
    }
  }
  }

  if (Math.round(sumPercent) !== 100) {
    msg.textContent = 'Tổng tỷ lệ phải bằng 100%';
    return;
  }

  const withCalc = dist.map(d => ({ id: d.id, percent: d.percent, exact: (total * d.percent) / 100 }));
  let allocated = withCalc.map(x => ({ id: x.id, count: Math.floor(x.exact), frac: x.exact - Math.floor(x.exact) }));
  let assigned = allocated.reduce((s, a) => s + a.count, 0);
  let remain = total - assigned;
  if (remain > 0) {
    allocated.sort((a, b) => b.frac - a.frac);
    for (let i = 0; i < allocated.length && remain > 0; i++) {
      allocated[i].count += 1;
      remain--;
    }
  }

  const pickPerTopic = {};
  for (const a of allocated) {
    const topic = allTopics.find(t => t.id === a.id);
    if (!topic) { msg.textContent = 'Không tìm thấy chuyên đề đã chọn!'; return; }
    if (a.count > topic.questions.length) {
      msg.textContent = `Chuyên đề "${topic.name}" không đủ câu hỏi (${a.count}/${topic.questions.length}). Giảm tỷ lệ hoặc tổng số câu.`;
      return;
    }
    const shuffled = shuffleArray(topic.questions.slice());
    pickPerTopic[a.id] = shuffled.slice(0, a.count);
  }

  let combined = [];
  for (const a of allocated) combined = combined.concat(pickPerTopic[a.id] || []);
  shuffleArray(combined);

  if (combined.length !== total) {
    msg.textContent = `Số câu gộp được (${combined.length}) khác tổng (${total}). Vui lòng điều chỉnh tỷ lệ.`;
    return;
  }

  const topics = allTopics.slice();
  const examConfig = { total: total, distribution: dist };
  topics.push({ 
    id: uuid(), 
    name: name, 
    isExam: true, 
    examConfig: examConfig, 
    questions: combined, 
    durationMinutes: durationMinutes, 
    allowPause: allowPause 
  });
  await saveTopics(topics);
  await renderTopics();
  document.getElementById('exam-builder-form').reset();
  msg.textContent = 'Tạo bộ đề thành công!';
  setTimeout(() => { msg.textContent = ''; }, 2000);
}

async function exportTopicsJson() {
  const topics = await getTopics();
  const blob = new Blob([JSON.stringify(topics, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'topics.json';
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

function importTopicsJson() {
  const fileInput = document.getElementById('import-json-file');
  fileInput.click();
}

function handleImportFile(e) {
  const file = e.target.files[0];
  if (!file) return;
  
  const reader = new FileReader();
  reader.onload = function(evt) {
    try {
      const data = JSON.parse(evt.target.result);
      
      if (!Array.isArray(data)) {
        alert('File không đúng định dạng! Phải là mảng JSON.');
        return;
      }
      
      // Validate basic structure
      let valid = true;
      for (const item of data) {
        if (!item.id || !item.name || !Array.isArray(item.questions)) {
          valid = false;
          break;
        }
      }
      
      if (!valid) {
        alert('File không đúng cấu trúc topics.json! Mỗi item phải có id, name, và questions.');
        return;
      }
      
      // Confirm before importing
      const confirmMsg = `Bạn có chắc muốn import ${data.length} chuyên đề/bài thi?\n\nLưu ý: Dữ liệu hiện tại sẽ bị ghi đè!`;
      if (!confirm(confirmMsg)) return;
      
      // Save to localStorage
      saveTopics(data);
      renderTopics();
      alert(`Đã import thành công ${data.length} chuyên đề/bài thi!`);
      
    } catch (err) {
      console.error(err);
      alert('Lỗi khi đọc file JSON: ' + (err.message || err));
    }
  };
  
  reader.onerror = () => {
    alert('Không thể đọc file!');
  };
  
  reader.readAsText(file);
  
  // Reset input để có thể chọn lại cùng file
  e.target.value = '';
}

// View toggle functions
function toggleTopicView() {
  const dropdownView = document.getElementById('topic-dropdown-view');
  const gridView = document.getElementById('topic-grid-view');
  const toggleBtn = document.getElementById('topic-view-toggle');
  const currentView = localStorage.getItem('admin_topic_view') || 'dropdown';
  
  if (!dropdownView || !gridView || !toggleBtn) return;
  
  // Sync values before switching
  syncTopicViews();
  
  if (currentView === 'dropdown') {
    // Switch to grid
    dropdownView.style.display = 'none';
    gridView.style.display = 'block';
    toggleBtn.innerHTML = '<i class="material-icons" style="font-size: 1.2rem;">list</i> Chế độ dropdown';
    localStorage.setItem('admin_topic_view', 'grid');
  } else {
    // Switch to dropdown
    dropdownView.style.display = 'block';
    gridView.style.display = 'none';
    toggleBtn.innerHTML = '<i class="material-icons" style="font-size: 1.2rem;">view_module</i> Chế độ lưới';
    localStorage.setItem('admin_topic_view', 'dropdown');
  }
}

function syncTopicViews() {
  const topicId = document.getElementById('topic-selector')?.value;
  if (topicId && document.querySelectorAll('#topic-list-container .topic-item').length > 0) {
    document.querySelectorAll('#topic-list-container .topic-item').forEach(el => {
      el.classList.toggle('selected', el.dataset.id === topicId);
    });
  }
}

function toggleExamView() {
  const dropdownView = document.getElementById('exam-dropdown-view');
  const gridView = document.getElementById('exam-grid-view');
  const toggleBtn = document.getElementById('exam-view-toggle');
  const currentView = localStorage.getItem('admin_exam_view') || 'dropdown';
  
  if (!dropdownView || !gridView || !toggleBtn) return;
  
  if (currentView === 'dropdown') {
    // Switch to grid
    dropdownView.style.display = 'none';
    gridView.style.display = 'block';
    toggleBtn.innerHTML = '<i class="material-icons" style="font-size: 1.2rem;">list</i> Chế độ dropdown';
    localStorage.setItem('admin_exam_view', 'grid');
    
    // Sync selection from dropdown to grid
    const examId = document.getElementById('exam-selector').value;
    if (examId) {
      document.querySelectorAll('#exam-list-container .topic-item').forEach(el => {
        el.classList.toggle('selected', el.dataset.id === examId);
      });
    }
  } else {
    // Switch to dropdown
    dropdownView.style.display = 'block';
    gridView.style.display = 'none';
    toggleBtn.innerHTML = '<i class="material-icons" style="font-size: 1.2rem;">view_module</i> Chế độ lưới';
    localStorage.setItem('admin_exam_view', 'dropdown');
    
    // Sync selection from grid to dropdown
    const selectedExam = document.querySelector('#exam-list-container .topic-item.selected');
    if (selectedExam) {
      const examId = selectedExam.dataset.id;
      document.getElementById('exam-selector').value = examId;
    }
  }
}

function toggleExamBuilderView() {
  const dropdownView = document.getElementById('exam-builder-dropdown-view');
  const gridView = document.getElementById('exam-builder-grid-view');
  const toggleBtn = document.getElementById('exam-builder-view-toggle');
  const currentView = localStorage.getItem('admin_exam_builder_view') || 'dropdown';
  
  // Sync values before switching
  syncExamBuilderViews();
  
  if (currentView === 'dropdown') {
    // Switch to grid
    if (dropdownView) dropdownView.style.display = 'none';
    if (gridView) gridView.style.display = 'block';
    if (toggleBtn) toggleBtn.innerHTML = '<i class="material-icons" style="font-size: 1.2rem;">list</i> Chế độ dropdown';
    localStorage.setItem('admin_exam_builder_view', 'grid');
  } else {
    // Switch to dropdown
    if (dropdownView) dropdownView.style.display = 'block';
    if (gridView) gridView.style.display = 'none';
    if (toggleBtn) toggleBtn.innerHTML = '<i class="material-icons" style="font-size: 1.2rem;">view_module</i> Chế độ lưới';
    localStorage.setItem('admin_exam_builder_view', 'dropdown');
  }
}

function initializeViews() {
  const topicView = localStorage.getItem('admin_topic_view') || 'dropdown';
  const examView = localStorage.getItem('admin_exam_view') || 'dropdown';
  const examBuilderView = localStorage.getItem('admin_exam_builder_view') || 'dropdown';
  
  // Set topic view
  const topicDropdown = document.getElementById('topic-dropdown-view');
  const topicGrid = document.getElementById('topic-grid-view');
  const topicToggleBtn = document.getElementById('topic-view-toggle');
  
  if (topicView === 'grid') {
    topicDropdown.style.display = 'none';
    topicGrid.style.display = 'block';
    topicToggleBtn.innerHTML = '<i class="material-icons" style="font-size: 1.2rem;">list</i> Chế độ dropdown';
  } else {
    topicDropdown.style.display = 'block';
    topicGrid.style.display = 'none';
    topicToggleBtn.innerHTML = '<i class="material-icons" style="font-size: 1.2rem;">view_module</i> Chế độ lưới';
  }
  
  // Set exam view
  const examDropdown = document.getElementById('exam-dropdown-view');
  const examGrid = document.getElementById('exam-grid-view');
  const examToggleBtn = document.getElementById('exam-view-toggle');
  
  if (examView === 'grid') {
    examDropdown.style.display = 'none';
    examGrid.style.display = 'block';
    examToggleBtn.innerHTML = '<i class="material-icons" style="font-size: 1.2rem;">list</i> Chế độ dropdown';
  } else {
    examDropdown.style.display = 'block';
    examGrid.style.display = 'none';
    examToggleBtn.innerHTML = '<i class="material-icons" style="font-size: 1.2rem;">view_module</i> Chế độ lưới';
  }
  
  // Set exam builder view
  const examBuilderDropdown = document.getElementById('exam-builder-dropdown-view');
  const examBuilderGrid = document.getElementById('exam-builder-grid-view');
  const examBuilderToggleBtn = document.getElementById('exam-builder-view-toggle');
  
  if (examBuilderView === 'grid') {
    if (examBuilderDropdown) examBuilderDropdown.style.display = 'none';
    if (examBuilderGrid) examBuilderGrid.style.display = 'block';
    if (examBuilderToggleBtn) examBuilderToggleBtn.innerHTML = '<i class="material-icons" style="font-size: 1.2rem;">list</i> Chế độ dropdown';
  } else {
    if (examBuilderDropdown) examBuilderDropdown.style.display = 'block';
    if (examBuilderGrid) examBuilderGrid.style.display = 'none';
    if (examBuilderToggleBtn) examBuilderToggleBtn.innerHTML = '<i class="material-icons" style="font-size: 1.2rem;">view_module</i> Chế độ lưới';
  }
}

// Topic management functions
function renderTopicItem(topic, container) {
  const topicEl = document.createElement('div');
  topicEl.className = 'topic-item';
  topicEl.dataset.id = topic.id;
  topicEl.innerHTML = `
    <div class="topic-info">
      <h3>${topic.name}</h3>
      <div class="topic-meta">
        ${topic.questions ? topic.questions.length : 0} câu hỏi
      </div>
    </div>
    <div class="topic-actions">
      <button class="btn btn-outline btn-sm edit-topic" data-id="${topic.id}">
        <i class="material-icons">edit</i>
      </button>
      <button class="btn btn-delete btn-sm delete-topic" data-id="${topic.id}">
        <i class="material-icons">delete</i>
      </button>
    </div>
  `;
  
  if (container) {
    container.appendChild(topicEl);
  }
  
  return topicEl;
}

function updateTopicView(topic) {
  if (!topic) {
    document.getElementById('topic-detail-container').style.display = 'none';
    document.getElementById('edit-topic-btn').disabled = true;
    document.getElementById('delete-topic-btn').disabled = true;
    return;
  }
  
  document.getElementById('selected-topic-name').textContent = topic.name;
  document.getElementById('selected-topic-questions').textContent = topic.questions ? topic.questions.length : 0;
  document.getElementById('topic-detail-container').style.display = 'block';
  document.getElementById('edit-topic-btn').disabled = false;
  document.getElementById('delete-topic-btn').disabled = false;
  
  // Store current topic ID in edit/delete buttons
  const topicId = topic.id;
  document.getElementById('edit-topic-btn').onclick = () => openEditTopic(topicId);
  document.getElementById('delete-topic-btn').onclick = () => delTopic(topicId);
}

function renderTopicDropdown(topics) {
  const selector = document.getElementById('topic-selector');
  selector.innerHTML = '<option value="">-- Chọn chuyên đề --</option>';
  
  // Filter out review topics and exam-like topics and sort
  const filteredTopics = topics.filter(topic => 
    !topic.name.includes('Ôn tập câu sai') && 
    !topic.createdFrom &&
    !topic.name.includes('(Bài thi')
  ).sort((a, b) => {
    // Extract number prefix (e.g., "1. Tín dụng..." -> 1)
    const getNumber = (name) => {
      const match = name.match(/^(\d+)\./);
      return match ? parseInt(match[1]) : 999;
    };
    
    const numA = getNumber(a.name);
    const numB = getNumber(b.name);
    
    // If both have numbers, sort by number
    if (numA !== 999 && numB !== 999) {
      return numA - numB;
    }
    
    // If only one has number, number comes first
    if (numA !== 999) return -1;
    if (numB !== 999) return 1;
    
    // If neither has number, sort alphabetically
    return a.name.localeCompare(b.name, 'vi');
  });
  
  filteredTopics.forEach(topic => {
    const option = document.createElement('option');
    option.value = topic.id;
    option.textContent = topic.name;
    selector.appendChild(option);
  });
  
  // Event listener will be set in initializeViews
}

function renderTopicGrid(topics) {
  const container = document.getElementById('topic-list-container');
  container.innerHTML = '';
  
  if (topics.length === 0) {
    container.innerHTML = '<p style="grid-column: 1 / -1; text-align: center; color: #666;">Chưa có chuyên đề nào</p>';
    return;
  }
  
  topics.forEach(topic => {
    const topicEl = renderTopicItem(topic);
    container.appendChild(topicEl);
    
    // Add event listeners for edit/delete buttons
    topicEl.querySelector('.edit-topic').onclick = (e) => {
      e.stopPropagation();
      openEditTopic(topic.id);
    };
    
    topicEl.querySelector('.delete-topic').onclick = (e) => {
      e.stopPropagation();
      delTopic(topic.id);
    };
    
    topicEl.onclick = () => {
      // Toggle selection
      document.querySelectorAll('.topic-item').forEach(el => el.classList.remove('selected'));
      topicEl.classList.add('selected');
      updateTopicView(topic);
    };
  });
}

// Initialize
document.addEventListener('DOMContentLoaded', async function() {
  // Wait for window.db to exist (should be immediate since script loads before this)
  let retries = 50;
  while (!window.db && retries > 0) {
    await new Promise(resolve => setTimeout(resolve, 100));
    retries--;
  }
  
  if (!window.db) {
    console.error('❌ window.db not available after timeout');
    alert('Lỗi khởi tạo hệ thống. Vui lòng F5 để tải lại trang.');
    return;
  }
  
  // Wait for IndexedDB to be fully initialized (window.db.ready is a Promise)
  try {
    await window.db.ready;
    console.log('✅ IndexedDB is ready for admin panel');
  } catch (e) {
    console.error('❌ Error waiting for IndexedDB ready:', e);
    alert('Lỗi khởi tạo database. Vui lòng thử lại hoặc xóa dữ liệu trình duyệt.');
    return;
  }
  
  // Wait for quizStorage to exist
  console.log('🔍 Waiting for quizStorage...');
  retries = 50;
  while (!window.quizStorage && retries > 0) {
    await new Promise(resolve => setTimeout(resolve, 100));
    retries--;
  }
  
  if (!window.quizStorage) {
    console.error('❌ window.quizStorage not available after timeout');
    alert('Lỗi khởi tạo storage. Vui lòng F5 để tải lại trang.');
    return;
  }
  
  console.log('✅ quizStorage is ready');
  
  const isAuth = await checkAuth();
  if (isAuth) {
    showAdminPanel();
    initializeViews();
    
    // Check and initialize data if needed
    await checkAndInitializeData();
    
    // Render topics after data initialization
    await renderTopics();
    
    // Add new topic button
    const addTopicBtn = document.getElementById('add-topic-btn');
    if (addTopicBtn) {
      addTopicBtn.onclick = () => {
        const topicFormContainer = document.querySelector('.topic-form');
        if (topicFormContainer) topicFormContainer.scrollIntoView({ behavior: 'smooth' });
      };
    }
    
    // Save topic form
    const topicForm = document.getElementById('topic-form');
    if (topicForm) {
      topicForm.onsubmit = async (e) => {
        e.preventDefault();
        const topicName = document.getElementById('topic-name').value.trim();
        const fileInput = document.getElementById('file-quiz');
        const msgEl = document.getElementById('topic-msg');
        
        if (!topicName) {
          msgEl.textContent = 'Vui lòng nhập tên chuyên đề';
          msgEl.className = 'ml-2 error';
          return;
        }
        
        if (!fileInput.files || fileInput.files.length === 0) {
          msgEl.textContent = 'Vui lòng chọn file Excel câu hỏi';
          msgEl.className = 'ml-2 error';
          return;
        }
        
        parseExcelFile(fileInput.files[0], async (result) => {
          if (result.error) {
            msgEl.textContent = result.error;
            msgEl.className = 'ml-2 error';
            return;
          }
          
          const topics = await getTopics();
          const newTopic = {
            id: uuid(),
            name: topicName,
            questions: result.questions,
            createdAt: new Date().toISOString()
          };
          
          topics.push(newTopic);
          await saveTopics(topics);
          
          // Reset form
          topicForm.reset();
          msgEl.textContent = 'Đã thêm chuyên đề thành công!';
          msgEl.className = 'ml-2 success';
          
          // Refresh views
          await renderTopics();
          
          setTimeout(() => {
            msgEl.textContent = '';
            msgEl.className = '';
          }, 3000);
        });
      };
    }
    
  } else {
    showLoginForm();
  }

  // Login form handler
  const loginForm = document.getElementById('login-form');
  if (loginForm) loginForm.addEventListener('submit', handleLogin);
  
  const logoutBtn = document.getElementById('logout-btn');
  if (logoutBtn) logoutBtn.addEventListener('click', handleLogout);
  
  // View toggle handlers
  const topicToggle = document.getElementById('topic-view-toggle');
  if (topicToggle) topicToggle.addEventListener('click', toggleTopicView);
  
  const examToggle = document.getElementById('exam-view-toggle');
  if (examToggle) examToggle.addEventListener('click', toggleExamView);
  
  const examBuilderToggle = document.getElementById('exam-builder-view-toggle');
  if (examBuilderToggle) examBuilderToggle.addEventListener('click', toggleExamBuilderView);
  
  // Topic selector change handler
  const topicSelector = document.getElementById('topic-selector');
  if (topicSelector) topicSelector.addEventListener('change', async function(e) {
    const topicId = e.target.value;
    const detailContainer = document.getElementById('topic-detail-container');
    const detailDiv = document.getElementById('selected-topic-detail');
    
    if (!topicId) {
      detailContainer.style.display = 'none';
      return;
    }
    
    const topics = await getTopics();
    const topic = topics.find(t => t.id === topicId && !t.isExam);
    
    if (topic) {
      detailDiv.innerHTML = `
        <div class="topic-info">
          <h3>${topic.name}</h3>
          <div class="topic-meta">${topic.questions.length} câu hỏi</div>
        </div>
        <div>
          <button onclick="openEditTopic('${topic.id}')" class="btn btn-outline" style="margin-right:8px;">
            <i class="material-icons">edit</i> Sửa
          </button>
          <button onclick="delTopic('${topic.id}')" class="btn btn-delete">
            <i class="material-icons">delete</i> Xóa
          </button>
        </div>
      `;
      detailContainer.style.display = 'block';
    }
  });
  
  // Exam selector change handler
  const examSelector = document.getElementById('exam-selector');
  if (examSelector) examSelector.addEventListener('change', async function(e) {
    const examId = e.target.value;
    const detailContainer = document.getElementById('exam-detail-container');
    const detailDiv = document.getElementById('selected-exam-detail');
    
    if (!examId) {
      detailContainer.style.display = 'none';
      return;
    }
    
    const topics = await getTopics();
    const exam = topics.find(t => t.id === examId && t.isExam);
    
    if (exam) {
      const total = exam.examConfig?.total ?? (exam.questions ? exam.questions.length : 0);
      const duration = (typeof exam.durationMinutes === 'number' && exam.durationMinutes > 0)
        ? `${exam.durationMinutes} phút` : 'Không đặt thời gian';
      
      detailDiv.innerHTML = `
        <div class="topic-info">
          <h3>${exam.name}</h3>
          <div class="topic-meta">${total} câu • ${duration}${exam.allowPause ? ' • Cho phép tạm dừng' : ''}</div>
        </div>
        <div>
          <button onclick="openEditExam('${exam.id}')" class="btn btn-outline" style="margin-right:8px;">
            <i class="material-icons">edit</i> Sửa
          </button>
          <button onclick="delTopic('${exam.id}')" class="btn btn-delete">
            <i class="material-icons">delete</i> Xóa
          </button>
        </div>
      `;
      detailContainer.style.display = 'block';
    }
  });
  
  // Topic form (duplicate handler - already handled above, skip)
  const topicFormSubmit = document.getElementById('topic-form');
  if (false) { // Disabled - already handled above
    topicFormSubmit.addEventListener('submit', async function(e) {
    e.preventDefault();
    const name = document.getElementById('topic-name').value.trim();
    const fileInput = document.getElementById('file-quiz');
    const msg = document.getElementById('topic-msg');
    msg.textContent = '';
    
    if (!name) { msg.textContent = "Vui lòng nhập tên chuyên đề!"; return; }
    const file = fileInput.files[0];
    if (!file) { msg.textContent = "Vui lòng chọn file câu hỏi!"; return; }
    
      parseExcelFile(file, async (result) => {
      if (result.error) {
        msg.textContent = result.error;
        return;
      }
      
        const topics = await getTopics();
      topics.push({
        id: uuid(),
        name: name,
        questions: result.questions
      });
        await saveTopics(topics);
        await renderTopics();
      document.getElementById('topic-form').reset();
      msg.textContent = "Tạo chuyên đề thành công!";
      setTimeout(() => { msg.textContent = ''; }, 2000);
    });
  });
  }
  
  // Edit Topic modal handlers
  const editTopicForm = document.getElementById('edit-topic-form');
  if (editTopicForm) editTopicForm.addEventListener('submit', saveEditTopic);
  
  const editTopicCancel = document.getElementById('edit-topic-cancel');
  if (editTopicCancel) editTopicCancel.addEventListener('click', () => {
    document.getElementById('edit-topic-modal').classList.add('hidden');
  });
  
  // Edit Exam modal handlers
  const editExamForm = document.getElementById('edit-exam-form');
  if (editExamForm) editExamForm.addEventListener('submit', saveEditExam);
  
  const editExamCancel = document.getElementById('edit-exam-cancel');
  if (editExamCancel) editExamCancel.addEventListener('click', () => {
    document.getElementById('edit-exam-modal').classList.add('hidden');
  });
  
  // Change password handlers
  const changePasswordBtn = document.getElementById('change-password-btn');
  if (changePasswordBtn) changePasswordBtn.addEventListener('click', showChangePasswordModal);
  
  const changePasswordForm = document.getElementById('change-password-form');
  if (changePasswordForm) changePasswordForm.addEventListener('submit', handleChangePassword);
  
  const changePasswordCancel = document.getElementById('change-password-cancel');
  if (changePasswordCancel) changePasswordCancel.addEventListener('click', () => {
    document.getElementById('change-password-modal').classList.add('hidden');
    document.getElementById('change-password-form').reset();
    document.getElementById('change-password-msg').textContent = '';
  });
  
  // Forgot password handler
  const forgotPasswordLink = document.getElementById('forgot-password-link');
  if (forgotPasswordLink) forgotPasswordLink.addEventListener('click', handleForgotPassword);
  
  // Exam Builder
  const examBuilderForm = document.getElementById('exam-builder-form');
  if (examBuilderForm) examBuilderForm.addEventListener('submit', buildCompositeExam);
  
  // Export
  const exportBtn = document.getElementById('export-json-btn');
  if (exportBtn) exportBtn.addEventListener('click', exportTopicsJson);
  // Import
  const importBtn = document.getElementById('import-json-btn');
  if (importBtn) importBtn.addEventListener('click', importTopicsJson);
  
  const importFileInput = document.getElementById('import-json-file');
  if (importFileInput) importFileInput.addEventListener('change', handleImportFile);
  
  // Test Google Sheets connection
  const testGoogleSheetsBtn = document.getElementById('test-google-sheets-btn');
  if (testGoogleSheetsBtn) testGoogleSheetsBtn.addEventListener('click', async function() {
    await testGoogleSheetsConnection();
  });
  
  // Load topics button
  const loadTopicsBtn = document.getElementById('load-topics-btn');
  if (loadTopicsBtn) loadTopicsBtn.addEventListener('click', async function() {
    await checkAndInitializeData();
    await renderTopics();
  });
  
  // Merge JSON files
  const mergeJsonBtn = document.getElementById('merge-json-btn');
  if (mergeJsonBtn) mergeJsonBtn.addEventListener('click', initMergeJson);
  
  const mergeJsonFile1Input = document.getElementById('merge-json-file-1');
  if (mergeJsonFile1Input) mergeJsonFile1Input.addEventListener('change', handleMergeFile1);
  
  const mergeJsonFile2Input = document.getElementById('merge-json-file-2');
  if (mergeJsonFile2Input) mergeJsonFile2Input.addEventListener('change', handleMergeFile2);
});

// Forgot password functionality
async function handleForgotPassword(e) {
  e.preventDefault();
  
  const confirmed = confirm(
    '⚠️ CẢNH BÁO: Reset mật khẩu về mặc định!\n\n' +
    'Mật khẩu sẽ được reset về:\n' +
    '• Username: admin\n' +
    '• Password: admin123\n\n' +
    'Bạn có chắc chắn muốn tiếp tục?'
  );
  
  if (!confirmed) return;
  
  try {
    // Reset to default credentials
    await setAdminCredentials('admin', 'admin123');
    
    alert(
      '✅ Reset mật khẩu thành công!\n\n' +
      'Thông tin đăng nhập mặc định:\n' +
      '• Username: admin\n' +
      '• Password: admin123\n\n' +
      'Vui lòng đăng nhập lại và ĐỔI MẬT KHẨU ngay!'
    );
    
    // Clear authentication
    await window.quizStorage.safeRemove('admin_authenticated');
    
    // Reload page
    location.reload();
  } catch (error) {
    console.error('Error resetting password:', error);
    alert('❌ Lỗi khi reset mật khẩu: ' + error.message);
  }
}

// Change password functionality
async function showChangePasswordModal() {
  document.getElementById('change-password-modal').classList.remove('hidden');
  document.getElementById('change-password-form').reset();
  document.getElementById('change-password-msg').textContent = '';
  
  // Pre-fill current username
  const currentCreds = await getAdminCredentials();
  document.getElementById('change-new-username').placeholder = `Hiện tại: ${currentCreds.username}`;
}

async function handleChangePassword(e) {
  e.preventDefault();
  
  const currentPassword = document.getElementById('change-current-password').value;
  const newUsername = document.getElementById('change-new-username').value.trim();
  const newPassword = document.getElementById('change-new-password').value;
  const confirmPassword = document.getElementById('change-confirm-password').value;
  
  const msgEl = document.getElementById('change-password-msg');
  msgEl.textContent = 'Đang xử lý...';
  msgEl.style.color = '#666';
  
  // Get current credentials
  const currentCreds = await getAdminCredentials();
  
  // Verify current password
  if (currentPassword !== currentCreds.password) {
    msgEl.textContent = 'Mật khẩu hiện tại không đúng!';
    msgEl.style.color = '#dc3545';
    return;
  }
  
  // Validate new password
  if (newPassword.length < 6) {
    msgEl.textContent = 'Mật khẩu mới phải có ít nhất 6 ký tự!';
    msgEl.style.color = '#dc3545';
    return;
  }
  
  // Check if passwords match
  if (newPassword !== confirmPassword) {
    msgEl.textContent = 'Mật khẩu xác nhận không khớp!';
    msgEl.style.color = '#dc3545';
    return;
  }
  
  // Update credentials
  const updatedUsername = newUsername || currentCreds.username;
  await setAdminCredentials(updatedUsername, newPassword);
  
  // Show success message
  msgEl.textContent = 'Đã đổi mật khẩu thành công!';
  msgEl.style.color = '#28a745';
  
  // Close modal and logout after 1.5 seconds
  setTimeout(async () => {
    document.getElementById('change-password-modal').classList.add('hidden');
    alert('Mật khẩu đã được thay đổi!\n\nBạn sẽ được đăng xuất. Vui lòng đăng nhập lại với mật khẩu mới.');
    await handleLogout();
  }, 1500);
}

// Merge JSON files functionality
let mergeFile1Data = null;
let mergeFile2Data = null;

function initMergeJson() {
  mergeFile1Data = null;
  mergeFile2Data = null;
  
  // Trigger file 1 selection immediately (no alert to avoid blocking)
  const fileInput1 = document.getElementById('merge-json-file-1');
  if (fileInput1) {
    fileInput1.click();
  }
}

function handleMergeFile1(e) {
  const file = e.target.files[0];
  if (!file) return;
  
  const reader = new FileReader();
  reader.onload = function(event) {
    try {
      mergeFile1Data = JSON.parse(event.target.result);
      
      console.log('✅ File 1 loaded:', file.name);
      
      // Trigger file 2 selection after a short delay
      setTimeout(() => {
        const fileInput2 = document.getElementById('merge-json-file-2');
        if (fileInput2) {
          console.log('📁 Opening file chooser 2...');
          fileInput2.click();
        }
      }, 300);
    } catch (error) {
      alert('❌ Lỗi đọc file 1: ' + error.message);
      mergeFile1Data = null;
    }
  };
  reader.readAsText(file);
  
  // Reset input
  e.target.value = '';
}

function handleMergeFile2(e) {
  const file = e.target.files[0];
  if (!file) return;
  
  if (!mergeFile1Data) {
    alert('❌ Vui lòng chọn file 1 trước!');
    return;
  }
  
  const reader = new FileReader();
  reader.onload = function(event) {
    try {
      mergeFile2Data = JSON.parse(event.target.result);
      console.log('✅ File 2 loaded:', file.name);
      console.log('⚙️ Starting merge process...');
      
      // Start merge process
      performMerge();
    } catch (error) {
      alert('❌ Lỗi đọc file 2: ' + error.message);
      mergeFile2Data = null;
    }
  };
  reader.readAsText(file);
  
  // Reset input
  e.target.value = '';
}

function performMerge() {
  if (!mergeFile1Data || !mergeFile2Data) {
    alert('Chưa đủ dữ liệu để gộp!');
    return;
  }
  
  try {
    // Ensure both files are arrays
    const data1 = Array.isArray(mergeFile1Data) ? mergeFile1Data : [];
    const data2 = Array.isArray(mergeFile2Data) ? mergeFile2Data : [];
    
    // Separate topics and exams from both files
    const topics1 = data1.filter(item => !item.isExam && !item.examConfig);
    const exams1 = data1.filter(item => item.isExam || item.examConfig);
    
    const topics2 = data2.filter(item => !item.isExam && !item.examConfig);
    const exams2 = data2.filter(item => item.isExam || item.examConfig);
    
    // Merge and remove duplicates for topics
    const mergedTopics = mergeDeduplicate(topics1, topics2, 'topics');
    
    // Merge and remove duplicates for exams
    const mergedExams = mergeDeduplicate(exams1, exams2, 'exams');
    
    // Create summary
    const topicsRemoved = topics1.length + topics2.length - mergedTopics.length;
    const examsRemoved = exams1.length + exams2.length - mergedExams.length;
    
    const summary = `✅ GỘP THÀNH CÔNG!

📚 CHUYÊN ĐỀ:
• File 1: ${topics1.length}
• File 2: ${topics2.length}
• Tổng: ${topics1.length + topics2.length}
• Loại bỏ trùng: ${topicsRemoved}
• ✅ Kết quả: ${mergedTopics.length}

📝 BÀI THI:
• File 1: ${exams1.length}
• File 2: ${exams2.length}
• Tổng: ${exams1.length + exams2.length}
• Loại bỏ trùng: ${examsRemoved}
• ✅ Kết quả: ${mergedExams.length}

💡 Lưu ý: Nếu có ID trùng nhưng nội dung khác,
hệ thống đã tự động tạo ID mới (xem Console).

🎉 Đang tải xuống merged_all.json...`;
    
    console.log(summary);
    
    // Create a combined file with both topics and exams
    const combined = [...mergedTopics, ...mergedExams];
    if (combined.length > 0) {
      downloadJson(combined, 'merged_all.json');
      alert(`✅ Đã tạo file: merged_all.json\n\n📦 Tổng cộng: ${combined.length} items\n• ${mergedTopics.length} chuyên đề\n• ${mergedExams.length} bài thi\n\n💾 Thay thế topics.json gốc bằng file này để sử dụng!`);
    } else {
      alert('⚠️ Không có dữ liệu để gộp!');
    }
    
    // Reset data
    mergeFile1Data = null;
    mergeFile2Data = null;
    
  } catch (error) {
    alert('Lỗi khi gộp dữ liệu: ' + error.message);
    console.error('Merge error:', error);
  }
}

function mergeDeduplicate(array1, array2, type) {
  // Combine arrays
  const combined = [...array1, ...array2];
  
  // Create a map to track unique items
  const uniqueMap = new Map();
  
  // Track true duplicates vs ID conflicts
  const trueDuplicates = [];
  const idConflicts = [];
  
  combined.forEach(item => {
    // Generate a unique key based on ID or name
    let key = item.id;
    
    // If no ID, use name as key
    if (!key && item.name) {
      key = item.name.toLowerCase().trim();
    }
    
    // If we haven't seen this key before, add it
    if (!uniqueMap.has(key)) {
      uniqueMap.set(key, item);
    } else {
      // Key already exists - check if content is actually different
      const existing = uniqueMap.get(key);
      
      // Compare content to determine if it's a true duplicate or just ID conflict
      const isDifferent = isContentDifferent(existing, item);
      
      if (isDifferent) {
        // ID conflict: same ID but different content
        // Create a new unique ID for this item
        let newKey = key;
        let suffix = 2;
        while (uniqueMap.has(newKey)) {
          newKey = `${key}_${suffix}`;
          suffix++;
        }
        
        // Update item's ID to avoid conflict
        const newItem = { ...item, id: newKey };
        uniqueMap.set(newKey, newItem);
        
        idConflicts.push({
          originalId: key,
          newId: newKey,
          name: item.name
        });
      } else {
        // True duplicate: same ID and same content
        trueDuplicates.push({
          key: key,
          name: item.name,
          type: type
        });
        
        // Keep the item with more questions or more properties
        if (item.questions && existing.questions) {
          if (item.questions.length > existing.questions.length) {
            uniqueMap.set(key, item);
          } else if (item.questions.length === existing.questions.length) {
            const existingProps = Object.keys(existing).length;
            const newProps = Object.keys(item).length;
            if (newProps > existingProps) {
              uniqueMap.set(key, item);
            }
          }
        }
      }
    }
  });
  
  // Log results
  if (trueDuplicates.length > 0) {
    console.log(`✅ Loại bỏ ${trueDuplicates.length} ${type} trùng lặp thực sự:`, trueDuplicates);
  }
  if (idConflicts.length > 0) {
    console.log(`⚠️ Phát hiện ${idConflicts.length} ${type} có ID trùng nhưng nội dung khác (đã tạo ID mới):`, idConflicts);
  }
  
  // Return unique items as array
  return Array.from(uniqueMap.values());
}

// Helper function to compare if two items have different content
function isContentDifferent(item1, item2) {
  // Compare name
  if (item1.name !== item2.name) return true;
  
  // Compare number of questions
  if (item1.questions && item2.questions) {
    if (item1.questions.length !== item2.questions.length) return true;
  }
  
  // For exams, compare examConfig
  if (item1.examConfig && item2.examConfig) {
    const config1 = JSON.stringify(item1.examConfig);
    const config2 = JSON.stringify(item2.examConfig);
    if (config1 !== config2) return true;
  }
  
  // Compare questions content (first 3 questions as sample)
  if (item1.questions && item2.questions && item1.questions.length > 0) {
    const sampleSize = Math.min(3, item1.questions.length);
    for (let i = 0; i < sampleSize; i++) {
      if (item1.questions[i]?.question !== item2.questions[i]?.question) {
        return true;
      }
    }
  }
  
  // If all checks pass, items are considered the same
  return false;
}

function downloadJson(data, filename) {
  const jsonStr = JSON.stringify(data, null, 2);
  const blob = new Blob([jsonStr], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

// Test Google Sheets connection function
async function testGoogleSheetsConnection() {
  if (!window.QUIZ_CONFIG || !window.isConfigured()) {
    alert('Google Sheets chưa được cấu hình!\n\nVui lòng kiểm tra file config.js và đảm bảo:\n- GOOGLE_SCRIPT_URL đã được thiết lập\n- ENABLE_CLOUD_SYNC = true');
    return;
  }

  try {
    console.log('Testing Google Sheets connection...');
    console.log('Google Script URL:', window.QUIZ_CONFIG.GOOGLE_SCRIPT_URL);
    
    const response = await fetch(`${window.QUIZ_CONFIG.GOOGLE_SCRIPT_URL}?action=test`, {
      method: 'GET',
      mode: 'cors'
    });
    
    const text = await response.text();
    console.log('Test response:', text);
    
    if (text.includes('working')) {
      alert('✅ Kết nối Google Sheets thành công!\n\n' + text + '\n\nBạn có thể sử dụng tính năng thống kê từ Google Sheets.');
    } else {
      alert('⚠️ Google Sheets phản hồi nhưng có thể có vấn đề:\n\n' + text + '\n\nVui lòng kiểm tra cấu hình Google Apps Script.');
    }
  } catch (error) {
    console.error('Google Sheets test error:', error);
    alert('❌ Không thể kết nối Google Sheets:\n\n' + error.message + '\n\nVui lòng kiểm tra:\n- URL Google Script trong config.js\n- Cấu hình CORS trong Google Apps Script\n- Quyền truy cập "Anyone" trong deployment\n- Kết nối internet');
  }
}