// Storage Wrapper - Thay thế localStorage bằng IndexedDB
// Cung cấp API tương tự localStorage để dễ migrate code

window.storage = {
  // === HELPER: Sync với localStorage để backward compatible ===
  _syncMode: false, // Set to true nếu muốn đồng bộ với localStorage
  
  // === TOPICS ===
  async getItem(key) {
    if (key === 'quiz_topics') {
      const topics = await window.db.getTopics();
      return JSON.stringify(topics);
    }
    
    if (key === 'quiz_statistics') {
      const stats = await window.db.getStatistics();
      return JSON.stringify(stats);
    }
    
    if (key === 'wrong_answers') {
      const wrongAnswers = await window.db.getWrongAnswers();
      return JSON.stringify(wrongAnswers);
    }
    
    if (key === 'deleted_review_topics') {
      const blacklist = await window.db.getConfig('deleted_review_topics');
      return JSON.stringify(blacklist || []);
    }
    
    if (key === 'deleted_review_topics_map') {
      const blacklistMap = await window.db.getConfig('deleted_review_topics_map');
      return JSON.stringify(blacklistMap || {});
    }
    
    if (key.startsWith('quiz_progress_')) {
      const topicId = key.replace('quiz_progress_', '');
      const progress = await window.db.getProgress(topicId);
      return JSON.stringify(progress);
    }
    
    if (key.startsWith('quiz_timer_end_')) {
      const topicId = key.replace('quiz_timer_end_', '');
      const timer = await window.db.getTimer(topicId);
      return timer ? timer.endTime : null;
    }
    
    if (key.startsWith('quiz_timer_paused_')) {
      const topicId = key.replace('quiz_timer_paused_', '');
      const timer = await window.db.getTimer(topicId);
      return timer ? String(timer.isPaused) : null;
    }
    
    if (key.startsWith('quiz_timer_remaining_')) {
      const topicId = key.replace('quiz_timer_remaining_', '');
      const timer = await window.db.getTimer(topicId);
      return timer ? String(timer.remaining) : null;
    }
    
    if (key.startsWith('quiz_exam_questions_')) {
      const topicId = key.replace('quiz_exam_questions_', '');
      const config = await window.db.getConfig('exam_questions_' + topicId);
      return JSON.stringify(config);
    }
    
    // Generic config
    const value = await window.db.getConfig(key);
    return value !== null ? JSON.stringify(value) : null;
  },

  async setItem(key, value) {
    if (key === 'quiz_topics') {
      const topics = JSON.parse(value);
      await window.db.saveTopics(topics);
      return;
    }
    
    if (key === 'quiz_statistics') {
      // Statistics are added individually, not bulk set
      // This is for backward compatibility
      const stats = JSON.parse(value);
      await window.db.clearStatistics();
      for (const stat of stats) {
        await window.db.addStatistic(stat);
      }
      return;
    }
    
    if (key === 'wrong_answers') {
      const wrongAnswers = JSON.parse(value);
      await window.db.clearWrongAnswers();
      if (wrongAnswers.length > 0) {
        await window.db.addWrongAnswers(wrongAnswers);
      }
      return;
    }
    
    if (key === 'deleted_review_topics') {
      const blacklist = JSON.parse(value);
      await window.db.setConfig('deleted_review_topics', blacklist);
      return;
    }
    
    if (key === 'deleted_review_topics_map') {
      const blacklistMap = JSON.parse(value);
      await window.db.setConfig('deleted_review_topics_map', blacklistMap);
      return;
    }
    
    if (key.startsWith('quiz_progress_')) {
      const topicId = key.replace('quiz_progress_', '');
      const progress = JSON.parse(value);
      await window.db.saveProgress(topicId, progress);
      return;
    }
    
    if (key.startsWith('quiz_timer_end_')) {
      const topicId = key.replace('quiz_timer_end_', '');
      const existing = await window.db.getTimer(topicId) || {};
      await window.db.saveTimer(topicId, { ...existing, endTime: value });
      return;
    }
    
    if (key.startsWith('quiz_timer_paused_')) {
      const topicId = key.replace('quiz_timer_paused_', '');
      const existing = await window.db.getTimer(topicId) || {};
      await window.db.saveTimer(topicId, { ...existing, isPaused: value === 'true' });
      return;
    }
    
    if (key.startsWith('quiz_timer_remaining_')) {
      const topicId = key.replace('quiz_timer_remaining_', '');
      const existing = await window.db.getTimer(topicId) || {};
      await window.db.saveTimer(topicId, { ...existing, remaining: parseInt(value) });
      return;
    }
    
    if (key.startsWith('quiz_exam_questions_')) {
      const topicId = key.replace('quiz_exam_questions_', '');
      const questions = JSON.parse(value);
      await window.db.setConfig('exam_questions_' + topicId, questions);
      return;
    }
    
    // Generic config
    try {
      const parsed = JSON.parse(value);
      await window.db.setConfig(key, parsed);
    } catch (e) {
      // If not JSON, store as string
      await window.db.setConfig(key, value);
    }
  },

  async removeItem(key) {
    if (key === 'quiz_topics') {
      await window.db.clear('quiz_topics');
      return;
    }
    
    if (key === 'quiz_statistics') {
      await window.db.clearStatistics();
      return;
    }
    
    if (key === 'wrong_answers') {
      await window.db.clearWrongAnswers();
      return;
    }
    
    if (key.startsWith('quiz_progress_')) {
      const topicId = key.replace('quiz_progress_', '');
      await window.db.deleteProgress(topicId);
      return;
    }
    
    if (key.startsWith('quiz_timer_')) {
      const topicId = key.replace(/^quiz_timer_(end|paused|remaining)_/, '');
      await window.db.deleteTimer(topicId);
      return;
    }
    
    if (key.startsWith('quiz_exam_questions_')) {
      const topicId = key.replace('quiz_exam_questions_', '');
      await window.db.deleteConfig('exam_questions_' + topicId);
      return;
    }
    
    await window.db.deleteConfig(key);
  },

  async clear() {
    await window.db.clearAll();
  },

  // === SYNCHRONOUS VERSIONS (fallback to localStorage temporarily) ===
  // Chỉ dùng trong trường hợp cần thiết, khuyên dùng async
  
  getItemSync(key) {
    console.warn('⚠️ Using sync storage (localStorage fallback). Consider using async version.');
    return localStorage.getItem(key);
  },

  setItemSync(key, value) {
    console.warn('⚠️ Using sync storage (localStorage fallback). Consider using async version.');
    localStorage.setItem(key, value);
  },

  removeItemSync(key) {
    console.warn('⚠️ Using sync storage (localStorage fallback). Consider using async version.');
    localStorage.removeItem(key);
  },

  clearSync() {
    console.warn('⚠️ Using sync storage (localStorage fallback). Consider using async version.');
    localStorage.clear();
  }
};

// === Thông báo cho dev ===
console.log('📦 Storage Wrapper loaded. Use window.storage instead of localStorage.');
console.log('📖 API: await storage.getItem(key), await storage.setItem(key, value), await storage.removeItem(key)');

