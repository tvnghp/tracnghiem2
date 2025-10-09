// Exam Builder Combobox Helper Functions
// Thêm file này vào admin.html: <script src="exam_builder_combobox.js"></script>

// Render combobox rows for exam builder (dropdown dynamic)
function renderComboboxRows() {
  const container = document.getElementById('exam-builder-combobox-rows');
  if (!container || !window.examBuilderTopics) return;
  
  const rows = Array.from(container.querySelectorAll('.eb-combobox-row'));
  const selections = rows.map(row => {
    const select = row.querySelector('.eb-topic-select');
    const percentInput = row.querySelector('.eb-topic-percent-input');
    return {
      topicId: select?.value || '',
      percent: parseFloat(percentInput?.value || '0')
    };
  }).filter(s => s.topicId);
  
  const totalPercent = selections.reduce((sum, s) => sum + s.percent, 0);
  const remaining = 100 - totalPercent;
  const selectedIds = selections.map(s => s.topicId);
  
  // Only add new row if total < 100% and there are available topics
  const needNewRow = totalPercent < 100 && remaining > 0 && selectedIds.length < window.examBuilderTopics.length;
  
  // Add new row if needed
  if (rows.length === 0 || (needNewRow && rows.length === selections.length)) {
    addComboboxRow(container, '', 0, selectedIds);
  }
  
  updateComboboxSummary(totalPercent);
}

function addComboboxRow(container, selectedId = '', percent = 0, excludeIds = []) {
  const topics = window.examBuilderTopics || [];
  const availableTopics = topics.filter(t => !excludeIds.includes(t.id) || t.id === selectedId);
  
  const row = document.createElement('div');
  row.className = 'eb-combobox-row';
  row.style.cssText = 'display: flex; align-items: center; gap: 10px; padding: 10px; background: #f8f9fa; border-radius: 8px; border: 1px solid #e9ecef;';
  
  row.innerHTML = `
    <div style="flex: 1;">
      <select class="eb-topic-select" style="width: 100%; padding: 8px; border-radius: 6px; border: 1px solid #ddd; font-size: 14px;">
        <option value="">-- Chọn chuyên đề --</option>
        ${availableTopics.map(t => `
          <option value="${t.id}" ${t.id === selectedId ? 'selected' : ''}>
            ${t.name} (${t.questions.length} câu)
          </option>
        `).join('')}
      </select>
    </div>
    <div style="display: flex; align-items: center; gap: 6px;">
      <input type="number" class="eb-topic-percent-input" min="0" max="100" step="1" value="${percent}" 
             style="width: 90px; padding: 8px; border-radius: 6px; border: 1px solid #ddd; font-size: 14px;" 
             ${!selectedId ? 'disabled' : ''}>
      <span style="font-weight: 500;">%</span>
    </div>
    ${selectedId ? `
      <button type="button" class="eb-remove-row" style="padding: 6px 10px; background: #c72c41; color: white; border: none; border-radius: 6px; cursor: pointer;">
        <i class="material-icons" style="font-size: 18px;">close</i>
      </button>
    ` : ''}
  `;
  
  container.appendChild(row);
  
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
    renderComboboxRows();
  });
  
  percentInput.addEventListener('input', () => {
    const container = document.getElementById('exam-builder-combobox-rows');
    if (!container) return;
    
    const rows = Array.from(container.querySelectorAll('.eb-combobox-row'));
    const selections = rows.map(row => {
      const sel = row.querySelector('.eb-topic-select');
      const pct = row.querySelector('.eb-topic-percent-input');
      return {
        topicId: sel?.value || '',
        percent: parseFloat(pct?.value || '0')
      };
    }).filter(s => s.topicId);
    
    const totalPercent = selections.reduce((sum, s) => sum + s.percent, 0);
    updateComboboxSummary(totalPercent);
    
    // Remove empty row if total >= 100%
    if (totalPercent >= 100) {
      const emptyRows = Array.from(container.querySelectorAll('.eb-combobox-row')).filter(r => {
        const sel = r.querySelector('.eb-topic-select');
        return !sel?.value;
      });
      emptyRows.forEach(r => r.remove());
    } else {
      // Add empty row back if total < 100% and no empty row exists
      const hasEmptyRow = Array.from(container.querySelectorAll('.eb-combobox-row')).some(r => {
        const sel = r.querySelector('.eb-topic-select');
        return !sel?.value;
      });
      const selectedIds = selections.map(s => s.topicId);
      if (!hasEmptyRow && selectedIds.length < (window.examBuilderTopics?.length || 0)) {
        addComboboxRow(container, '', 0, selectedIds);
      }
    }
  });
  
  percentInput.addEventListener('blur', () => {
    renderComboboxRows();
  });
  
  if (removeBtn) {
    removeBtn.addEventListener('click', () => {
      row.remove();
      renderComboboxRows();
    });
  }
}

function updateComboboxSummary(totalPercent) {
  const summary = document.getElementById('percent-summary');
  const totalSpan = document.getElementById('total-percent');
  if (!summary || !totalSpan) return;
  
  totalSpan.textContent = totalPercent.toFixed(1);
  
  if (totalPercent === 100) {
    summary.style.background = '#d4edda';
    summary.style.color = '#155724';
    summary.style.border = '1px solid #c3e6cb';
  } else if (totalPercent > 100) {
    summary.style.background = '#f8d7da';
    summary.style.color = '#721c24';
    summary.style.border = '1px solid #f5c6cb';
  } else {
    summary.style.background = '#fff3cd';
    summary.style.color = '#856404';
    summary.style.border = '1px solid #ffeaa7';
  }
}

// Get selections from combobox view
function getComboboxSelections() {
  const container = document.getElementById('exam-builder-combobox-rows');
  if (!container) return [];
  
  const rows = Array.from(container.querySelectorAll('.eb-combobox-row'));
  return rows.map(row => {
    const select = row.querySelector('.eb-topic-select');
    const percentInput = row.querySelector('.eb-topic-percent-input');
    return {
      id: select?.value || '',
      percent: parseFloat(percentInput?.value || '0')
    };
  }).filter(s => s.id);
}
