import React, { useState, useEffect, useCallback, useMemo } from "react";
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
  const [filterRoom, setFilterRoom] = useState("");

  const [loading, setLoading] = useState(false);

  // VISTA, FECHA Y MODO
  const [viewMode, setViewMode] = useState("Week"); // Day | Week | Month | Semester
  const [currentDate, setCurrentDate] = useState(new Date());
  const [isListView, setIsListView] = useState(false);

  // TIPO DE SEMESTRE (Winter vs Summer)
  const [semesterType, setSemesterType] = useState("Winter");

  // Modal (create/edit)
  const [showModal, setShowModal] = useState(false);
  const [editingEntry, setEditingEntry] = useState(null); // edit via delete+create to match api.js

  const [form, setForm] = useState({
    day: "",
    start_time: "09:00",
    end_time: "10:00",
    offered_module_id: "",
    room_id: "",
    group_ids: [],
  });

  const daysOfWeek = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"];

  // Hours for the classic calendar grid views (Month/Semester untouched)
  const hours = [
    "08:00", "09:00", "10:00", "11:00", "12:00", "13:00",
    "14:00", "15:00", "16:00", "17:00", "18:00", "19:00", "20:00"
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

  const timeToMinutes = (t) => {
    if (!t || typeof t !== "string" || !t.includes(":")) return 0;
    const [hh, mm] = t.split(":").map((x) => parseInt(x, 10));
    return hh * 60 + mm;
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
    return date
      .toLocaleDateString("en-GB", { day: "2-digit", month: "2-digit", year: "2-digit" })
      .replace(/\//g, ".");
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

  const getDayNameFromDate = (date) => date.toLocaleDateString("en-US", { weekday: "long" });
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

  // --- CARGA DE DATOS ---
  const loadSchedule = useCallback(async () => {
    if (!selectedSemester) return;
    setLoading(true);
    try {
      const data = await api.getSchedule(selectedSemester);
      setScheduleData(data || []);
    } catch (e) {
      console.error(e);
    }
    setLoading(false);
  }, [selectedSemester]);

  const loadDropdowns = useCallback(async () => {
    if (!selectedSemester) return;
    try {
      const mods = await api.getOfferedModules(selectedSemester);
      setOfferedModules(mods || []);
      const r = await api.getRooms();
      setRooms(r || []);
    } catch (e) {
      console.error(e);
    }
  }, [selectedSemester]);

  useEffect(() => {
    async function loadInitialData() {
      try {
        const s = await api.getSemesters();
        setSemesters(s || []);
        if (s && s.length > 0) setSelectedSemester(s[0].name);

        const l = await api.getLecturers();
        setLecturers(l || []);

        const g = await api.getGroups();
        setGroups(g || []);
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
  const filteredData = useMemo(() => {
    return (scheduleData || []).filter((entry) => {
      if (filterLecturer && entry.lecturer_name !== filterLecturer) return false;
      if (filterRoom && String(entry.room_name) !== filterRoom) return false;

      if (filterGroup) {
        const groupNames =
          entry.group_names ||
          (Array.isArray(entry.groups) ? entry.groups.map((g) => g.name ?? g.Name) : []);
        if (!groupNames.includes(filterGroup)) return false;
      }
      return true;
    });
  }, [scheduleData, filterLecturer, filterRoom, filterGroup]);

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

  // --- Modal helpers (ONLY used in Day/Week changes) ---
  const getModuleLabel = (m) => {
    const modName = m.module_name ?? m.name ?? m.module?.name ?? m.module?.Name ?? "Unnamed module";
    const lecName = m.lecturer_name ?? m.lecturerName ?? m.lecturer?.name ?? "";
    return lecName ? `${modName} (${lecName})` : modName;
  };

  const getGroupName = (g) => g.name ?? g.Name ?? g.group_name ?? "Unnamed group";

  const openAdd = (day) => {
    if (isStudent) return;
    setEditingEntry(null);
    setForm({
      day,
      start_time: "09:00",
      end_time: "10:00",
      offered_module_id: "",
      room_id: "",
      group_ids: [],
    });
    setShowModal(true);
  };

  const openEdit = (entry) => {
    if (isStudent) return;
    setEditingEntry(entry);
    setForm({
      day: entry.day_of_week,
      start_time: entry.start_time,
      end_time: entry.end_time,
      offered_module_id: String(entry.offered_module_id ?? ""),
      room_id: "", // backend doesn't return room_id; user can reselect
      group_ids: Array.isArray(entry.group_ids) ? entry.group_ids : [],
    });
    setShowModal(true);
  };

  const handleSave = async () => {
    if (!form.offered_module_id) return alert("Select module");
    if (!form.room_id) return alert("Select room");
    if (!form.group_ids || form.group_ids.length === 0) return alert("Select at least 1 group");

    const s = timeToMinutes(form.start_time);
    const e = timeToMinutes(form.end_time);
    if (e <= s) return alert("End time must be after start time");

    try {
      // edit without PUT => delete old, then create new (matches previous api.js)
      if (editingEntry?.id) {
        await api.deleteScheduleEntry(editingEntry.id);
      }

      await api.createScheduleEntry({
        offered_module_id: Number(form.offered_module_id),
        room_id: Number(form.room_id),
        day_of_week: form.day,
        start_time: form.start_time,
        end_time: form.end_time,
        semester: selectedSemester,
        group_ids: form.group_ids,
      });

      setShowModal(false);
      setEditingEntry(null);
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
    } catch {
      alert("Error deleting");
    }
  };

  // --- 1) LIST VIEW (UNCHANGED style) ---
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
              <tr><td colSpan={isStudent ? "8" : "9"} style={{ padding: "20px", textAlign: "center", color: "#666" }}>No classes scheduled for this view.</td></tr>
            ) : (
              sortedList.map((entry, idx) => {
                const dateStr = getDateForDayOfWeek(entry.day_of_week);
                const groupLine = Array.isArray(entry.group_names) ? entry.group_names.join(", ") : (filterGroup || "All");
                return (
                  <tr key={entry.id} style={{ background: idx % 2 === 0 ? "#f1f3f5" : "white", borderBottom: "1px solid #dee2e6" }}>
                    <td style={{ padding: "10px", color: "#495057" }}>{dateStr}</td>
                    <td style={{ padding: "10px", fontWeight: "600", color: "#343a40" }}>{entry.day_of_week}</td>
                    <td style={{ padding: "10px", color: "#495057" }}>{entry.start_time}</td>
                    <td style={{ padding: "10px", color: "#495057" }}>{entry.end_time}</td>
                    <td style={{ padding: "10px", fontWeight: "bold", color: "#2b4a8e" }}>{entry.module_name}</td>
                    <td style={{ padding: "10px", color: "#495057" }}>{entry.lecturer_name}</td>
                    <td style={{ padding: "10px", color: "#495057" }}>{groupLine}</td>
                    <td style={{ padding: "10px", color: "#495057" }}>{entry.room_name}</td>
                    {!isStudent && (
                      <td style={{ padding: "10px", textAlign: "center" }}>
                        <button onClick={(e) => handleDelete(entry.id, e)} style={{ background: "none", border: "none", color: "#c92a2a", cursor: "pointer", fontSize: "1.1rem" }}>×</button>
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

  // --- 2) SEMESTER VIEW (UNCHANGED from before) ---
  const renderSemesterPlan = () => {
    let months = [];
    if (semesterType === "Winter") {
      months = [
        { name: "October", days: 31, startDay: 2 },
        { name: "November", days: 30, startDay: 5 },
        { name: "December", days: 31, startDay: 0 },
        { name: "January", days: 31, startDay: 3 },
        { name: "February", days: 28, startDay: 6 }
      ];
    } else {
      months = [
        { name: "April", days: 30, startDay: 3 },
        { name: "May", days: 31, startDay: 5 },
        { name: "June", days: 30, startDay: 1 },
        { name: "July", days: 31, startDay: 3 },
        { name: "August", days: 31, startDay: 6 }
      ];
    }
    return (
      <div style={{marginTop: "20px"}}>
        <div style={{display:"flex", justifyContent:"center", marginBottom:"20px", gap:"10px"}}>
          <button onClick={() => setSemesterType("Winter")} style={{padding: "8px 20px", borderRadius: "20px", border: "1px solid #2b4a8e", background: semesterType === "Winter" ? "#2b4a8e" : "white", color: semesterType === "Winter" ? "white" : "#2b4a8e", fontWeight: "bold", cursor: "pointer", transition: "all 0.2s"}}>❄️ Winter Semester (Oct - Feb)</button>
          <button onClick={() => setSemesterType("Summer")} style={{padding: "8px 20px", borderRadius: "20px", border: "1px solid #2b4a8e", background: semesterType === "Summer" ? "#2b4a8e" : "white", color: semesterType === "Summer" ? "white" : "#2b4a8e", fontWeight: "bold", cursor: "pointer", transition: "all 0.2s"}}>☀️ Summer Semester (Apr - Aug)</button>
        </div>
        <div style={{ display: "flex", gap: "20px", overflowX: "auto", paddingBottom: "20px" }}>
          {months.map((month, mIdx) => (
            <div key={mIdx} style={{ minWidth: "320px", background: "white", border: "1px solid #ddd", borderRadius: "8px", overflow: "hidden" }}>
              <div style={{ background: "#2b4a8e", color: "white", padding: "10px", textAlign: "center", fontWeight: "bold" }}>{month.name}</div>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.8rem" }}>
                <thead>
                  <tr style={{ background: "#f1f3f5", borderBottom: "1px solid #ddd" }}>
                    <th style={{ padding: "5px", width: "30px", borderRight: "1px solid #eee" }}>D</th>
                    <th style={{ padding: "5px", width: "40px", borderRight: "1px solid #eee" }}>Day</th>
                    <th style={{ padding: "5px" }}>Module / Lecturer</th>
                  </tr>
                </thead>
                <tbody>
                  {Array.from({ length: month.days }, (_, i) => {
                    const dayNum = i + 1;
                    const dayOfWeekIndex = (month.startDay + i) % 7;
                    const dayNames = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
                    const dayName = dayNames[dayOfWeekIndex];
                    const isWeekend = dayName === "Saturday" || dayName === "Sunday";
                    const dailyClasses = filteredData.filter(c => c.day_of_week === dayName);
                    return (
                      <tr key={dayNum} style={{ background: isWeekend ? "#e9ecef" : "white", borderBottom: "1px solid #f1f3f5" }}>
                        <td style={{ padding: "6px", textAlign: "center", fontWeight: "bold", color: "#666", borderRight: "1px solid #eee" }}>{dayNum < 10 ? `0${dayNum}` : dayNum}</td>
                        <td style={{ padding: "6px", color: isWeekend ? "#adb5bd" : "#333", fontSize: "0.75rem", borderRight: "1px solid #eee" }}>{dayName.substring(0, 3)}</td>
                        <td style={{ padding: "4px" }}>
                          {dailyClasses.length > 0 ? (
                            <div style={{ display: "flex", flexDirection: "column", gap: "2px" }}>
                              {dailyClasses.map(cls => (
                                <div key={cls.id} style={{ background: getColorForModule(cls.module_name).bg, borderLeft: `3px solid ${getColorForModule(cls.module_name).border}`, padding: "4px 6px", borderRadius: "3px", fontSize: "0.7rem" }}>
                                  <div style={{marginBottom:"2px"}}><strong>{cls.start_time} - {cls.end_time}</strong> {cls.module_name}</div>
                                  <div style={{fontSize:"0.65rem", opacity:0.8, fontStyle:"italic"}}>👨‍🏫 {cls.lecturer_name}</div>
                                </div>
                              ))}
                            </div>
                          ) : (isWeekend ? <span style={{color:"#ccc"}}>-</span> : null)}
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

  // --- 3) MONTH VIEW (UNCHANGED classic calendar) ---
  const renderMonthView = () => {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    const firstDay = new Date(year, month, 1);
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const startDayOfWeek = firstDay.getDay() === 0 ? 6 : firstDay.getDay() - 1;
    const calendarCells = [];
    for (let i = 0; i < startDayOfWeek; i++) {
      calendarCells.push(<div key={`empty-${i}`} style={{background: "#f8f9fa", border: "1px solid #eee", minHeight: "100px"}}></div>);
    }
    for (let d = 1; d <= daysInMonth; d++) {
      const currentDayDate = new Date(year, month, d);
      const dayName = getDayNameFromDate(currentDayDate);
      const dailyClasses = filteredData.filter(entry => entry.day_of_week === dayName);
      calendarCells.push(
        <div key={d} style={{ border: "1px solid #eee", minHeight: "100px", padding: "5px", background: "white" }}>
          <div style={{ textAlign: "right", fontWeight: "bold", color: "#ccc", marginBottom: "5px" }}>{d}</div>
          <div style={{ display: "flex", flexDirection: "column", gap: "2px" }}>
            {dailyClasses.map(cls => (
              <div key={cls.id} style={{ fontSize: "0.65rem", padding: "2px 4px", borderRadius: "3px", background: getColorForModule(cls.module_name).bg, color: getColorForModule(cls.module_name).text, borderLeft: `3px solid ${getColorForModule(cls.module_name).border}`, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                {cls.start_time}-{cls.end_time} {cls.module_name}
              </div>
            ))}
          </div>
        </div>
      );
    }
    return (
      <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: "1px", background: "#ddd", border: "1px solid #ddd" }}>
        {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map(d => (
          <div key={d} style={{ background: "#2b4a8e", color: "white", padding: "10px", textAlign: "center", fontWeight: "bold" }}>{d}</div>
        ))}
        {calendarCells}
      </div>
    );
  };

  // --- ✅ NEW CLEAR DAY/WEEK CALENDAR VIEW (ONLY Day+Week changed) ---
  const getDayEntries = (dayName) =>
    filteredData
      .filter((e) => e.day_of_week === dayName)
      .sort((a, b) => timeToMinutes(a.start_time) - timeToMinutes(b.start_time));

  const AgendaCard = ({ entry }) => {
    const groupLine = Array.isArray(entry.group_names) ? entry.group_names.join(", ") : (filterGroup || "—");
    return (
      <div
        onClick={() => !isStudent && openEdit(entry)}
        style={{
          border: "1px solid #e9ecef",
          borderRadius: "12px",
          padding: "14px",
          background: "white",
          boxShadow: "0 2px 10px rgba(0,0,0,0.04)",
          cursor: isStudent ? "default" : "pointer",
          position: "relative",
        }}
      >
        <div style={{ fontWeight: 900, color: "#2b4a8e", marginBottom: 8 }}>
          {entry.start_time} - {entry.end_time}
        </div>
        <div style={{ fontWeight: 900, fontSize: "1.05rem", marginBottom: 6 }}>{entry.module_name}</div>
        <div style={{ color: "#495057", fontWeight: 700, marginBottom: 10 }}>{entry.lecturer_name}</div>

        <div style={{ display: "flex", flexDirection: "column", gap: 6, fontSize: "0.95rem", color: "#495057" }}>
          <div>📍 <b>{entry.room_name}</b></div>
          <div>👥 {groupLine}</div>
        </div>

        {!isStudent && (
          <button
            onClick={(e) => handleDelete(entry.id, e)}
            style={{
              position: "absolute",
              top: 10,
              right: 10,
              width: 30,
              height: 30,
              borderRadius: 10,
              border: "1px solid rgba(0,0,0,0.08)",
              background: "white",
              color: "#fa5252",
              cursor: "pointer",
            }}
            title="Delete"
          >
            ✕
          </button>
        )}
      </div>
    );
  };

  const renderAgendaWeek = () => (
    <div style={{ display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: 16 }}>
      {daysOfWeek.map((day) => {
        const items = getDayEntries(day);
        return (
          <div key={day} style={{ background: "#f8f9fa", borderRadius: 12, padding: 12, border: "1px solid #e9ecef" }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
              <div>
                <div style={{ fontWeight: 900, fontSize: "1.15rem", color: "#2b4a8e" }}>{day}</div>
                <div style={{ color: "#868e96", fontWeight: 700, fontSize: "0.9rem" }}>{items.length} classes</div>
              </div>

              {!isStudent && (
                <button
                  onClick={() => openAdd(day)}
                  style={{
                    padding: "8px 12px",
                    borderRadius: 10,
                    border: "1px solid #2b4a8e",
                    background: "white",
                    color: "#2b4a8e",
                    fontWeight: 900,
                    cursor: "pointer",
                  }}
                >
                  + Add
                </button>
              )}
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: 12, maxHeight: 720, overflow: "auto", paddingRight: 4 }}>
              {items.length === 0 ? (
                <div style={{ color: "#adb5bd", fontWeight: 700, padding: "10px 4px" }}>No classes</div>
              ) : (
                items.map((e) => <AgendaCard key={e.id} entry={e} />)
              )}
            </div>
          </div>
        );
      })}
    </div>
  );

  const renderAgendaDay = () => {
    const day = getDayNameFromDate(currentDate);
    const items = getDayEntries(day);

    return (
      <div style={{ background: "#f8f9fa", borderRadius: 12, padding: 16, border: "1px solid #e9ecef" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
          <div>
            <div style={{ fontWeight: 900, fontSize: "1.25rem", color: "#2b4a8e" }}>{day}</div>
            <div style={{ color: "#868e96", fontWeight: 700 }}>{displayDateNum} • {items.length} classes</div>
          </div>

          {!isStudent && (
            <button
              onClick={() => openAdd(day)}
              style={{
                padding: "10px 14px",
                borderRadius: 10,
                border: "1px solid #2b4a8e",
                background: "white",
                color: "#2b4a8e",
                fontWeight: 900,
                cursor: "pointer",
              }}
            >
              + Add class
            </button>
          )}
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 12, maxHeight: 760, overflow: "auto", paddingRight: 4 }}>
          {items.length === 0 ? (
            <div style={{ color: "#adb5bd", fontWeight: 700, padding: "10px 4px" }}>No classes</div>
          ) : (
            items.map((e) => <AgendaCard key={e.id} entry={e} />)
          )}
        </div>
      </div>
    );
  };

  // --- ESTILOS ---
  const navButtonStyle = (mode) => ({
    padding: "8px 20px",
    background: viewMode === mode ? "#2b4a8e" : "white",
    color: viewMode === mode ? "white" : "#2b4a8e",
    border: "1px solid #2b4a8e",
    borderRadius: "4px",
    cursor: "pointer",
    fontSize: "0.8rem",
    fontWeight: "600",
    minWidth: "80px",
    textAlign: "center",
  });

  const filterSelectStyle = {
    padding: "8px 12px",
    borderRadius: "6px",
    border: "1px solid #dee2e6",
    background: "white",
    color: "#495057",
    minWidth: "160px",
    fontSize: "0.9rem",
  };

  return (
    <div style={{ padding: "40px", fontFamily: "'Inter', 'Segoe UI', sans-serif", background: "#ffffff", minHeight: "100vh" }}>
      <h2 style={{ margin: "0 0 30px 0", color: "#343a40", fontSize: "1.6rem", fontWeight: "700" }}>
        {isStudent ? "Student Schedule" : "Schedule Overview"}
      </h2>

      {/* FILTROS (UNCHANGED) */}
      <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: "30px", marginBottom: "40px" }}>
        <div style={{ display: "flex", alignItems: "center" }}>
          <label style={{ marginRight: "10px", fontWeight: "bold" }}>Semester</label>
          <select value={selectedSemester} onChange={(e) => setSelectedSemester(e.target.value)} style={filterSelectStyle}>
            {semesters.map((s) => <option key={s.id} value={s.name}>{s.name}</option>)}
          </select>
        </div>

        <div style={{ display: "flex", alignItems: "center" }}>
          <label style={{ marginRight: "10px", fontWeight: "bold" }}>Groups</label>
          <select value={filterGroup} onChange={(e) => setFilterGroup(e.target.value)} style={filterSelectStyle}>
            <option value="">All Groups</option>
            {groups.map((g) => <option key={g.id} value={getGroupName(g)}>{getGroupName(g)}</option>)}
          </select>
        </div>

        {!isStudent && (
          <div style={{ display: "flex", alignItems: "center" }}>
            <label style={{ marginRight: "10px", fontWeight: "bold" }}>Lecturer</label>
            <select value={filterLecturer} onChange={(e) => setFilterLecturer(e.target.value)} style={filterSelectStyle}>
              <option value="">All Lecturers</option>
              {lecturers.map((l) => <option key={l.id} value={`${l.first_name} ${l.last_name}`}>{`${l.first_name} ${l.last_name}`}</option>)}
            </select>
          </div>
        )}

        <div style={{ display: "flex", alignItems: "center" }}>
          <label style={{ marginRight: "10px", fontWeight: "bold" }}>Location</label>
          <select value={filterRoom} onChange={(e) => setFilterRoom(e.target.value)} style={{ ...filterSelectStyle, width: "120px" }}>
            <option value="">All</option>
            {rooms.map((r) => <option key={r.id} value={r.name}>{r.name}</option>)}
          </select>
        </div>
      </div>

      {/* CONTROLES (UNCHANGED layout) */}
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
                <div style={{ fontSize: "1.2rem", fontWeight: "700", lineHeight: "1.2" }}>CW {getWeekNumber(currentDate)}</div>
                <div style={{ fontSize: "1rem", fontWeight: "600", opacity: 0.9 }}>{getWeekRangeString()}</div>
              </div>
              <button onClick={() => handleNavigateDate("next")} style={{ background: "none", border: "none", cursor: "pointer", fontSize: "2rem", color: "#2b4a8e" }}>›</button>
            </>
          )}

          {viewMode === "Day" && !isListView && (
            <>
              <button onClick={() => handleNavigateDate("prev")} style={{ background: "none", border: "none", cursor: "pointer", fontSize: "2rem", color: "#2b4a8e" }}>‹</button>
              <div style={{ textAlign: "center", color: "#2b4a8e" }}>
                <div style={{ fontSize: "1.1rem", fontWeight: "700" }}>{getDayNameFromDate(currentDate)}</div>
                <div style={{ fontSize: "1rem" }}>{displayDateNum}</div>
              </div>
              <button onClick={() => handleNavigateDate("next")} style={{ background: "none", border: "none", cursor: "pointer", fontSize: "2rem", color: "#2b4a8e" }}>›</button>
            </>
          )}

          {viewMode === "Month" && !isListView && (
            <>
              <button onClick={() => handleNavigateDate("prev")} style={{ background: "none", border: "none", cursor: "pointer", fontSize: "2rem", color: "#2b4a8e" }}>‹</button>
              <div style={{ fontSize: "1.4rem", fontWeight: "700", color: "#2b4a8e" }}>{displayMonthName}</div>
              <button onClick={() => handleNavigateDate("next")} style={{ background: "none", border: "none", cursor: "pointer", fontSize: "2rem", color: "#2b4a8e" }}>›</button>
            </>
          )}

          {viewMode === "Semester" && !isListView && (
            <div style={{ fontSize: "1.4rem", fontWeight: "700", color:"#2b4a8e" }}>{selectedSemester}</div>
          )}
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
          <span style={{ color: isListView ? "#2b4a8e" : "#6c757d", fontWeight: isListView ? "700" : "400", fontSize: "0.95rem" }}>List View</span>
          <div onClick={() => setIsListView(!isListView)} style={{ width: "44px", height: "24px", background: isListView ? "#2b4a8e" : "#6c757d", borderRadius: "12px", position: "relative", cursor: "pointer", display: "flex", alignItems: "center", transition: "background 0.3s" }}>
            <div style={{ width: "18px", height: "18px", background: "white", borderRadius: "50%", position: "absolute", left: isListView ? "22px" : "3px", right: isListView ? "3px" : "auto", boxShadow: "0 1px 2px rgba(0,0,0,0.2)", transition: "all 0.3s" }}></div>
          </div>
          <span style={{ color: !isListView ? "#2b4a8e" : "#6c757d", fontWeight: !isListView ? "700" : "400", fontSize: "0.95rem" }}>Calendar View</span>
        </div>
      </div>

      {/* ✅ MAIN RENDER: only Day/Week calendar changed */}
      {loading ? (
        <p>Loading...</p>
      ) : isListView ? (
        renderListView()
      ) : viewMode === "Month" ? (
        renderMonthView()
      ) : viewMode === "Semester" ? (
        renderSemesterPlan()
      ) : viewMode === "Day" ? (
        renderAgendaDay()
      ) : (
        renderAgendaWeek()
      )}

      {/* MODAL (only used in Day/Week) */}
      {showModal && !isStudent && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.4)", display: "flex", justifyContent: "center", alignItems: "center", zIndex: 1000, backdropFilter: "blur(3px)" }}>
          <div style={{ background: "white", padding: "30px", borderRadius: "14px", width: "520px", boxShadow: "0 10px 30px rgba(0,0,0,0.15)" }}>
            <h3 style={{ marginTop: 0, marginBottom: "12px", color: "#343a40", fontSize: "1.4rem", fontWeight: "900" }}>
              {editingEntry ? "Edit Class" : "Schedule Class"}
            </h3>

            <p style={{ marginBottom: "18px", color: "#6c757d", fontSize: "1.05rem" }}>
              <strong>{form.day}</strong>
            </p>

            <label style={{ display: "block", marginBottom: "6px", fontWeight: "900" }}>Start time</label>
            <input
              type="time"
              step="900"
              style={{ width: "100%", padding: "12px", marginBottom: "16px", borderRadius: "8px", border: "1px solid #ced4da", fontSize: "1rem" }}
              value={form.start_time}
              onChange={(e) => setForm({ ...form, start_time: e.target.value })}
            />

            <label style={{ display: "block", marginBottom: "6px", fontWeight: "900" }}>End time</label>
            <input
              type="time"
              step="900"
              style={{ width: "100%", padding: "12px", marginBottom: "16px", borderRadius: "8px", border: "1px solid #ced4da", fontSize: "1rem" }}
              value={form.end_time}
              onChange={(e) => setForm({ ...form, end_time: e.target.value })}
            />

            <label style={{ display: "block", marginBottom: "6px", fontWeight: "900" }}>Module</label>
            <select
              style={{ width: "100%", padding: "12px", marginBottom: "16px", borderRadius: "8px", border: "1px solid #ced4da", fontSize: "1rem" }}
              value={form.offered_module_id}
              onChange={(e) => setForm({ ...form, offered_module_id: e.target.value })}
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
              value={form.room_id}
              onChange={(e) => setForm({ ...form, room_id: e.target.value })}
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
              value={form.group_ids.map(String)}
              onChange={(e) => {
                const selected = Array.from(e.target.selectedOptions).map((opt) => Number(opt.value));
                setForm({ ...form, group_ids: selected });
              }}
            >
              {groups.map((g) => (
                <option key={g.id} value={String(g.id)}>
                  {getGroupName(g)}
                </option>
              ))}
            </select>

            <div style={{ display: "flex", justifyContent: "flex-end", gap: "10px" }}>
              <button
                onClick={() => { setShowModal(false); setEditingEntry(null); }}
                style={{ padding: "12px 22px", background: "white", border: "1px solid #ced4da", borderRadius: "8px", cursor: "pointer", fontWeight: "800" }}
              >
                Cancel
              </button>
              <button
                onClick={handleSave}
                style={{ padding: "12px 26px", background: "#2b4a8e", color: "white", border: "none", borderRadius: "8px", cursor: "pointer", fontWeight: "900" }}
              >
                Save
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}