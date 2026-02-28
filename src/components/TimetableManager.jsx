import React, { useState, useEffect, useCallback, useMemo } from "react";
import api from "../api";

export default function TimetableManager({ currentUserRole }) {
  const isStudent = currentUserRole === "student";

  // --- STATE ---
  const [semesters, setSemesters] = useState([]);
  const [selectedSemester, setSelectedSemester] = useState("");
  const [scheduleData, setScheduleData] = useState([]);

  const [offeredModules, setOfferedModules] = useState([]);
  const [rooms, setRooms] = useState([]);
  const [lecturers, setLecturers] = useState([]);
  const [groups, setGroups] = useState([]);

  const [filterLecturer, setFilterLecturer] = useState("");
  const [filterGroup, setFilterGroup] = useState("");

  const [loading, setLoading] = useState(false);
  const [showModal, setShowModal] = useState(false);

  const [viewMode, setViewMode] = useState("Week"); // Day | Week | Month | Semester
  const [currentDate, setCurrentDate] = useState(new Date());
  const [isListView, setIsListView] = useState(false);

  const [semesterType, setSemesterType] = useState("Winter");

  const [newEntry, setNewEntry] = useState({
    day: "",
    start_time: "",
    end_time: "",
    offered_module_id: "",
    room_id: "",
    group_ids: [],
  });

  const daysOfWeek = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"];

  // timetable visible range
  const DAY_START = "08:00";
  const DAY_END = "20:00";

  // --- COLORS ---
  const pastelColors = [
    { bg: "#fff9c4", border: "#fbc02d", text: "#5d4037" },
    { bg: "#c8e6c9", border: "#43a047", text: "#1b5e20" },
    { bg: "#bbdefb", border: "#1976d2", text: "#0d47a1" },
    { bg: "#f8bbd0", border: "#c2185b", text: "#880e4f" },
    { bg: "#e1bee7", border: "#7b1fa2", text: "#4a148c" },
  ];

  const getColorForModule = (moduleName) => {
    if (!moduleName) return pastelColors[0];
    let hash = 0;
    for (let i = 0; i < moduleName.length; i++) hash = moduleName.charCodeAt(i) + ((hash << 5) - hash);
    return pastelColors[Math.abs(hash) % pastelColors.length];
  };

  // --- TIME HELPERS ---
  const timeToMinutes = (t) => {
    if (!t || typeof t !== "string" || !t.includes(":")) return 0;
    const [hh, mm] = t.split(":").map((x) => parseInt(x, 10));
    return hh * 60 + mm;
  };

  const minutesToTime = (mins) => {
    const hh = String(Math.floor(mins / 60)).padStart(2, "0");
    const mm = String(mins % 60).padStart(2, "0");
    return `${hh}:${mm}`;
  };

  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));

  const buildSlots = (startStr, endStr, stepMin) => {
    const start = timeToMinutes(startStr);
    const end = timeToMinutes(endStr);
    const out = [];
    for (let m = start; m <= end; m += stepMin) out.push(minutesToTime(m));
    return out;
  };

  // 60-min labels on left, 15-min click targets in Day, 60-min click targets in Week
  const hourSlots = useMemo(() => buildSlots(DAY_START, DAY_END, 60), []);
  const daySlots15 = useMemo(() => buildSlots(DAY_START, DAY_END, 15), []);

  const isDay = viewMode === "Day";
  const isWeek = viewMode === "Week";

  const visibleDays = viewMode === "Week"
    ? daysOfWeek
    : [currentDate.toLocaleDateString("en-US", { weekday: "long" })];

  // --- DATE HELPERS ---
  const getWeekNumber = (d) => {
    d = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
    d.setUTCDate(d.getUTCDate() + 4 - (d.getUTCDay() || 7));
    const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
    return Math.ceil((((d - yearStart) / 86400000) + 1) / 7);
  };

  const formatDateShort = (date) =>
    date.toLocaleDateString("en-GB", { day: "2-digit", month: "2-digit", year: "2-digit" }).replace(/\//g, ".");

  const getWeekRangeString = () => {
    const curr = new Date(currentDate);
    const day = curr.getDay() || 7;
    const monday = new Date(curr);
    monday.setDate(curr.getDate() - day + 1);
    const friday = new Date(monday);
    friday.setDate(monday.getDate() + 4);
    return `(${formatDateShort(monday)}-${formatDateShort(friday)})`;
  };

  const getDateForDayOfWeek = (dayName) => {
    const dayIndex = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"].indexOf(dayName);
    const curr = new Date(currentDate);
    const currentDayIso = curr.getDay() || 7;
    const targetDayIso = dayIndex === 0 ? 7 : dayIndex;
    const diff = targetDayIso - currentDayIso;
    const targetDate = new Date(curr);
    targetDate.setDate(curr.getDate() + diff);
    return formatDateShort(targetDate);
  };

  const displayDayName = currentDate.toLocaleDateString("en-US", { weekday: "long" });
  const displayDateNum = formatDateShort(currentDate);
  const displayMonthName = currentDate.toLocaleDateString("en-US", { month: "long", year: "numeric" });

  // --- LOADING ---
  const loadSchedule = useCallback(async () => {
    if (!selectedSemester) return;
    setLoading(true);
    try {
      const data = await api.getSchedule(selectedSemester);
      setScheduleData(data);
    } catch (e) {
      console.error(e);
    }
    setLoading(false);
  }, [selectedSemester]);

  const loadDropdowns = useCallback(async () => {
    if (!selectedSemester) return;
    try {
      const mods = await api.getOfferedModules(selectedSemester);
      setOfferedModules(mods);
      const r = await api.getRooms();
      setRooms(r);
    } catch (e) {
      console.error(e);
    }
  }, [selectedSemester]);

  useEffect(() => {
    (async () => {
      try {
        const s = await api.getSemesters();
        setSemesters(s);
        if (s.length > 0) setSelectedSemester(s[0].name);

        const l = await api.getLecturers();
        setLecturers(l);

        const g = await api.getGroups();
        setGroups(g);
      } catch (e) {
        console.error(e);
      }
    })();
  }, []);

  useEffect(() => {
    if (selectedSemester) {
      loadSchedule();
      loadDropdowns();
    }
  }, [selectedSemester, loadSchedule, loadDropdowns]);

  // --- FILTERED DATA ---
  const filteredData = useMemo(() => {
    return scheduleData.filter((entry) => {
      if (filterLecturer && entry.lecturer_name !== filterLecturer) return false;

      if (filterGroup) {
        const groupNames =
          entry.group_names ||
          (Array.isArray(entry.groups) ? entry.groups.map((g) => g.name ?? g.Name) : []);
        if (!groupNames.includes(filterGroup)) return false;
      }
      return true;
    });
  }, [scheduleData, filterLecturer, filterGroup]);

  // --- NAV ---
  const handleNavigateDate = (direction) => {
    if (viewMode === "Semester" && !isListView) return;

    const newDate = new Date(currentDate);
    if (viewMode === "Week" || isListView) newDate.setDate(currentDate.getDate() + (direction === "next" ? 7 : -7));
    else if (viewMode === "Day") newDate.setDate(currentDate.getDate() + (direction === "next" ? 1 : -1));
    else if (viewMode === "Month") newDate.setMonth(currentDate.getMonth() + (direction === "next" ? 1 : -1));
    setCurrentDate(newDate);
  };

  // --- BUSY CHECK (only Day+Month, selected lecturer) ---
  const isLecturerBusyAt = (day, slotStartTime, slotMinutes) => {
    if (!(viewMode === "Day" || viewMode === "Month")) return false;
    if (!filterLecturer) return false;

    const slotStart = timeToMinutes(slotStartTime);
    const slotEnd = slotStart + slotMinutes;

    const lecturerEntries = scheduleData.filter((e) => e.day_of_week === day && e.lecturer_name === filterLecturer);

    return lecturerEntries.some((e) => {
      const s = timeToMinutes(e.start_time);
      const en = timeToMinutes(e.end_time);
      return slotStart < en && slotEnd > s;
    });
  };

  // --- CLICK / SAVE / DELETE ---
  const openModalAt = (day, startTime) => {
    const s = timeToMinutes(startTime);
    const e = clamp(s + 60, timeToMinutes(DAY_START), timeToMinutes(DAY_END));
    setNewEntry({
      day,
      start_time: startTime,
      end_time: minutesToTime(e),
      offered_module_id: "",
      room_id: "",
      group_ids: [],
    });
    setShowModal(true);
  };

  const handleCellClick = (day, time, slotMinutes) => {
    if (isStudent) return;

    // ✅ blocking only in Day/Month, not in Week
    if (viewMode === "Day" || viewMode === "Month") {
      if (isLecturerBusyAt(day, time, slotMinutes)) {
        alert("Selected lecturer is busy at this time.");
        return;
      }
    }
    openModalAt(day, time);
  };

  const handleSave = async () => {
    if (!newEntry.offered_module_id) return alert("Select module");
    if (!newEntry.room_id) return alert("Select room");
    if (!newEntry.start_time) return alert("Select start time");
    if (!newEntry.end_time) return alert("Select end time");
    if (!newEntry.group_ids || newEntry.group_ids.length === 0) return alert("Select at least 1 group");

    const s = timeToMinutes(newEntry.start_time);
    const e = timeToMinutes(newEntry.end_time);
    if (e <= s) return alert("End time must be after start time");

    try {
      await api.createScheduleEntry({
        offered_module_id: Number(newEntry.offered_module_id),
        room_id: Number(newEntry.room_id),
        day_of_week: newEntry.day,
        start_time: newEntry.start_time,
        end_time: newEntry.end_time,
        semester: selectedSemester,
        group_ids: newEntry.group_ids,
      });
      setShowModal(false);
      loadSchedule();
    } catch (err) {
      alert("Error: " + err.message);
    }
  };

  const handleDelete = async (id, e) => {
    e.stopPropagation();
    if (isStudent) return;
    if (!window.confirm("Delete session?")) return;
    try {
      await api.deleteScheduleEntry(id);
      loadSchedule();
    } catch (err) {
      alert("Error deleting");
    }
  };

  // --- OVERLAP LAYOUT (LANES) ---
  // returns items with { lane, laneCount } so we can set left/width
  const computeLanesForDay = (events) => {
    const items = events
      .map((ev) => ({
        ev,
        startM: timeToMinutes(ev.start_time),
        endM: timeToMinutes(ev.end_time),
      }))
      .sort((a, b) => a.startM - b.startM || a.endM - b.endM);

    const lanesEnd = []; // end time per lane
    const placed = [];

    for (const item of items) {
      let laneIndex = lanesEnd.findIndex((end) => end <= item.startM);
      if (laneIndex === -1) {
        laneIndex = lanesEnd.length;
        lanesEnd.push(item.endM);
      } else {
        lanesEnd[laneIndex] = item.endM;
      }
      placed.push({ ...item, lane: laneIndex });
    }

    // For each item compute how many lanes overlap with it (max concurrent in its overlap window)
    for (const item of placed) {
      const overlapping = placed.filter((x) => x.startM < item.endM && x.endM > item.startM);
      const laneCount = Math.max(...overlapping.map((x) => x.lane)) + 1;
      item.laneCount = laneCount;
    }

    return placed;
  };

  // --- DURATION RENDERING ---
  const PX_PER_MIN = isDay ? 2.0 : 1.6;
  const timelineHeightPx = useMemo(() => (timeToMinutes(DAY_END) - timeToMinutes(DAY_START)) * PX_PER_MIN, [PX_PER_MIN]);

  const getEventsForDay = (dayName) => filteredData.filter((e) => e.day_of_week === dayName);

  const renderDayColumn = (dayName) => {
    const rawEvents = getEventsForDay(dayName);
    const placed = computeLanesForDay(rawEvents);

    // click targets:
    const clickSlots = isDay ? daySlots15 : hourSlots;
    const clickStep = isDay ? 15 : 60;

    return (
      <div style={{ position: "relative", height: timelineHeightPx, background: "white" }}>
        {/* subtle grid */}
        <div
          style={{
            position: "absolute",
            inset: 0,
            backgroundImage: isDay
              ? "repeating-linear-gradient(to bottom, rgba(0,0,0,0.04) 0px, rgba(0,0,0,0.04) 1px, transparent 1px, transparent 30px)"
              : "repeating-linear-gradient(to bottom, rgba(0,0,0,0.05) 0px, rgba(0,0,0,0.05) 1px, transparent 1px, transparent 96px)",
            pointerEvents: "none",
          }}
        />

        {/* ✅ clickable overlay in Day AND Week */}
        {!isStudent && (isDay || isWeek) && (
          <div style={{ position: "absolute", inset: 0 }}>
            {clickSlots.map((t) => {
              const busy = (viewMode === "Day" || viewMode === "Month") ? isLecturerBusyAt(dayName, t, clickStep) : false;
              const top = (timeToMinutes(t) - timeToMinutes(DAY_START)) * PX_PER_MIN;
              return (
                <div
                  key={t}
                  onClick={() => !busy && handleCellClick(dayName, t, clickStep)}
                  style={{
                    position: "absolute",
                    left: 0,
                    right: 0,
                    top,
                    height: clickStep * PX_PER_MIN,
                    cursor: busy ? "not-allowed" : "pointer",
                    background: busy ? "rgba(0,0,0,0.03)" : "transparent",
                  }}
                  title={busy ? "Selected lecturer is busy" : `Add at ${t}`}
                />
              );
            })}
          </div>
        )}

        {/* events with lane positioning */}
        {placed.map((item) => {
          const ev = item.ev;
          const startM = clamp(item.startM, timeToMinutes(DAY_START), timeToMinutes(DAY_END));
          const endM = clamp(item.endM, timeToMinutes(DAY_START), timeToMinutes(DAY_END));

          const top = (startM - timeToMinutes(DAY_START)) * PX_PER_MIN;
          const height = Math.max(26, (endM - startM) * PX_PER_MIN);

          const colors = getColorForModule(ev.module_name);
          const groupLine =
            ev.group_names && Array.isArray(ev.group_names) && ev.group_names.length > 0
              ? ev.group_names.join(", ")
              : null;

          const laneCount = Math.max(1, item.laneCount || 1);
          const lane = item.lane || 0;

          // widths (gaps so it looks clean)
          const gap = 10;
          const totalGap = gap * (laneCount + 1);
          const wPct = 100 / laneCount;

          return (
            <div
              key={ev.id}
              style={{
                position: "absolute",
                top,
                height,
                left: `calc(${wPct * lane}% + ${gap}px)`,
                width: `calc(${wPct}% - ${totalGap / laneCount}px)`,
                background: colors.bg,
                borderLeft: `6px solid ${colors.border}`,
                borderRadius: "10px",
                boxShadow: "0 4px 10px rgba(0,0,0,0.06)",
                padding: "10px 12px",
                display: "flex",
                flexDirection: "column",
                justifyContent: "space-between",
                overflow: "hidden",
              }}
            >
              <div>
                <div style={{ fontSize: "0.9rem", fontWeight: 900, color: "#2b4a8e", marginBottom: "6px" }}>
                  {ev.start_time} - {ev.end_time}
                </div>
                <div style={{ fontWeight: 900, fontSize: "1.05rem", color: "#212529", lineHeight: 1.2 }}>
                  {ev.module_name}
                </div>
                <div style={{ fontSize: "0.92rem", color: "#495057", fontWeight: 700, marginTop: "4px" }}>
                  {ev.lecturer_name}
                </div>

                {groupLine && (
                  <div style={{ fontSize: "0.85rem", color: "#495057", fontWeight: 700, marginTop: "6px" }}>
                    👥 {groupLine}
                  </div>
                )}
              </div>

              <div style={{ fontSize: "0.92rem", fontWeight: 900, display: "flex", alignItems: "center", gap: "6px" }}>
                <span aria-hidden>📍</span>
                <span>{ev.room_name}</span>
              </div>

              {!isStudent && (
                <button
                  onClick={(e) => handleDelete(ev.id, e)}
                  style={{
                    position: "absolute",
                    top: "8px",
                    right: "8px",
                    background: "white",
                    border: "1px solid rgba(0,0,0,0.08)",
                    color: "#fa5252",
                    cursor: "pointer",
                    fontSize: "14px",
                    borderRadius: "8px",
                    width: "28px",
                    height: "28px",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                  title="Delete"
                >
                  ✕
                </button>
              )}
            </div>
          );
        })}
      </div>
    );
  };

  // --- LIST VIEW ---
  const renderListView = () => {
    const sorted = [...filteredData].sort((a, b) => {
      const order = { Monday: 1, Tuesday: 2, Wednesday: 3, Thursday: 4, Friday: 5 };
      if (order[a.day_of_week] !== order[b.day_of_week]) return order[a.day_of_week] - order[b.day_of_week];
      return a.start_time.localeCompare(b.start_time);
    });

    return (
      <div style={{ marginTop: "20px", overflowX: "auto", boxShadow: "0 2px 10px rgba(0,0,0,0.05)", borderRadius: "10px", border: "1px solid #eee" }}>
        <table style={{ width: "100%", borderCollapse: "collapse", background: "white" }}>
          <thead>
            <tr style={{ background: "#f8f9fa", borderBottom: "2px solid #dee2e6" }}>
              <th style={{ padding: "14px 16px", textAlign: "left" }}>Date</th>
              <th style={{ padding: "14px 16px", textAlign: "left" }}>Day</th>
              <th style={{ padding: "14px 16px", textAlign: "left" }}>Time</th>
              <th style={{ padding: "14px 16px", textAlign: "left" }}>Module</th>
              <th style={{ padding: "14px 16px", textAlign: "left" }}>Lecturer</th>
              <th style={{ padding: "14px 16px", textAlign: "left" }}>Groups</th>
              <th style={{ padding: "14px 16px", textAlign: "left" }}>Room</th>
              {!isStudent && <th style={{ padding: "14px 16px", textAlign: "center" }}>Action</th>}
            </tr>
          </thead>
          <tbody>
            {sorted.length === 0 ? (
              <tr>
                <td colSpan={isStudent ? 7 : 8} style={{ padding: "20px", textAlign: "center", color: "#999" }}>
                  No classes scheduled yet.
                </td>
              </tr>
            ) : (
              sorted.map((e, idx) => {
                const dateStr = getDateForDayOfWeek(e.day_of_week);
                const groupLine = Array.isArray(e.group_names) ? e.group_names.join(", ") : (filterGroup || "All");
                return (
                  <tr key={e.id} style={{ borderBottom: "1px solid #f1f3f5", background: idx % 2 === 0 ? "white" : "#fcfcfc" }}>
                    <td style={{ padding: "14px 16px" }}>{dateStr}</td>
                    <td style={{ padding: "14px 16px", fontWeight: 900, color: "#2b4a8e" }}>{e.day_of_week}</td>
                    <td style={{ padding: "14px 16px" }}>{e.start_time} - {e.end_time}</td>
                    <td style={{ padding: "14px 16px", fontWeight: 800 }}>{e.module_name}</td>
                    <td style={{ padding: "14px 16px" }}>{e.lecturer_name}</td>
                    <td style={{ padding: "14px 16px" }}>{groupLine}</td>
                    <td style={{ padding: "14px 16px" }}>📍 {e.room_name}</td>
                    {!isStudent && (
                      <td style={{ padding: "14px 16px", textAlign: "center" }}>
                        <button onClick={(ev) => handleDelete(e.id, ev)} style={{ background: "none", border: "none", color: "#c92a2a", cursor: "pointer", fontSize: "1.2rem" }}>
                          ×
                        </button>
                      </td>
                    )}
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    );
  };

  // --- SEMESTER VIEW (keep your previous layout, shortened here) ---
  const renderSemesterPlan = () => {
    let months = [];
    if (semesterType === "Winter") {
      months = [
        { name: "October", days: 31, startDay: 2 },
        { name: "November", days: 30, startDay: 5 },
        { name: "December", days: 31, startDay: 0 },
        { name: "January", days: 31, startDay: 3 },
        { name: "February", days: 28, startDay: 6 },
      ];
    } else {
      months = [
        { name: "April", days: 30, startDay: 3 },
        { name: "May", days: 31, startDay: 5 },
        { name: "June", days: 30, startDay: 1 },
        { name: "July", days: 31, startDay: 3 },
        { name: "August", days: 31, startDay: 6 },
      ];
    }

    return (
      <div style={{ marginTop: "20px" }}>
        <div style={{ display: "flex", justifyContent: "center", marginBottom: "20px", gap: "10px" }}>
          <button
            onClick={() => setSemesterType("Winter")}
            style={{
              padding: "10px 22px",
              borderRadius: "22px",
              border: "1px solid #2b4a8e",
              background: semesterType === "Winter" ? "#2b4a8e" : "white",
              color: semesterType === "Winter" ? "white" : "#2b4a8e",
              fontWeight: "800",
              cursor: "pointer",
            }}
          >
            ❄️ Winter Semester (Oct - Feb)
          </button>
          <button
            onClick={() => setSemesterType("Summer")}
            style={{
              padding: "10px 22px",
              borderRadius: "22px",
              border: "1px solid #2b4a8e",
              background: semesterType === "Summer" ? "#2b4a8e" : "white",
              color: semesterType === "Summer" ? "white" : "#2b4a8e",
              fontWeight: "800",
              cursor: "pointer",
            }}
          >
            ☀️ Summer Semester (Apr - Aug)
          </button>
        </div>

        <div style={{ display: "flex", gap: "20px", overflowX: "auto", paddingBottom: "20px" }}>
          {months.map((month, mIdx) => (
            <div key={mIdx} style={{ minWidth: "340px", background: "white", border: "1px solid #ddd", borderRadius: "10px", overflow: "hidden" }}>
              <div style={{ background: "#2b4a8e", color: "white", padding: "12px", textAlign: "center", fontWeight: "800" }}>
                {month.name}
              </div>

              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.85rem" }}>
                <thead>
                  <tr style={{ background: "#f1f3f5", borderBottom: "1px solid #ddd" }}>
                    <th style={{ padding: "6px", width: "30px", borderRight: "1px solid #eee" }}>D</th>
                    <th style={{ padding: "6px", width: "46px", borderRight: "1px solid #eee" }}>Day</th>
                    <th style={{ padding: "6px" }}>Module / Lecturer</th>
                  </tr>
                </thead>
                <tbody>
                  {Array.from({ length: month.days }, (_, i) => {
                    const dayNum = i + 1;
                    const dayOfWeekIndex = (month.startDay + i) % 7;
                    const dayNames = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
                    const dayName = dayNames[dayOfWeekIndex];
                    const isWeekend = dayName === "Saturday" || dayName === "Sunday";

                    const daily = filteredData.filter((c) => c.day_of_week === dayName);

                    return (
                      <tr key={dayNum} style={{ background: isWeekend ? "#e9ecef" : "white", borderBottom: "1px solid #f1f3f5" }}>
                        <td style={{ padding: "7px", textAlign: "center", fontWeight: "800", color: "#666", borderRight: "1px solid #eee" }}>
                          {dayNum < 10 ? `0${dayNum}` : dayNum}
                        </td>
                        <td style={{ padding: "7px", color: isWeekend ? "#adb5bd" : "#333", borderRight: "1px solid #eee", fontWeight: 700 }}>
                          {dayName.substring(0, 3)}
                        </td>
                        <td style={{ padding: "6px" }}>
                          {daily.length > 0 ? (
                            <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
                              {daily.map((cls) => (
                                <div
                                  key={cls.id}
                                  style={{
                                    background: getColorForModule(cls.module_name).bg,
                                    borderLeft: `4px solid ${getColorForModule(cls.module_name).border}`,
                                    padding: "6px 8px",
                                    borderRadius: "6px",
                                    fontSize: "0.78rem",
                                  }}
                                >
                                  <div style={{ marginBottom: "3px" }}>
                                    <strong>{cls.start_time} - {cls.end_time}</strong> {cls.module_name}
                                  </div>
                                  <div style={{ fontSize: "0.72rem", opacity: 0.8, fontStyle: "italic" }}>👨‍🏫 {cls.lecturer_name}</div>
                                </div>
                              ))}
                            </div>
                          ) : isWeekend ? (
                            <span style={{ color: "#ccc" }}>-</span>
                          ) : null}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          ))}
        </div>
      </div>
    );
  };

  // --- MONTH VIEW (unchanged, simple) ---
  const renderMonthView = () => {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    const firstDay = new Date(year, month, 1);
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const startDayOfWeek = firstDay.getDay() === 0 ? 6 : firstDay.getDay() - 1;

    const cells = [];
    for (let i = 0; i < startDayOfWeek; i++) {
      cells.push(<div key={`empty-${i}`} style={{ background: "#f8f9fa", border: "1px solid #eee", minHeight: "110px" }} />);
    }

    for (let d = 1; d <= daysInMonth; d++) {
      const dayDate = new Date(year, month, d);
      const dayName = dayDate.toLocaleDateString("en-US", { weekday: "long" });
      const daily = filteredData.filter((entry) => entry.day_of_week === dayName);

      cells.push(
        <div key={d} style={{ border: "1px solid #eee", minHeight: "110px", padding: "8px", background: "white" }}>
          <div style={{ textAlign: "right", fontWeight: "800", color: "#ccc", marginBottom: "6px" }}>{d}</div>
          <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
            {daily.map((cls) => (
              <div
                key={cls.id}
                style={{
                  fontSize: "0.75rem",
                  padding: "4px 6px",
                  borderRadius: "6px",
                  background: getColorForModule(cls.module_name).bg,
                  color: getColorForModule(cls.module_name).text,
                  borderLeft: `4px solid ${getColorForModule(cls.module_name).border}`,
                  whiteSpace: "nowrap",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  fontWeight: 700,
                }}
                title={`${cls.start_time} - ${cls.end_time} ${cls.module_name}`}
              >
                {cls.start_time}-{cls.end_time} {cls.module_name}
              </div>
            ))}
          </div>
        </div>
      );
    }

    return (
      <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: "1px", background: "#ddd", border: "1px solid #ddd" }}>
        {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((d) => (
          <div key={d} style={{ background: "#2b4a8e", color: "white", padding: "12px", textAlign: "center", fontWeight: "800" }}>
            {d}
          </div>
        ))}
        {cells}
      </div>
    );
  };

  // --- WEEK/DAY GRID ---
  const renderTimelineGrid = () => {
    const leftWidth = 90;

    return (
      <div style={{ borderTop: "1px solid #e9ecef", overflowX: "auto" }}>
        <div style={{ minWidth: "1100px" }}>
          <div style={{ display: "grid", gridTemplateColumns: `${leftWidth}px repeat(${visibleDays.length}, 1fr)` }}>
            <div style={{ borderRight: "1px solid #e9ecef" }} />
            {visibleDays.map((day) => (
              <div key={day} style={{ padding: "18px", textAlign: "center", fontWeight: 900, color: "#2b4a8e", fontSize: "1.2rem", borderBottom: "2px solid #dee2e6", borderRight: "1px solid #f1f3f5" }}>
                {day}
                <div style={{ fontSize: "0.9rem", color: "#888", fontWeight: 600, marginTop: "6px" }}>
                  {viewMode === "Week" && "(Weekly Schedule)"}
                </div>
              </div>
            ))}
          </div>

          <div style={{ display: "grid", gridTemplateColumns: `${leftWidth}px repeat(${visibleDays.length}, 1fr)` }}>
            <div style={{ borderRight: "1px solid #e9ecef" }}>
              {hourSlots.map((t) => (
                <div key={t} style={{ height: 60 * PX_PER_MIN, display: "flex", alignItems: "flex-start", justifyContent: "center", paddingTop: "10px", fontWeight: 900, color: "#343a40" }}>
                  {t}
                </div>
              ))}
            </div>

            {visibleDays.map((day) => (
              <div key={day} style={{ borderRight: "1px solid #f1f3f5" }}>
                {renderDayColumn(day)}
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  };

  // --- MODAL DROPDOWN FIELD NORMALIZERS (fix DB mismatches) ---
  const getModuleLabel = (m) => {
    const modName = m.module_name ?? m.moduleName ?? m.name ?? m.module?.name ?? m.module?.Name ?? "Unnamed module";
    const lecName = m.lecturer_name ?? m.lecturerName ?? m.lecturer?.name ?? m.lecturer?.full_name ?? "";
    return lecName ? `${modName} (${lecName})` : modName;
  };

  const getGroupName = (g) => g.name ?? g.Name ?? g.group_name ?? g.groupName ?? "Unnamed group";

  // --- STYLES ---
  const navButtonStyle = (mode) => ({
    padding: "10px 22px",
    background: viewMode === mode ? "#2b4a8e" : "white",
    color: viewMode === mode ? "white" : "#2b4a8e",
    border: "1px solid #2b4a8e",
    borderRadius: "6px",
    cursor: "pointer",
    fontSize: "0.95rem",
    fontWeight: "800",
    minWidth: "92px",
    textAlign: "center",
  });

  const filterSelectStyle = {
    padding: "10px 12px",
    borderRadius: "8px",
    border: "1px solid #dee2e6",
    background: "white",
    color: "#495057",
    minWidth: "180px",
    fontSize: "1rem",
  };

  return (
    <div style={{ padding: "40px", fontFamily: "'Inter', 'Segoe UI', sans-serif", background: "#ffffff", minHeight: "100vh" }}>
      <h2 style={{ margin: "0 0 30px 0", color: "#343a40", fontSize: "1.9rem", fontWeight: "900" }}>
        {isStudent ? "Student Schedule" : "Schedule Overview"}
      </h2>

      {/* FILTERS */}
      <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: "26px", marginBottom: "34px" }}>
        <div style={{ display: "flex", alignItems: "center" }}>
          <label style={{ marginRight: "10px", fontWeight: "900" }}>Semester</label>
          <select value={selectedSemester} onChange={(e) => setSelectedSemester(e.target.value)} style={filterSelectStyle}>
            {semesters.map((s) => (
              <option key={s.id} value={s.name}>
                {s.name}
              </option>
            ))}
          </select>
        </div>

        <div style={{ display: "flex", alignItems: "center" }}>
          <label style={{ marginRight: "10px", fontWeight: "900" }}>Groups</label>
          <select value={filterGroup} onChange={(e) => setFilterGroup(e.target.value)} style={filterSelectStyle}>
            <option value="">All Groups</option>
            {groups.map((g) => (
              <option key={g.id} value={getGroupName(g)}>
                {getGroupName(g)}
              </option>
            ))}
          </select>
        </div>

        {!isStudent && (
          <div style={{ display: "flex", alignItems: "center" }}>
            <label style={{ marginRight: "10px", fontWeight: "900" }}>Lecturer</label>
            <select value={filterLecturer} onChange={(e) => setFilterLecturer(e.target.value)} style={filterSelectStyle}>
              <option value="">All Lecturers</option>
              {lecturers.map((l) => (
                <option key={l.id} value={`${l.first_name} ${l.last_name}`}>
                  {`${l.first_name} ${l.last_name}`}
                </option>
              ))}
            </select>
          </div>
        )}
      </div>

      {/* CONTROLS */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "25px" }}>
        <div style={{ display: "flex", gap: "10px" }}>
          <button style={navButtonStyle("Day")} onClick={() => setViewMode("Day")}>Day</button>
          <button style={navButtonStyle("Week")} onClick={() => setViewMode("Week")}>Week</button>
          <button style={navButtonStyle("Month")} onClick={() => setViewMode("Month")}>Month</button>
          <button style={navButtonStyle("Semester")} onClick={() => setViewMode("Semester")}>Semester</button>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: "20px" }}>
          {viewMode === "Week" && !isListView && (
            <>
              <button onClick={() => handleNavigateDate("prev")} style={{ background: "none", border: "none", cursor: "pointer", fontSize: "2rem", color: "#2b4a8e" }}>‹</button>
              <div style={{ textAlign: "center", color: "#2b4a8e" }}>
                <div style={{ fontSize: "1.2rem", fontWeight: "900", lineHeight: "1.2" }}>CW {getWeekNumber(currentDate)}</div>
                <div style={{ fontSize: "1.05rem", fontWeight: "800", opacity: 0.9 }}>{getWeekRangeString()}</div>
              </div>
              <button onClick={() => handleNavigateDate("next")} style={{ background: "none", border: "none", cursor: "pointer", fontSize: "2rem", color: "#2b4a8e" }}>›</button>
            </>
          )}

          {viewMode === "Day" && !isListView && (
            <>
              <button onClick={() => handleNavigateDate("prev")} style={{ background: "none", border: "none", cursor: "pointer", fontSize: "2rem", color: "#2b4a8e" }}>‹</button>
              <div style={{ textAlign: "center", color: "#2b4a8e" }}>
                <div style={{ fontSize: "1.2rem", fontWeight: "900", lineHeight: "1.2" }}>{displayDayName}</div>
                <div style={{ fontSize: "1.05rem", fontWeight: "800", opacity: 0.9 }}>{displayDateNum}</div>
              </div>
              <button onClick={() => handleNavigateDate("next")} style={{ background: "none", border: "none", cursor: "pointer", fontSize: "2rem", color: "#2b4a8e" }}>›</button>
            </>
          )}

          {viewMode === "Month" && !isListView && (
            <>
              <button onClick={() => handleNavigateDate("prev")} style={{ background: "none", border: "none", cursor: "pointer", fontSize: "2rem", color: "#2b4a8e" }}>‹</button>
              <div style={{ fontSize: "1.5rem", fontWeight: "900", color: "#2b4a8e" }}>{displayMonthName}</div>
              <button onClick={() => handleNavigateDate("next")} style={{ background: "none", border: "none", cursor: "pointer", fontSize: "2rem", color: "#2b4a8e" }}>›</button>
            </>
          )}

          {viewMode === "Semester" && !isListView && (
            <div style={{ fontSize: "1.5rem", fontWeight: "900", color: "#2b4a8e" }}>{selectedSemester}</div>
          )}
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
          <span style={{ color: isListView ? "#2b4a8e" : "#6c757d", fontWeight: isListView ? "900" : "600", fontSize: "1rem" }}>List View</span>
          <div
            onClick={() => setIsListView(!isListView)}
            style={{
              width: "46px",
              height: "26px",
              background: isListView ? "#6c757d" : "#2b4a8e",
              borderRadius: "13px",
              position: "relative",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              transition: "background 0.3s",
            }}
          >
            <div
              style={{
                width: "20px",
                height: "20px",
                background: "white",
                borderRadius: "50%",
                position: "absolute",
                left: isListView ? "3px" : "auto",
                right: isListView ? "auto" : "3px",
                boxShadow: "0 1px 2px rgba(0,0,0,0.2)",
                transition: "all 0.3s",
              }}
            />
          </div>
          <span style={{ color: !isListView ? "#2b4a8e" : "#6c757d", fontWeight: !isListView ? "900" : "600", fontSize: "1rem" }}>Calendar View</span>
        </div>
      </div>

      {/* MAIN */}
      {loading ? (
        <p>Loading...</p>
      ) : isListView ? (
        renderListView()
      ) : viewMode === "Semester" ? (
        renderSemesterPlan()
      ) : viewMode === "Month" ? (
        renderMonthView()
      ) : (
        renderTimelineGrid()
      )}

      {/* MODAL */}
      {showModal && !isStudent && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.4)", display: "flex", justifyContent: "center", alignItems: "center", zIndex: 1000, backdropFilter: "blur(3px)" }}>
          <div style={{ background: "white", padding: "30px", borderRadius: "14px", width: "520px", boxShadow: "0 10px 30px rgba(0,0,0,0.15)" }}>
            <h3 style={{ marginTop: 0, marginBottom: "16px", color: "#343a40", fontSize: "1.4rem", fontWeight: "900" }}>Schedule Class</h3>
            <p style={{ marginBottom: "18px", color: "#6c757d", fontSize: "1.05rem" }}>
              <strong>{newEntry.day}</strong>
            </p>

            <label style={{ display: "block", marginBottom: "6px", fontWeight: "900" }}>Start time</label>
            <input
              type="time"
              step="900"
              style={{ width: "100%", padding: "12px", marginBottom: "16px", borderRadius: "8px", border: "1px solid #ced4da", fontSize: "1rem" }}
              value={newEntry.start_time}
              onChange={(e) => setNewEntry({ ...newEntry, start_time: e.target.value })}
            />

            <label style={{ display: "block", marginBottom: "6px", fontWeight: "900" }}>End time</label>
            <input
              type="time"
              step="900"
              style={{ width: "100%", padding: "12px", marginBottom: "16px", borderRadius: "8px", border: "1px solid #ced4da", fontSize: "1rem" }}
              value={newEntry.end_time}
              onChange={(e) => setNewEntry({ ...newEntry, end_time: e.target.value })}
            />

            <label style={{ display: "block", marginBottom: "6px", fontWeight: "900" }}>Module</label>
            <select
              style={{ width: "100%", padding: "12px", marginBottom: "16px", borderRadius: "8px", border: "1px solid #ced4da", fontSize: "1rem" }}
              value={newEntry.offered_module_id}
              onChange={(e) => setNewEntry({ ...newEntry, offered_module_id: e.target.value })}
            >
              <option value="">-- Select Module --</option>
              {offeredModules.map((m) => (
                <option key={m.id} value={String(m.id)}>
                  {getModuleLabel(m)}
                </option>
              ))}
            </select>

            <label style={{ display: "block", marginBottom: "6px", fontWeight: "900" }}>Room</label>
            <select
              style={{ width: "100%", padding: "12px", marginBottom: "16px", borderRadius: "8px", border: "1px solid #ced4da", fontSize: "1rem" }}
              value={newEntry.room_id}
              onChange={(e) => setNewEntry({ ...newEntry, room_id: e.target.value })}
            >
              <option value="">-- Select Room --</option>
              {rooms.map((r) => (
                <option key={r.id} value={String(r.id)}>
                  {r.name}
                </option>
              ))}
            </select>

            <label style={{ display: "block", marginBottom: "6px", fontWeight: "900" }}>Groups</label>
            <select
              multiple
              style={{ width: "100%", padding: "12px", marginBottom: "22px", borderRadius: "8px", border: "1px solid #ced4da", fontSize: "1rem", minHeight: "140px" }}
              value={newEntry.group_ids.map(String)}
              onChange={(e) => {
                const selected = Array.from(e.target.selectedOptions).map((opt) => Number(opt.value));
                setNewEntry({ ...newEntry, group_ids: selected });
              }}
            >
              {groups.map((g) => (
                <option key={g.id} value={String(g.id)}>
                  {getGroupName(g)}
                </option>
              ))}
            </select>

            <div style={{ textAlign: "right", display: "flex", justifyContent: "flex-end", gap: "10px" }}>
              <button onClick={() => setShowModal(false)} style={{ padding: "12px 22px", background: "white", border: "1px solid #ced4da", borderRadius: "8px", cursor: "pointer", fontWeight: "800" }}>
                Cancel
              </button>
              <button onClick={handleSave} style={{ padding: "12px 26px", background: "#2b4a8e", color: "white", border: "none", borderRadius: "8px", cursor: "pointer", fontWeight: "900" }}>
                Save Class
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}