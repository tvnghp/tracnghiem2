// Quiz Storage Helper - Wrapper cho quiz.html sử dụng IndexedDB
// Cung cấp API dễ sử dụng thay thế localStorage

window.quizStorage = {
  // === PROGRESS MANAGEMENT ===
  
  async getProgress(topicId) {
    try {
      const progress = await window.db.getProgress(topicId);
      return progress ? JSON.stringify(progress) : null;
    } catch (error) {
      console.error('Error getting progress:', error);
      return null;
    }
  },

  async saveProgress(topicId, progressData) {
    try {
      const data = typeof progressData === 'string' ? JSON.parse(progressData) : progressData;
      await window.db.saveProgress(topicId, data);
      return true;
    } catch (error) {
      console.error('Error saving progress:', error);
      return false;
    }
  },

  async deleteProgress(topicId) {
    try {
      await window.db.deleteProgress(topicId);
      return true;
    } catch (error) {
      console.error('Error deleting progress:', error);
      return false;
    }
  },

  // === TIMER MANAGEMENT ===

  async getTimerEnd(topicId) {
    try {
      const timer = await window.db.getTimer(topicId);
      return timer ? timer.endTime : null;
    } catch (error) {
      console.error('Error getting timer end:', error);
      return null;
    }
  },

  async saveTimerEnd(topicId, endTime) {
    try {
      const existing = await window.db.getTimer(topicId) || {};
      await window.db.saveTimer(topicId, { ...existing, endTime });
      return true;
    } catch (error) {
      console.error('Error saving timer end:', error);
      return false;
    }
  },

  async deleteTimerEnd(topicId) {
    try {
      await window.db.deleteTimer(topicId);
      return true;
    } catch (error) {
      console.error('Error deleting timer:', error);
      return false;
    }
  },

  async getTimerPaused(topicId) {
    try {
      const timer = await window.db.getTimer(topicId);
      return timer ? String(timer.isPaused) : null;
    } catch (error) {
      console.error('Error getting timer paused:', error);
      return null;
    }
  },

  async saveTimerPaused(topicId, isPaused) {
    try {
      const existing = await window.db.getTimer(topicId) || {};
      await window.db.saveTimer(topicId, { ...existing, isPaused: isPaused === 'true' || isPaused === true });
      return true;
    } catch (error) {
      console.error('Error saving timer paused:', error);
      return false;
    }
  },

  async getTimerRemaining(topicId) {
    try {
      const timer = await window.db.getTimer(topicId);
      return timer ? String(timer.remaining) : null;
    } catch (error) {
      console.error('Error getting timer remaining:', error);
      return null;
    }
  },

  async saveTimerRemaining(topicId, remaining) {
    try {
      const existing = await window.db.getTimer(topicId) || {};
      await window.db.saveTimer(topicId, { ...existing, remaining: parseInt(remaining) });
      return true;
    } catch (error) {
      console.error('Error saving timer remaining:', error);
      return false;
    }
  },

  // === EXAM QUESTIONS CACHE ===

  async getExamQuestions(topicId) {
    try {
      const questions = await window.db.getConfig('exam_questions_' + topicId);
      return questions ? JSON.stringify(questions) : null;
    } catch (error) {
      console.error('Error getting exam questions:', error);
      return null;
    }
  },

  async saveExamQuestions(topicId, questions) {
    try {
      const data = typeof questions === 'string' ? JSON.parse(questions) : questions;
      await window.db.setConfig('exam_questions_' + topicId, data);
      return true;
    } catch (error) {
      console.error('Error saving exam questions:', error);
      return false;
    }
  },

  async deleteExamQuestions(topicId) {
    try {
      await window.db.deleteConfig('exam_questions_' + topicId);
      return true;
    } catch (error) {
      console.error('Error deleting exam questions:', error);
      return false;
    }
  },

  // === TOPICS ===

  async getTopics() {
    try {
      const topics = await window.db.getTopics();
      return JSON.stringify(topics);
    } catch (error) {
      console.error('Error getting topics:', error);
      return '[]';
    }
  },

  async saveTopics(topics) {
    try {
      const data = typeof topics === 'string' ? JSON.parse(topics) : topics;
      await window.db.saveTopics(data);
      return true;
    } catch (error) {
      console.error('Error saving topics:', error);
      return false;
    }
  },

  // === ADMIN CREDENTIALS ===

  async getAdminCredentials() {
    try {
      const creds = await window.db.getConfig('admin_credentials');
      return creds || { username: 'admin', password: 'admin123' };
    } catch (error) {
      console.error('Error getting admin credentials:', error);
      return { username: 'admin', password: 'admin123' };
    }
  },

  async setAdminCredentials(username, password) {
    try {
      await window.db.setConfig('admin_credentials', { username, password });
      return true;
    } catch (error) {
      console.error('Error setting admin credentials:', error);
      return false;
    }
  },

  async isAdminAuthenticated() {
    try {
      const auth = await window.db.getConfig('admin_authenticated');
      return auth === true;
    } catch (error) {
      console.error('Error checking admin auth:', error);
      return false;
    }
  },

  async setAdminAuthenticated(value) {
    try {
      await window.db.setConfig('admin_authenticated', value === true);
      return true;
    } catch (error) {
      console.error('Error setting admin auth:', error);
      return false;
    }
  },

  // === STATISTICS ===

  async addStatistic(statData) {
    try {
      const data = typeof statData === 'string' ? JSON.parse(statData) : statData;
      await window.db.addStatistic(data);
      return true;
    } catch (error) {
      console.error('Error adding statistic:', error);
      return false;
    }
  },

  // === WRONG ANSWERS ===

  async addWrongAnswers(wrongAnswers) {
    try {
      const data = typeof wrongAnswers === 'string' ? JSON.parse(wrongAnswers) : wrongAnswers;
      if (Array.isArray(data) && data.length > 0) {
        await window.db.addWrongAnswers(data);
      }
      return true;
    } catch (error) {
      console.error('Error adding wrong answers:', error);
      return false;
    }
  },

  // === COMPATIBILITY HELPERS ===

  // Safe wrappers that won't throw errors
  async safeGet(key) {
    try {
      if (key.startsWith('quiz_progress_')) {
        const topicId = key.replace('quiz_progress_', '');
        return await this.getProgress(topicId);
      }
      if (key.startsWith('quiz_timer_end_')) {
        const topicId = key.replace('quiz_timer_end_', '');
        return await this.getTimerEnd(topicId);
      }
      if (key.startsWith('quiz_timer_paused_')) {
        const topicId = key.replace('quiz_timer_paused_', '');
        return await this.getTimerPaused(topicId);
      }
      if (key.startsWith('quiz_timer_remaining_')) {
        const topicId = key.replace('quiz_timer_remaining_', '');
        return await this.getTimerRemaining(topicId);
      }
      if (key.startsWith('quiz_exam_questions_')) {
        const topicId = key.replace('quiz_exam_questions_', '');
        return await this.getExamQuestions(topicId);
      }
      if (key === 'quiz_topics') {
        return await this.getTopics();
      }
      // Generic config
      const value = await window.db.getConfig(key);
      return value !== null ? JSON.stringify(value) : null;
    } catch (error) {
      console.error('safeGet error:', key, error);
      return null;
    }
  },

  async safeSet(key, value) {
    try {
      if (key.startsWith('quiz_progress_')) {
        const topicId = key.replace('quiz_progress_', '');
        return await this.saveProgress(topicId, value);
      }
      if (key.startsWith('quiz_timer_end_')) {
        const topicId = key.replace('quiz_timer_end_', '');
        return await this.saveTimerEnd(topicId, value);
      }
      if (key.startsWith('quiz_timer_paused_')) {
        const topicId = key.replace('quiz_timer_paused_', '');
        return await this.saveTimerPaused(topicId, value);
      }
      if (key.startsWith('quiz_timer_remaining_')) {
        const topicId = key.replace('quiz_timer_remaining_', '');
        return await this.saveTimerRemaining(topicId, value);
      }
      if (key.startsWith('quiz_exam_questions_')) {
        const topicId = key.replace('quiz_exam_questions_', '');
        return await this.saveExamQuestions(topicId, value);
      }
      if (key === 'quiz_topics') {
        return await this.saveTopics(value);
      }
      // Generic config
      try {
        const parsed = JSON.parse(value);
        await window.db.setConfig(key, parsed);
      } catch (e) {
        await window.db.setConfig(key, value);
      }
      return true;
    } catch (error) {
      console.error('safeSet error:', key, error);
      return false;
    }
  },

  async safeRemove(key) {
    try {
      if (key.startsWith('quiz_progress_')) {
        const topicId = key.replace('quiz_progress_', '');
        return await this.deleteProgress(topicId);
      }
      if (key.startsWith('quiz_timer_')) {
        const topicId = key.replace(/^quiz_timer_(end|paused|remaining)_/, '');
        return await this.deleteTimerEnd(topicId);
      }
      if (key.startsWith('quiz_exam_questions_')) {
        const topicId = key.replace('quiz_exam_questions_', '');
        return await this.deleteExamQuestions(topicId);
      }
      await window.db.deleteConfig(key);
      return true;
    } catch (error) {
      console.error('safeRemove error:', key, error);
      return false;
    }
  },

  // === CLEAR OLD DATA ===

  async clearOldProgress(currentTopicId) {
    try {
      const allProgress = await window.db.getAllProgress();
      for (const progress of allProgress) {
        if (progress.topicId !== currentTopicId) {
          // Check if older than 7 days
          const timestamp = new Date(progress.timestamp);
          const now = new Date();
          const daysDiff = (now - timestamp) / (1000 * 60 * 60 * 24);
          if (daysDiff > 7) {
            await window.db.deleteProgress(progress.topicId);
            console.log('Cleared old progress:', progress.topicId);
          }
        }
      }
      return true;
    } catch (error) {
      console.error('Error clearing old progress:', error);
      return false;
    }
  }
};

// Override localStorage methods for quiz.html (with warnings)
window.addEventListener('DOMContentLoaded', () => {
  console.log('📦 Quiz Storage Helper loaded');
  console.log('ℹ️ Use quizStorage.safeGet/safeSet/safeRemove instead of localStorage');
});

