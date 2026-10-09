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

if (typeof module !== 'undefined' && module.exports) {
  module.exports = DEFAULT_SCHEDULE;
}
