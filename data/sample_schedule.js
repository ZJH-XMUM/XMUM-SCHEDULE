/**
 * Generic Demo Schedule for XMUM Schedule Hub
 * Student: 示例同学 | Semester: 2026/09
 */

const DEFAULT_SCHEDULE = {
  studentName: "示例同学",
  studentId: "DEMO2026",
  semester: "2026/09",
  lastUpdated: "2026-10-08T12:00:00",
  courses: [
    {
      id: "DEMO101-1",
      code: "SWE101",
      name: "Introduction to Computing",
      instructor: "Prof. Sample",
      location: "A1#101",
      dayOfWeek: 1,
      dayName: "Monday",
      startTime: "09:00",
      endTime: "11:00",
      startSlot: 2,
      slotSpan: 2,
      weeks: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14],
      weeksText: "Week 1–14",
      colorTag: "#3b82f6"
    },
    {
      id: "DEMO102-1",
      code: "MAT101",
      name: "Calculus I",
      instructor: "Dr. Example",
      location: "A2#201",
      dayOfWeek: 2,
      dayName: "Tuesday",
      startTime: "14:00",
      endTime: "16:00",
      startSlot: 7,
      slotSpan: 2,
      weeks: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14],
      weeksText: "Week 1–14",
      colorTag: "#10b981"
    }
  ],
  deletedCourses: [],
  rescheduledCourses: {}
};

const DEFAULT_DEADLINES = [
  {
    id: "moodle-demo-1",
    title: "Assignment 1: System Architecture & UML Design",
    courseCode: "SWE305",
    courseName: "Object-Oriented Analysis and Design",
    dueDate: "2026-10-15",
    dueTime: "23:59",
    dueTimestamp: 1792089540,
    type: "assign",
    url: "https://l.xmu.edu.my/my/",
    overdue: false,
    daysRemaining: 2,
    completed: false
  },
  {
    id: "moodle-demo-2",
    title: "Quiz 2: Operating System Virtual Memory & Paging",
    courseCode: "CST310",
    courseName: "Operating Systems",
    dueDate: "2026-10-18",
    dueTime: "20:00",
    dueTimestamp: 1792334400,
    type: "quiz",
    url: "https://l.xmu.edu.my/my/",
    overdue: false,
    daysRemaining: 5,
    completed: false
  },
  {
    id: "moodle-demo-3",
    title: "Mini-Project Proposal & Milestone 1 Submission",
    courseCode: "SWE305",
    courseName: "Object-Oriented Analysis and Design",
    dueDate: "2026-10-25",
    dueTime: "23:59",
    dueTimestamp: 1792953540,
    type: "assign",
    url: "https://l.xmu.edu.my/my/",
    overdue: false,
    daysRemaining: 12,
    completed: false
  }
];

if (typeof window !== 'undefined') {
  window.DEFAULT_SCHEDULE = DEFAULT_SCHEDULE;
  window.DEFAULT_DEADLINES = DEFAULT_DEADLINES;
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { DEFAULT_SCHEDULE, DEFAULT_DEADLINES };
}
