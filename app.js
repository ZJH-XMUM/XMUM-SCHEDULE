/**
 * XMUM Schedule Hub - Core Application Logic
 */

(function () {
  'use strict';

  // Application State
  const state = {
    currentSemesterId: '2026/09',
    realTodayDateStr: '', // "YYYY-MM-DD"
    realTodayWeek: 2,     // Actual current week in semester
    realTodayDay: 4,      // 1: Mon, 2: Tue, 3: Wed, 4: Thu ... 7: Sun
    selectedWeek: 2,      // Currently viewed week
    selectedDay: 4,       // Currently viewed day tab (1..7)
    activeView: 'dailyAgendaView',
    weekGridDays: 5,
    activeCalendarYear: '2026',
    schedule: null,
    deadlines: [],
    activeDdlFilter: 'all',
    ddlCollapsed: localStorage.getItem('xmum_ddl_collapsed') === 'true',
    selectedCourse: null,
    theme: localStorage.getItem('xmum_theme') || 'dark'
  };

  // Day names dictionary
  const DAY_NAMES = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];
  const DAY_ZH = ["周一", "周二", "周三", "周四", "周五", "周六", "周日"];

  const TIME_SLOTS_DEF = [
    { slot: 1, start: "08:00", end: "09:00", label: "08:00", range: "08:00-09:00" },
    { slot: 2, start: "09:00", end: "10:00", label: "09:00", range: "09:00-10:00" },
    { slot: 3, start: "10:00", end: "11:00", label: "10:00", range: "10:00-11:00" },
    { slot: 4, start: "11:00", end: "12:00", label: "11:00", range: "11:00-12:00" },
    { slot: 5, start: "12:00", end: "13:00", label: "12:00", range: "12:00-13:00" },
    { slot: 6, start: "13:00", end: "14:00", label: "13:00", range: "13:00-14:00" },
    { slot: 7, start: "14:00", end: "15:00", label: "14:00", range: "14:00-15:00" },
    { slot: 8, start: "15:00", end: "16:00", label: "15:00", range: "15:00-16:00" },
    { slot: 9, start: "16:00", end: "17:00", label: "16:00", range: "16:00-17:00" },
    { slot: 10, start: "17:00", end: "18:00", label: "17:00", range: "17:00-18:00" },
    { slot: 11, start: "18:00", end: "19:00", label: "18:00", range: "18:00-19:00" },
    { slot: 12, start: "19:00", end: "20:00", label: "19:00", range: "19:00-20:00" },
    { slot: 13, start: "20:00", end: "21:00", label: "20:00", range: "20:00-21:00" }
  ];

  // DOM Elements
  const el = {
    body: document.body,
    semesterSelect: document.getElementById('semesterSelect'),
    studentNameDisplay: document.getElementById('studentNameDisplay'),
    weekChipsContainer: document.getElementById('weekChipsContainer'),
    prevWeekBtn: document.getElementById('prevWeekBtn'),
    nextWeekBtn: document.getElementById('nextWeekBtn'),
    currentDateDisplay: document.getElementById('currentDateDisplay'),
    termStatusBadge: document.getElementById('termStatusBadge'),
    nextClassLabel: document.getElementById('nextClassLabel'),
    nextClassContent: document.getElementById('nextClassContent'),
    holidayAlertCard: document.getElementById('holidayAlertCard'),
    holidayTitle: document.getElementById('holidayTitle'),
    weeklyGridView: document.getElementById('weeklyGridView'),
    dailyAgendaView: document.getElementById('dailyAgendaView'),
    calendarOverviewView: document.getElementById('calendarOverviewView'),
    gridWeekTitle: document.getElementById('gridWeekTitle'),
    gridDateRange: document.getElementById('gridDateRange'),
    timetableGrid: document.getElementById('timetableGrid'),
    dayTabsContainer: document.getElementById('dayTabsContainer'),
    dailyAgendaList: document.getElementById('dailyAgendaList'),
    semestersCalendarList: document.getElementById('semestersCalendarList'),
    holidaysListGrid: document.getElementById('holidaysListGrid'),
    milestonesRow: document.getElementById('milestonesRow'),
    calendarYearTabs: document.getElementById('calendarYearTabs'),
    themeToggleBtn: document.getElementById('themeToggleBtn'),
    syncModalBtn: document.getElementById('syncModalBtn'),
    exportIcsBtn: document.getElementById('exportIcsBtn'),
    syncModal: document.getElementById('syncModal'),
    closeSyncModalBtn: document.getElementById('closeSyncModalBtn'),
    courseDetailModal: document.getElementById('courseDetailModal'),
    closeDetailModalBtn: document.getElementById('closeDetailModalBtn'),
    toastMessage: document.getElementById('toastMessage'),
    acLoginForm: document.getElementById('acLoginForm'),
    parseHtmlBtn: document.getElementById('parseHtmlBtn'),
    loadDemoBtn: document.getElementById('loadDemoBtn'),
    todayJumpBtn: document.getElementById('todayJumpBtn'),
    addCustomCourseBtn: document.getElementById('addCustomCourseBtn'),
    copyLocationBtn: document.getElementById('copyLocationBtn'),
    deleteCourseBtn: document.getElementById('deleteCourseBtn'),
    recycleBinBtn: document.getElementById('recycleBinBtn'),
    recycleBinPillBtn: document.getElementById('recycleBinPillBtn'),
    recycleCountBadge: document.getElementById('recycleCountBadge'),
    deleteConfirmModal: document.getElementById('deleteConfirmModal'),
    closeDeleteModalBtn: document.getElementById('closeDeleteModalBtn'),
    delCourseCode: document.getElementById('delCourseCode'),
    delCourseName: document.getElementById('delCourseName'),
    delCurrentWeekLabel: document.getElementById('delCurrentWeekLabel'),
    confirmDeleteWeekBtn: document.getElementById('confirmDeleteWeekBtn'),
    confirmDeleteAllBtn: document.getElementById('confirmDeleteAllBtn'),
    cancelDeleteBtn: document.getElementById('cancelDeleteBtn'),
    recycleBinModal: document.getElementById('recycleBinModal'),
    closeRecycleModalBtn: document.getElementById('closeRecycleModalBtn'),
    recycleListContainer: document.getElementById('recycleListContainer'),
    clearRecycleBinBtn: document.getElementById('clearRecycleBinBtn'),
    toggleDaysBtn: document.getElementById('toggleDaysBtn'),
    bannerUrgentDdl: document.getElementById('bannerUrgentDdl'),
    bannerUrgentDdlTitle: document.getElementById('bannerUrgentDdlTitle'),
    bannerUrgentDdlTime: document.getElementById('bannerUrgentDdlTime'),
    moodleDdlCard: document.getElementById('moodleDdlCard'),
    moodleDdlBody: document.getElementById('moodleDdlBody'),
    moodleDdlList: document.getElementById('moodleDdlList'),
    quickSyncMoodleBtn: document.getElementById('quickSyncMoodleBtn'),
    toggleDdlCollapseBtn: document.getElementById('toggleDdlCollapseBtn'),
    ddlCollapseIcon: document.getElementById('ddlCollapseIcon'),
    ddlCountAll: document.getElementById('ddlCountAll'),
    ddlCountUrgent: document.getElementById('ddlCountUrgent'),
    ddlCountDone: document.getElementById('ddlCountDone'),
    unifiedLoginForm: document.getElementById('unifiedLoginForm'),
    unifiedUsername: document.getElementById('unifiedUsername'),
    unifiedPassword: document.getElementById('unifiedPassword'),
    unifiedSemester: document.getElementById('unifiedSemester'),
    unifiedSyncAcCheck: document.getElementById('unifiedSyncAcCheck'),
    unifiedSyncMoodleCheck: document.getElementById('unifiedSyncMoodleCheck'),
    startUnifiedSyncBtn: document.getElementById('startUnifiedSyncBtn'),
    unifiedStatusMsg: document.getElementById('unifiedStatusMsg'),
    loadUnifiedDemoBtn: document.getElementById('loadUnifiedDemoBtn'),
    clearAllUserDataBtn: document.getElementById('clearAllUserDataBtn'),
    moodleLoginForm: document.getElementById('moodleLoginForm'),
    moodleUsername: document.getElementById('moodleUsername'),
    moodlePassword: document.getElementById('moodlePassword'),
    startMoodleSyncBtn: document.getElementById('startMoodleSyncBtn'),
    moodleStatusMsg: document.getElementById('moodleStatusMsg'),
    loadDemoDeadlinesBtn: document.getElementById('loadDemoDeadlinesBtn'),
    clearDeadlinesBtn: document.getElementById('clearDeadlinesBtn'),
    navItems: document.querySelectorAll('.bottom-nav .nav-item'),
    openUpdateNoticeBtn: document.getElementById('openUpdateNoticeBtn'),
    updateNoticeModal: document.getElementById('updateNoticeModal'),
    updateNoticeBadge: document.getElementById('updateNoticeBadge'),
    updateNoticeTitle: document.getElementById('updateNoticeTitle'),
    updateNoticeDesc: document.getElementById('updateNoticeDesc'),
    updateFeaturesList: document.getElementById('updateFeaturesList'),
    closeUpdateNoticeBtn: document.getElementById('closeUpdateNoticeBtn'),
    confirmUpdateNoticeBtn: document.getElementById('confirmUpdateNoticeBtn')
  };

  // Modal Helpers with Mobile Scroll-Lock
  function openModal(modalEl) {
    if (!modalEl) return;
    modalEl.classList.add('open');
    document.body.classList.add('modal-open');
    document.documentElement.classList.add('modal-open');
  }

  function closeModal(modalEl) {
    if (!modalEl) return;
    modalEl.classList.remove('open');
    if (!document.querySelector('.modal-backdrop.open')) {
      document.body.classList.remove('modal-open');
      document.documentElement.classList.remove('modal-open');
    }
  }

  // 1. Initializer
  function init() {
    try {
      loadSavedSchedule();
      loadSavedDeadlines();
      applyTheme(state.theme);
      initRealToday();
      setupEventListeners();
      updateSemesterInfo();
      renderWeekChips();
      renderDayTabs();
      switchView(state.activeView);
      renderView();
      updateTodayBanner();
      renderDeadlines();
      renderCalendarMilestones();
      renderAcademicCalendar();
      updateRecycleCountBadge();
      checkUpdateNotice();
      requestPersistentStorage();
    } catch (err) {
      console.error('Core init error:', err);
    }

    // Register Service Worker immediately for instant caching & offline support
    if ('serviceWorker' in navigator && window.location.protocol.startsWith('http')) {
      navigator.serviceWorker.register('sw.js').catch(err => {
        console.log('SW registration note:', err);
      });
    }
  }

  // 1b. App Release & One-Time Update Notice
  const APP_RELEASE_INFO = {
    version: 'v1.6.0',
    title: 'XMUM 课表助手全面升级',
    date: '2026-10-15',
    features: [
      {
        icon: '⚡️',
        title: '0ms 闪电秒开与零延迟',
        desc: '底层重构离线缓存导航，首次打开后每次启动均为 0ms 瞬间秒开展现，告别卡顿与加载延迟。'
      },
      {
        icon: '✨',
        title: '底部排版重构，舒适告别拥挤',
        desc: '重构全局中文字体层级与行距，加大课表卡片和待办列表留白，视野更清晰美观。'
      },
      {
        icon: '🛡️',
        title: '防手机清理垃圾防丢数据',
        desc: '引入操作系统级持久化存储与 IndexedDB 双重硬核容灾，手机使用手机管家清理垃圾数据绝不丢失！'
      },
      {
        icon: '📶',
        title: '强悍弱网与无网离线运行',
        desc: '无网络或飞行模式下，所有已导入课表、校历及作业倒计时均能完全离线顺畅使用。'
      }
    ]
  };

  function renderUpdateNoticeModal() {
    if (el.updateNoticeBadge) {
      el.updateNoticeBadge.textContent = `🎉 升级公告 • ${APP_RELEASE_INFO.version}`;
    }
    if (el.updateNoticeTitle) {
      el.updateNoticeTitle.textContent = APP_RELEASE_INFO.title;
    }
    if (el.updateFeaturesList) {
      el.updateFeaturesList.innerHTML = APP_RELEASE_INFO.features.map(f => `
        <div class="update-feature-item">
          <span class="update-feature-icon">${f.icon}</span>
          <div class="update-feature-content">
            <div class="update-feature-title">${f.title}</div>
            <div class="update-feature-desc">${f.desc}</div>
          </div>
        </div>
      `).join('');
    }
  }

  function checkUpdateNotice() {
    try {
      const lastSeen = localStorage.getItem('xmum_last_seen_version');
      if (lastSeen !== APP_RELEASE_INFO.version) {
        renderUpdateNoticeModal();
        openModal(el.updateNoticeModal);
      }
    } catch (e) {
      console.warn('Could not check update notice version:', e);
    }
  }

  function dismissUpdateNotice() {
    try {
      localStorage.setItem('xmum_last_seen_version', APP_RELEASE_INFO.version);
    } catch (e) {}
    closeModal(el.updateNoticeModal);
  }

  // 2. Storage & Anti-Purge Vault Management
  // IndexedDB Persistent Vault: Dual-engine redundancy immune to browser cache cleaning
  const IDBVault = {
    dbName: 'XMUMScheduleVault',
    storeName: 'keyval',
    dbPromise: null,

    getDB() {
      if (!this.dbPromise) {
        this.dbPromise = new Promise((resolve) => {
          if (!window.indexedDB) {
            resolve(null);
            return;
          }
          try {
            const req = window.indexedDB.open(this.dbName, 1);
            req.onupgradeneeded = (e) => {
              const db = e.target.result;
              if (!db.objectStoreNames.contains(this.storeName)) {
                db.createObjectStore(this.storeName);
              }
            };
            req.onsuccess = () => resolve(req.result);
            req.onerror = () => resolve(null);
          } catch (e) {
            resolve(null);
          }
        });
      }
      return this.dbPromise;
    },

    async get(key) {
      try {
        const db = await this.getDB();
        if (!db) return null;
        return new Promise((resolve) => {
          const tx = db.transaction(this.storeName, 'readonly');
          const store = tx.objectStore(this.storeName);
          const req = store.get(key);
          req.onsuccess = () => resolve(req.result || null);
          req.onerror = () => resolve(null);
        });
      } catch (e) {
        return null;
      }
    },

    async set(key, val) {
      try {
        const db = await this.getDB();
        if (!db) return;
        return new Promise((resolve) => {
          const tx = db.transaction(this.storeName, 'readwrite');
          const store = tx.objectStore(this.storeName);
          store.put(val, key);
          tx.oncomplete = () => resolve(true);
          tx.onerror = () => resolve(false);
        });
      } catch (e) {}
    }
  };

  // Request Mobile OS / Browser Persistent Storage
  function requestPersistentStorage() {
    if (navigator.storage && navigator.storage.persist) {
      navigator.storage.persist().then((persisted) => {
        if (persisted) {
          console.log('🛡️ Persistent storage activated: Immune to mobile garbage cleanup.');
        }
      }).catch(() => {});
    }
  }

  function loadSavedSchedule() {
    const emptySchedule = {
      studentName: "同学",
      studentId: "",
      semester: "2026/09",
      lastUpdated: "",
      courses: [],
      deletedCourses: [],
      rescheduledCourses: {}
    };

    try {
      const stored = localStorage.getItem('xmum_schedule_data');
      if (stored) {
        state.schedule = JSON.parse(stored);
      } else {
        state.schedule = JSON.parse(JSON.stringify(emptySchedule));
      }
    } catch (e) {
      console.error('Failed to load schedule from storage:', e);
      state.schedule = JSON.parse(JSON.stringify(emptySchedule));
    }

    if (!state.schedule) {
      state.schedule = JSON.parse(JSON.stringify(emptySchedule));
    }

    if (!state.schedule.courses || !Array.isArray(state.schedule.courses)) {
      state.schedule.courses = [];
    }
    if (!state.schedule.deletedCourses || !Array.isArray(state.schedule.deletedCourses)) {
      state.schedule.deletedCourses = [];
    }
    if (!state.schedule.rescheduledCourses) {
      state.schedule.rescheduledCourses = {};
    }

    // Double-engine recovery: if localStorage was wiped by phone cleaner, recover from IndexedDB vault!
    if (state.schedule.courses.length === 0) {
      IDBVault.get('xmum_schedule_data').then((vaultSchedule) => {
        if (vaultSchedule && vaultSchedule.courses && vaultSchedule.courses.length > 0) {
          console.log('🛡️ Schedule recovered from IndexedDB vault after storage cleanup!');
          state.schedule = vaultSchedule;
          try {
            localStorage.setItem('xmum_schedule_data', JSON.stringify(vaultSchedule));
          } catch (e) {}
          if (state.schedule.studentName) {
            el.studentNameDisplay.textContent = `Hi, ${state.schedule.studentName}`;
          }
          if (state.schedule.semester) {
            state.currentSemesterId = state.schedule.semester;
            if (el.semesterSelect) el.semesterSelect.value = state.currentSemesterId;
          }
          initRealToday();
          renderWeekChips();
          renderDayTabs();
          renderView();
          updateNextClassCard();
          updateTodayBanner();
          updateRecycleCountBadge();
        }
      });
    }

    if (state.schedule && state.schedule.studentName) {
      el.studentNameDisplay.textContent = `Hi, ${state.schedule.studentName}`;
    }

    if (state.schedule && state.schedule.semester) {
      state.currentSemesterId = state.schedule.semester;
      if (el.semesterSelect) el.semesterSelect.value = state.currentSemesterId;
    }

    // Also fetch from server to ensure persistence across devices/refreshes
    syncScheduleFromServer();
  }

  async function syncScheduleFromServer() {
    try {
      const resp = await fetch('/api/schedule');
      if (resp.ok) {
        const data = await resp.json();
        if (data && data.success && data.schedule && data.schedule.courses && data.schedule.courses.length > 0) {
          // If local schedule was empty or had fewer courses, update to server schedule
          const localCount = state.schedule?.courses?.length || 0;
          const serverCount = data.schedule.courses.length;
          if (localCount === 0 || serverCount > localCount || !localStorage.getItem('xmum_schedule_data')) {
            state.schedule = data.schedule;
            localStorage.setItem('xmum_schedule_data', JSON.stringify(state.schedule));
            IDBVault.set('xmum_schedule_data', state.schedule);
            if (state.schedule.studentName) {
              el.studentNameDisplay.textContent = `Hi, ${state.schedule.studentName}`;
            }
            if (state.schedule.semester) {
              state.currentSemesterId = state.schedule.semester;
              if (el.semesterSelect) el.semesterSelect.value = state.currentSemesterId;
            }
            initRealToday();
            renderWeekChips();
            renderDayTabs();
            renderView();
            updateNextClassCard();
            updateRecycleCountBadge();
          }
        }
      }
    } catch (e) {
      // Offline fallback: continue using local cache
    }
  }

  function saveSchedule() {
    if (state.schedule) {
      localStorage.setItem('xmum_schedule_data', JSON.stringify(state.schedule));
      IDBVault.set('xmum_schedule_data', state.schedule); // Mirror to IndexedDB vault
      updateRecycleCountBadge();

      // Background persist to server disk
      fetch('/api/save_schedule', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(state.schedule)
      }).catch(err => console.warn('Failed to persist schedule to server:', err));
    }
  }

  // 2b. Moodle Deadlines & Tasks Management
  function loadSavedDeadlines() {
    try {
      const stored = localStorage.getItem('xmum_moodle_deadlines');
      if (stored) {
        state.deadlines = JSON.parse(stored);
      } else if (typeof DEFAULT_DEADLINES !== 'undefined' && Array.isArray(DEFAULT_DEADLINES)) {
        state.deadlines = JSON.parse(JSON.stringify(DEFAULT_DEADLINES));
      } else {
        state.deadlines = [];
      }
    } catch (e) {
      console.warn('Could not load deadlines from storage:', e);
      state.deadlines = [];
    }

    if (!state.deadlines || state.deadlines.length === 0) {
      IDBVault.get('xmum_moodle_deadlines').then((vaultDeadlines) => {
        if (vaultDeadlines && Array.isArray(vaultDeadlines) && vaultDeadlines.length > 0) {
          state.deadlines = vaultDeadlines;
          try {
            localStorage.setItem('xmum_moodle_deadlines', JSON.stringify(vaultDeadlines));
          } catch (e) {}
          renderDeadlines();
        }
      });
    }

    syncDeadlinesFromServer();
  }

  function saveDeadlines() {
    try {
      localStorage.setItem('xmum_moodle_deadlines', JSON.stringify(state.deadlines || []));
      IDBVault.set('xmum_moodle_deadlines', state.deadlines || []); // Mirror to IndexedDB vault
      fetch('/api/save_deadlines', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(state.deadlines || [])
      }).catch(err => console.warn('Failed to persist deadlines to server:', err));
    } catch (e) {
      console.warn('Error saving deadlines:', e);
    }
  }

  async function syncDeadlinesFromServer() {
    try {
      const resp = await fetch('/api/deadlines');
      if (resp.ok) {
        const data = await resp.json();
        if (data && data.success && Array.isArray(data.deadlines) && data.deadlines.length > 0) {
          if (!state.deadlines || state.deadlines.length === 0 || !localStorage.getItem('xmum_moodle_deadlines')) {
            state.deadlines = data.deadlines;
            localStorage.setItem('xmum_moodle_deadlines', JSON.stringify(state.deadlines));
            IDBVault.set('xmum_moodle_deadlines', state.deadlines);
            renderDeadlines();
          }
        }
      }
    } catch (e) {
      // Offline fallback
    }
  }

  function toggleDeadlineComplete(id) {
    if (!state.deadlines) return;
    const item = state.deadlines.find(d => d.id === id);
    if (!item) return;
    item.completed = !item.completed;
    saveDeadlines();
    renderDeadlines();
    showToast(item.completed ? '🎉 恭喜！该作业已标记完成！' : '已重置为待办状态');
  }

  function renderDeadlines() {
    if (!el.moodleDdlList) return;
    
    // Check collapse state
    if (el.moodleDdlBody && el.ddlCollapseIcon) {
      if (state.ddlCollapsed) {
        el.moodleDdlBody.classList.add('collapsed');
        el.ddlCollapseIcon.textContent = '▸';
      } else {
        el.moodleDdlBody.classList.remove('collapsed');
        el.ddlCollapseIcon.textContent = '▾';
      }
    }

    const allDeadlines = state.deadlines || [];
    const now = Date.now();

    // Update counts
    const uncompleted = allDeadlines.filter(d => !d.completed);
    const urgentItems = uncompleted.filter(d => {
      if (!d.dueTimestamp) return false;
      const diffMs = (d.dueTimestamp * 1000) - now;
      return diffMs <= 3 * 86400 * 1000; // <= 3 days or overdue
    });
    const completedItems = allDeadlines.filter(d => d.completed);

    if (el.ddlCountAll) el.ddlCountAll.textContent = uncompleted.length;
    if (el.ddlCountUrgent) el.ddlCountUrgent.textContent = urgentItems.length;
    if (el.ddlCountDone) el.ddlCountDone.textContent = completedItems.length;

    // Filter display items
    let displayItems = [];
    if (state.activeDdlFilter === 'urgent') {
      displayItems = urgentItems;
    } else if (state.activeDdlFilter === 'completed') {
      displayItems = completedItems;
    } else {
      // 'all': uncompleted first, sorted by due time, then completed
      const sortedUncompleted = [...uncompleted].sort((a, b) => (a.dueTimestamp || 9999999999) - (b.dueTimestamp || 9999999999));
      displayItems = sortedUncompleted.concat(completedItems);
    }

    el.moodleDdlList.innerHTML = '';

    if (displayItems.length === 0) {
      const emptyDiv = document.createElement('div');
      emptyDiv.className = 'ddl-empty-box';
      if (state.activeDdlFilter === 'completed') {
        emptyDiv.innerHTML = `
          <div class="empty-icon">📝</div>
          <div class="empty-txt">暂无已完成记录</div>
          <div class="empty-sub">勾选作业即可归档至已完成列表</div>
        `;
      } else if (state.activeDdlFilter === 'urgent') {
        emptyDiv.innerHTML = `
          <div class="empty-icon">☕️</div>
          <div class="empty-txt">暂无3天内的紧急作业！</div>
          <div class="empty-sub">所有待办均时间充裕，继续保持好节奏</div>
        `;
      } else {
        emptyDiv.innerHTML = `
          <div class="empty-icon">🎉</div>
          <div class="empty-txt">当前暂无待提交的 Moodle 作业！</div>
          <div class="empty-sub">若任课教师刚发布新任务，可点击上方【同步 Moodle】获取最新数据</div>
          <button class="btn-pill-small secondary" id="emptyLoadDemoBtn" style="margin-top: 4px;">🌟 载入作业演示数据</button>
        `;
        const emptyBtn = emptyDiv.querySelector('#emptyLoadDemoBtn');
        if (emptyBtn) {
          emptyBtn.addEventListener('click', () => {
            if (typeof DEFAULT_DEADLINES !== 'undefined') {
              state.deadlines = JSON.parse(JSON.stringify(DEFAULT_DEADLINES));
              saveDeadlines();
              renderDeadlines();
              showToast('已载入作业演示数据');
            }
          });
        }
      }
      el.moodleDdlList.appendChild(emptyDiv);
      return;
    }

    displayItems.forEach(item => {
      const row = document.createElement('div');
      let isUrgent = false;
      let isOverdue = false;
      let pillClass = 'normal';
      let pillText = '待办';

      if (item.completed) {
        pillClass = 'done';
        pillText = '已完成';
      } else if (item.dueTimestamp) {
        const diffMs = (item.dueTimestamp * 1000) - now;
        const diffDays = Math.ceil(diffMs / (86400 * 1000));
        const diffHours = Math.ceil(diffMs / (3600 * 1000));

        if (diffMs < 0) {
          isOverdue = true;
          pillClass = 'overdue';
          pillText = '已逾期';
        } else if (diffHours <= 24) {
          isUrgent = true;
          pillClass = 'urgent';
          pillText = diffHours <= 1 ? '即将截止' : `剩 ${diffHours}小时`;
        } else if (diffDays <= 3) {
          isUrgent = true;
          pillClass = 'warning';
          pillText = `剩 ${diffDays}天`;
        } else {
          pillClass = 'normal';
          pillText = `剩 ${diffDays}天`;
        }
      }

      row.className = `ddl-item ${item.completed ? 'completed' : ''} ${isUrgent ? 'urgent' : ''}`;
      
      const typeLabel = item.type === 'quiz' ? '📝 测验' : '📋 作业';
      const formattedTime = item.dueTime ? `${item.dueDate} ${item.dueTime}` : (item.dueDate || '近期截止');

      row.innerHTML = `
        <div class="ddl-countdown-col">
          <span class="ddl-countdown-pill ${pillClass}">${pillText}</span>
        </div>
        <div class="ddl-info-col">
          <div class="ddl-header-row">
            <span class="ddl-course-badge">${item.courseCode || 'COURSE'}</span>
            <span class="ddl-type-tag">${typeLabel}</span>
          </div>
          <div class="ddl-item-title" title="${item.title}">${item.title}</div>
          <div class="ddl-meta-row">
            <span>🕒 ${formattedTime}</span>
            ${item.courseName ? `<span style="opacity:0.75;">• ${item.courseName}</span>` : ''}
          </div>
        </div>
        <div class="ddl-actions-col">
          <button class="btn-ddl-check" title="${item.completed ? '标记为未完成' : '标记已完成'}">
            ${item.completed ? '↩️' : '✅'}
          </button>
          <a href="${item.url || 'https://l.xmu.edu.my/my/'}" target="_blank" rel="noopener noreferrer" class="btn-ddl-open" title="去 Moodle 提交">
            去提交 ↗
          </a>
        </div>
      `;

      // Event listener for completion toggle
      const checkBtn = row.querySelector('.btn-ddl-check');
      if (checkBtn) {
        checkBtn.addEventListener('click', (e) => {
          e.stopPropagation();
          toggleDeadlineComplete(item.id);
        });
      }

      el.moodleDdlList.appendChild(row);
    });

    updateBannerUrgentDdl();
  }

  function updateBannerUrgentDdl() {
    if (!el.bannerUrgentDdl) return;
    const allDeadlines = state.deadlines || [];
    const uncompleted = allDeadlines.filter(d => !d.completed);

    if (uncompleted.length === 0) {
      el.bannerUrgentDdl.classList.add('hidden');
      return;
    }

    const now = Date.now();
    // Sort by due timestamp ascending
    const sorted = [...uncompleted].sort((a, b) => (a.dueTimestamp || 9999999999) - (b.dueTimestamp || 9999999999));
    const closest = sorted[0];

    let timeText = '待办';
    let icon = '⚡️';
    if (closest.dueTimestamp) {
      const diffMs = (closest.dueTimestamp * 1000) - now;
      if (diffMs < 0) {
        timeText = '已逾期';
        icon = '⚠️';
      } else {
        const diffHours = Math.ceil(diffMs / 3600000);
        const diffDays = Math.ceil(diffMs / 86400000);
        if (diffHours <= 24) {
          timeText = diffHours <= 1 ? '即将截止' : `剩 ${diffHours}小时`;
          icon = '🔥';
        } else if (diffDays <= 3) {
          timeText = `剩 ${diffDays}天`;
          icon = '🔥';
        } else {
          timeText = `剩 ${diffDays}天`;
          icon = '⏰';
        }
      }
    }

    const iconEl = el.bannerUrgentDdl.querySelector('.urgent-ddl-icon');
    if (iconEl) iconEl.textContent = icon;
    if (el.bannerUrgentDdlTitle) {
      el.bannerUrgentDdlTitle.textContent = `【${closest.courseCode || '课程'}】${closest.title} (共 ${uncompleted.length} 项)`;
    }
    if (el.bannerUrgentDdlTime) {
      el.bannerUrgentDdlTime.textContent = timeText;
    }
    el.bannerUrgentDdl.classList.remove('hidden');
  }

  async function handleUnifiedLogin(e) {
    if (e) e.preventDefault();
    const username = el.unifiedUsername ? el.unifiedUsername.value.trim() : '';
    const password = el.unifiedPassword ? el.unifiedPassword.value.trim() : '';
    const semester = el.unifiedSemester ? el.unifiedSemester.value : '2026/09';
    const syncAc = el.unifiedSyncAcCheck ? el.unifiedSyncAcCheck.checked : true;
    const syncMoodle = el.unifiedSyncMoodleCheck ? el.unifiedSyncMoodleCheck.checked : true;

    if (!username || !password) {
      showToast('请输入学号与统一密码');
      return;
    }
    if (!syncAc && !syncMoodle) {
      showToast('请至少勾选一项同步内容 (课表或 Moodle)');
      return;
    }

    if (el.startUnifiedSyncBtn) el.startUnifiedSyncBtn.disabled = true;
    if (el.unifiedStatusMsg) {
      el.unifiedStatusMsg.innerHTML = '<span style="color:#60a5fa;">⏳ 正在连接校园系统并进行全量同步...</span>';
    }

    try {
      let fullRes = null;
      try {
        const resp = await fetch('/api/full_sync?action=full_sync', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'full_sync', username, password, semester, sync_ac: syncAc, sync_moodle: syncMoodle })
        });
        if (resp.ok) {
          try { fullRes = await resp.json(); } catch (_) {}
        }
      } catch (err) {
        console.warn('full_sync error, fallback to sequential', err);
      }

      let acSuccess = false;
      let moodleSuccess = false;
      let acCount = 0;
      let moodleCount = 0;

      if (fullRes) {
        if (syncAc && fullRes.ac && fullRes.ac.success && fullRes.ac.courses) {
          acSuccess = true;
          acCount = fullRes.ac.courses.length;
          state.schedule = {
            studentName: fullRes.ac.studentName || username,
            studentId: username,
            semester: semester,
            lastUpdated: new Date().toISOString(),
            courses: fullRes.ac.courses
          };
          state.studentName = state.schedule.studentName;
          saveSchedule();
        }
        if (syncMoodle && fullRes.moodle && fullRes.moodle.success && fullRes.moodle.deadlines) {
          moodleSuccess = true;
          moodleCount = fullRes.moodle.deadlines.length;
          state.deadlines = fullRes.moodle.deadlines;
          saveDeadlines();
        }
      } else {
        // Sequential fallback
        if (syncAc) {
          if (el.unifiedStatusMsg) {
            el.unifiedStatusMsg.innerHTML = '<span style="color:#60a5fa;">⏳ [1/2] 正在连接 AC 教务系统同步课表...</span>';
          }
          const acResp = await fetch('/api/sync?action=sync', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ action: 'sync', username, password, semester })
          });
          let acData = null;
          try { acData = await acResp.json(); } catch (_) {
            acData = { success: false, error: acResp.status === 504 ? '教务系统连接超时 (504)' : `服务异常 (HTTP ${acResp.status})` };
          }
          if (acData && acData.success && acData.courses) {
            acSuccess = true;
            acCount = acData.courses.length;
            state.schedule = {
              studentName: acData.studentName || username,
              studentId: username,
              semester: semester,
              lastUpdated: new Date().toISOString(),
              courses: acData.courses
            };
            state.studentName = state.schedule.studentName;
            saveSchedule();
          }
        }
        if (syncMoodle) {
          if (el.unifiedStatusMsg) {
            el.unifiedStatusMsg.innerHTML = '<span style="color:#60a5fa;">⏳ [2/2] 正在连接 Moodle 学习网同步作业...</span>';
          }
          const mResp = await fetch('/api/moodle_sync?action=moodle_sync', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ action: 'moodle_sync', username, password })
          });
          let mData = null;
          try { mData = await mResp.json(); } catch (_) {
            mData = { success: false, error: mResp.status === 504 ? 'Moodle 连接超时 (504)' : `服务异常 (HTTP ${mResp.status})` };
          }
          if (mData && mData.success && mData.deadlines) {
            moodleSuccess = true;
            moodleCount = mData.deadlines.length;
            state.deadlines = mData.deadlines;
            saveDeadlines();
          }
        }
      }

      // Re-render UI
      if (el.studentNameDisplay) el.studentNameDisplay.textContent = `Hi, ${state.studentName}`;
      renderView();
      renderDeadlines();
      updateTodayBanner();

      const overallSuccess = (syncAc ? acSuccess : true) && (syncMoodle ? moodleSuccess : true);
      if (overallSuccess || acSuccess || moodleSuccess) {
        const msg = `🎉 同步成功！已导入 ${acCount} 门课程、${moodleCount} 项 Moodle 待办！`;
        if (el.unifiedStatusMsg) {
          el.unifiedStatusMsg.innerHTML = `<span style="color:#10b981;">${msg}</span>`;
        }
        showToast('一键全量同步成功！');
        setTimeout(() => {
          closeModal(el.syncModal);
          if (el.unifiedStatusMsg) el.unifiedStatusMsg.innerHTML = '';
        }, 1400);
      } else {
        const errMsg = fullRes?.error || '同步失败：请检查学号与密码，或确认是否连接校园网络';
        if (el.unifiedStatusMsg) {
          el.unifiedStatusMsg.innerHTML = `<span style="color:#f43f5e;">❌ ${errMsg}</span>`;
        }
        showToast(`同步失败: ${errMsg}`);
      }
    } catch (err) {
      const msg = (err.name === 'TypeError' || err.message.includes('fetch'))
        ? '无法连接服务器：请检查网络状态或是否连接校园网/VPN'
        : `请求异常: ${err.message}`;
      if (el.unifiedStatusMsg) {
        el.unifiedStatusMsg.innerHTML = `<span style="color:#f43f5e;">❌ ${msg}</span>`;
      }
      showToast(msg);
    } finally {
      if (el.startUnifiedSyncBtn) el.startUnifiedSyncBtn.disabled = false;
    }
  }

  async function handleMoodleLogin(e) {
    if (e) e.preventDefault();
    const username = el.moodleUsername ? el.moodleUsername.value.trim() : '';
    const password = el.moodlePassword ? el.moodlePassword.value.trim() : '';

    if (!username || !password) {
      showToast('请输入 Moodle 学号和密码');
      return;
    }

    if (el.moodleStatusMsg) {
      el.moodleStatusMsg.innerHTML = '<span style="color:#60a5fa;">⏳ 正在连接 XMUM Moodle 学习平台...</span>';
    }
    if (el.startMoodleSyncBtn) el.startMoodleSyncBtn.disabled = true;

    try {
      const resp = await fetch('/api/moodle_sync?action=moodle_sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'moodle_sync', username, password })
      });

      let data = null;
      try {
        data = await resp.json();
      } catch (_) {
        data = { success: false, error: resp.status === 504 ? 'Moodle 响应超时 (504)，请稍后再试' : `服务响应异常 (HTTP ${resp.status})` };
      }

      if (data && data.success) {
        state.deadlines = data.deadlines || [];
        saveDeadlines();
        renderDeadlines();

        if (el.moodleStatusMsg) {
          el.moodleStatusMsg.innerHTML = `<span style="color:#10b981;">✅ 成功同步 ${data.deadlines.length} 项 Moodle 待办作业！</span>`;
        }
        showToast(`🎉 成功同步 ${data.deadlines.length} 项 Moodle 作业与 DDL！`);
        setTimeout(() => {
          closeModal(el.syncModal);
          if (el.moodleStatusMsg) el.moodleStatusMsg.innerHTML = '';
        }, 1200);
      } else {
        const errMsg = data?.error || '登录失败，请检查账号密码或校园网络';
        if (el.moodleStatusMsg) {
          el.moodleStatusMsg.innerHTML = `<span style="color:#f43f5e;">❌ ${errMsg}</span>`;
        }
        showToast(`Moodle 同步失败: ${errMsg}`);
      }
    } catch (err) {
      const msg = (err.name === 'TypeError' || err.message.includes('fetch'))
        ? '无法连接 Moodle 服务：请检查网络状态或是否连接校园网/VPN'
        : `请求异常: ${err.message}`;
      if (el.moodleStatusMsg) {
        el.moodleStatusMsg.innerHTML = `<span style="color:#f43f5e;">❌ ${msg}</span>`;
      }
      showToast(msg);
    } finally {
      if (el.startMoodleSyncBtn) el.startMoodleSyncBtn.disabled = false;
    }
  }

  // 3. Theme
  function applyTheme(theme) {
    state.theme = theme;
    localStorage.setItem('xmum_theme', theme);
    const docEl = document.documentElement;
    if (theme === 'light') {
      docEl.classList.remove('theme-dark');
      docEl.classList.add('theme-light');
      docEl.style.colorScheme = 'light';
      docEl.style.backgroundColor = '#f0f4f8';
      el.body.classList.remove('theme-dark');
      el.body.classList.add('theme-light');
      el.body.style.backgroundColor = '#f0f4f8';
      if (el.themeToggleBtn) el.themeToggleBtn.querySelector('.theme-icon').textContent = '☀️';
    } else {
      docEl.classList.remove('theme-light');
      docEl.classList.add('theme-dark');
      docEl.style.colorScheme = 'dark';
      docEl.style.backgroundColor = '#0b1120';
      el.body.classList.remove('theme-light');
      el.body.classList.add('theme-dark');
      el.body.style.backgroundColor = '#0b1120';
      if (el.themeToggleBtn) el.themeToggleBtn.querySelector('.theme-icon').textContent = '🌙';
    }
    const metaTheme = document.getElementById('metaThemeColor');
    if (metaTheme) metaTheme.content = (theme === 'light') ? '#f0f4f8' : '#0b1120';
  }

  // 4. Academic Calendar Helpers
  // Helper: Format local date to YYYY-MM-DD without UTC offset shift
  function formatLocalDate(d) {
    if (!d) return '';
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  // 4. Academic Calendar Helpers & Real Today Management
  function getCurrentSemesterData() {
    if (typeof ACADEMIC_CALENDAR === 'undefined') return null;
    return ACADEMIC_CALENDAR.semesters.find(s => s.id === state.currentSemesterId) || ACADEMIC_CALENDAR.semesters[2];
  }

  function initRealToday() {
    const today = new Date();
    const sem = getCurrentSemesterData();
    let curDateStr = formatLocalDate(today);

    // Check if curDateStr falls within this semester's teaching weeks
    let matchedWeek = null;
    if (sem && sem.weeks) {
      matchedWeek = sem.weeks.find(w => curDateStr >= w.start && curDateStr <= w.end);
    }

    // If local device date is outside semester bounds (e.g., development/testing on different year/month):
    // Fallback to active teaching week (Week 3, Monday 2026-10-12)
    if (!matchedWeek) {
      if (sem && sem.weeks && sem.weeks.length >= 3) {
        matchedWeek = sem.weeks[2]; // Week 3
      } else if (sem && sem.weeks && sem.weeks.length > 0) {
        matchedWeek = sem.weeks[0];
      }
      if (matchedWeek) {
        // Pick Monday of this week (start date + 1 day since start is Sunday)
        const parts = matchedWeek.start.split('-');
        const sunday = new Date(parseInt(parts[0], 10), parseInt(parts[1], 10) - 1, parseInt(parts[2], 10), 12, 0, 0);
        const monday = new Date(sunday);
        monday.setDate(monday.getDate() + 1);
        curDateStr = formatLocalDate(monday);
      } else {
        curDateStr = "2026-10-12";
      }
    }

    state.realTodayDateStr = curDateStr;

    const parts = curDateStr.split('-');
    const dateObj = new Date(parseInt(parts[0], 10), parseInt(parts[1], 10) - 1, parseInt(parts[2], 10), 12, 0, 0);
    const dayIndex = dateObj.getDay() === 0 ? 7 : dateObj.getDay();
    state.realTodayDay = dayIndex;

    const currentWk = matchedWeek ? matchedWeek.week : 3;
    state.realTodayWeek = currentWk;
    state.selectedWeek = currentWk;
    state.selectedDay = dayIndex;
  }

  function parseCourseTimeMinutes(course) {
    if (course.startTime && course.endTime) {
      const [sh, sm] = course.startTime.split(':').map(Number);
      const [eh, em] = course.endTime.split(':').map(Number);
      return {
        startMin: (sh || 0) * 60 + (sm || 0),
        endMin: (eh || 0) * 60 + (em || 0)
      };
    }
    const startHour = 7 + (course.startSlot || 1);
    const endHour = startHour + (course.slotSpan || 1);
    return {
      startMin: startHour * 60,
      endMin: endHour * 60
    };
  }

  function updateSemesterInfo() {
    updateTodayBanner();
  }

  function updateTodayBanner() {
    const sem = getCurrentSemesterData();
    const isCurrentWeek = (state.selectedWeek === state.realTodayWeek);
    const currentWeekInfo = sem?.weeks.find(w => w.week === state.selectedWeek);

    if (isCurrentWeek) {
      // Real today's week
      const parts = state.realTodayDateStr.split('-');
      const dateObj = new Date(parseInt(parts[0]), parseInt(parts[1]) - 1, parseInt(parts[2]), 12, 0, 0);
      const options = { weekday: 'long', year: 'numeric', month: 'short', day: 'numeric' };
      el.currentDateDisplay.textContent = dateObj.toLocaleDateString('zh-CN', options);
      
      el.termStatusBadge.innerHTML = `第 ${state.selectedWeek} 周 • 教学周 (本周)`;
      el.termStatusBadge.className = 'status-pill active';
      el.termStatusBadge.onclick = null;

      // Realtime check for today based on current hour and minute
      const now = new Date();
      const currentMin = now.getHours() * 60 + now.getMinutes();

      // Today courses
      const todayCourses = (state.schedule?.courses || [])
        .filter(c => {
          if (!c.weeks) return true;
          const wList = Array.isArray(c.weeks) ? c.weeks.map(Number) : [];
          return wList.includes(Number(state.realTodayWeek));
        })
        .map(c => getEffectiveCourseForWeek(c, Number(state.realTodayWeek)))
        .filter(c => Number(c.dayOfWeek) === Number(state.realTodayDay))
        .sort((a, b) => {
          const aMin = parseCourseTimeMinutes(a).startMin;
          const bMin = parseCourseTimeMinutes(b).startMin;
          return aMin !== bMin ? aMin - bMin : (a.startSlot || 0) - (b.startSlot || 0);
        });

      if (todayCourses.length > 0) {
        let ongoingCourse = null;
        let nextCourse = null;

        for (const c of todayCourses) {
          const { startMin, endMin } = parseCourseTimeMinutes(c);
          if (startMin <= currentMin && currentMin < endMin) {
            if (!ongoingCourse) ongoingCourse = c;
          } else if (currentMin < startMin && !nextCourse) {
            nextCourse = c;
          }
        }

        if (ongoingCourse) {
          // A course is currently ongoing
          const { endMin } = parseCourseTimeMinutes(ongoingCourse);
          const remainMin = Math.max(1, endMin - currentMin);
          if (el.nextClassLabel) {
            el.nextClassLabel.innerHTML = `🔴 正在上课中 • 距下课还有 ${remainMin} 分钟`;
          }

          let tagsHtml = `
            <span class="meta-tag venue">📍 ${ongoingCourse.location}</span>
            <span class="meta-tag time">🕒 ${ongoingCourse.startTime} - ${ongoingCourse.endTime}</span>
            <span class="meta-tag lecturer">👤 ${ongoingCourse.instructor}</span>
            <span class="meta-tag" style="background:#10b981; color:#fff;">正在进行</span>
          `;
          if (ongoingCourse.isRescheduled) {
            tagsHtml += `<span class="meta-tag" style="background:#f97316; color:#fff;">🔄 已调课</span>`;
          }
          if (ongoingCourse.notes) {
            tagsHtml += `<span class="meta-tag" style="background:#3b82f6; color:#fff;">📝 ${ongoingCourse.notes}</span>`;
          }
          if (nextCourse) {
            tagsHtml += `<span class="meta-tag" style="background:rgba(59,130,246,0.2); color:#60a5fa;">👉 下一节课: ${nextCourse.startTime} ${nextCourse.code} (${nextCourse.location})</span>`;
          }

          el.nextClassContent.innerHTML = `
            <div class="next-class-name">${ongoingCourse.code} ${ongoingCourse.name}</div>
            <div class="next-class-meta">${tagsHtml}</div>
          `;
        } else if (nextCourse) {
          // An upcoming course later today
          const { startMin } = parseCourseTimeMinutes(nextCourse);
          const diffMin = startMin - currentMin;
          let timeCountText = '';
          if (diffMin <= 60) {
            timeCountText = `距上课还有 ${diffMin} 分钟`;
          } else {
            const diffH = Math.floor(diffMin / 60);
            const remM = diffMin % 60;
            timeCountText = `距上课约 ${diffH}小时${remM > 0 ? remM + '分' : ''}`;
          }

          if (el.nextClassLabel) {
            el.nextClassLabel.innerHTML = `⏰ 下一节课 • ${timeCountText}`;
          }

          let tagsHtml = `
            <span class="meta-tag venue">📍 ${nextCourse.location}</span>
            <span class="meta-tag time">🕒 ${nextCourse.startTime} - ${nextCourse.endTime}</span>
            <span class="meta-tag lecturer">👤 ${nextCourse.instructor}</span>
          `;
          if (nextCourse.isRescheduled) {
            tagsHtml += `<span class="meta-tag" style="background:#f97316; color:#fff;">🔄 已调课</span>`;
          }
          if (nextCourse.notes) {
            tagsHtml += `<span class="meta-tag" style="background:#10b981; color:#fff;">📝 ${nextCourse.notes}</span>`;
          }

          el.nextClassContent.innerHTML = `
            <div class="next-class-name">${nextCourse.code} ${nextCourse.name}</div>
            <div class="next-class-meta">${tagsHtml}</div>
          `;
        } else {
          // All today's courses have finished!
          if (el.nextClassLabel) {
            el.nextClassLabel.innerHTML = '🎉 今日课程已全部结束';
          }

          // Look ahead to tomorrow's first course
          const tomorrowDay = (state.realTodayDay % 7) + 1;
          const tomorrowWeek = (tomorrowDay === 1) ? state.realTodayWeek + 1 : state.realTodayWeek;
          const tomorrowCourses = (state.schedule?.courses || [])
            .filter(c => {
              if (!c.weeks) return true;
              const wList = Array.isArray(c.weeks) ? c.weeks.map(Number) : [];
              return wList.includes(tomorrowWeek);
            })
            .map(c => getEffectiveCourseForWeek(c, tomorrowWeek))
            .filter(c => Number(c.dayOfWeek) === tomorrowDay)
            .sort((a, b) => {
              const aMin = parseCourseTimeMinutes(a).startMin;
              const bMin = parseCourseTimeMinutes(b).startMin;
              return aMin !== bMin ? aMin - bMin : (a.startSlot || 0) - (b.startSlot || 0);
            });

          let tomorrowHint = '';
          if (tomorrowCourses.length > 0) {
            const tomFirst = tomorrowCourses[0];
            tomorrowHint = `✨ 明日首节课: ${tomFirst.startTime} ${tomFirst.code} ${tomFirst.name} (📍 ${tomFirst.location})`;
          } else {
            tomorrowHint = `明日（${DAY_ZH[tomorrowDay - 1]}）暂无排课安排，好好放松！`;
          }

          el.nextClassContent.innerHTML = `
            <div class="next-class-name">今日 ${todayCourses.length} 门课程已全部完成！好好休息～ 🎉</div>
            <div class="next-class-meta">
              <span class="meta-tag">${tomorrowHint}</span>
            </div>
          `;
        }
      } else {
        if (el.nextClassLabel) {
          el.nextClassLabel.textContent = '⏰ 今日课程安排';
        }
        el.nextClassContent.innerHTML = `
          <div class="next-class-name">今日（${DAY_ZH[state.realTodayDay - 1]}）暂无排课安排 🎉</div>
          <div class="next-class-meta">
            <span class="meta-tag">所有课程正常运行，可查看下方周课表掌握全周节奏</span>
          </div>
        `;
      }

      checkHolidayAlert(state.realTodayDateStr);
    } else {
      // Browsing another week (e.g. Week 3, Week 4)
      const rangeText = currentWeekInfo ? `${currentWeekInfo.start} 至 ${currentWeekInfo.end}` : '';
      el.currentDateDisplay.textContent = `第 ${state.selectedWeek} 周 (${rangeText})`;
      
      el.termStatusBadge.innerHTML = `第 ${state.selectedWeek} 周 • 浏览中 <span style="text-decoration:underline; font-weight:800;">[回今天]</span>`;
      el.termStatusBadge.className = 'status-pill browsing-pill';
      el.termStatusBadge.onclick = goToToday;

      if (el.nextClassLabel) {
        el.nextClassLabel.textContent = `📋 第 ${state.selectedWeek} 周 • 课程预览`;
      }

      const weekCourses = (state.schedule?.courses || [])
        .filter(c => c.weeks && c.weeks.includes(state.selectedWeek))
        .map(c => getEffectiveCourseForWeek(c, state.selectedWeek));

      if (weekCourses.length > 0) {
        el.nextClassContent.innerHTML = `
          <div class="next-class-name">第 ${state.selectedWeek} 周共有 ${weekCourses.length} 门课程安排</div>
          <div class="next-class-meta">
            <span class="meta-tag" style="background:rgba(59,130,246,0.2); color:#60a5fa;">💡 提示：当前在浏览第 ${state.selectedWeek} 周，下方周课表已同步切换</span>
          </div>
        `;
      } else {
        el.nextClassContent.innerHTML = `
          <div class="next-class-name">第 ${state.selectedWeek} 周暂无排课安排 🎉</div>
          <div class="next-class-meta">
            <span class="meta-tag">非教学周或无课程安排</span>
          </div>
        `;
      }

      // Check holidays in this week
      if (currentWeekInfo && typeof ACADEMIC_CALENDAR !== 'undefined') {
        const hols = ACADEMIC_CALENDAR.publicHolidays.filter(h => h.date >= currentWeekInfo.start && h.date <= currentWeekInfo.end);
        if (hols.length > 0) {
          el.holidayAlertCard.classList.remove('hidden');
          el.holidayTitle.textContent = `🎉 本周包含法定公休: ${hols.map(h => `${h.name} (${h.date})`).join(', ')}`;
        } else {
          el.holidayAlertCard.classList.add('hidden');
        }
      } else {
        el.holidayAlertCard.classList.add('hidden');
      }
    }
    updateBannerUrgentDdl();
  }

  function checkHolidayAlert(dateStr) {
    if (typeof ACADEMIC_CALENDAR === 'undefined') return;
    const holiday = ACADEMIC_CALENDAR.publicHolidays.find(h => h.date === dateStr);
    if (holiday) {
      el.holidayAlertCard.classList.remove('hidden');
      el.holidayTitle.textContent = `🎉 公共假期: ${holiday.name}`;
    } else {
      el.holidayAlertCard.classList.add('hidden');
    }
  }

  function updateNextClassCard() {
    updateTodayBanner();
  }

  function selectWeek(weekNum) {
    const sem = getCurrentSemesterData();
    if (!sem) return;
    if (weekNum < 1 || weekNum > sem.weeks.length) return;
    state.selectedWeek = weekNum;

    if (state.selectedWeek === state.realTodayWeek) {
      state.selectedDay = state.realTodayDay;
    } else {
      if (!state.selectedDay) state.selectedDay = 1;
    }

    updateTodayBanner();
    renderWeekChips();
    renderDayTabs();
    renderView();
  }

  function goToToday() {
    selectWeek(state.realTodayWeek);
    state.selectedDay = state.realTodayDay;
    renderDayTabs();
    renderView();
    showToast('已切回本周与今日');
  }

  // 5. Week Chips
  function renderWeekChips() {
    const sem = getCurrentSemesterData();
    if (!sem) return;

    el.weekChipsContainer.innerHTML = '';
    sem.weeks.forEach(w => {
      const chip = document.createElement('div');
      const isSelected = (w.week === state.selectedWeek);
      const isCurrentWeek = (w.week === state.realTodayWeek);
      chip.className = `week-chip ${isSelected ? 'active' : ''} ${isCurrentWeek ? 'is-current-week is-current-week-chip' : ''}`;
      
      const startParts = w.start.split('-');
      const endParts = w.end.split('-');
      const dateText = `${parseInt(startParts[1])}.${parseInt(startParts[2])} - ${parseInt(endParts[1])}.${parseInt(endParts[2])}`;

      chip.innerHTML = `
        <span class="chip-label">第 ${w.week} 周${isCurrentWeek ? ' (本周)' : ''}</span>
        <span class="chip-dates">${dateText}</span>
      `;

      chip.addEventListener('click', () => {
        selectWeek(w.week);
      });

      el.weekChipsContainer.appendChild(chip);
    });

    // Auto-scroll active chip into center view
    const activeChip = el.weekChipsContainer.querySelector('.week-chip.active');
    if (activeChip) {
      activeChip.scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' });
    }
  }

  // Day Tabs for Daily Agenda
  function renderDayTabs() {
    if (!el.dayTabsContainer) return;
    el.dayTabsContainer.innerHTML = '';
    const sem = getCurrentSemesterData();
    const currentWeekInfo = sem?.weeks.find(w => w.week === state.selectedWeek);

    for (let d = 1; d <= 7; d++) {
      const btn = document.createElement('button');
      btn.dataset.day = d.toString();
      const isSelected = (d === state.selectedDay);
      const isRealToday = (state.selectedWeek === state.realTodayWeek && d === state.realTodayDay);

      let classes = ['day-tab'];
      if (isSelected) classes.push('active');
      if (isRealToday) classes.push('is-today-tab');
      btn.className = classes.join(' ');

      const dateStr = getDayDateString(currentWeekInfo, d);
      const shortDate = dateStr ? `${parseInt(dateStr.slice(5, 7))}.${parseInt(dateStr.slice(8, 10))}` : '';

      if (isRealToday) {
        btn.innerHTML = `
          <span class="tab-title">${DAY_ZH[d - 1]} <span class="tab-today-badge">今天</span></span>
          <span class="tab-date">${shortDate}</span>
        `;
      } else {
        btn.innerHTML = `
          <span class="tab-title">${DAY_ZH[d - 1]}</span>
          <span class="tab-date">${shortDate}</span>
        `;
      }

      btn.addEventListener('click', () => {
        state.selectedDay = d;
        renderDayTabs();
        renderDailyAgenda();
      });

      el.dayTabsContainer.appendChild(btn);
    }
  }

  // Helper: Get date string for a specific day of week given weekInfo
  function getDayDateString(weekInfo, dayOfWeek) {
    if (!weekInfo || !weekInfo.start) return null;
    const parts = weekInfo.start.split('-');
    const sundayDate = new Date(parseInt(parts[0]), parseInt(parts[1]) - 1, parseInt(parts[2]), 12, 0, 0);
    const offset = (dayOfWeek === 7) ? 0 : dayOfWeek;
    const targetDate = new Date(sundayDate);
    targetDate.setDate(targetDate.getDate() + offset);
    return formatLocalDate(targetDate);
  }

  // Helper: Find holiday for date
  function getHolidayForDate(dateStr) {
    if (!dateStr || typeof ACADEMIC_CALENDAR === 'undefined') return null;
    return ACADEMIC_CALENDAR.publicHolidays.find(h => h.date === dateStr);
  }

  // Helper: Get effective course considering week overrides & global reschedule
  function getEffectiveCourseForWeek(course, weekNum) {
    if (!course) return null;
    // Single week override check
    if (course.weekOverrides && course.weekOverrides[weekNum]) {
      const ov = course.weekOverrides[weekNum];
      return {
        ...course,
        dayOfWeek: ov.dayOfWeek,
        dayName: DAY_NAMES[ov.dayOfWeek - 1],
        startTime: ov.startTime,
        endTime: ov.endTime,
        startSlot: ov.startSlot,
        slotSpan: ov.slotSpan || course.slotSpan || 2,
        location: ov.location || course.location,
        isRescheduled: true,
        rescheduleReason: ov.reason || '临时调课',
        isSingleWeekRescheduled: true
      };
    }
    return course;
  }

  // 6. Weekly Timetable Grid
  function renderTimetableGrid() {
    const sem = getCurrentSemesterData();
    const currentWeekInfo = sem?.weeks.find(w => w.week === state.selectedWeek);
    
    el.gridWeekTitle.textContent = `第 ${state.selectedWeek} 周 课表`;
    if (currentWeekInfo) {
      el.gridDateRange.textContent = `${currentWeekInfo.start} 至 ${currentWeekInfo.end}`;
    }

    el.timetableGrid.innerHTML = '';

    // Cache holidays for this week's 7 days
    const weekHolidays = {};
    for (let d = 1; d <= 7; d++) {
      const dStr = getDayDateString(currentWeekInfo, d);
      weekHolidays[d] = {
        dateStr: dStr,
        holiday: getHolidayForDate(dStr)
      };
    }

    // 1. Header Row
    // First corner empty header
    // Total visible days: 5 (Mon..Fri workweek) or 7 (Full week)
    const totalDays = state.weekGridDays || 5;
    if (totalDays === 5) {
      el.timetableGrid.classList.add('five-days-mode');
      if (el.toggleDaysBtn) el.toggleDaysBtn.textContent = '📅 完整7天';
    } else {
      el.timetableGrid.classList.remove('five-days-mode');
      if (el.toggleDaysBtn) el.toggleDaysBtn.textContent = '📅 5天模式';
    }

    const cornerTh = document.createElement('div');
    cornerTh.className = 'grid-cell-header';
    cornerTh.style.gridColumn = '1';
    cornerTh.style.gridRow = '1';
    cornerTh.textContent = '时间';
    el.timetableGrid.appendChild(cornerTh);

    // Day Headers (1..totalDays)
    for (let d = 1; d <= totalDays; d++) {
      const dayHeader = document.createElement('div');
      const isToday = (state.selectedWeek === state.realTodayWeek && d === state.realTodayDay);
      const holInfo = weekHolidays[d];
      
      let headerClasses = ['grid-cell-header'];
      if (isToday) headerClasses.push('today');
      if (holInfo.holiday) headerClasses.push('is-holiday');
      dayHeader.className = headerClasses.join(' ');
      dayHeader.style.gridColumn = `${d + 1}`;
      dayHeader.style.gridRow = '1';

      if (holInfo.holiday) {
        dayHeader.innerHTML = `
          <div>${DAY_ZH[d - 1]} ${isToday ? '<span class="tab-today-badge">今天</span> ' : ''}<span class="holiday-pill">放假</span></div>
          <div class="holiday-name-sub" title="${holInfo.holiday.name}">${holInfo.holiday.name}</div>
        `;
      } else {
        const shortDate = holInfo.dateStr ? `${parseInt(holInfo.dateStr.slice(5, 7))}.${parseInt(holInfo.dateStr.slice(8, 10))}` : '';
        dayHeader.innerHTML = `
          <div>${DAY_ZH[d - 1]} ${isToday ? '<span class="tab-today-badge">今天</span>' : ''}</div>
          <div style="font-size:0.6rem; opacity:0.8;">${shortDate || DAY_NAMES[d - 1].slice(0, 3)}</div>
        `;
      }
      
      el.timetableGrid.appendChild(dayHeader);
    }

    // 2. Render background grid: Time labels in Col 1, and Empty slots for 1..totalDays
    TIME_SLOTS_DEF.forEach((slot, slotIdx) => {
      const rowIdx = slotIdx + 2; // Row 1 is header, Row 2 is slot 1...

      // Time Label Cell (HARD-LOCKED to Col 1, Row rowIdx)
      const timeCell = document.createElement('div');
      timeCell.className = 'grid-time-slot';
      timeCell.style.gridColumn = '1';
      timeCell.style.gridRow = `${rowIdx}`;
      timeCell.innerHTML = `
        <div class="time-range-wrap">
          <span class="time-start">${slot.start}</span>
          <span class="time-sep">-</span>
          <span class="time-end">${slot.end}</span>
        </div>
      `;
      el.timetableGrid.appendChild(timeCell);

      // Day Empty Slot Cells (Col 2..totalDays+1, Row rowIdx)
      for (let day = 1; day <= totalDays; day++) {
        const holInfo = weekHolidays[day];
        const emptySlot = document.createElement('div');
        emptySlot.className = `grid-empty-slot ${holInfo.holiday ? 'holiday-day-slot' : ''}`;
        emptySlot.style.gridColumn = `${day + 1}`;
        emptySlot.style.gridRow = `${rowIdx}`;
        emptySlot.style.zIndex = '1';
        
        if (holInfo.holiday && slot.slot === 1) {
          emptySlot.innerHTML = `<div class="holiday-watermark">🎉 ${holInfo.holiday.name}</div>`;
        }

        emptySlot.addEventListener('click', () => {
          const hText = holInfo.holiday ? ` [法定假日: ${holInfo.holiday.name}]` : '';
          showToast(`点击了 ${DAY_ZH[day - 1]} ${slot.range}${hText}`);
        });
        el.timetableGrid.appendChild(emptySlot);
      }
    });

    // 3. Render course cards directly at their exact coordinates (Col = day + 1, Row = startSlot + 1, Span = slotSpan)
    const activeCourses = (state.schedule?.courses || [])
      .filter(c => c.weeks && c.weeks.includes(state.selectedWeek))
      .map(c => getEffectiveCourseForWeek(c, state.selectedWeek));

    activeCourses.forEach(course => {
      if (!course.dayOfWeek || !course.startSlot) return;
      if (course.dayOfWeek > totalDays) return; // Hide weekend courses in 5-day mode
      const holInfo = weekHolidays[course.dayOfWeek] || {};

      const courseCard = document.createElement('div');
      courseCard.className = 'course-card-block';
      const col = course.dayOfWeek + 1; // 1 -> Col 2 (Mon) ...
      const startRow = course.startSlot + 1; // Slot 1 -> Row 2, Slot 8 -> Row 9...
      const span = course.slotSpan || 1;

      courseCard.style.gridColumn = `${col}`;
      courseCard.style.gridRow = `${startRow} / span ${span}`;
      courseCard.style.backgroundColor = course.colorTag || '#3b82f6';
      courseCard.style.zIndex = '2';

      let badgesHtml = '<div class="card-badges-row">';
      if (course.isRescheduled) {
        badgesHtml += `<span class="course-rescheduled-badge">🔄 已调课</span>`;
      }
      if (course.notes && course.notes.trim()) {
        badgesHtml += `<span class="course-notes-badge" title="${course.notes}">📝 备注</span>`;
      }
      badgesHtml += '</div>';

      let holidayAlertHtml = '';
      if (holInfo.holiday) {
        holidayAlertHtml = `<div class="course-holiday-alert">⚠️ 逢假: ${holInfo.holiday.name}</div>`;
      }

      courseCard.innerHTML = `
        <div>
          <div class="course-code">${course.code}</div>
          <div class="course-title" title="${course.name}">${course.name}</div>
          ${badgesHtml}
          ${holidayAlertHtml}
        </div>
        <div class="course-room">📍 ${course.location || 'TBA'}</div>
      `;

      courseCard.addEventListener('click', () => {
        const originalCourseRef = state.schedule?.courses.find(c => c.id === course.id) || course;
        openCourseDetail(originalCourseRef, course);
      });

      el.timetableGrid.appendChild(courseCard);
    });
  }

  // 7. Daily Agenda Feed
  function renderDailyAgenda() {
    const sem = getCurrentSemesterData();
    const currentWeekNum = Number(state.selectedWeek);
    const currentDayNum = Number(state.selectedDay || state.realTodayDay || 1);
    const currentWeekInfo = sem?.weeks.find(w => Number(w.week) === currentWeekNum);
    const dayDateStr = getDayDateString(currentWeekInfo, currentDayNum);
    const dayHoliday = getHolidayForDate(dayDateStr);

    const todayCourses = (state.schedule?.courses || [])
      .filter(c => {
        if (!c.weeks) return true;
        const wList = Array.isArray(c.weeks) ? c.weeks.map(Number) : [];
        return wList.includes(currentWeekNum);
      })
      .map(c => getEffectiveCourseForWeek(c, currentWeekNum))
      .filter(c => Number(c.dayOfWeek) === currentDayNum)
      .sort((a, b) => {
        const aMin = parseCourseTimeMinutes(a).startMin;
        const bMin = parseCourseTimeMinutes(b).startMin;
        return aMin !== bMin ? aMin - bMin : (a.startSlot || 0) - (b.startSlot || 0);
      });

    // Update active tab in dayTabs
    if (el.dayTabsContainer) {
      el.dayTabsContainer.querySelectorAll('.day-tab').forEach(tab => {
        const tabDay = parseInt(tab.dataset.day, 10);
        tab.classList.toggle('active', tabDay === currentDayNum);
      });
    }

    if (!el.dailyAgendaList) return;
    el.dailyAgendaList.innerHTML = '';

    const isRealToday = (currentWeekNum === Number(state.realTodayWeek) && currentDayNum === Number(state.realTodayDay));

    // If day is a public holiday, display prominent holiday banner
    if (dayHoliday) {
      const holCard = document.createElement('div');
      holCard.className = 'daily-holiday-banner';
      holCard.innerHTML = `
        <span class="holiday-icon">🎉</span>
        <div>
          <h4>${isRealToday ? '今日' : `${DAY_ZH[currentDayNum - 1]}`}为法定公休日：${dayHoliday.name} (${dayDateStr})</h4>
          <p>校历法定公共假日，全校常规教学停课；若任课教师安排有调课/补课，请见下方具体日程。</p>
        </div>
      `;
      el.dailyAgendaList.appendChild(holCard);
    }

    if (todayCourses.length === 0) {
      const emptyDiv = document.createElement('div');
      emptyDiv.className = 'empty-state';
      emptyDiv.innerHTML = `
        <div class="empty-state-icon">☕️</div>
        <h3>第 ${currentWeekNum} 周 ${DAY_ZH[currentDayNum - 1]} (${dayDateStr || ''}) 无课程</h3>
        <p>${dayHoliday ? '法定假期休假，无常规课程！' : '这一天没有任何课，可以自习或休息放松一下！'}</p>
      `;
      el.dailyAgendaList.appendChild(emptyDiv);
      return;
    }

    todayCourses.forEach(c => {
      const card = document.createElement('div');
      
      let statusClass = '';
      let statusBadge = '';

      if (isRealToday) {
        const now = new Date();
        const currentMin = now.getHours() * 60 + now.getMinutes();
        const { startMin, endMin } = parseCourseTimeMinutes(c);

        if (startMin <= currentMin && currentMin < endMin) {
          statusClass = 'is-ongoing';
          statusBadge = '<span class="course-status-pill ongoing">🔴 上课中</span>';
        } else if (currentMin >= endMin) {
          statusClass = 'is-finished';
          statusBadge = '<span class="course-status-pill finished">✓ 已结课</span>';
        } else if (currentMin < startMin) {
          const upcomingOnes = todayCourses.filter(item => {
            const tm = parseCourseTimeMinutes(item);
            return tm.startMin > currentMin;
          });
          if (upcomingOnes.length > 0 && upcomingOnes[0].id === c.id) {
            statusClass = 'is-next-upcoming';
            statusBadge = '<span class="course-status-pill upcoming">⏰ 下一节</span>';
          }
        }
      }

      card.className = `daily-course-card ${statusClass}`.trim();
      
      let badgesLine = '';
      if (c.isRescheduled) {
        badgesLine += `<span class="course-rescheduled-badge">🔄 已调课 (${c.rescheduleReason || '时间地点调整'})</span> `;
      }
      if (c.notes && c.notes.trim()) {
        badgesLine += `<span class="course-notes-badge">📝 ${c.notes}</span>`;
      }

      card.innerHTML = `
        <div class="course-time-col">
          <span class="course-time-start">${c.startTime}</span>
          <span class="course-time-end">${c.endTime}</span>
        </div>
        <div class="course-info-col">
          <div style="display:flex; align-items:center; gap:6px; margin-bottom:4px;">
            <span class="course-code-badge" style="background:${c.colorTag || '#3b82f6'}; margin-bottom:0;">${c.code}</span>
            ${statusBadge}
          </div>
          <div class="course-name-lg">${c.name}</div>
          <div class="course-meta-row">
            <span>📍 ${c.location}</span>
            <span>👤 ${c.instructor}</span>
            <span>📅 ${c.weeksText || '全学期'}</span>
          </div>
          ${badgesLine ? `<div style="margin-top: 6px;">${badgesLine}</div>` : ''}
        </div>
      `;

      card.addEventListener('click', () => {
        const originalCourseRef = state.schedule?.courses.find(item => item.id === c.id) || c;
        openCourseDetail(originalCourseRef, c);
      });
      el.dailyAgendaList.appendChild(card);
    });
  }

  // 8. Academic Calendar Overview
  function renderCalendarMilestones() {
    if (typeof ACADEMIC_CALENDAR === 'undefined') return;
    const sem = getCurrentSemesterData();
    if (!sem) return;

    el.milestonesRow.innerHTML = `
      <div class="milestone-card">
        <div>
          <div class="milestone-label">复习周 (Revision)</div>
          <div class="milestone-countdown">${sem.revisionWeek ? sem.revisionWeek.start.slice(5) : 'Wk 6'}</div>
        </div>
        <div class="milestone-sub">冲刺复习</div>
      </div>
      <div class="milestone-card">
        <div>
          <div class="milestone-label">期末考试周 (Exam)</div>
          <div class="milestone-countdown">${sem.examWeek ? sem.examWeek.start.slice(5) : 'TBA'}</div>
        </div>
        <div class="milestone-sub">期末考核</div>
      </div>
      <div class="milestone-card">
        <div>
          <div class="milestone-label">学期假期 (Break)</div>
          <div class="milestone-countdown">${sem.breakPeriod ? sem.breakPeriod.start.slice(5) : '待公布'}</div>
        </div>
        <div class="milestone-sub">暑/寒假离校</div>
      </div>
    `;
  }

  function renderAcademicCalendar() {
    if (typeof ACADEMIC_CALENDAR === 'undefined') return;

    // Filter semesters by activeYearCalendar
    const filteredSems = ACADEMIC_CALENDAR.semesters.filter(s => s.year.toString() === state.activeCalendarYear);
    
    el.semestersCalendarList.innerHTML = '';
    filteredSems.forEach(s => {
      const semCard = document.createElement('div');
      semCard.className = 'sem-card';
      semCard.innerHTML = `
        <div class="sem-card-header">
          <div class="sem-card-title">🏛️ ${s.name}</div>
          <span class="sem-duration">${s.startDate} ~ ${s.endDate}</span>
        </div>
        <div class="sem-details-grid">
          <div class="sem-detail-item">
            <div class="sem-detail-label">新生注册 & 迎新 (Orientation)</div>
            <div class="sem-detail-val">${s.registrationDays.join(', ')}</div>
          </div>
          <div class="sem-detail-item">
            <div class="sem-detail-label">教学周数 (Teaching Weeks)</div>
            <div class="sem-detail-val">${s.teachingWeeks} 周教学</div>
          </div>
          <div class="sem-detail-item">
            <div class="sem-detail-label">期末考试周 (Exam Week)</div>
            <div class="sem-detail-val">${s.examWeek ? `${s.examWeek.start} ~ ${s.examWeek.end}` : 'N/A'}</div>
          </div>
          <div class="sem-detail-item">
            <div class="sem-detail-label">学期长假 (Semester Break)</div>
            <div class="sem-detail-val">${s.breakPeriod ? `${s.breakPeriod.start} ~ ${s.breakPeriod.end}` : '短学期连读'}</div>
          </div>
        </div>
      `;
      el.semestersCalendarList.appendChild(semCard);
    });

    // Render Public Holidays
    el.holidaysListGrid.innerHTML = '';
    const holidays = ACADEMIC_CALENDAR.publicHolidays.filter(h => h.date.startsWith(state.activeCalendarYear));
    holidays.forEach(h => {
      const hItem = document.createElement('div');
      hItem.className = 'holiday-item';
      hItem.innerHTML = `
        <div class="holiday-name">${h.name}</div>
        <div class="holiday-date">📅 ${h.date}</div>
      `;
      el.holidaysListGrid.appendChild(hItem);
    });
  }

  // 9. View Switcher
  function switchView(viewName) {
    state.activeView = viewName;
    document.querySelectorAll('.view-panel').forEach(p => p.classList.remove('active'));
    document.getElementById(viewName).classList.add('active');

    el.navItems.forEach(n => {
      n.classList.toggle('active', n.dataset.view === viewName);
    });

    renderView();
  }

  function renderView() {
    if (state.activeView === 'weeklyGridView') {
      renderTimetableGrid();
    } else if (state.activeView === 'dailyAgendaView') {
      renderDailyAgenda();
    } else if (state.activeView === 'calendarOverviewView') {
      renderAcademicCalendar();
      renderCalendarMilestones();
    }
  }

  // Helper: Calculate start and end time based on startSlot and slotSpan
  function calculateCourseTimeRange(startSlot, slotSpan) {
    const startHour = 7 + startSlot; // slot 1 -> 8:00
    const endHour = startHour + slotSpan;
    const formatHour = (h) => (h < 10 ? `0${h}:00` : `${h}:00`);
    return {
      startTime: formatHour(startHour),
      endTime: formatHour(endHour),
      slotSpan: slotSpan
    };
  }

  function updateReschedulePreview() {
    const dayEl = document.getElementById('rescheduleDay');
    const slotEl = document.getElementById('rescheduleSlot');
    const durEl = document.getElementById('rescheduleDuration');
    const previewEl = document.getElementById('reschedulePreviewText');
    if (!dayEl || !slotEl || !durEl || !previewEl) return;

    const day = parseInt(dayEl.value) || 1;
    const slot = parseInt(slotEl.value) || 1;
    const duration = parseInt(durEl.value) || 2;

    const timeRange = calculateCourseTimeRange(slot, duration);
    previewEl.textContent = `${DAY_ZH[day - 1]} ${timeRange.startTime} - ${timeRange.endTime} (时长 ${duration} 小时)`;
  }

  // 10. Course Detail Modal with Notes and Rescheduling
  function openCourseDetail(course, effectiveCourse) {
    state.selectedCourse = course;
    const eff = effectiveCourse || getEffectiveCourseForWeek(course, state.selectedWeek);

    document.getElementById('modalCourseCode').textContent = eff.code;
    document.getElementById('modalCourseName').textContent = eff.name;
    document.getElementById('modalLocation').textContent = eff.location;
    document.getElementById('modalInstructor').textContent = eff.instructor;
    document.getElementById('modalTime').textContent = `${DAY_ZH[eff.dayOfWeek - 1]} ${eff.startTime} - ${eff.endTime} (时长 ${eff.slotSpan || 2} 小时)`;
    document.getElementById('modalWeeks').textContent = eff.weeksText || `第 ${eff.weeks.join(', ')} 周`;

    // Notes
    const notesInput = document.getElementById('courseNotesInput');
    notesInput.value = course.notes || '';

    // Reschedule Status Banner
    const reschedBanner = document.getElementById('rescheduleInfoBanner');
    const isOverriddenThisWeek = (course.weekOverrides && course.weekOverrides[state.selectedWeek]);
    const isGloballyRescheduled = course.isRescheduled;

    if (isOverriddenThisWeek || isGloballyRescheduled) {
      reschedBanner.classList.remove('hidden');
      const orig = course.originalInfo || {
        dayOfWeek: course.dayOfWeek,
        startTime: course.startTime,
        endTime: course.endTime,
        slotSpan: course.slotSpan || 2,
        location: course.location
      };
      document.getElementById('rescheduleBannerText').textContent = 
        `原初始时间: ${DAY_ZH[orig.dayOfWeek - 1]} ${orig.startTime} - ${orig.endTime || ''} @ ${orig.location}`;
      document.getElementById('rescheduleBannerReason').textContent = 
        `调整备注: ${eff.rescheduleReason || '课程调课'} (${isOverriddenThisWeek ? `仅第${state.selectedWeek}周` : '全学期'})`;
    } else {
      reschedBanner.classList.add('hidden');
    }

    // Reset reschedule form fields to current values
    const dayEl = document.getElementById('rescheduleDay');
    const slotEl = document.getElementById('rescheduleSlot');
    const durEl = document.getElementById('rescheduleDuration');
    if (dayEl) dayEl.value = eff.dayOfWeek.toString();
    if (slotEl) slotEl.value = eff.startSlot.toString();
    if (durEl) durEl.value = (eff.slotSpan || 2).toString();
    document.getElementById('rescheduleRoom').value = eff.location || '';
    document.getElementById('rescheduleReason').value = '';
    document.getElementById('rescheduleFormBody').classList.add('hidden');
    document.getElementById('toggleRescheduleBtn').textContent = '展开调课设置 ▾';
    updateReschedulePreview();

    openModal(el.courseDetailModal);
  }

  function closeCourseDetail() {
    closeModal(el.courseDetailModal);
  }

  // 11. Toast Notifications with Undo Capability
  let toastTimer = null;
  function showToast(msg, undoCallback) {
    if (toastTimer) clearTimeout(toastTimer);
    el.toastMessage.innerHTML = '';
    
    const textSpan = document.createElement('span');
    textSpan.textContent = msg;
    el.toastMessage.appendChild(textSpan);

    if (undoCallback) {
      const undoBtn = document.createElement('button');
      undoBtn.className = 'toast-undo-btn';
      undoBtn.textContent = '撤销';
      undoBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        el.toastMessage.classList.remove('show');
        undoCallback();
      });
      el.toastMessage.appendChild(undoBtn);
    }

    el.toastMessage.classList.add('show');
    toastTimer = setTimeout(() => {
      el.toastMessage.classList.remove('show');
    }, undoCallback ? 4500 : 2500);
  }

  // 11.1 Deletion & Confirmation
  function openDeleteConfirmModal(course) {
    if (!course) return;
    state.pendingDeleteCourse = course;
    el.delCourseCode.textContent = course.code;
    el.delCourseName.textContent = course.name;
    el.delCurrentWeekLabel.textContent = `第 ${state.selectedWeek} 周`;
    openModal(el.deleteConfirmModal);
  }

  function closeDeleteConfirmModal() {
    state.pendingDeleteCourse = null;
    closeModal(el.deleteConfirmModal);
  }

  function deleteCourseSingleWeek(course) {
    if (!course || !state.schedule) return;
    const weekNum = state.selectedWeek;
    
    // Remove weekNum from course.weeks
    if (!course.cancelledWeeks) course.cancelledWeeks = [];
    if (!course.cancelledWeeks.includes(weekNum)) {
      course.cancelledWeeks.push(weekNum);
    }
    course.weeks = course.weeks.filter(w => w !== weekNum);

    // Record into deletedCourses list
    if (!state.schedule.deletedCourses) state.schedule.deletedCourses = [];
    const deleteRecord = {
      courseId: course.id,
      code: course.code,
      name: course.name,
      location: course.location,
      instructor: course.instructor,
      dayOfWeek: course.dayOfWeek,
      startTime: course.startTime,
      endTime: course.endTime,
      deleteType: 'week',
      week: weekNum,
      timestamp: Date.now()
    };
    state.schedule.deletedCourses.unshift(deleteRecord);

    saveSchedule();
    closeDeleteConfirmModal();
    closeCourseDetail();
    renderView();
    updateNextClassCard();
    updateRecycleCountBadge();

    showToast(`已取消第 ${weekNum} 周 ${course.code} 课程`, () => {
      restoreCourseItem(deleteRecord);
    });
  }

  function deleteCourseFullSemester(course) {
    if (!course || !state.schedule) return;
    // Remove course from schedule.courses
    state.schedule.courses = state.schedule.courses.filter(c => c.id !== course.id);

    // Record into deletedCourses list
    if (!state.schedule.deletedCourses) state.schedule.deletedCourses = [];
    const deleteRecord = {
      ...JSON.parse(JSON.stringify(course)),
      deleteType: 'full',
      timestamp: Date.now()
    };
    state.schedule.deletedCourses.unshift(deleteRecord);

    saveSchedule();
    closeDeleteConfirmModal();
    closeCourseDetail();
    renderView();
    updateNextClassCard();
    updateRecycleCountBadge();

    showToast(`已将 ${course.code} 移至回收站`, () => {
      restoreCourseItem(deleteRecord);
    });
  }

  // 11.2 Recycle Bin
  function openRecycleBinModal() {
    renderRecycleBin();
    openModal(el.recycleBinModal);
  }

  function closeRecycleBinModal() {
    closeModal(el.recycleBinModal);
  }

  function updateRecycleCountBadge() {
    if (!el.recycleCountBadge) return;
    const deletedCount = (state.schedule?.deletedCourses || []).length;
    if (deletedCount > 0) {
      el.recycleCountBadge.textContent = deletedCount > 9 ? '9+' : deletedCount;
      el.recycleCountBadge.classList.remove('hidden');
    } else {
      el.recycleCountBadge.classList.add('hidden');
    }
  }

  function renderRecycleBin() {
    if (!el.recycleListContainer) return;
    el.recycleListContainer.innerHTML = '';

    const deletedItems = state.schedule?.deletedCourses || [];

    if (deletedItems.length === 0) {
      el.recycleListContainer.innerHTML = `
        <div class="recycle-empty-box">
          <div class="recycle-empty-icon">🎉</div>
          <div style="font-weight:700; color:var(--text-main);">回收站为空</div>
          <div style="font-size:0.75rem; color:var(--text-muted); margin-top:4px;">
            当前没有被删除或停课的课程，所有课程都在正常运行中！
          </div>
        </div>
      `;
      return;
    }

    deletedItems.forEach((item) => {
      const card = document.createElement('div');
      card.className = 'recycle-item-card';

      const isWeekDelete = item.deleteType === 'week';
      const typeBadge = isWeekDelete
        ? `<span class="recycle-type-pill week">第 ${item.week} 周停课</span>`
        : `<span class="recycle-type-pill full">整学期已删除</span>`;

      const dayText = item.dayOfWeek ? DAY_ZH[item.dayOfWeek - 1] : '';
      const timeText = item.startTime ? `${dayText} ${item.startTime}-${item.endTime}` : '';
      const locText = item.location ? `@ ${item.location}` : '';

      card.innerHTML = `
        <div class="recycle-item-info">
          <div class="recycle-item-title">
            <span>${item.code} ${item.name}</span>
            ${typeBadge}
          </div>
          <div class="recycle-item-sub">
            ${timeText} ${locText}
          </div>
        </div>
        <button class="btn-restore-item">一键恢复</button>
      `;

      card.querySelector('.btn-restore-item').addEventListener('click', () => {
        restoreCourseItem(item);
      });

      el.recycleListContainer.appendChild(card);
    });
  }

  function restoreCourseItem(item) {
    if (!state.schedule) return;

    if (item.deleteType === 'week') {
      const course = state.schedule.courses.find(c => c.id === item.courseId);
      if (course) {
        if (course.cancelledWeeks) {
          course.cancelledWeeks = course.cancelledWeeks.filter(w => w !== item.week);
        }
        if (!course.weeks.includes(item.week)) {
          course.weeks.push(item.week);
          course.weeks.sort((a, b) => a - b);
        }
      }
      state.schedule.deletedCourses = (state.schedule.deletedCourses || []).filter(d => 
        !(d.courseId === item.courseId && d.week === item.week)
      );
    } else {
      const exists = state.schedule.courses.some(c => c.id === (item.id || item.courseId));
      if (!exists) {
        const cleanCourse = {
          id: item.id || item.courseId || ('RESTORED-' + Date.now()),
          code: item.code,
          name: item.name,
          instructor: item.instructor || 'Lecturer',
          location: item.location || 'TBA',
          dayOfWeek: item.dayOfWeek || 1,
          dayName: DAY_NAMES[(item.dayOfWeek || 1) - 1],
          startTime: item.startTime || '09:00',
          endTime: item.endTime || '11:00',
          startSlot: item.startSlot || 2,
          slotSpan: item.slotSpan || 2,
          weeks: item.weeks || [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14],
          weeksText: item.weeksText || 'Week 1–14',
          colorTag: item.colorTag || '#3b82f6',
          notes: item.notes || ''
        };
        state.schedule.courses.push(cleanCourse);
      }
      state.schedule.deletedCourses = (state.schedule.deletedCourses || []).filter(d => 
        (d.id || d.courseId) !== (item.id || item.courseId)
      );
    }

    saveSchedule();
    renderRecycleBin();
    renderView();
    updateNextClassCard();
    updateRecycleCountBadge();
    showToast(`🎉 成功恢复课程：${item.code}！`);
  }

  function clearRecycleBin() {
    if (!state.schedule) return;
    state.schedule.deletedCourses = [];
    saveSchedule();
    renderRecycleBin();
    updateRecycleCountBadge();
    showToast('🗑️ 回收站已清空');
  }

  // 12. ICS Calendar Generator (iCalendar RFC 5545)
  function exportScheduleToIcs() {
    if (!state.schedule || !state.schedule.courses || state.schedule.courses.length === 0) {
      showToast('暂无课表数据可导出');
      return;
    }

    const sem = getCurrentSemesterData();
    let icsLines = [
      "BEGIN:VCALENDAR",
      "VERSION:2.0",
      "PRODID:-//XMUM Schedule Hub//EN",
      "CALSCALE:GREGORIAN",
      "METHOD:PUBLISH",
      "X-WR-CALNAME:XMUM Timetable " + state.currentSemesterId,
      "X-WR-TIMEZONE:Asia/Kuala_Lumpur"
    ];

    state.schedule.courses.forEach(c => {
      // For each week that the course runs
      c.weeks.forEach(wNum => {
        const weekInfo = sem?.weeks.find(w => w.week === wNum);
        if (!weekInfo) return;

        // Calculate specific date for dayOfWeek
        const startSunday = new Date(weekInfo.start + 'T00:00:00');
        // If week starts Sunday, Monday is +1, Tuesday +2...
        const courseDate = new Date(startSunday);
        courseDate.setDate(courseDate.getDate() + (c.dayOfWeek % 7));

        const dateStr = courseDate.toISOString().split('T')[0].replace(/-/g, '');
        const startClean = c.startTime.replace(':', '') + '00';
        const endClean = c.endTime.replace(':', '') + '00';

        icsLines.push("BEGIN:VEVENT");
        icsLines.push(`SUMMARY:${c.code} ${c.name}`);
        icsLines.push(`LOCATION:${c.location}`);
        icsLines.push(`DESCRIPTION:Instructor: ${c.instructor}\\nWeek: ${wNum}\\nTime: ${c.startTime} - ${c.endTime}`);
        icsLines.push(`DTSTART;TZID=Asia/Kuala_Lumpur:${dateStr}T${startClean}`);
        icsLines.push(`DTEND;TZID=Asia/Kuala_Lumpur:${dateStr}T${endClean}`);
        icsLines.push(`UID:${c.code}-${wNum}-${dateStr}@xmum.schedule`);
        icsLines.push("END:VEVENT");
      });
    });

    icsLines.push("END:VCALENDAR");

    const blob = new Blob([icsLines.join("\r\n")], { type: "text/calendar;charset=utf-8" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = `XMUM_Timetable_${state.currentSemesterId.replace('/', '_')}.ics`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    showToast('🎉 日历文件 (.ics) 已导出，可导入手机系统日历！');
  }

  // 13. AC Login & HTML Scraper Handlers
  async function handleAcLogin(e) {
    e.preventDefault();
    const username = document.getElementById('acUsername').value.trim();
    const password = document.getElementById('acPassword').value.trim();
    const semester = document.getElementById('acSemester').value;
    const statusMsg = document.getElementById('loginStatusMsg');
    const submitBtn = document.getElementById('startLoginSyncBtn');

    if (!username || !password) {
      statusMsg.textContent = '请填写学号和密码';
      statusMsg.style.color = '#f43f5e';
      return;
    }

    submitBtn.disabled = true;
    submitBtn.querySelector('.btn-text').textContent = '正在连接 AC 系统...';
    statusMsg.textContent = '向 ac.xmu.edu.my 发送认证中...';
    statusMsg.style.color = '#38bdf8';

    try {
      const response = await fetch('/api/sync?action=sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'sync', username, password, semester })
      });

      let res = null;
      try {
        res = await response.json();
      } catch (_) {
        res = { success: false, error: response.status === 504 ? '教务系统响应超时 (504)，请稍后再试' : `服务响应异常 (HTTP ${response.status})` };
      }
      if (res && res.success && res.courses && res.courses.length > 0) {
        state.currentSemesterId = semester;
        if (el.semesterSelect) el.semesterSelect.value = semester;
        state.schedule = {
          studentName: res.studentName || username,
          studentId: username,
          semester: semester,
          lastUpdated: new Date().toISOString(),
          courses: res.courses,
          deletedCourses: [],
          rescheduledCourses: {}
        };
        saveSchedule();
        el.studentNameDisplay.textContent = `Hi, ${state.schedule.studentName}`;
        closeModal(el.syncModal);
        showToast(`🎉 成功同步 ${res.courses.length} 门课程！已载入课表。`);
        renderView();
        updateNextClassCard();
      } else {
        statusMsg.textContent = res.error || `在 ${semester} 未找到课表，请核对学期或使用旁边的 HTML 源码导入`;
        statusMsg.style.color = '#f43f5e';
      }
    } catch (err) {
      console.warn('API error, falling back to local simulation:', err);
      statusMsg.textContent = '连接超时或网络异常，请确认学号密码是否正确，也可使用旁边的 HTML 源码导入。';
      statusMsg.style.color = '#f59e0b';
    } finally {
      submitBtn.disabled = false;
      submitBtn.querySelector('.btn-text').textContent = '立即连接并同步课表';
    }
  }

  // Client-side HTML parser fallback for offline/mobile standalone operation
  function parseTimetableHtmlClient(htmlContent) {
    try {
      const parser = new DOMParser();
      const doc = parser.parseFromString(htmlContent, 'text/html');
      
      let studentName = '';
      const textAll = doc.body ? doc.body.textContent : '';
      const matchName = textAll.match(/Welcome,\s*([^<>\n\r]+)/i);
      if (matchName) studentName = matchName[1].trim();

      const tables = doc.querySelectorAll('table');
      let targetTable = null;
      for (const t of tables) {
        const txt = t.textContent;
        if (txt.includes('Monday') && (txt.includes('Tuesday') || txt.includes('Wednesday'))) {
          targetTable = t;
          break;
        }
      }
      if (!targetTable && tables.length > 0) targetTable = tables[0];
      if (!targetTable) return { success: false };

      const rows = targetTable.querySelectorAll('tr');
      if (rows.length < 2) return { success: false };

      const headers = Array.from(rows[0].querySelectorAll('th, td')).map(c => c.textContent.trim());
      const dayIndices = {};
      const dayNames = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];
      headers.forEach((h, idx) => {
        dayNames.forEach((dName, dNum) => {
          if (h.toLowerCase().includes(dName.toLowerCase())) {
            dayIndices[idx] = { dayNum: dNum + 1, dayName: dName };
          }
        });
      });

      const courses = [];
      const colors = ["#3b82f6", "#10b981", "#8b5cf6", "#f59e0b", "#ec4899", "#06b6d4", "#f97316", "#6366f1"];
      const occupied = {};

      for (let rIdx = 1; rIdx < rows.length; rIdx++) {
        const cells = Array.from(rows[rIdx].querySelectorAll('td, th'));
        let cPointer = 0;

        for (const cell of cells) {
          while (occupied[`${rIdx}_${cPointer}`]) {
            cPointer++;
          }

          const rowspan = parseInt(cell.getAttribute('rowspan')) || 1;
          const colspan = parseInt(cell.getAttribute('colspan')) || 1;

          for (let dr = 0; dr < rowspan; dr++) {
            for (let dc = 0; dc < colspan; dc++) {
              occupied[`${rIdx + dr}_${cPointer + dc}`] = true;
            }
          }

          const dayInfo = dayIndices[cPointer];
          const cellText = cell.innerText || cell.textContent || '';
          const rawLines = cellText.split('\n').map(l => l.trim()).filter(Boolean);

          if (dayInfo && rawLines.length >= 1) {
            // Split cell into distinct course blocks if multiple courses share this time slot
            const codePattern = /^[A-Za-z]{2,5}\s*\d{3,4}[A-Za-z]?$/;
            const blocks = [];
            let currentBlock = [];
            for (const line of rawLines) {
              if (codePattern.test(line) && currentBlock.length > 0) {
                blocks.push(currentBlock);
                currentBlock = [line];
              } else {
                currentBlock.push(line);
              }
            }
            if (currentBlock.length > 0) blocks.push(currentBlock);

            const startSlot = rIdx;
            const slotSpan = rowspan;
            const slotDefStart = TIME_SLOTS_DEF[startSlot - 1] || TIME_SLOTS_DEF[0];
            const slotDefEnd = TIME_SLOTS_DEF[Math.min(startSlot + slotSpan - 2, TIME_SLOTS_DEF.length - 1)] || slotDefStart;

            blocks.forEach((lines, bIdx) => {
              const code = lines[0] || 'COURSE';
              const name = lines[1] || code;
              const instructor = lines[2] || 'Lecturer';
              const location = lines[3] || 'TBA';
              let weeksStr = '(Week 1–14)';
              for (const l of lines) {
                if (l.toLowerCase().includes('week') || l.toLowerCase().includes('wk') || l.includes('周')) {
                  weeksStr = l;
                  break;
                }
              }

              const normalizedWeeks = weeksStr.replace(/[—–~～至to\s]+/g, '-').replace(/[^\d,\-]/g, '');
              const weekSet = new Set();
              normalizedWeeks.split(',').forEach(part => {
                const range = part.split('-');
                if (range.length === 2 && !isNaN(range[0]) && !isNaN(range[1])) {
                  for (let w = parseInt(range[0]); w <= parseInt(range[1]); w++) weekSet.add(w);
                } else if (!isNaN(part) && part) {
                  weekSet.add(parseInt(part));
                }
              });
              const weeks = weekSet.size ? Array.from(weekSet).sort((a,b) => a-b) : [1,2,3,4,5,6,7,8,9,10,11,12,13,14];

              courses.push({
                id: `${code}-${dayInfo.dayNum}-${startSlot}-${bIdx}`,
                code,
                name,
                instructor,
                location,
                dayOfWeek: dayInfo.dayNum,
                dayName: dayInfo.dayName,
                startTime: slotDefStart.start,
                endTime: slotDefEnd.end,
                startSlot,
                slotSpan,
                weeks,
                weeksText: weeksStr,
                colorTag: colors[courses.length % colors.length]
              });
            });
          }

          cPointer += colspan;
        }
      }

      return {
        success: courses.length > 0,
        studentName,
        courses
      };
    } catch (e) {
      console.warn('Client HTML parse error:', e);
      return { success: false, error: e.message };
    }
  }

  async function handleHtmlParse() {
    const htmlArea = document.getElementById('htmlInputArea');
    const htmlContent = htmlArea.value.trim();
    if (!htmlContent) {
      showToast('请先粘贴课表网页的 HTML 源码');
      return;
    }

    function applyCourses(parsedData) {
      state.schedule.courses = parsedData.courses;
      if (parsedData.studentName) state.schedule.studentName = parsedData.studentName;
      saveSchedule();
      closeModal(el.syncModal);
      showToast('🎉 成功解析出 ' + parsedData.courses.length + ' 门课程！');
      renderView();
      updateNextClassCard();
    }

    try {
      const response = await fetch('/api/parse_html', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ html: htmlContent })
      });
      const res = await response.json();
      if (res.success && res.courses && res.courses.length > 0) {
        applyCourses(res);
        return;
      }
    } catch (e) {
      console.log('Backend parse unavailable, falling back to client-side DOM parser...');
    }

    // Client-side fallback for offline/mobile standalone operation
    const clientRes = parseTimetableHtmlClient(htmlContent);
    if (clientRes.success && clientRes.courses && clientRes.courses.length > 0) {
      applyCourses(clientRes);
    } else {
      showToast('未能识别到标准课表结构，请确认复制了完整课表源码');
    }
  }

  // 14. Event Listeners Setup
  function setupEventListeners() {
    const on = (element, evt, handler) => {
      if (element) {
        element.addEventListener(evt, handler);
      }
    };

    // AC Sync Modal open/close (Priority listener)
    on(el.syncModalBtn, 'click', () => openModal(el.syncModal));
    on(el.closeSyncModalBtn, 'click', () => closeModal(el.syncModal));
    on(el.syncModal, 'click', (e) => {
      if (e.target === el.syncModal) closeModal(el.syncModal);
    });

    // Update Notice Modal handlers
    on(el.openUpdateNoticeBtn, 'click', () => {
      renderUpdateNoticeModal();
      openModal(el.updateNoticeModal);
    });
    on(el.closeUpdateNoticeBtn, 'click', dismissUpdateNotice);
    on(el.confirmUpdateNoticeBtn, 'click', dismissUpdateNotice);
    on(el.updateNoticeModal, 'click', (e) => {
      if (e.target === el.updateNoticeModal) dismissUpdateNotice();
    });

    // Theme toggle
    on(el.themeToggleBtn, 'click', () => {
      applyTheme(state.theme === 'dark' ? 'light' : 'dark');
    });

    // Semester switcher
    on(el.semesterSelect, 'change', (e) => {
      state.currentSemesterId = e.target.value;
      updateSemesterInfo();
      renderWeekChips();
      renderView();
    });

    // Week navigation buttons
    on(el.prevWeekBtn, 'click', () => {
      selectWeek(state.selectedWeek - 1);
    });

    on(el.nextWeekBtn, 'click', () => {
      selectWeek(state.selectedWeek + 1);
    });

    // Bottom Navigation
    if (el.navItems) {
      el.navItems.forEach(item => {
        item.addEventListener('click', () => {
          if (item.id === 'navSyncModal') {
            openModal(el.syncModal);
            return;
          }
          const view = item.dataset.view;
          if (view) switchView(view);
        });
      });
    }

    // Calendar Year Switcher Tabs
    on(el.calendarYearTabs, 'click', (e) => {
      const tab = e.target.closest('.year-tab');
      if (!tab) return;
      el.calendarYearTabs.querySelectorAll('.year-tab').forEach(t => t.classList.remove('active'));
      tab.classList.add('active');
      state.activeCalendarYear = tab.dataset.year;
      renderAcademicCalendar();
    });

    // Today Jump button
    on(el.todayJumpBtn, 'click', () => {
      goToToday();
    });

    // Add Course placeholder
    on(el.addCustomCourseBtn, 'click', () => {
      showToast('可点击具体课程进行查看与操作');
    });

    // Toggle 5-Day / 7-Day View
    on(el.toggleDaysBtn, 'click', () => {
      state.weekGridDays = (state.weekGridDays === 5 ? 7 : 5);
      renderTimetableGrid();
      showToast(`已切换至 ${state.weekGridDays} 天模式`);
    });

    // Modal internal tabs
    document.querySelectorAll('.modal-tab').forEach(tab => {
      tab.addEventListener('click', () => {
        document.querySelectorAll('.modal-tab').forEach(t => t.classList.remove('active'));
        document.querySelectorAll('.modal-tab-pane').forEach(p => p.classList.remove('active'));
        tab.classList.add('active');
        const target = document.getElementById(tab.dataset.target);
        if (target) target.classList.add('active');
      });
    });

    // Forms & Import Actions
    on(el.unifiedLoginForm, 'submit', handleUnifiedLogin);
    on(el.acLoginForm, 'submit', handleAcLogin);
    on(el.moodleLoginForm, 'submit', handleMoodleLogin);

    // Banner Urgent DDL Quick Jump (最显眼处 -> 课程下方)
    on(el.bannerUrgentDdl, 'click', () => {
      if (state.activeView !== 'dailyAgendaView') {
        switchView('dailyAgendaView');
      }
      if (state.ddlCollapsed) {
        state.ddlCollapsed = false;
        localStorage.setItem('xmum_ddl_collapsed', false);
        renderDeadlines();
      }
      if (el.moodleDdlCard) {
        el.moodleDdlCard.scrollIntoView({ behavior: 'smooth', block: 'center' });
        el.moodleDdlCard.classList.add('pulse-highlight');
        setTimeout(() => el.moodleDdlCard.classList.remove('pulse-highlight'), 1600);
      }
    });

    on(el.quickSyncMoodleBtn, 'click', () => {
      openModal(el.syncModal);
      const unifiedTab = document.querySelector('.modal-tab[data-target="tabUnifiedLogin"]');
      if (unifiedTab) unifiedTab.click();
    });

    on(el.toggleDdlCollapseBtn, 'click', () => {
      state.ddlCollapsed = !state.ddlCollapsed;
      localStorage.setItem('xmum_ddl_collapsed', state.ddlCollapsed);
      renderDeadlines();
    });

    // Moodle Filter Chips
    document.querySelectorAll('.ddl-filter-chip').forEach(chip => {
      chip.addEventListener('click', () => {
        document.querySelectorAll('.ddl-filter-chip').forEach(c => c.classList.remove('active'));
        chip.classList.add('active');
        state.activeDdlFilter = chip.dataset.filter || 'all';
        renderDeadlines();
      });
    });

    // Unified Demo Data (Schedule + Deadlines)
    on(el.loadUnifiedDemoBtn, 'click', () => {
      if (typeof DEFAULT_SCHEDULE !== 'undefined') {
        state.schedule = JSON.parse(JSON.stringify(DEFAULT_SCHEDULE));
        saveSchedule();
        if (el.studentNameDisplay) el.studentNameDisplay.textContent = `Hi, ${state.schedule.studentName}`;
      }
      if (typeof DEFAULT_DEADLINES !== 'undefined') {
        state.deadlines = JSON.parse(JSON.stringify(DEFAULT_DEADLINES));
        saveDeadlines();
      }
      renderView();
      renderDeadlines();
      updateTodayBanner();
      closeModal(el.syncModal);
      showToast('🎉 成功载入全套演示数据 (课表 + 作业待办)！');
    });

    // Clear All User Data
    on(el.clearAllUserDataBtn, 'click', () => {
      state.schedule = { courses: [] };
      state.deadlines = [];
      saveSchedule();
      saveDeadlines();
      renderView();
      renderDeadlines();
      updateTodayBanner();
      closeModal(el.syncModal);
      showToast('已清空全部课表与作业数据');
    });

    // Load Demo Deadlines
    on(el.loadDemoDeadlinesBtn, 'click', () => {
      if (typeof DEFAULT_DEADLINES !== 'undefined') {
        state.deadlines = JSON.parse(JSON.stringify(DEFAULT_DEADLINES));
        saveDeadlines();
        renderDeadlines();
        closeModal(el.syncModal);
        showToast('🎉 成功载入 Moodle 待办演示数据！');
      }
    });

    // Clear Deadlines
    on(el.clearDeadlinesBtn, 'click', () => {
      state.deadlines = [];
      saveDeadlines();
      renderDeadlines();
      closeModal(el.syncModal);
      showToast('已清空全部待办列表');
    });

    // Two-way credential sync between all tabs (Unified, AC, Moodle)
    const usernameInputs = [el.unifiedUsername, el.acUsername, el.moodleUsername].filter(Boolean);
    usernameInputs.forEach(input => {
      input.addEventListener('input', () => {
        const val = input.value;
        usernameInputs.forEach(other => {
          if (other !== input) other.value = val;
        });
      });
    });

    const passwordInputs = [el.unifiedPassword, el.acPassword, el.moodlePassword].filter(Boolean);
    passwordInputs.forEach(input => {
      input.addEventListener('input', () => {
        const val = input.value;
        passwordInputs.forEach(other => {
          if (other !== input) other.value = val;
        });
      });
    });

    if (el.unifiedSemester && el.acSemester) {
      el.unifiedSemester.addEventListener('change', () => {
        el.acSemester.value = el.unifiedSemester.value;
      });
      el.acSemester.addEventListener('change', () => {
        el.unifiedSemester.value = el.acSemester.value;
      });
    }

    on(el.parseHtmlBtn, 'click', handleHtmlParse);
    on(el.loadDemoBtn, 'click', () => {
      state.schedule = JSON.parse(JSON.stringify(DEFAULT_SCHEDULE));
      saveSchedule();
      if (el.studentNameDisplay) el.studentNameDisplay.textContent = `Hi, ${state.schedule.studentName}`;
      closeModal(el.syncModal);
      showToast('已载入通用演示课表');
      renderView();
      updateNextClassCard();
    });

    // ICS Export Button
    on(el.exportIcsBtn, 'click', exportScheduleToIcs);

    // Detail Modal Close
    on(el.closeDetailModalBtn, 'click', closeCourseDetail);
    on(el.courseDetailModal, 'click', (e) => {
      if (e.target === el.courseDetailModal) closeCourseDetail();
    });

    // Copy location
    on(el.copyLocationBtn, 'click', () => {
      if (state.selectedCourse) {
        navigator.clipboard?.writeText(state.selectedCourse.location);
        showToast(`已复制教室代码: ${state.selectedCourse.location}`);
      }
    });

    // Safe Delete Course: open confirmation modal
    on(el.deleteCourseBtn, 'click', () => {
      if (state.selectedCourse) {
        openDeleteConfirmModal(state.selectedCourse);
      }
    });

    // Delete Option 1: Single week cancel
    on(el.confirmDeleteWeekBtn, 'click', () => {
      if (state.pendingDeleteCourse) {
        deleteCourseSingleWeek(state.pendingDeleteCourse);
      }
    });

    // Delete Option 2: Full semester delete
    on(el.confirmDeleteAllBtn, 'click', () => {
      if (state.pendingDeleteCourse) {
        deleteCourseFullSemester(state.pendingDeleteCourse);
      }
    });

    // Cancel deletion buttons
    on(el.cancelDeleteBtn, 'click', closeDeleteConfirmModal);
    on(el.closeDeleteModalBtn, 'click', closeDeleteConfirmModal);
    on(el.deleteConfirmModal, 'click', (e) => {
      if (e.target === el.deleteConfirmModal) closeDeleteConfirmModal();
    });

    // Recycle Bin open / close
    on(el.recycleBinBtn, 'click', openRecycleBinModal);
    on(el.recycleBinPillBtn, 'click', openRecycleBinModal);
    on(el.closeRecycleModalBtn, 'click', closeRecycleBinModal);
    on(el.recycleBinModal, 'click', (e) => {
      if (e.target === el.recycleBinModal) closeRecycleBinModal();
    });

    // Restore all default courses
    if (el.restoreDefaultCoursesBtn) {
      el.restoreDefaultCoursesBtn.addEventListener('click', restoreDefaultCourses);
    }

    // Save Course Notes
    const saveNotesBtn = document.getElementById('saveNotesBtn');
    if (saveNotesBtn) {
      saveNotesBtn.addEventListener('click', () => {
        if (!state.selectedCourse) return;
        const notesVal = document.getElementById('courseNotesInput').value.trim();
        state.selectedCourse.notes = notesVal;
        saveSchedule();
        renderView();
        updateNextClassCard();
        showToast('📝 课程专属备注已保存！');
      });
    }

    // Toggle Reschedule Form Accordion
    const toggleRescheduleHeader = document.getElementById('toggleRescheduleHeader');
    const toggleRescheduleBtn = document.getElementById('toggleRescheduleBtn');
    const rescheduleFormBody = document.getElementById('rescheduleFormBody');
    function toggleReschedule() {
      const isHidden = rescheduleFormBody.classList.contains('hidden');
      if (isHidden) {
        rescheduleFormBody.classList.remove('hidden');
        toggleRescheduleBtn.textContent = '收起调课设置 ▴';
      } else {
        rescheduleFormBody.classList.add('hidden');
        toggleRescheduleBtn.textContent = '展开调课设置 ▾';
      }
    }
    if (toggleRescheduleBtn) toggleRescheduleBtn.addEventListener('click', toggleReschedule);
    if (toggleRescheduleHeader) toggleRescheduleHeader.addEventListener('click', (e) => {
      if (e.target !== toggleRescheduleBtn) toggleReschedule();
    });

    // Realtime preview listeners
    ['rescheduleDay', 'rescheduleSlot', 'rescheduleDuration'].forEach(id => {
      const field = document.getElementById(id);
      if (field) {
        field.addEventListener('change', updateReschedulePreview);
      }
    });

    // Confirm Rescheduling
    const confirmRescheduleBtn = document.getElementById('confirmRescheduleBtn');
    if (confirmRescheduleBtn) {
      confirmRescheduleBtn.addEventListener('click', () => {
        if (!state.selectedCourse) return;
        const newDay = parseInt(document.getElementById('rescheduleDay').value);
        const newSlot = parseInt(document.getElementById('rescheduleSlot').value);
        const newDuration = parseInt(document.getElementById('rescheduleDuration').value) || 2;
        const newRoom = document.getElementById('rescheduleRoom').value.trim();
        const scope = document.getElementById('rescheduleScope').value;
        const reason = document.getElementById('rescheduleReason').value.trim() || '课程调课补课';

        const timeRange = calculateCourseTimeRange(newSlot, newDuration);
        const startTime = timeRange.startTime;
        const endTime = timeRange.endTime;

        if (scope === 'all') {
          // Preserve original info if first time
          if (!state.selectedCourse.originalInfo) {
            state.selectedCourse.originalInfo = {
              dayOfWeek: state.selectedCourse.dayOfWeek,
              startSlot: state.selectedCourse.startSlot,
              slotSpan: state.selectedCourse.slotSpan || 2,
              startTime: state.selectedCourse.startTime,
              endTime: state.selectedCourse.endTime,
              location: state.selectedCourse.location
            };
          }
          state.selectedCourse.dayOfWeek = newDay;
          state.selectedCourse.dayName = DAY_NAMES[newDay - 1];
          state.selectedCourse.startSlot = newSlot;
          state.selectedCourse.slotSpan = newDuration;
          state.selectedCourse.startTime = startTime;
          state.selectedCourse.endTime = endTime;
          if (newRoom) state.selectedCourse.location = newRoom;
          state.selectedCourse.isRescheduled = true;
          state.selectedCourse.rescheduleReason = reason;
        } else {
          // Single-week override
          if (!state.selectedCourse.weekOverrides) {
            state.selectedCourse.weekOverrides = {};
          }
          state.selectedCourse.weekOverrides[state.selectedWeek] = {
            dayOfWeek: newDay,
            startSlot: newSlot,
            slotSpan: newDuration,
            startTime: startTime,
            endTime: endTime,
            location: newRoom || state.selectedCourse.location,
            reason: reason
          };
        }

        saveSchedule();
        closeCourseDetail();
        renderView();
        updateNextClassCard();
        showToast(`🔄 课程已调至${DAY_ZH[newDay - 1]} ${startTime}-${endTime} (共${newDuration}小时)！`);
      });
    }

    // Restore Original Course
    const restoreOriginalCourseBtn = document.getElementById('restoreOriginalCourseBtn');
    if (restoreOriginalCourseBtn) {
      restoreOriginalCourseBtn.addEventListener('click', () => {
        if (!state.selectedCourse) return;
        // Clear week override for selected week if any
        if (state.selectedCourse.weekOverrides && state.selectedCourse.weekOverrides[state.selectedWeek]) {
          delete state.selectedCourse.weekOverrides[state.selectedWeek];
        }
        // If globally rescheduled, restore originalInfo
        if (state.selectedCourse.originalInfo) {
          state.selectedCourse.dayOfWeek = state.selectedCourse.originalInfo.dayOfWeek;
          state.selectedCourse.dayName = DAY_NAMES[state.selectedCourse.originalInfo.dayOfWeek - 1];
          state.selectedCourse.startSlot = state.selectedCourse.originalInfo.startSlot;
          state.selectedCourse.slotSpan = state.selectedCourse.originalInfo.slotSpan || 2;
          state.selectedCourse.startTime = state.selectedCourse.originalInfo.startTime;
          state.selectedCourse.endTime = state.selectedCourse.originalInfo.endTime;
          state.selectedCourse.location = state.selectedCourse.originalInfo.location;
          state.selectedCourse.isRescheduled = false;
          delete state.selectedCourse.originalInfo;
          delete state.selectedCourse.rescheduleReason;
        }
        saveSchedule();
        closeCourseDetail();
        renderView();
        updateNextClassCard();
        showToast('已恢复为初始课程时间与地点！');
      });
    }

    // 14. Real-time dynamic updates (Every 30 seconds & on tab focus/visibility change)
    setInterval(() => {
      updateTodayBanner();
      if (state.activeView === 'dailyAgendaView') {
        renderDailyAgenda();
      }
    }, 30000);

    document.addEventListener('visibilitychange', () => {
      if (!document.hidden) {
        updateTodayBanner();
        if (state.activeView === 'dailyAgendaView') {
          renderDailyAgenda();
        }
      }
    });

    window.addEventListener('focus', () => {
      updateTodayBanner();
      if (state.activeView === 'dailyAgendaView') {
        renderDailyAgenda();
      }
    });
  }

  // Run on DOM Ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
