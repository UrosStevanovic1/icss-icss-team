import React, { useState, useEffect, useCallback } from "react";
import api from "../api";

// ✅ RECIBIMOS currentUserRole DESDE App.jsx
export default function TimetableManager({ currentUserRole }) {
  const isStudent = currentUserRole === "student";

  // --- ESTADOS ---
  const [semesters, setSemesters] = useState([]);
  const [selectedSemester, setSelectedSemester] = useState("");
  const [scheduleData, setScheduleData] = useState([]);

  // Listas
  const [offeredModules, setOfferedModules] = useState([]);
  const [rooms, setRooms] = useState([]);
  const [lecturers, setLecturers] = useState([]);
  const [groups, setGroups] = useState([]);

  // Filtros
  const [filterLecturer, setFilterLecturer] = useState("");
  const [filterGroup, setFilterGroup] = useState("");
  // ✅ removed filterRoom (Location filter)

  const [loading, setLoading] = useState(false);
  const [showModal, setShowModal] = useState(false);

  // VISTA, FECHA Y MODO
  const [viewMode, setViewMode] = useState("Week"); // "Day" | "Week" | "Month" | "Semester"
  const [currentDate, setCurrentDate] = useState(new Date());
  const [isListView, setIsListView] = useState(false);

  // TIPO DE SEMESTRE (Winter vs Summer)
  const [semesterType, setSemesterType] = useState("Winter");

  // ✅ include end_time + selected groups (multi)
  const [newEntry, setNewEntry] = useState({
    day: "",
    time: "",
    end_time: "",
    offered_module_id: "",
    room_id: "",
    group_ids: [],
  });

  const daysOfWeek = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"];

  // Hours range
  const hours = [
    "08:00",
    "09:00",
    "10:00",
    "11:00",
    "12:00",
    "13:00",
    "14:00",
    "15:00",
    "16:00",
    "17:00",
    "18:00",
    "19:00",
    "20:00",
  ];

  // Colores Pastel
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

  // --- HELPERS DE FECHAS (CW CALCULATION) ---
  const getWeekNumber = (d) => {
    d = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
    d.setUTCDate(d.getUTCDate() + 4 - (d.getUTCDay() || 7));
    const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
    const weekNo = Math.ceil((((d - yearStart) / 86400000) + 1) / 7);
    return weekNo;
  };

  const formatDateShort = (date) => {
    return date.toLocaleDateString("en-GB", { day: "2-digit", month: "2-digit", year: "2-digit" }).replace(/\//g, ".");
  };

  const getWeekRangeString = () => {
    const curr = new Date(currentDate);
    const day = curr.getDay() || 7;
    const monday = new Date(curr);
    monday.setDate(curr.getDate() - day + 1);
    const friday = new Date(monday);
    friday.setDate(monday.getDate() + 4);
    return `(${formatDateShort(monday)}-${formatDateShort(friday)})`;
  };

  // --- HELPERS TIME (supports 09:30 etc.) ---
  const addHoursToTime = (timeStr, addHours) => {
    const [hh, mm] = timeStr.split(":").map((x) => parseInt(x, 10));
    const d = new Date(2000, 0, 1, hh, mm, 0);
    d.setHours(d.getHours() + addHours);
    const h2 = String(d.getHours()).padStart(2, "0");
    const m2 = String(d.getMinutes()).padStart(2, "0");
    return `${h2}:${m2}`;
  };

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

  const buildHalfHourSlotsFromHours = () => {
    const start = timeToMinutes(hours[0]);
    const end = timeToMinutes(hours[hours.length - 1]);
    const slots = [];
    for (let m = start; m <= end; m += 30) slots.push(minutesToTime(m));
    return slots;
  };

  // ✅ Day view shows 30-min slots; Week view stays hourly
  const timeSlots = viewMode === "Day" ? buildHalfHourSlotsFromHours() : hours;

  // ✅ Block adding only for selected lecturer AND only in Day/Month views
  const isLecturerBusyAt = (day, slotStartTime, slotMinutes = 30) => {
    if (!(viewMode === "Day" || viewMode === "Month")) return false;
    if (!filterLecturer) return false;

    const slotStart = timeToMinutes(slotStartTime);
    const slotEnd = slotStart + slotMinutes;

    // Check against ALL schedule entries for that lecturer (not only filteredData)
    const lecturerEntries = scheduleData.filter((e) => e.day_of_week === day && e.lecturer_name === filterLecturer);

    return lecturerEntries.some((e) => {
      const s = timeToMinutes(e.start_time);
      const en = timeToMinutes(e.end_time);
      return slotStart < en && slotEnd > s; // overlap
    });
  };

  // --- CARGA DE DATOS ---
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
    async function loadInitialData() {
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
    }
    loadInitialData();
  }, []);

  useEffect(() => {
    if (selectedSemester) {
      loadSchedule();
      loadDropdowns();
    }
  }, [selectedSemester, loadSchedule, loadDropdowns]);

  // --- FILTRADO ---
  const getFilteredSchedule = () => {
    return scheduleData.filter((entry) => {
      if (filterLecturer && entry.lecturer_name !== filterLecturer) return false;

      // ✅ group filter (supports entry.group_names OR entry.groups from backend)
      if (filterGroup) {
        const groupNames =
          entry.group_names || (Array.isArray(entry.groups) ? entry.groups.map((g) => g.name) : []);
        if (!groupNames.includes(filterGroup)) return false;
      }

      return true;
    });
  };
  const filteredData = getFilteredSchedule();

  // --- NAVEGACIÓN ---
  const handleNavigateDate = (direction) => {
    if (viewMode === "Semester" && !isListView) return;

    const newDate = new Date(currentDate);
    if (viewMode === "Week" || isListView) {
      newDate.setDate(currentDate.getDate() + (direction === "next" ? 7 : -7));
    } else if (viewMode === "Day") {
      newDate.setDate(currentDate.getDate() + (direction === "next" ? 1 : -1));
    } else if (viewMode === "Month") {
      newDate.setMonth(currentDate.getMonth() + (direction === "next" ? 1 : -1));
    }
    setCurrentDate(newDate);
  };

  const getDayNameFromDate = (date) => date.toLocaleDateString("en-US", { weekday: "long" });
  const displayDayName = currentDate.toLocaleDateString("en-US", { weekday: "long" });
  const displayDateNum = formatDateShort(currentDate);
  const displayMonthName = currentDate.toLocaleDateString("en-US", { month: "long", year: "numeric" });

  const visibleDays = viewMode === "Week" ? daysOfWeek : [getDayNameFromDate(currentDate)];

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

  // --- HANDLERS ---
  const handleCellClick = (day, time) => {
    if (isStudent) return; // ✅ ESTUDIANTES NO PUEDEN AGREGAR CLASES

    // ✅ block adding only for selected lecturer (Day/Month views)
    if (isLecturerBusyAt(day, time, viewMode === "Day" ? 30 : 60)) {
      alert("Selected lecturer is busy at this time.");
      return;
    }

    // ✅ default end time (editable)
    const defaultEnd = addHoursToTime(time, 1);
    setNewEntry({ day, time, end_time: defaultEnd, offered_module_id: "", room_id: "", group_ids: [] });
    setShowModal(true);
  };

  const handleSave = async () => {
    if (!newEntry.offered_module_id || !newEntry.room_id) return alert("Select module and room");
    if (!newEntry.end_time) return alert("Select end time");
    if (!newEntry.group_ids || newEntry.group_ids.length === 0) return alert("Select at least 1 group");

    try {
      await api.createScheduleEntry({
        offered_module_id: newEntry.offered_module_id,
        room_id: newEntry.room_id,
        day_of_week: newEntry.day,
        start_time: newEntry.time,
        end_time: newEntry.end_time,
        semester: selectedSemester,
        // ✅ send groups (multi)
        group_ids: newEntry.group_ids,
      });
      setShowModal(false);
      loadSchedule();
    } catch (e) {
      alert("Error: " + e.message);
    }
  };

  const handleDelete = async (id, e) => {
    e.stopPropagation();
    if (isStudent) return; // ✅ ESTUDIANTES NO PUEDEN BORRAR CLASES
    if (!window.confirm("Delete session?")) return;
    try {
      await api.deleteScheduleEntry(id);
      loadSchedule();
    } catch (e) {
      alert("Error deleting");
    }
  };

  const getEntryForSlot = (day, time) => {
    if (viewMode === "Day") {
      // ✅ exact match so 09:30 starts render correctly
      return filteredData.find((entry) => entry.day_of_week === day && entry.start_time === time);
    }
    const hourPrefix = time.split(":")[0];
    return filteredData.find((entry) => entry.day_of_week === day && entry.start_time.startsWith(hourPrefix));
  };

  // --- RENDERIZADORES ---

  // 1. LISTA TIPO "ANDY VIEW"
  const renderListView = () => {
    const sortedList = [...filteredData].sort((a, b) => {
      const dayOrder = { Monday: 1, Tuesday: 2, Wednesday: 3, Thursday: 4, Friday: 5 };
      if (dayOrder[a.day_of_week] !== dayOrder[b.day_of_week]) return dayOrder[a.day_of_week] - dayOrder[b.day_of_week];
      return a.start_time.localeCompare(b.start_time);
    });

    return (
      <div style={{ marginTop: "20px", overflowX: "auto", boxShadow: "0 2px 5px rgba(0,0,0,0.05)", borderRadius: "4px" }}>
        <table style={{ width: "100%", borderCollapse: "collapse", fontFamily: "'Inter', sans-serif", fontSize: "0.9rem" }}>
          <thead>
            <tr style={{ background: "#2b4a8e", color: "white", borderBottom: "2px solid #1a3b70" }}>
              <th style={{ padding: "12px 10px", textAlign: "left" }}>Date</th>
              <th style={{ padding: "12px 10px", textAlign: "left" }}>Day</th>
              <th style={{ padding: "12px 10px", textAlign: "left" }}>From</th>
              <th style={{ padding: "12px 10px", textAlign: "left" }}>To</th>
              <th style={{ padding: "12px 10px", textAlign: "left" }}>Module</th>
              <th style={{ padding: "12px 10px", textAlign: "left" }}>Lecturer(s)</th>
              <th style={{ padding: "12px 10px", textAlign: "left" }}>Group</th>
              <th style={{ padding: "12px 10px", textAlign: "left" }}>Location</th>
              {!isStudent && <th style={{ padding: "12px 10px", textAlign: "center" }}>Action</th>}
            </tr>
          </thead>
          <tbody>
            {sortedList.length === 0 ? (
              <tr>
                <td colSpan={isStudent ? "8" : "9"} style={{ padding: "20px", textAlign: "center", color: "#666" }}>
                  No classes scheduled for this view.
                </td>
              </tr>
            ) : (
              sortedList.map((entry, idx) => {
                const dateStr = getDateForDayOfWeek(entry.day_of_week);
                return (
                  <tr key={entry.id} style={{ background: idx % 2 === 0 ? "#f1f3f5" : "white", borderBottom: "1px solid #dee2e6" }}>
                    <td style={{ padding: "10px", color: "#495057" }}>{dateStr}</td>
                    <td style={{ padding: "10px", fontWeight: "600", color: "#343a40" }}>{entry.day_of_week}</td>
                    <td style={{ padding: "10px", color: "#495057" }}>{entry.start_time}</td>
                    <td style={{ padding: "10px", color: "#495057" }}>{entry.end_time}</td>
                    <td style={{ padding: "10px", fontWeight: "bold", color: "#2b4a8e" }}>{entry.module_name}</td>
                    <td style={{ padding: "10px", color: "#495057" }}>{entry.lecturer_name}</td>
                    <td style={{ padding: "10px", color: "#495057" }}>{filterGroup || "All"}</td>
                    <td style={{ padding: "10px", color: "#495057" }}>📍 {entry.room_name}</td>
                    {!isStudent && (
                      <td style={{ padding: "10px", textAlign: "center" }}>
                        <button
                          onClick={(e) => handleDelete(entry.id, e)}
                          style={{ background: "none", border: "none", color: "#c92a2a", cursor: "pointer", fontSize: "1.1rem" }}
                        >
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

  // 2. VISTA SEMESTRAL
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
              transition: "all 0.2s",
              fontSize: "0.95rem",
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
              transition: "all 0.2s",
              fontSize: "0.95rem",
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
                    const dailyClasses = filteredData.filter((c) => c.day_of_week === dayName);

                    return (
                      <tr key={dayNum} style={{ background: isWeekend ? "#e9ecef" : "white", borderBottom: "1px solid #f1f3f5" }}>
                        <td style={{ padding: "7px", textAlign: "center", fontWeight: "800", color: "#666", borderRight: "1px solid #eee" }}>
                          {dayNum < 10 ? `0${dayNum}` : dayNum}
                        </td>
                        <td style={{ padding: "7px", color: isWeekend ? "#adb5bd" : "#333", fontSize: "0.8rem", borderRight: "1px solid #eee", fontWeight: 700 }}>
                          {dayName.substring(0, 3)}
                        </td>
                        <td style={{ padding: "6px" }}>
                          {dailyClasses.length > 0 ? (
                            <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
                              {dailyClasses.map((cls) => (
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
                                    <strong>
                                      {cls.start_time} - {cls.end_time}
                                    </strong>{" "}
                                    {cls.module_name}
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

  // 3. VISTA MES
  const renderMonthView = () => {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    const firstDay = new Date(year, month, 1);
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const startDayOfWeek = firstDay.getDay() === 0 ? 6 : firstDay.getDay() - 1;
    const calendarCells = [];

    for (let i = 0; i < startDayOfWeek; i++) {
      calendarCells.push(<div key={`empty-${i}`} style={{ background: "#f8f9fa", border: "1px solid #eee", minHeight: "110px" }} />);
    }

    for (let d = 1; d <= daysInMonth; d++) {
      const currentDayDate = new Date(year, month, d);
      const dayName = getDayNameFromDate(currentDayDate);
      const dailyClasses = filteredData.filter((entry) => entry.day_of_week === dayName);

      calendarCells.push(
        <div key={d} style={{ border: "1px solid #eee", minHeight: "110px", padding: "8px", background: "white" }}>
          <div style={{ textAlign: "right", fontWeight: "800", color: "#ccc", marginBottom: "6px" }}>{d}</div>
          <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
            {dailyClasses.map((cls) => (
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
        {calendarCells}
      </div>
    );
  };

  // 4. VISTA GRID (SEMANA / DÍA)
  const renderGridView = () => (
    <div style={{ borderTop: "1px solid #e9ecef", overflowX: "auto" }}>
      <table style={{ width: "100%", borderCollapse: "collapse", minWidth: "1000px", tableLayout: "fixed" }}>
        <thead>
          <tr>
            <th style={{ width: "90px", borderRight: "1px solid #e9ecef" }}></th>
            {visibleDays.map((day) => (
              <th
                key={day}
                style={{
                  padding: "18px",
                  textAlign: "center",
                  fontWeight: "900",
                  color: "#2b4a8e",
                  fontSize: "1.2rem",
                  borderBottom: "2px solid #dee2e6",
                  borderRight: "1px solid #f1f3f5",
                }}
              >
                {day}
                <div style={{ fontSize: "0.9rem", color: "#888", fontWeight: "600", marginTop: "6px" }}>
                  {viewMode === "Week" && "(Weekly Schedule)"}
                </div>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {timeSlots.map((slot) => (
            <tr key={slot}>
              <td
                style={{
                  padding: "18px 10px",
                  textAlign: "center",
                  color: "#343a40",
                  fontWeight: "900",
                  borderRight: "1px solid #e9ecef",
                  borderBottom: "1px solid #f8f9fa",
                  verticalAlign: "middle",
                  fontSize: "1rem",
                }}
              >
                {slot}
              </td>

              {visibleDays.map((day) => {
                const entry = getEntryForSlot(day, slot);
                const colors = entry ? getColorForModule(entry.module_name) : null;

                const slotMinutes = viewMode === "Day" ? 30 : 60;
                const busyForLecturer = !isStudent && isLecturerBusyAt(day, slot, slotMinutes);

                return (
                  <td
                    key={day}
                    onClick={() => !entry && !busyForLecturer && handleCellClick(day, slot)}
                    style={{
                      borderRight: "1px solid #f1f3f5",
                      borderBottom: "1px solid #f1f3f5",
                      height: viewMode === "Day" ? "90px" : "125px",
                      padding: "8px",
                      verticalAlign: "top",
                      cursor: entry || isStudent ? "default" : busyForLecturer ? "not-allowed" : "pointer",
                      background: !entry && busyForLecturer ? "#f1f3f5" : "white",
                    }}
                  >
                    {entry ? (
                      <div
                        style={{
                          background: colors.bg,
                          borderLeft: `6px solid ${colors.border}`,
                          borderRadius: "10px",
                          height: "100%",
                          padding: "12px 12px",
                          position: "relative",
                          boxShadow: "0 4px 10px rgba(0,0,0,0.05)",
                          display: "flex",
                          flexDirection: "column",
                          justifyContent: "space-between",
                          width: "100%",
                        }}
                      >
                        <div>
                          <div style={{ fontSize: "0.95rem", fontWeight: "900", color: "#2b4a8e", marginBottom: "6px" }}>
                            {entry.start_time} - {entry.end_time}
                          </div>
                          <div style={{ fontWeight: "900", fontSize: "1.05rem", color: "#212529", lineHeight: 1.2 }}>
                            {entry.module_name}
                          </div>
                          <div style={{ fontSize: "0.95rem", color: "#495057", fontWeight: 700, marginTop: "4px" }}>
                            {entry.lecturer_name}
                          </div>
                        </div>

                        <div style={{ fontSize: "0.95rem", fontWeight: "900", display: "flex", alignItems: "center", gap: "6px" }}>
                          <span aria-hidden>📍</span>
                          <span>{entry.room_name}</span>
                        </div>

                        {!isStudent && (
                          <button
                            onClick={(e) => handleDelete(entry.id, e)}
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
                    ) : null}
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );

  // --- ESTILOS ---
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

      {/* FILTROS */}
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
              <option key={g.id} value={g.name}>
                {g.name}
              </option>
            ))}
          </select>
        </div>

        {/* ✅ OCULTAR FILTRO DE PROFESOR A ESTUDIANTES */}
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

        {/* ✅ Location filter removed */}
      </div>

      {/* CONTROLES */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "25px" }}>
        <div style={{ display: "flex", gap: "10px" }}>
          <button style={navButtonStyle("Day")} onClick={() => setViewMode("Day")}>
            Day
          </button>
          <button style={navButtonStyle("Week")} onClick={() => setViewMode("Week")}>
            Week
          </button>
          <button style={navButtonStyle("Month")} onClick={() => setViewMode("Month")}>
            Month
          </button>
          <button style={navButtonStyle("Semester")} onClick={() => setViewMode("Semester")}>
            Semester
          </button>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: "20px" }}>
          {viewMode === "Week" && !isListView && (
            <>
              <button onClick={() => handleNavigateDate("prev")} style={{ background: "none", border: "none", cursor: "pointer", fontSize: "2rem", color: "#2b4a8e" }}>
                ‹
              </button>
              <div style={{ textAlign: "center", color: "#2b4a8e" }}>
                <div style={{ fontSize: "1.2rem", fontWeight: "900", lineHeight: "1.2" }}>CW {getWeekNumber(currentDate)}</div>
                <div style={{ fontSize: "1.05rem", fontWeight: "800", opacity: 0.9 }}>{getWeekRangeString()}</div>
              </div>
              <button onClick={() => handleNavigateDate("next")} style={{ background: "none", border: "none", cursor: "pointer", fontSize: "2rem", color: "#2b4a8e" }}>
                ›
              </button>
            </>
          )}

          {viewMode === "Day" && !isListView && (
            <>
              <button onClick={() => handleNavigateDate("prev")} style={{ background: "none", border: "none", cursor: "pointer", fontSize: "2rem", color: "#2b4a8e" }}>
                ‹
              </button>
              <div style={{ textAlign: "center", color: "#2b4a8e" }}>
                <div style={{ fontSize: "1.2rem", fontWeight: "900", lineHeight: "1.2" }}>{displayDayName}</div>
                <div style={{ fontSize: "1.05rem", fontWeight: "800", opacity: 0.9 }}>{displayDateNum}</div>
              </div>
              <button onClick={() => handleNavigateDate("next")} style={{ background: "none", border: "none", cursor: "pointer", fontSize: "2rem", color: "#2b4a8e" }}>
                ›
              </button>
            </>
          )}

          {viewMode === "Month" && !isListView && (
            <>
              <button onClick={() => handleNavigateDate("prev")} style={{ background: "none", border: "none", cursor: "pointer", fontSize: "2rem", color: "#2b4a8e" }}>
                ‹
              </button>
              <div style={{ fontSize: "1.5rem", fontWeight: "900", color: "#2b4a8e" }}>{displayMonthName}</div>
              <button onClick={() => handleNavigateDate("next")} style={{ background: "none", border: "none", cursor: "pointer", fontSize: "2rem", color: "#2b4a8e" }}>
                ›
              </button>
            </>
          )}

          {viewMode === "Semester" && !isListView && <div style={{ fontSize: "1.5rem", fontWeight: "900", color: "#2b4a8e" }}>{selectedSemester}</div>}
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
            ></div>
          </div>
          <span style={{ color: !isListView ? "#2b4a8e" : "#6c757d", fontWeight: !isListView ? "900" : "600", fontSize: "1rem" }}>Calendar View</span>
        </div>
      </div>

      {loading ? <p>Loading...</p> : isListView ? renderListView() : viewMode === "Month" ? renderMonthView() : viewMode === "Semester" ? renderSemesterPlan() : renderGridView()}

      {showModal && !isStudent && (
        <div style={{ position: "fixed", top: 0, left: 0, right: 0, bottom: 0, background: "rgba(0,0,0,0.4)", display: "flex", justifyContent: "center", alignItems: "center", zIndex: 1000, backdropFilter: "blur(3px)" }}>
          <div style={{ background: "white", padding: "30px", borderRadius: "14px", width: "460px", boxShadow: "0 10px 30px rgba(0,0,0,0.15)" }}>
            <h3 style={{ marginTop: 0, marginBottom: "16px", color: "#343a40", fontSize: "1.4rem", fontWeight: "900" }}>Schedule Class</h3>
            <p style={{ marginBottom: "18px", color: "#6c757d", fontSize: "1.05rem" }}>
              <strong>{newEntry.day}</strong> at <strong>{newEntry.time}</strong>
            </p>

            <label style={{ display: "block", marginBottom: "6px", fontWeight: "900" }}>Module</label>
            <select
              style={{ width: "100%", padding: "12px", marginBottom: "16px", borderRadius: "8px", border: "1px solid #ced4da", fontSize: "1rem" }}
              value={newEntry.offered_module_id}
              onChange={(e) => setNewEntry({ ...newEntry, offered_module_id: e.target.value })}
            >
              <option value="">-- Select Module --</option>
              {offeredModules.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.module_name} ({m.lecturer_name})
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
                <option key={r.id} value={r.id}>
                  {r.name}
                </option>
              ))}
            </select>

            {/* ✅ END TIME */}
            <label style={{ display: "block", marginBottom: "6px", fontWeight: "900" }}>End time</label>
            <input
              type="time"
              step="60"
              style={{ width: "100%", padding: "12px", marginBottom: "16px", borderRadius: "8px", border: "1px solid #ced4da", fontSize: "1rem" }}
              value={newEntry.end_time}
              onChange={(e) => setNewEntry({ ...newEntry, end_time: e.target.value })}
            />

            {/* ✅ GROUPS (multi) */}
            <label style={{ display: "block", marginBottom: "6px", fontWeight: "900" }}>Groups</label>
            <select
              multiple
              style={{
                width: "100%",
                padding: "12px",
                marginBottom: "22px",
                borderRadius: "8px",
                border: "1px solid #ced4da",
                fontSize: "1rem",
                minHeight: "120px",
              }}
              value={newEntry.group_ids}
              onChange={(e) => {
                const selected = Array.from(e.target.selectedOptions).map((opt) => Number(opt.value));
                setNewEntry({ ...newEntry, group_ids: selected });
              }}
            >
              {groups.map((g) => (
                <option key={g.id} value={String(g.id)}>
                  {g.name}
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