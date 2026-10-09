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
    activeView: 'weeklyGridView',
    activeCalendarYear: '2026',
    schedule: null,
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
    navItems: document.querySelectorAll('.bottom-nav .nav-item')
  };

  // 1. Initializer
  function init() {
    loadSavedSchedule();
    applyTheme(state.theme);
    initRealToday();
    setupEventListeners();
    updateSemesterInfo();
    renderWeekChips();
    renderDayTabs();
    renderView();
    renderCalendarMilestones();
    renderAcademicCalendar();
    updateRecycleCountBadge();

    // Register Service Worker for offline mobile app support
    if ('serviceWorker' in navigator && window.location.protocol.startsWith('http')) {
      window.addEventListener('load', () => {
        navigator.serviceWorker.register('sw.js').catch(err => {
          console.log('SW registration note:', err);
        });
      });
    }
  }

  // 2. Storage & State Management
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

    // Clean up mock placeholder courses from both deleted list and active list
    const mockIds = new Set(['CST310-1', 'SWE305-1', 'MKT201-1']);
    const mockCodes = new Set(['CST310*', 'SWE305*', 'MKT201*', 'CST310', 'SWE305', 'MKT201']);

    let changed = false;
    if (state.schedule.courses && Array.isArray(state.schedule.courses)) {
      const origCount = state.schedule.courses.length;
      state.schedule.courses = state.schedule.courses.filter(c => 
        !mockIds.has(c.id) && !mockCodes.has(c.code)
      );
      if (state.schedule.courses.length !== origCount) changed = true;
    }

    if (!state.schedule.deletedCourses) {
      state.schedule.deletedCourses = [];
    } else {
      const beforeLen = state.schedule.deletedCourses.length;
      state.schedule.deletedCourses = state.schedule.deletedCourses.filter(d => 
        !d.isMissingDefault && 
        !mockIds.has(d.id) && 
        !mockIds.has(d.courseId) &&
        !mockCodes.has(d.code)
      );
      if (beforeLen !== state.schedule.deletedCourses.length) changed = true;
    }

    if (changed) {
      saveSchedule();
    }

    if (state.schedule && state.schedule.studentName) {
      el.studentNameDisplay.textContent = `Hi, ${state.schedule.studentName}`;
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
            if (state.schedule.studentName) {
              el.studentNameDisplay.textContent = `Hi, ${state.schedule.studentName}`;
            }
            if (state.schedule.semester) {
              state.currentSemesterId = state.schedule.semester;
              if (el.semesterSelect) el.semesterSelect.value = state.currentSemesterId;
            }
            renderView();
            updateNextClassCard();
            updateRecycleCountBadge();
          }
        }
      }
    } catch (e) {
      console.warn('Could not sync schedule from server:', e);
    }
  }

  function saveSchedule() {
    if (state.schedule) {
      localStorage.setItem('xmum_schedule_data', JSON.stringify(state.schedule));
      updateRecycleCountBadge();

      // Background persist to server disk
      fetch('/api/save_schedule', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(state.schedule)
      }).catch(err => console.warn('Failed to persist schedule to server:', err));
    }
  }

  // 3. Theme
  function applyTheme(theme) {
    state.theme = theme;
    localStorage.setItem('xmum_theme', theme);
    if (theme === 'light') {
      el.body.classList.remove('theme-dark');
      el.body.classList.add('theme-light');
      el.themeToggleBtn.querySelector('.theme-icon').textContent = '☀️';
    } else {
      el.body.classList.remove('theme-light');
      el.body.classList.add('theme-dark');
      el.themeToggleBtn.querySelector('.theme-icon').textContent = '🌙';
    }
    const metaTheme = document.getElementById('metaThemeColor');
    if (metaTheme) metaTheme.content = (theme === 'light') ? '#f8fafc' : '#0f172a';
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
    const curYear = today.getFullYear();
    // Default to Oct 8, 2026 (Thursday) if local device date is before 2026
    const curDateStr = curYear < 2026 ? "2026-10-08" : formatLocalDate(today);
    state.realTodayDateStr = curDateStr;

    const parts = curDateStr.split('-');
    const dateObj = new Date(parseInt(parts[0]), parseInt(parts[1]) - 1, parseInt(parts[2]), 12, 0, 0);
    const dayIndex = dateObj.getDay() === 0 ? 7 : dateObj.getDay();
    state.realTodayDay = dayIndex;

    const sem = getCurrentSemesterData();
    let currentWk = 2;
    if (sem && sem.weeks) {
      for (const w of sem.weeks) {
        if (curDateStr >= w.start && curDateStr <= w.end) {
          currentWk = w.week;
          break;
        }
      }
    }
    state.realTodayWeek = currentWk;
    state.selectedWeek = currentWk;
    state.selectedDay = dayIndex;
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

      if (el.nextClassLabel) {
        el.nextClassLabel.textContent = '⏰ 今日课程 / 下一节课';
      }

      // Today courses
      const todayCourses = (state.schedule?.courses || [])
        .filter(c => c.weeks && c.weeks.includes(state.realTodayWeek))
        .map(c => getEffectiveCourseForWeek(c, state.realTodayWeek))
        .filter(c => c.dayOfWeek === state.realTodayDay)
        .sort((a, b) => a.startSlot - b.startSlot);

      if (todayCourses.length > 0) {
        const nextCourse = todayCourses[0];
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
      chip.className = `week-chip ${isSelected ? 'active' : ''} ${isCurrentWeek ? 'is-current-week-chip' : ''}`;
      
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
    const cornerTh = document.createElement('div');
    cornerTh.className = 'grid-cell-header';
    cornerTh.style.gridColumn = '1';
    cornerTh.style.gridRow = '1';
    cornerTh.textContent = '时间';
    el.timetableGrid.appendChild(cornerTh);

    // 7 Day Headers with Holiday Indicator
    for (let d = 1; d <= 7; d++) {
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

    // 2. Render background grid: Time labels in Col 1, and 7 Empty slots for every row
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

      // 7 Day Empty Slot Cells (Col 2..8, Row rowIdx)
      for (let day = 1; day <= 7; day++) {
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
      const holInfo = weekHolidays[course.dayOfWeek] || {};

      const courseCard = document.createElement('div');
      courseCard.className = 'course-card-block';
      const col = course.dayOfWeek + 1; // 1 -> Col 2 (Mon) ... 7 -> Col 8 (Sun)
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

      const courseStart = course.startTime || (TIME_SLOTS_DEF[course.startSlot - 1] ? TIME_SLOTS_DEF[course.startSlot - 1].start : '');
      const courseEnd = course.endTime || (TIME_SLOTS_DEF[course.startSlot + (course.slotSpan || 1) - 2] ? TIME_SLOTS_DEF[course.startSlot + (course.slotSpan || 1) - 2].end : '');
      const timeDisplayHtml = (courseStart && courseEnd)
        ? `<div class="course-card-time">🕒 ${courseStart} - ${courseEnd}</div>`
        : '';

      courseCard.innerHTML = `
        <div>
          <div class="course-code">${course.code}</div>
          <div class="course-title">${course.name}</div>
          ${timeDisplayHtml}
          ${badgesHtml}
          ${holidayAlertHtml}
        </div>
        <div class="course-room">${course.location}</div>
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
    const currentWeekInfo = sem?.weeks.find(w => w.week === state.selectedWeek);
    const dayDateStr = getDayDateString(currentWeekInfo, state.selectedDay);
    const dayHoliday = getHolidayForDate(dayDateStr);

    const todayCourses = (state.schedule?.courses || [])
      .filter(c => c.weeks && c.weeks.includes(state.selectedWeek))
      .map(c => getEffectiveCourseForWeek(c, state.selectedWeek))
      .filter(c => c.dayOfWeek === state.selectedDay)
      .sort((a, b) => a.startSlot - b.startSlot);

    // Update active tab in dayTabs
    el.dayTabsContainer.querySelectorAll('.day-tab').forEach(tab => {
      const tabDay = parseInt(tab.dataset.day);
      tab.classList.toggle('active', tabDay === state.selectedDay);
    });

    el.dailyAgendaList.innerHTML = '';

    const isRealToday = (state.selectedWeek === state.realTodayWeek && state.selectedDay === state.realTodayDay);

    // If day is a public holiday, display prominent holiday banner
    if (dayHoliday) {
      const holCard = document.createElement('div');
      holCard.className = 'daily-holiday-banner';
      holCard.innerHTML = `
        <span class="holiday-icon">🎉</span>
        <div>
          <h4>${isRealToday ? '今日' : `${DAY_ZH[state.selectedDay - 1]}`}为法定公休日：${dayHoliday.name} (${dayDateStr})</h4>
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
        <h3>第 ${state.selectedWeek} 周 ${DAY_ZH[state.selectedDay - 1]} (${dayDateStr || ''}) 无课程</h3>
        <p>${dayHoliday ? '法定假期休假，无常规课程！' : '这一天没有任何课，可以自习或休息放松一下！'}</p>
      `;
      el.dailyAgendaList.appendChild(emptyDiv);
      return;
    }

    todayCourses.forEach(c => {
      const card = document.createElement('div');
      card.className = 'daily-course-card';
      
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
          <span class="course-code-badge" style="background:${c.colorTag || '#3b82f6'}">${c.code}</span>
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

    el.courseDetailModal.classList.add('open');
  }

  function closeCourseDetail() {
    el.courseDetailModal.classList.remove('open');
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
    el.deleteConfirmModal.classList.add('open');
  }

  function closeDeleteConfirmModal() {
    state.pendingDeleteCourse = null;
    el.deleteConfirmModal.classList.remove('open');
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
    el.recycleBinModal.classList.add('open');
  }

  function closeRecycleBinModal() {
    el.recycleBinModal.classList.remove('open');
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
      const response = await fetch('/api/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password, semester })
      });

      const res = await response.json();
      if (res.success && res.courses && res.courses.length > 0) {
        state.schedule = {
          studentName: res.studentName || username,
          studentId: username,
          semester: semester,
          lastUpdated: new Date().toISOString(),
          courses: res.courses
        };
        saveSchedule();
        el.studentNameDisplay.textContent = `Hi, ${state.schedule.studentName}`;
        el.syncModal.classList.remove('open');
        showToast('🎉 AC 课表同步成功！已载入最新课程。');
        renderView();
        updateNextClassCard();
      } else {
        statusMsg.textContent = res.error || '未能在该学期找到课表或登录未通过';
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
          const lines = cellText.split('\n').map(l => l.trim()).filter(Boolean);

          if (dayInfo && lines.length >= 1) {
            const code = lines[0] || 'COURSE';
            const name = lines[1] || code;
            const instructor = lines[2] || 'Lecturer';
            const location = lines[3] || 'TBA';
            let weeksStr = lines[4] || '(Week 1–14)';
            for (const l of lines) {
              if (l.toLowerCase().includes('week') || l.toLowerCase().includes('wk')) {
                weeksStr = l;
                break;
              }
            }

            const cleanWeeks = weeksStr.replace(/[^\d,\-–]/g, '');
            const weekSet = new Set();
            cleanWeeks.split(',').forEach(part => {
              const range = part.split(/[\-–]/);
              if (range.length === 2 && !isNaN(range[0]) && !isNaN(range[1])) {
                for (let w = parseInt(range[0]); w <= parseInt(range[1]); w++) weekSet.add(w);
              } else if (!isNaN(part) && part) {
                weekSet.add(parseInt(part));
              }
            });
            const weeks = weekSet.size ? Array.from(weekSet).sort((a,b) => a-b) : [1,2,3,4,5,6,7,8,9,10,11,12,13,14];

            const startSlot = rIdx;
            const slotSpan = rowspan;
            const slotDefStart = TIME_SLOTS_DEF[startSlot - 1] || TIME_SLOTS_DEF[0];
            const slotDefEnd = TIME_SLOTS_DEF[Math.min(startSlot + slotSpan - 2, TIME_SLOTS_DEF.length - 1)] || slotDefStart;

            courses.push({
              id: `${code}-${dayInfo.dayNum}-${startSlot}`,
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
      el.syncModal.classList.remove('open');
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
    // Theme toggle
    el.themeToggleBtn.addEventListener('click', () => {
      applyTheme(state.theme === 'dark' ? 'light' : 'dark');
    });

    // Semester switcher
    el.semesterSelect.addEventListener('change', (e) => {
      state.currentSemesterId = e.target.value;
      updateSemesterInfo();
      renderWeekChips();
      renderView();
    });

    // Week navigation buttons
    el.prevWeekBtn.addEventListener('click', () => {
      selectWeek(state.selectedWeek - 1);
    });

    el.nextWeekBtn.addEventListener('click', () => {
      selectWeek(state.selectedWeek + 1);
    });

    // Bottom Navigation
    el.navItems.forEach(item => {
      item.addEventListener('click', () => {
        if (item.id === 'navSyncModal') {
          el.syncModal.classList.add('open');
          return;
        }
        const view = item.dataset.view;
        if (view) switchView(view);
      });
    });

    // Calendar Year Switcher Tabs
    el.calendarYearTabs.addEventListener('click', (e) => {
      const tab = e.target.closest('.year-tab');
      if (!tab) return;
      el.calendarYearTabs.querySelectorAll('.year-tab').forEach(t => t.classList.remove('active'));
      tab.classList.add('active');
      state.activeCalendarYear = tab.dataset.year;
      renderAcademicCalendar();
    });

    // Today Jump button
    el.todayJumpBtn.addEventListener('click', () => {
      goToToday();
    });

    // Add Course placeholder
    el.addCustomCourseBtn.addEventListener('click', () => {
      showToast('可点击具体课程进行查看与操作');
    });

    // Sync Modal open/close
    el.syncModalBtn.addEventListener('click', () => el.syncModal.classList.add('open'));
    el.closeSyncModalBtn.addEventListener('click', () => el.syncModal.classList.remove('open'));
    el.syncModal.addEventListener('click', (e) => {
      if (e.target === el.syncModal) el.syncModal.classList.remove('open');
    });

    // Modal internal tabs
    document.querySelectorAll('.modal-tab').forEach(tab => {
      tab.addEventListener('click', () => {
        document.querySelectorAll('.modal-tab').forEach(t => t.classList.remove('active'));
        document.querySelectorAll('.modal-tab-pane').forEach(p => p.classList.remove('active'));
        tab.classList.add('active');
        document.getElementById(tab.dataset.target).classList.add('active');
      });
    });

    // Forms & Import Actions
    el.acLoginForm.addEventListener('submit', handleAcLogin);
    el.parseHtmlBtn.addEventListener('click', handleHtmlParse);
    el.loadDemoBtn.addEventListener('click', () => {
      state.schedule = JSON.parse(JSON.stringify(DEFAULT_SCHEDULE));
      saveSchedule();
      el.studentNameDisplay.textContent = `Hi, ${state.schedule.studentName}`;
      el.syncModal.classList.remove('open');
      showToast('已载入通用演示课表');
      renderView();
      updateNextClassCard();
    });

    // ICS Export Button
    el.exportIcsBtn.addEventListener('click', exportScheduleToIcs);

    // Detail Modal Close
    el.closeDetailModalBtn.addEventListener('click', closeCourseDetail);
    el.courseDetailModal.addEventListener('click', (e) => {
      if (e.target === el.courseDetailModal) closeCourseDetail();
    });

    // Copy location
    el.copyLocationBtn.addEventListener('click', () => {
      if (state.selectedCourse) {
        navigator.clipboard?.writeText(state.selectedCourse.location);
        showToast(`已复制教室代码: ${state.selectedCourse.location}`);
      }
    });

    // Safe Delete Course: open confirmation modal
    el.deleteCourseBtn.addEventListener('click', () => {
      if (state.selectedCourse) {
        openDeleteConfirmModal(state.selectedCourse);
      }
    });

    // Delete Option 1: Single week cancel
    if (el.confirmDeleteWeekBtn) {
      el.confirmDeleteWeekBtn.addEventListener('click', () => {
        if (state.pendingDeleteCourse) {
          deleteCourseSingleWeek(state.pendingDeleteCourse);
        }
      });
    }

    // Delete Option 2: Full semester delete
    if (el.confirmDeleteAllBtn) {
      el.confirmDeleteAllBtn.addEventListener('click', () => {
        if (state.pendingDeleteCourse) {
          deleteCourseFullSemester(state.pendingDeleteCourse);
        }
      });
    }

    // Cancel deletion buttons
    if (el.cancelDeleteBtn) el.cancelDeleteBtn.addEventListener('click', closeDeleteConfirmModal);
    if (el.closeDeleteModalBtn) el.closeDeleteModalBtn.addEventListener('click', closeDeleteConfirmModal);
    if (el.deleteConfirmModal) {
      el.deleteConfirmModal.addEventListener('click', (e) => {
        if (e.target === el.deleteConfirmModal) closeDeleteConfirmModal();
      });
    }

    // Recycle Bin open / close
    if (el.recycleBinBtn) el.recycleBinBtn.addEventListener('click', openRecycleBinModal);
    if (el.recycleBinPillBtn) el.recycleBinPillBtn.addEventListener('click', openRecycleBinModal);
    if (el.closeRecycleModalBtn) el.closeRecycleModalBtn.addEventListener('click', closeRecycleBinModal);
    if (el.recycleBinModal) {
      el.recycleBinModal.addEventListener('click', (e) => {
        if (e.target === el.recycleBinModal) closeRecycleBinModal();
      });
    }

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
  }

  // Run on DOM Ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
