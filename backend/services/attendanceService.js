const crypto = require("crypto");
const mongoose = require("mongoose");
const Attendance = require("../models/Attendance");
const User = require("../models/User");
const Leave = require("../models/Leave");
const Shift = require("../models/Shift");
const Holiday = require("../models/Holiday");
const { emitAttendanceEvent } = require("../utils/socket");
const { POPULATE_SKIP_TENANT } = require("../utils/tenantQuery");

// Below this many minutes worked in a day, a present employee is counted as "Half Day".
const HALF_DAY_THRESHOLD_MINUTES = 240;
// "Employees" tracked on the attendance dashboard are regular staff (role "user") only —
// admins, HR, sales, and clients are excluded from headcount/present/absent/leave counts.
const EMPLOYEE_ROLES = ["user"];

const ATTENDANCE_STATUS = {
  ACTIVE: "Active",
  OFFLINE: "Offline",
};

// Login tokens expire after 1 day, so a session left "Active" longer than that
// was never properly logged out (closed tab, crashed browser, etc).
const STALE_SESSION_MS = 24 * 60 * 60 * 1000;

const closeStaleActiveSessions = async (tenantId) => {
  const staleCutoff = new Date(Date.now() - STALE_SESSION_MS);
  const staleSessions = await Attendance.find({
    tenantId,
    status: ATTENDANCE_STATUS.ACTIVE,
    loginTime: { $lte: staleCutoff },
  });

  await Promise.all(
    staleSessions.map((session) => {
      const logoutTime = new Date(session.loginTime.getTime() + STALE_SESSION_MS);
      session.logoutTime = logoutTime;
      session.status = ATTENDANCE_STATUS.OFFLINE;
      computeSessionTotal(session, logoutTime);
      return session.save();
    })
  );
};

const formatServerDate = (date = new Date()) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

const startOfDay = (date) => {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
};

const endOfDay = (date) => {
  const d = new Date(date);
  d.setHours(23, 59, 59, 999);
  return d;
};

const dateFromYmd = (ymd) => {
  const [year, month, day] = ymd.split("-").map(Number);
  return new Date(year, month - 1, day, 0, 0, 0, 0);
};

const diffMinutes = (start, end) => {
  if (!start || !end) return 0;
  const ms = new Date(end).getTime() - new Date(start).getTime();
  return Math.max(0, Math.round(ms / 60000));
};

const overlapMinutes = (sessionStart, sessionEnd, windowStart, windowEnd) => {
  const start = Math.max(new Date(sessionStart).getTime(), new Date(windowStart).getTime());
  const end = Math.min(new Date(sessionEnd).getTime(), new Date(windowEnd).getTime());
  if (end <= start) return 0;
  return Math.max(0, Math.round((end - start) / 60000));
};

const getSessionEnd = (row, now = new Date()) => {
  if (row.status === ATTENDANCE_STATUS.ACTIVE) return now;
  return row.logoutTime ? new Date(row.logoutTime) : now;
};

const getDayLateData = async (userId, loginTime, tenantId) => {
  const date = formatServerDate(loginTime);
  const existingSessions = await Attendance.countDocuments({ tenantId, userId, date });

  // Only first login of day should be considered for late.
  if (existingSessions > 0) {
    return { isLate: false, lateByMinutes: 0 };
  }

  // Use shift start time when the user has an assigned shift; otherwise fall back to 10:00.
  const threshold = new Date(loginTime);
  try {
    const user = await User.findById(userId).select("shiftId").setOptions({ skipTenantScope: true });
    if (user?.shiftId) {
      const shift = await Shift.findById(user.shiftId).select("startHour startMinute").setOptions({ skipTenantScope: true });
      if (shift) {
        threshold.setHours(shift.startHour, shift.startMinute, 0, 0);
      } else {
        threshold.setHours(10, 0, 0, 0);
      }
    } else {
      threshold.setHours(10, 0, 0, 0);
    }
  } catch {
    threshold.setHours(10, 0, 0, 0);
  }

  if (loginTime <= threshold) {
    return { isLate: false, lateByMinutes: 0 };
  }

  return {
    isLate: true,
    lateByMinutes: diffMinutes(threshold, loginTime),
  };
};

const normalizeStatus = (status) => {
  return status === ATTENDANCE_STATUS.ACTIVE ? ATTENDANCE_STATUS.ACTIVE : ATTENDANCE_STATUS.OFFLINE;
};

const computeSessionTotal = (record, referenceLogoutTime = null) => {
  const sessionEnd = referenceLogoutTime || record.logoutTime;
  record.totalSessionTime = diffMinutes(record.loginTime, sessionEnd);
  return record;
};

const toObjectId = (value) => {
  if (!value) return null;
  if (value instanceof mongoose.Types.ObjectId) return value;
  if (mongoose.Types.ObjectId.isValid(value)) return new mongoose.Types.ObjectId(value);
  return null;
};

// Attendance list/export/"All Users" filter should only ever surface real staff —
// admins are excluded (already established), and client-portal logins (role
// "client") are excluded too, since a client signing into their project portal
// is not an employee clocking in/out.
const NON_EMPLOYEE_ROLES = ["admin", "client"];

const getNonEmployeeIds = async (tenantId) => {
  const nonEmployees = await User.find({ tenantId, role: { $in: NON_EMPLOYEE_ROLES } }).select("_id");
  return nonEmployees.map((item) => item._id);
};

const closePreviousActiveSession = async (userId, closeTime, tenantId) => {
  const activeSession = await Attendance.findOne({
    tenantId,
    userId,
    status: ATTENDANCE_STATUS.ACTIVE,
  }).sort({ loginTime: -1 });

  if (!activeSession) return null;

  activeSession.logoutTime = closeTime;
  activeSession.status = ATTENDANCE_STATUS.OFFLINE;
  computeSessionTotal(activeSession, closeTime);

  await activeSession.save();

  emitAttendanceEvent("attendance:auto-offline", {
    userId: String(userId),
    attendanceId: String(activeSession._id),
    sessionId: activeSession.sessionId,
  });

  return activeSession;
};

const createLoginAttendance = async (userId, tenantId) => {
  const loginTime = new Date();

  await closePreviousActiveSession(userId, loginTime, tenantId);

  const { isLate, lateByMinutes } = await getDayLateData(userId, loginTime, tenantId);
  const record = await Attendance.create({
    tenantId,
    userId,
    sessionId: crypto.randomUUID(),
    loginTime,
    logoutTime: null,
    date: formatServerDate(loginTime),
    status: ATTENDANCE_STATUS.ACTIVE,
    isLate,
    lateByMinutes,
  });

  emitAttendanceEvent("attendance:login", {
    userId: String(userId),
    attendanceId: String(record._id),
    sessionId: record.sessionId,
  });

  return record;
};

const logoutAttendance = async (userId, tenantId) => {
  const record = await Attendance.findOne({
    tenantId,
    userId,
    status: ATTENDANCE_STATUS.ACTIVE,
  }).sort({ loginTime: -1 });

  if (!record) {
    const error = new Error("No active attendance session found");
    error.statusCode = 404;
    throw error;
  }

  const logoutTime = new Date();
  record.logoutTime = logoutTime;
  record.status = ATTENDANCE_STATUS.OFFLINE;
  computeSessionTotal(record, logoutTime);

  await record.save();

  emitAttendanceEvent("attendance:logout", {
    userId: String(userId),
    attendanceId: String(record._id),
    sessionId: record.sessionId,
  });

  return record;
};

const buildQuery = ({ tenantId, userId, status, fromDate, toDate, excludeUserIds = [] }) => {
  const query = { tenantId };

  if (userId) query.userId = userId;
  if (status) query.status = status;

  if (excludeUserIds.length) {
    if (query.userId) {
      query.userId = { $eq: query.userId, $nin: excludeUserIds };
    } else {
      query.userId = { $nin: excludeUserIds };
    }
  }

  if (fromDate || toDate) {
    query.loginTime = {};
    if (fromDate) query.loginTime.$gte = new Date(`${fromDate}T00:00:00`);
    if (toDate) query.loginTime.$lte = new Date(`${toDate}T23:59:59`);
  }

  return query;
};

const buildMonthRange = (month) => {
  const [yearStr, monthStr] = month.split("-");
  const year = Number(yearStr);
  const monthIdx = Number(monthStr) - 1;

  const monthStart = new Date(year, monthIdx, 1, 0, 0, 0, 0);
  const monthEnd = new Date(year, monthIdx + 1, 0, 23, 59, 59, 999);

  return { monthStart, monthEnd };
};

const normalizeRow = (row) => {
  const doc = row.toObject ? row.toObject() : row;
  return {
    ...doc,
    status: normalizeStatus(doc.status),
  };
};

const buildDaySplitTotals = (rows, rangeStart, rangeEnd, now = new Date()) => {
  const perDayMap = {};

  rows.forEach((row) => {
    const sessionStart = new Date(row.loginTime);
    const sessionEnd = getSessionEnd(row, now);

    const start = new Date(Math.max(sessionStart.getTime(), rangeStart.getTime()));
    const end = new Date(Math.min(sessionEnd.getTime(), rangeEnd.getTime()));

    if (end <= start) return;

    let cursor = startOfDay(start);
    while (cursor.getTime() <= end.getTime()) {
      const dayStart = startOfDay(cursor);
      const dayEnd = endOfDay(cursor);
      const ymd = formatServerDate(dayStart);
      const mins = overlapMinutes(start, end, dayStart, dayEnd);

      if (mins > 0) {
        perDayMap[ymd] = (perDayMap[ymd] || 0) + mins;
      }

      cursor.setDate(cursor.getDate() + 1);
    }
  });

  return perDayMap;
};

const getAttendanceList = async (filters = {}) => {
  const { tenantId } = filters;
  await closeStaleActiveSessions(tenantId);

  const page = Math.max(1, Number(filters.page) || 1);
  const limit = Math.min(100, Math.max(1, Number(filters.limit) || 10));
  const now = new Date();

  const excludedRoleIds = await getNonEmployeeIds(tenantId);
  const baseQuery = buildQuery({
    tenantId,
    userId: filters.userId,
    status: filters.status,
    fromDate: filters.fromDate,
    toDate: filters.toDate,
    excludeUserIds: excludedRoleIds,
  });

  let query = { ...baseQuery };
  if (filters.date) {
    const selectedDate = dateFromYmd(filters.date);
    const dayStart = startOfDay(selectedDate);
    const dayEnd = endOfDay(selectedDate);

    query = {
      ...baseQuery,
      loginTime: { $lte: dayEnd },
      $or: [{ logoutTime: { $gte: dayStart } }, { status: ATTENDANCE_STATUS.ACTIVE }],
    };
  }

  const [rowsRaw, total] = await Promise.all([
    Attendance.find(query)
      .populate({ path: "userId", select: "name email role", options: POPULATE_SKIP_TENANT })
      .sort({ loginTime: -1 })
      .skip((page - 1) * limit)
      .limit(limit),
    Attendance.countDocuments(query),
  ]);

  let rows = rowsRaw
    .map(normalizeRow)
    .filter((item) => item.userId && !NON_EMPLOYEE_ROLES.includes(item.userId.role));

  if (filters.date) {
    const selectedDate = dateFromYmd(filters.date);
    const dayStart = startOfDay(selectedDate);
    const dayEnd = endOfDay(selectedDate);

    rows = rows
      .map((row) => {
        const minutesInSelectedDate = overlapMinutes(
          row.loginTime,
          getSessionEnd(row, now),
          dayStart,
          dayEnd
        );

        return {
          ...row,
          displayDate: filters.date,
          displayWorkingMinutes: minutesInSelectedDate,
        };
      })
      .filter((row) => row.displayWorkingMinutes > 0);
  } else {
    rows = rows.map((row) => ({
      ...row,
      displayDate: row.date,
      displayWorkingMinutes:
        row.status === ATTENDANCE_STATUS.ACTIVE
          ? diffMinutes(row.loginTime, now)
          : row.totalSessionTime || diffMinutes(row.loginTime, row.logoutTime),
    }));
  }

  const month = filters.month || formatServerDate(new Date()).slice(0, 7);
  const { monthStart, monthEnd } = buildMonthRange(month);

  const monthQuery = {
    ...buildQuery({
      tenantId,
      userId: filters.userId,
      status: filters.status,
      excludeUserIds: excludedRoleIds,
    }),
    loginTime: { $lte: monthEnd },
    $or: [{ logoutTime: { $gte: monthStart } }, { status: ATTENDANCE_STATUS.ACTIVE }],
  };

  const monthRows = await Attendance.find(monthQuery).select(
    "loginTime logoutTime status totalSessionTime userId"
  );

  const perDayMap = buildDaySplitTotals(monthRows, monthStart, monthEnd, now);
  const perDay = Object.keys(perDayMap)
    .sort()
    .map((date) => ({
      date,
      totalMinutes: perDayMap[date],
      totalHours: Number((perDayMap[date] / 60).toFixed(2)),
    }));

  const monthlyTotalMinutes = perDay.reduce((sum, item) => sum + item.totalMinutes, 0);

  const overallDate = filters.date || formatServerDate(new Date());
  const overallDayStart = startOfDay(dateFromYmd(overallDate));
  const overallDayEnd = endOfDay(dateFromYmd(overallDate));

  const overallQuery = {
    ...buildQuery({
      tenantId,
      userId: filters.userId,
      status: filters.status,
      excludeUserIds: excludedRoleIds,
    }),
    loginTime: { $lte: overallDayEnd },
    $or: [{ logoutTime: { $gte: overallDayStart } }, { status: ATTENDANCE_STATUS.ACTIVE }],
  };

  const overallRows = await Attendance.find(overallQuery).select("loginTime logoutTime status userId");
  const todayOverallMinutes = overallRows.reduce((sum, row) => {
    return sum + overlapMinutes(row.loginTime, getSessionEnd(row, now), overallDayStart, overallDayEnd);
  }, 0);

  return {
    rows,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit) || 1,
    },
    summary: {
      month,
      perDay,
      monthlyTotalMinutes,
      monthlyTotalHours: Number((monthlyTotalMinutes / 60).toFixed(2)),
      overallDate,
      todayOverallMinutes,
      todayOverallHours: Number((todayOverallMinutes / 60).toFixed(2)),
    },
  };
};

const minutesSinceMidnight = (date) => {
  const d = new Date(date);
  return d.getHours() * 60 + d.getMinutes() + d.getSeconds() / 60;
};

const formatClockTime = (totalMinutes) => {
  if (totalMinutes == null || Number.isNaN(totalMinutes)) return "--";
  const wrapped = ((Math.round(totalMinutes) % 1440) + 1440) % 1440;
  const hours24 = Math.floor(wrapped / 60);
  const minutes = wrapped % 60;
  const period = hours24 >= 12 ? "PM" : "AM";
  const hours12 = hours24 % 12 === 0 ? 12 : hours24 % 12;
  return `${String(hours12).padStart(2, "0")}:${String(minutes).padStart(2, "0")} ${period}`;
};

// Present/half-day/late stats for a single day, used by the dashboard (today + trend day).
const computeDayAttendance = async (dayStart, dayEnd, employeeIds, now, tenantId) => {
  const dayQuery = {
    tenantId,
    loginTime: { $lte: dayEnd },
    $or: [{ logoutTime: { $gte: dayStart } }, { status: ATTENDANCE_STATUS.ACTIVE }],
  };
  const rowsRaw = await Attendance.find(dayQuery).select("userId loginTime logoutTime status isLate");
  const rows = rowsRaw.filter((row) => employeeIds.has(String(row.userId)));

  const perUserMinutes = {};
  rows.forEach((row) => {
    const uid = String(row.userId);
    const mins = overlapMinutes(row.loginTime, getSessionEnd(row, now), dayStart, dayEnd);
    perUserMinutes[uid] = (perUserMinutes[uid] || 0) + mins;
  });

  const presentUserIds = Object.keys(perUserMinutes).filter((uid) => perUserMinutes[uid] > 0);
  const halfDayUserIds = presentUserIds.filter((uid) => perUserMinutes[uid] < HALF_DAY_THRESHOLD_MINUTES);
  const fullDayUserIds = presentUserIds.filter((uid) => perUserMinutes[uid] >= HALF_DAY_THRESHOLD_MINUTES);
  const lateArrivals = rows.filter((row) => row.isLate).length;

  return { rows, perUserMinutes, presentUserIds, halfDayUserIds, fullDayUserIds, lateArrivals };
};

const getAttendanceDashboard = async (filters = {}) => {
  const { tenantId } = filters;
  await closeStaleActiveSessions(tenantId);

  const now = new Date();
  const targetDate = filters.date ? dateFromYmd(filters.date) : now;
  const dayStart = startOfDay(targetDate);
  const dayEnd = endOfDay(targetDate);
  const ymd = formatServerDate(targetDate);

  const employees = await User.find({ tenantId, role: { $in: EMPLOYEE_ROLES } }).select("_id name role");
  const totalEmployees = employees.length;
  const employeeIds = new Set(employees.map((e) => String(e._id)));

  const today = await computeDayAttendance(dayStart, dayEnd, employeeIds, now, tenantId);

  const approvedLeaveToday = await Leave.find({
    tenantId,
    status: "approved",
    fromDate: { $lte: dayEnd },
    toDate: { $gte: dayStart },
  }).select("userId");
  // An approved leave for today takes precedence over a stray/incidental login —
  // someone on leave who briefly checked something is still "on leave", not "present".
  const onLeaveUserIds = new Set(
    approvedLeaveToday.map((l) => String(l.userId)).filter((uid) => employeeIds.has(uid))
  );

  // "Present Today" is anyone who logged in at all today (full or half day), minus
  // anyone on approved leave. The full/half split is still tracked separately for
  // the "Half Day" breakdown bucket, but doesn't gate the headline present count.
  const presentUserIds = today.presentUserIds.filter((uid) => !onLeaveUserIds.has(uid));
  const halfDayUserIds = today.halfDayUserIds.filter((uid) => !onLeaveUserIds.has(uid));
  const fullDayUserIds = today.fullDayUserIds.filter((uid) => !onLeaveUserIds.has(uid));

  const presentCount = presentUserIds.length;
  const halfDayCount = halfDayUserIds.length;
  const onLeaveCount = onLeaveUserIds.size;
  const absentCount = Math.max(0, totalEmployees - presentCount - onLeaveCount);
  const attendanceRate = totalEmployees
    ? Number(((presentCount / totalEmployees) * 100).toFixed(2))
    : 0;

  // yesterday's rate, just for the "vs yesterday" trend indicator
  const yesterdayStart = startOfDay(new Date(dayStart.getTime() - 24 * 60 * 60 * 1000));
  const yesterdayEnd = endOfDay(yesterdayStart);
  const yesterday = await computeDayAttendance(yesterdayStart, yesterdayEnd, employeeIds, now, tenantId);
  const yesterdayPresent = yesterday.fullDayUserIds.length + yesterday.halfDayUserIds.length;
  const yesterdayRate = totalEmployees ? (yesterdayPresent / totalEmployees) * 100 : 0;
  const attendanceTrend = Number((attendanceRate - yesterdayRate).toFixed(2));

  const workingMinuteValues = today.presentUserIds.map((uid) => today.perUserMinutes[uid]);
  const avgWorkingMinutes = workingMinuteValues.length
    ? Math.round(workingMinuteValues.reduce((a, b) => a + b, 0) / workingMinuteValues.length)
    : 0;
  const maxWorkingMinutes = workingMinuteValues.length ? Math.max(...workingMinuteValues) : 0;
  const minWorkingMinutes = workingMinuteValues.length ? Math.min(...workingMinuteValues) : 0;

  const checkInTimes = today.rows.map((row) => minutesSinceMidnight(row.loginTime));
  const checkOutTimes = today.rows
    .filter((row) => row.logoutTime)
    .map((row) => minutesSinceMidnight(row.logoutTime));

  const avgCheckIn = checkInTimes.length ? checkInTimes.reduce((a, b) => a + b, 0) / checkInTimes.length : null;
  const avgCheckOut = checkOutTimes.length ? checkOutTimes.reduce((a, b) => a + b, 0) / checkOutTimes.length : null;
  const earliestCheckIn = checkInTimes.length ? Math.min(...checkInTimes) : null;
  const latestCheckIn = checkInTimes.length ? Math.max(...checkInTimes) : null;

  const roleWiseAttendance = EMPLOYEE_ROLES.map((role) => {
    const roleEmployees = employees.filter((e) => e.role === role);
    const roleTotal = roleEmployees.length;
    const rolePresent = roleEmployees.filter((e) => presentUserIds.includes(String(e._id))).length;
    return {
      role,
      label: role === "user" ? "Team" : role[0].toUpperCase() + role.slice(1),
      total: roleTotal,
      present: rolePresent,
      percent: roleTotal ? Math.round((rolePresent / roleTotal) * 100) : 0,
    };
  }).filter((g) => g.total > 0);

  const month = filters.month || ymd.slice(0, 7);
  const { monthStart, monthEnd } = buildMonthRange(month);

  const pendingRequests = await Leave.countDocuments({ tenantId, status: "pending" });

  const monthLeaves = await Leave.find({
    tenantId,
    fromDate: { $lte: monthEnd },
    toDate: { $gte: monthStart },
    status: { $in: ["approved", "rejected"] },
  }).select("status fromDate toDate");

  const approvedLeaves = monthLeaves.filter((l) => l.status === "approved").length;
  const rejectedLeaves = monthLeaves.filter((l) => l.status === "rejected").length;

  const leavesTaken = monthLeaves
    .filter((l) => l.status === "approved")
    .reduce((sum, l) => {
      const start = new Date(Math.max(new Date(l.fromDate).getTime(), monthStart.getTime()));
      const end = new Date(Math.min(new Date(l.toDate).getTime(), monthEnd.getTime()));
      const days = Math.max(1, Math.round((startOfDay(end).getTime() - startOfDay(start).getTime()) / 86400000) + 1);
      return sum + days;
    }, 0);

  const approvalRate = approvedLeaves + rejectedLeaves
    ? Math.round((approvedLeaves / (approvedLeaves + rejectedLeaves)) * 100)
    : 0;

  return {
    date: ymd,
    totalEmployees,
    presentToday: presentCount,
    absentToday: absentCount,
    onLeave: onLeaveCount,
    halfDay: halfDayCount,
    lateArrivals: today.lateArrivals,
    pendingRequests,
    attendanceRate,
    attendanceTrend,
    workingHours: {
      avgMinutes: avgWorkingMinutes,
      maxMinutes: maxWorkingMinutes,
      minMinutes: minWorkingMinutes,
    },
    checkIn: {
      avgCheckIn: formatClockTime(avgCheckIn),
      avgCheckOut: formatClockTime(avgCheckOut),
      earliestCheckIn: formatClockTime(earliestCheckIn),
      latestCheckIn: formatClockTime(latestCheckIn),
    },
    roleWiseAttendance,
    // Non-overlapping breakdown — "Present" here means full-day only, since
    // "Half Day" is broken out separately (the headline presentToday above
    // combines both, but this list should sum to totalEmployees).
    statusBreakdown: [
      { status: "Present", count: fullDayUserIds.length },
      { status: "Absent", count: absentCount },
      { status: "On Leave", count: onLeaveCount },
      { status: "Half Day", count: halfDayCount },
    ],
    leaveAnalytics: {
      month,
      pendingRequests,
      approvedLeaves,
      rejectedLeaves,
      leavesTaken,
      approvalRate,
    },
  };
};

const getTodayAttendance = async (filters = {}) => {
  const today = formatServerDate(new Date());
  return getAttendanceList({ ...filters, date: today });
};

const getAttendanceByUser = async (userId, filters = {}) => {
  const user = await User.findOne({ _id: userId, tenantId: filters.tenantId }).select("role");
  if (!user || NON_EMPLOYEE_ROLES.includes(user.role)) {
    return {
      rows: [],
      pagination: { page: 1, limit: Number(filters.limit) || 10, total: 0, totalPages: 1 },
      summary: {
        month: filters.month || formatServerDate(new Date()).slice(0, 7),
        perDay: [],
        monthlyTotalMinutes: 0,
        monthlyTotalHours: 0,
        overallDate: filters.date || formatServerDate(new Date()),
        todayOverallMinutes: 0,
        todayOverallHours: 0,
      },
    };
  }
  return getAttendanceList({ ...filters, userId });
};

const exportAttendanceWorkbookBuffer = async (filters = {}) => {
  const { tenantId } = filters;
  await closeStaleActiveSessions(tenantId);

  const excludedRoleIds = await getNonEmployeeIds(tenantId);
  const now = new Date();

  let exportStart;
  let exportEnd;

  if (filters.date) {
    const d = dateFromYmd(filters.date);
    exportStart = startOfDay(d);
    exportEnd = endOfDay(d);
  } else if (filters.month) {
    const r = buildMonthRange(filters.month);
    exportStart = r.monthStart;
    exportEnd = r.monthEnd;
  } else if (filters.fromDate || filters.toDate) {
    exportStart = filters.fromDate
      ? new Date(`${filters.fromDate}T00:00:00`)
      : new Date(0);
    exportEnd = filters.toDate
      ? new Date(`${filters.toDate}T23:59:59`)
      : now;
  } else {
    const currentMonth = formatServerDate(now).slice(0, 7);
    const r = buildMonthRange(currentMonth);
    exportStart = r.monthStart;
    exportEnd = r.monthEnd;
  }

  const query = {
    ...buildQuery({
      tenantId,
      userId: filters.userId,
      status: filters.status,
      excludeUserIds: excludedRoleIds,
    }),
    loginTime: { $lte: exportEnd },
    $or: [{ logoutTime: { $gte: exportStart } }, { status: ATTENDANCE_STATUS.ACTIVE }],
  };

  const rows = await Attendance.find(query)
    .populate({ path: "userId", select: "name email role", options: POPULATE_SKIP_TENANT })
    .sort({ loginTime: -1 });

  const dailyMap = {};

  rows
    .filter((row) => row.userId && !NON_EMPLOYEE_ROLES.includes(row.userId.role))
    .forEach((row) => {
      const sessionStart = new Date(row.loginTime);
      const sessionEnd = getSessionEnd(row, now);
      const boundedStart = new Date(Math.max(sessionStart.getTime(), exportStart.getTime()));
      const boundedEnd = new Date(Math.min(sessionEnd.getTime(), exportEnd.getTime()));

      if (boundedEnd <= boundedStart) return;

      let cursor = startOfDay(boundedStart);
      while (cursor.getTime() <= boundedEnd.getTime()) {
        const dayStart = startOfDay(cursor);
        const dayEnd = endOfDay(cursor);
        const date = formatServerDate(dayStart);

        const overlapStart = new Date(
          Math.max(boundedStart.getTime(), dayStart.getTime())
        );
        const overlapEnd = new Date(
          Math.min(boundedEnd.getTime(), dayEnd.getTime())
        );
        const minutes = overlapMinutes(overlapStart, overlapEnd, dayStart, dayEnd);

        if (minutes > 0) {
          const uid = String(row.userId._id || row.userId);
          const key = `${uid}__${date}`;
          const current = dailyMap[key] || {
            Name: row.userId?.name || "N/A",
            Email: row.userId?.email || "N/A",
            Date: date,
            FirstLoginTime: overlapStart,
            LastLogoutTime: overlapEnd,
            TotalActiveMinutes: 0,
          };

          if (overlapStart < current.FirstLoginTime) current.FirstLoginTime = overlapStart;
          if (overlapEnd > current.LastLogoutTime) current.LastLogoutTime = overlapEnd;
          current.TotalActiveMinutes += minutes;

          dailyMap[key] = current;
        }

        cursor.setDate(cursor.getDate() + 1);
      }
    });

  const exportRows = Object.values(dailyMap)
    .sort((a, b) => {
      if (a.Date === b.Date) return a.Name.localeCompare(b.Name);
      return a.Date.localeCompare(b.Date);
    })
    .map((row) => ({
      Name: row.Name,
      Email: row.Email,
      Date: row.Date,
      FirstLoginTime: row.FirstLoginTime ? new Date(row.FirstLoginTime).toISOString() : "",
      LastLogoutTime: row.LastLogoutTime ? new Date(row.LastLogoutTime).toISOString() : "",
      TotalActiveMinutes: row.TotalActiveMinutes,
      TotalActiveHours: Number((row.TotalActiveMinutes / 60).toFixed(2)),
    }));

  try {
    const XLSX = require("xlsx");
    const workbook = XLSX.utils.book_new();
    const worksheet = XLSX.utils.json_to_sheet(exportRows);
    XLSX.utils.book_append_sheet(workbook, worksheet, "Attendance");
    return {
      buffer: XLSX.write(workbook, { type: "buffer", bookType: "xlsx" }),
      extension: "xlsx",
      mimeType: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    };
  } catch {
    const headers = [
      "Name",
      "Email",
      "Date",
      "FirstLoginTime",
      "LastLogoutTime",
      "TotalActiveMinutes",
      "TotalActiveHours",
    ];
    const lines = [headers.join(",")];
    exportRows.forEach((row) => {
      const values = headers.map((key) => `"${String(row[key] ?? "").replace(/"/g, '""')}"`);
      lines.push(values.join(","));
    });
    return {
      buffer: Buffer.from(lines.join("\n"), "utf-8"),
      extension: "csv",
      mimeType: "text/csv",
    };
  }
};

module.exports = {
  ATTENDANCE_STATUS,
  createLoginAttendance,
  logoutAttendance,
  getAttendanceList,
  getTodayAttendance,
  getAttendanceByUser,
  getAttendanceDashboard,
  exportAttendanceWorkbookBuffer,
};
