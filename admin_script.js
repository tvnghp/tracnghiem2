// Admin credentials
const ADMIN_CREDENTIALS = {
  username: 'admin',
  password: 'admin123'
};

function checkAuth() {
  return localStorage.getItem('admin_authenticated') === 'true';
}

function handleLogin(e) {
  e.preventDefault();
  const username = document.getElementById('username').value;
  const password = document.getElementById('password').value;
  
  if (username === ADMIN_CREDENTIALS.username && password === ADMIN_CREDENTIALS.password) {
    localStorage.setItem('admin_authenticated', 'true');
    showAdminPanel();
  } else {
    alert('Tên đăng nhập hoặc mật khẩu không đúng!');
  }
}

function handleLogout() {
  localStorage.removeItem('admin_authenticated');
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

function getTopics() {
  return JSON.parse(localStorage.getItem('quiz_topics') || '[]');
}

function saveTopics(topics) {
  localStorage.setItem('quiz_topics', JSON.stringify(topics));
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
        let rawAnswer = getCol(row, 'đáp án đúng').toString().trim();
        let answer = ["1", "2", "3", "4"].includes(rawAnswer) 
          ? ["A", "B", "C", "D"][parseInt(rawAnswer)-1] 
          : rawAnswer.toUpperCase();
        
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
        if (!answer) return null;
        
        let validAnswer = false;
        if (["A", "B", "C", "D"].includes(answer)) {
          let idxLabel = ["A", "B", "C", "D"].indexOf(answer);
          validAnswer = cols[idxLabel].value && cols[idxLabel].value.toString().trim() !== "";
        }
        if (!validAnswer) return null;
        
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

function renderTopics() {
  const topics = getTopics();
  const selector = document.getElementById('topic-selector');
  const detailContainer = document.getElementById('topic-detail-container');
  const gridContainer = document.getElementById('topic-list-container');
  
  if (topics.length === 0) {
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

  // Populate topic selector dropdown
  selector.innerHTML = '<option value="">-- Chọn chuyên đề --</option>' + 
    normalTopics.map(topic => `<option value="${topic.id}">${topic.name} (${topic.questions.length} câu)</option>`).join('');
  
  // Clear detail on re-render
  detailContainer.style.display = 'none';
  
  // Populate grid view
  if (gridContainer) {
    gridContainer.innerHTML = normalTopics.map(topic => `
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

  renderExamBuilderTopics(normalTopics);
  renderExams(exams);
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
window.openEditTopic = function(topicId) {
  const topics = getTopics();
  const topic = topics.find(t => t.id === topicId && !t.isExam);
  if (!topic) return;
  
  document.getElementById('edit-topic-id').value = topic.id;
  document.getElementById('edit-topic-name').value = topic.name || '';
  document.getElementById('edit-topic-file').value = '';
  document.getElementById('edit-topic-msg').textContent = '';
  document.getElementById('edit-topic-modal').classList.remove('hidden');
}

function saveEditTopic(e) {
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
  
  const topics = getTopics();
  const idx = topics.findIndex(t => t.id === id && !t.isExam);
  if (idx === -1) {
    msg.textContent = 'Không tìm thấy chuyên đề!';
    return;
  }
  
  const file = fileInput.files[0];
  if (!file) {
    // Chỉ đổi tên
    topics[idx].name = name;
    saveTopics(topics);
    renderTopics();
    document.getElementById('edit-topic-modal').classList.add('hidden');
    return;
  }
  
  // Đổi tên + thay câu hỏi
  parseExcelFile(file, (result) => {
    if (result.error) {
      msg.textContent = result.error;
      return;
    }
    topics[idx].name = name;
    topics[idx].questions = result.questions;
    saveTopics(topics);
    renderTopics();
    document.getElementById('edit-topic-modal').classList.add('hidden');
  });
}

// ===== Edit Exam Logic =====
window.openEditExam = function(examId) {
  const topics = getTopics();
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
  if (!allTopics || allTopics.length === 0) {
    holder.innerHTML = '<p>Chưa có chuyên đề để chọn.</p>';
    return;
  }
  
  const distMap = {};
  (exam.examConfig?.distribution || []).forEach(d => distMap[d.id] = d.percent);
  
  holder.innerHTML = allTopics.map(t => `
    <div class="topic-item" style="align-items:center; gap:12px;">
      <label style="flex:1; display:flex; align-items:center; gap:8px;">
        <input type="checkbox" class="edit-eb-topic-check" value="${t.id}" ${distMap[t.id] ? 'checked' : ''}>
        <span>${t.name}</span>
      </label>
      <div style="display:flex; align-items:center; gap:6px;">
        <input type="number" class="edit-eb-topic-percent" data-id="${t.id}" min="0" max="100" step="1" value="${distMap[t.id] || 0}" style="width:90px;">
        <span>%</span>
        <small style="color:#666">(${t.questions.length} câu)</small>
      </div>
    </div>
  `).join('');

  holder.querySelectorAll('.edit-eb-topic-percent').forEach(inp => {
    inp.addEventListener('input', (e) => {
      const id = e.target.getAttribute('data-id');
      const chk = holder.querySelector(`.edit-eb-topic-check[value="${id}"]`);
      if (chk && parseFloat(e.target.value || '0') > 0) chk.checked = true;
      normalizePercents(holder);
    });
    inp.addEventListener('blur', () => normalizePercents(holder));
  });
  
  holder.querySelectorAll('.edit-eb-topic-check').forEach(chk => {
    chk.addEventListener('change', () => normalizePercents(holder));
  });
}

function saveEditExam(e) {
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

  const topics = getTopics();
  const idx = topics.findIndex(t => t.id === id && t.isExam);
  if (idx === -1) { msg.textContent = 'Không tìm thấy bài thi!'; return; }
  
  topics[idx].name = name;
  topics[idx].durationMinutes = durationMinutes;
  topics[idx].allowPause = allowPause;
  topics[idx].examConfig = { total, distribution: dist };
  saveTopics(topics);
  
  try { localStorage.removeItem(`quiz_exam_questions_${id}`); } catch(_) {}
  renderTopics();
  document.getElementById('edit-exam-modal').classList.add('hidden');
}

window.delTopic = function(id) {
  if (!confirm('Bạn có chắc chắn muốn xóa chuyên đề này?')) return;
  const all = getTopics();
  const removed = all.find(topic => topic.id === id);
  const topics = all.filter(topic => topic.id !== id);
  saveTopics(topics);
  if (removed && removed.isExam === true) {
    try { localStorage.removeItem(`quiz_exam_questions_${id}`); } catch(_) {}
  }
  
  // Reset selectors after deletion
  document.getElementById('topic-selector').value = '';
  document.getElementById('exam-selector').value = '';
  document.getElementById('topic-detail-container').style.display = 'none';
  document.getElementById('exam-detail-container').style.display = 'none';
  
  renderTopics();
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

function buildCompositeExam(e) {
  e.preventDefault();
  const msg = document.getElementById('exam-builder-msg');
  msg.textContent = '';

  const name = document.getElementById('exam-name').value.trim();
  const total = parseInt(document.getElementById('exam-total').value, 10);
  const durationMinutes = parseInt(document.getElementById('exam-duration').value, 10);
  const allowPause = !!document.getElementById('exam-allow-pause').checked;
  const allTopics = getTopics();

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
  saveTopics(topics);
  renderTopics();
  document.getElementById('exam-builder-form').reset();
  msg.textContent = 'Tạo bộ đề thành công!';
  setTimeout(() => { msg.textContent = ''; }, 2000);
}

function exportTopicsJson() {
  const topics = getTopics();
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
  
  topics.forEach(topic => {
    const option = document.createElement('option');
    option.value = topic.id;
    option.textContent = topic.name;
    selector.appendChild(option);
  });
  
  selector.onchange = (e) => {
    const topicId = e.target.value;
    const topic = topics.find(t => t.id === topicId);
    updateTopicView(topic);
  };
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
document.addEventListener('DOMContentLoaded', function() {
  if (checkAuth()) {
    showAdminPanel();
    initializeViews();
    
    // Initialize topic management
    const topics = getTopics();
    renderTopicDropdown(topics);
    renderTopicGrid(topics);
    
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
      topicForm.onsubmit = (e) => {
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
        
        parseExcelFile(fileInput.files[0], (result) => {
          if (result.error) {
            msgEl.textContent = result.error;
            msgEl.className = 'ml-2 error';
            return;
          }
          
          const topics = getTopics();
          const newTopic = {
            id: uuid(),
            name: topicName,
            questions: result.questions,
            createdAt: new Date().toISOString()
          };
          
          topics.push(newTopic);
          saveTopics(topics);
          
          // Reset form
          topicForm.reset();
          msgEl.textContent = 'Đã thêm chuyên đề thành công!';
          msgEl.className = 'ml-2 success';
          
          // Refresh views
          renderTopics();
          
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
  if (topicSelector) topicSelector.addEventListener('change', function(e) {
    const topicId = e.target.value;
    const detailContainer = document.getElementById('topic-detail-container');
    const detailDiv = document.getElementById('selected-topic-detail');
    
    if (!topicId) {
      detailContainer.style.display = 'none';
      return;
    }
    
    const topics = getTopics();
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
  if (examSelector) examSelector.addEventListener('change', function(e) {
    const examId = e.target.value;
    const detailContainer = document.getElementById('exam-detail-container');
    const detailDiv = document.getElementById('selected-exam-detail');
    
    if (!examId) {
      detailContainer.style.display = 'none';
      return;
    }
    
    const topics = getTopics();
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
  
  // Topic form
  const topicFormSubmit = document.getElementById('topic-form');
  if (topicFormSubmit) topicFormSubmit.addEventListener('submit', function(e) {
    e.preventDefault();
    const name = document.getElementById('topic-name').value.trim();
    const fileInput = document.getElementById('file-quiz');
    const msg = document.getElementById('topic-msg');
    msg.textContent = '';
    
    if (!name) { msg.textContent = "Vui lòng nhập tên chuyên đề!"; return; }
    const file = fileInput.files[0];
    if (!file) { msg.textContent = "Vui lòng chọn file câu hỏi!"; return; }
    
    parseExcelFile(file, (result) => {
      if (result.error) {
        msg.textContent = result.error;
        return;
      }
      
      const topics = getTopics();
      topics.push({
        id: uuid(),
        name: name,
        questions: result.questions
      });
      saveTopics(topics);
      renderTopics();
      document.getElementById('topic-form').reset();
      msg.textContent = "Tạo chuyên đề thành công!";
      setTimeout(() => { msg.textContent = ''; }, 2000);
    });
  });
  
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
});