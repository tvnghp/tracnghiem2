// IndexedDB Storage Manager - Thay thế localStorage hoàn toàn
// Dung lượng lớn hơn, không giới hạn, hoạt động offline

class IndexedDBStorage {
  constructor() {
    this.dbName = 'QuizAppDB';
    this.version = 2;
    this.db = null;
    this._ready = false;
    this._readyPromise = null;
    this._readyResolve = null;
    
    // Create ready Promise immediately
    this.ready = new Promise((resolve) => {
      this._readyResolve = resolve;
    });
  }

  // Khởi tạo database
  async init() {
    if (this._ready && this.db) return this.db;
    
    // Prevent multiple initialization
    if (this._readyPromise) return this._readyPromise;

    this._readyPromise = new Promise((resolve, reject) => {
      const request = indexedDB.open(this.dbName, this.version);

      request.onerror = () => {
        console.error('❌ IndexedDB error:', request.error);
        reject(request.error);
      };

      request.onsuccess = () => {
        this.db = request.result;
        this._ready = true;
        console.log('✅ IndexedDB initialized successfully');
        
        // Resolve the ready Promise
        if (this._readyResolve) {
          this._readyResolve(this.db);
        }
        
        resolve(this.db);
      };

      request.onupgradeneeded = (event) => {
        const db = event.target.result;

        // Store: quiz_topics (thay thế localStorage.quiz_topics)
        if (!db.objectStoreNames.contains('quiz_topics')) {
          const topicsStore = db.createObjectStore('quiz_topics', { keyPath: 'id' });
          topicsStore.createIndex('name', 'name', { unique: false });
          topicsStore.createIndex('isExam', 'isExam', { unique: false });
          console.log('✅ Created quiz_topics store');
        }

        // Store: quiz_progress (tiến trình làm bài)
        if (!db.objectStoreNames.contains('quiz_progress')) {
          const progressStore = db.createObjectStore('quiz_progress', { keyPath: 'topicId' });
          progressStore.createIndex('timestamp', 'timestamp', { unique: false });
          console.log('✅ Created quiz_progress store');
        }

        // Store: quiz_statistics (thống kê)
        if (!db.objectStoreNames.contains('quiz_statistics')) {
          const statsStore = db.createObjectStore('quiz_statistics', { keyPath: 'id', autoIncrement: true });
          statsStore.createIndex('topicId', 'topicId', { unique: false });
          statsStore.createIndex('timestamp', 'timestamp', { unique: false });
          console.log('✅ Created quiz_statistics store');
        }

        // Store: wrong_answers (câu trả lời sai)
        if (!db.objectStoreNames.contains('wrong_answers')) {
          const wrongStore = db.createObjectStore('wrong_answers', { keyPath: 'id', autoIncrement: true });
          wrongStore.createIndex('topicId', 'topicId', { unique: false });
          wrongStore.createIndex('topicName', 'topicName', { unique: false });
          wrongStore.createIndex('timestamp', 'timestamp', { unique: false });
          console.log('✅ Created wrong_answers store');
        }

        // Store: config (cấu hình app, blacklist, etc.)
        if (!db.objectStoreNames.contains('config')) {
          db.createObjectStore('config', { keyPath: 'key' });
          console.log('✅ Created config store');
        }

        // Store: quiz_timers (timer cho các bài thi)
        if (!db.objectStoreNames.contains('quiz_timers')) {
          db.createObjectStore('quiz_timers', { keyPath: 'topicId' });
          console.log('✅ Created quiz_timers store');
        }
      };
    });
  }

  // === GENERIC METHODS ===

  async get(storeName, key) {
    await this.init();
    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction([storeName], 'readonly');
      const store = transaction.objectStore(storeName);
      const request = store.get(key);

      request.onsuccess = () => resolve(request.result || null);
      request.onerror = () => reject(request.error);
    });
  }

  async getAll(storeName) {
    await this.init();
    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction([storeName], 'readonly');
      const store = transaction.objectStore(storeName);
      const request = store.getAll();

      request.onsuccess = () => resolve(request.result || []);
      request.onerror = () => reject(request.error);
    });
  }

  async put(storeName, data) {
    await this.init();
    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction([storeName], 'readwrite');
      const store = transaction.objectStore(storeName);
      const request = store.put(data);

      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  async add(storeName, data) {
    await this.init();
    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction([storeName], 'readwrite');
      const store = transaction.objectStore(storeName);
      const request = store.add(data);

      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  async delete(storeName, key) {
    await this.init();
    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction([storeName], 'readwrite');
      const store = transaction.objectStore(storeName);
      const request = store.delete(key);

      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  async clear(storeName) {
    await this.init();
    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction([storeName], 'readwrite');
      const store = transaction.objectStore(storeName);
      const request = store.clear();

      request.onsuccess = () => {
        console.log(`✅ Cleared ${storeName}`);
        resolve();
      };
      request.onerror = () => reject(request.error);
    });
  }

  // === TOPICS METHODS ===

  async saveTopics(topics) {
    await this.init();
    const transaction = this.db.transaction(['quiz_topics'], 'readwrite');
    const store = transaction.objectStore('quiz_topics');

    // Clear old data first
    await store.clear();

    // Add all topics
    for (const topic of topics) {
      await store.put(topic);
    }

    return new Promise((resolve, reject) => {
      transaction.oncomplete = () => {
        console.log(`✅ Saved ${topics.length} topics to IndexedDB`);
        resolve();
      };
      transaction.onerror = () => reject(transaction.error);
    });
  }

  async getTopics() {
    return await this.getAll('quiz_topics');
  }

  async getTopic(topicId) {
    return await this.get('quiz_topics', topicId);
  }

  async addTopic(topic) {
    return await this.put('quiz_topics', topic);
  }

  async deleteTopic(topicId) {
    return await this.delete('quiz_topics', topicId);
  }

  async clearTopics() {
    return await this.clear('quiz_topics');
  }

  // === PROGRESS METHODS ===

  async saveProgress(topicId, progressData) {
    const data = {
      topicId: topicId,
      ...progressData,
      timestamp: new Date().toISOString()
    };
    await this.put('quiz_progress', data);
    console.log('✅ Progress saved:', topicId);
  }

  async getProgress(topicId) {
    return await this.get('quiz_progress', topicId);
  }

  async deleteProgress(topicId) {
    return await this.delete('quiz_progress', topicId);
  }

  async getAllProgress() {
    return await this.getAll('quiz_progress');
  }

  // === STATISTICS METHODS ===

  async addStatistic(statData) {
    const data = {
      ...statData,
      timestamp: statData.timestamp || new Date().toISOString()
    };
    const id = await this.add('quiz_statistics', data);
    console.log('✅ Statistic saved, ID:', id);
    return id;
  }

  async getStatistics() {
    return await this.getAll('quiz_statistics');
  }

  async getStatisticsByTopic(topicId) {
    await this.init();
    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction(['quiz_statistics'], 'readonly');
      const store = transaction.objectStore('quiz_statistics');
      const index = store.index('topicId');
      const request = index.getAll(topicId);

      request.onsuccess = () => resolve(request.result || []);
      request.onerror = () => reject(request.error);
    });
  }

  async clearStatistics() {
    return await this.clear('quiz_statistics');
  }

  // === WRONG ANSWERS METHODS ===

  async addWrongAnswer(wrongAnswerData) {
    const data = {
      ...wrongAnswerData,
      timestamp: wrongAnswerData.timestamp || new Date().toISOString()
    };
    return await this.add('wrong_answers', data);
  }

  async addWrongAnswers(wrongAnswersArray) {
    await this.init();
    const transaction = this.db.transaction(['wrong_answers'], 'readwrite');
    const store = transaction.objectStore('wrong_answers');

    for (const wrongAnswer of wrongAnswersArray) {
      const data = {
        ...wrongAnswer,
        timestamp: wrongAnswer.timestamp || new Date().toISOString()
      };
      await store.add(data);
    }

    return new Promise((resolve, reject) => {
      transaction.oncomplete = () => {
        console.log(`✅ Saved ${wrongAnswersArray.length} wrong answers`);
        resolve();
      };
      transaction.onerror = () => reject(transaction.error);
    });
  }

  async getWrongAnswers() {
    return await this.getAll('wrong_answers');
  }

  async getWrongAnswersByTopic(topicId) {
    await this.init();
    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction(['wrong_answers'], 'readonly');
      const store = transaction.objectStore('wrong_answers');
      const index = store.index('topicId');
      const request = index.getAll(topicId);

      request.onsuccess = () => resolve(request.result || []);
      request.onerror = () => reject(request.error);
    });
  }

  async deleteWrongAnswersByTopic(topicId) {
    await this.init();
    const wrongAnswers = await this.getWrongAnswersByTopic(topicId);
    const transaction = this.db.transaction(['wrong_answers'], 'readwrite');
    const store = transaction.objectStore('wrong_answers');

    for (const answer of wrongAnswers) {
      await store.delete(answer.id);
    }

    return new Promise((resolve, reject) => {
      transaction.oncomplete = () => {
        console.log(`✅ Deleted ${wrongAnswers.length} wrong answers for topic:`, topicId);
        resolve();
      };
      transaction.onerror = () => reject(transaction.error);
    });
  }

  async clearWrongAnswers() {
    return await this.clear('wrong_answers');
  }

  // === CONFIG METHODS (for blacklist, settings, etc.) ===

  async getConfig(key) {
    const result = await this.get('config', key);
    return result ? result.value : null;
  }

  async setConfig(key, value) {
    return await this.put('config', { key, value });
  }

  async deleteConfig(key) {
    return await this.delete('config', key);
  }

  // === TIMER METHODS ===

  async saveTimer(topicId, timerData) {
    const data = {
      topicId: topicId,
      ...timerData
    };
    return await this.put('quiz_timers', data);
  }

  async getTimer(topicId) {
    return await this.get('quiz_timers', topicId);
  }

  async deleteTimer(topicId) {
    return await this.delete('quiz_timers', topicId);
  }

  // === UTILITY METHODS ===

  async clearAll() {
    await this.init();
    const storeNames = ['quiz_topics', 'quiz_progress', 'quiz_statistics', 'wrong_answers', 'config', 'quiz_timers'];
    
    for (const storeName of storeNames) {
      await this.clear(storeName);
    }
    
    console.log('✅ All IndexedDB data cleared');
  }

  async getStorageEstimate() {
    if ('storage' in navigator && 'estimate' in navigator.storage) {
      const estimate = await navigator.storage.estimate();
      const usedMB = (estimate.usage / (1024 * 1024)).toFixed(2);
      const quotaMB = (estimate.quota / (1024 * 1024)).toFixed(2);
      const percentUsed = ((estimate.usage / estimate.quota) * 100).toFixed(1);

      return {
        used: parseFloat(usedMB),
        quota: parseFloat(quotaMB),
        percentage: parseFloat(percentUsed),
        usedBytes: estimate.usage,
        quotaBytes: estimate.quota
      };
    }
    return null;
  }

  // === MIGRATION FROM LOCALSTORAGE ===

  async migrateFromLocalStorage() {
    console.log('🔄 Migrating data from localStorage to IndexedDB...');
    let migrated = { topics: 0, statistics: 0, wrongAnswers: 0, config: 0 };

    try {
      // Migrate topics
      const topics = localStorage.getItem('quiz_topics');
      if (topics) {
        const parsed = JSON.parse(topics);
        if (Array.isArray(parsed) && parsed.length > 0) {
          await this.saveTopics(parsed);
          migrated.topics = parsed.length;
        }
      }

      // Migrate statistics
      const stats = localStorage.getItem('quiz_statistics');
      if (stats) {
        const parsed = JSON.parse(stats);
        if (Array.isArray(parsed) && parsed.length > 0) {
          for (const stat of parsed) {
            await this.addStatistic(stat);
          }
          migrated.statistics = parsed.length;
        }
      }

      // Migrate wrong answers
      const wrongAnswers = localStorage.getItem('wrong_answers');
      if (wrongAnswers) {
        const parsed = JSON.parse(wrongAnswers);
        if (Array.isArray(parsed) && parsed.length > 0) {
          await this.addWrongAnswers(parsed);
          migrated.wrongAnswers = parsed.length;
        }
      }

      // Migrate blacklist
      const blacklist = localStorage.getItem('deleted_review_topics');
      if (blacklist) {
        await this.setConfig('deleted_review_topics', JSON.parse(blacklist));
        migrated.config++;
      }

      const blacklistMap = localStorage.getItem('deleted_review_topics_map');
      if (blacklistMap) {
        await this.setConfig('deleted_review_topics_map', JSON.parse(blacklistMap));
        migrated.config++;
      }

      console.log('✅ Migration completed:', migrated);
      return migrated;
    } catch (error) {
      console.error('❌ Migration error:', error);
      throw error;
    }
  }
}

// Tạo instance global
window.db = new IndexedDBStorage();

// Khởi tạo NGAY LẬP TỨC (không đợi DOMContentLoaded)
(async () => {
  try {
    await window.db.init();
    console.log('✅ IndexedDB ready');

    // Hiển thị dung lượng
    const estimate = await window.db.getStorageEstimate();
    if (estimate) {
      console.log(`📊 Storage: ${estimate.used}MB / ${estimate.quota}MB (${estimate.percentage}%)`);
      
      // Cảnh báo nếu gần đầy
      if (estimate.percentage > 80) {
        console.warn('⚠️ Storage usage is high!');
      }
    }

    // Auto-migrate from localStorage if exists
    try {
      const hasLocalStorageData = localStorage.getItem('quiz_topics');
      if (hasLocalStorageData) {
        console.log('📦 Detected localStorage data, checking if migration needed...');
        const existingTopics = await window.db.getTopics();
        if (existingTopics.length === 0) {
          console.log('🔄 Auto-migrating from localStorage...');
          await window.db.migrateFromLocalStorage();
          console.log('✅ Auto-migration complete');
        } else {
          console.log('✅ IndexedDB already has data, skipping migration');
        }
      }
    } catch (migrationError) {
      // Ignore migration errors (localStorage might be full or corrupted)
      console.log('⚠️ Could not migrate from localStorage (this is OK):', migrationError.message);
    }
  } catch (error) {
    console.error('❌ Failed to initialize IndexedDB:', error);
    alert('Lỗi khởi tạo database. Vui lòng thử lại hoặc xóa dữ liệu trình duyệt.');
  }
})();

// Export for use in other files
if (typeof module !== 'undefined' && module.exports) {
  module.exports = IndexedDBStorage;
}

