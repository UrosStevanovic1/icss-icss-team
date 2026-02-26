import React, { useState, useEffect, useCallback } from "react";
import api from "../api";

export default function TimetableManager() {
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
  const [showModal, setShowModal] = useState(false);

  // VISTA, FECHA Y MODO
  const [viewMode, setViewMode] = useState("Week"); // "Day" | "Week" | "Month" | "Semester"
  const [currentDate, setCurrentDate] = useState(new Date());
  const [isListView, setIsListView] = useState(false);

  // TIPO DE SEMESTRE (Winter vs Summer)
  const [semesterType, setSemesterType] = useState("Winter");

  const [newEntry, setNewEntry] = useState({ day: "", time: "", offered_module_id: "", room_id: "" });

  const daysOfWeek = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"];
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

  // --- CARGA DE DATOS ---
  const loadSchedule = useCallback(async () => {
    if (!selectedSemester) return;
    setLoading(true);
    try {
      const data = await api.getSchedule(selectedSemester);
      setScheduleData(data);
    } catch (e) { console.error(e); }
    setLoading(false);
  }, [selectedSemester]);

  const loadDropdowns = useCallback(async () => {
    if (!selectedSemester) return;
    try {
      const mods = await api.getOfferedModules(selectedSemester);
      setOfferedModules(mods);
      const r = await api.getRooms();
      setRooms(r);
    } catch (e) { console.error(e); }
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
      } catch (e) { console.error(e); }
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
    return scheduleData.filter(entry => {
      if (filterLecturer && entry.lecturer_name !== filterLecturer) return false;
      if (filterRoom && String(entry.room_name) !== filterRoom) return false;
      return true;
    });
  };
  const filteredData = getFilteredSchedule();

  // --- NAVEGACIÓN ---
  const handleNavigateDate = (direction) => {
    if (viewMode === "Semester") return;
    const newDate = new Date(currentDate);
    if (viewMode === "Day") {
      newDate.setDate(currentDate.getDate() + (direction === "next" ? 1 : -1));
    } else if (viewMode === "Week") {
      newDate.setDate(currentDate.getDate() + (direction === "next" ? 7 : -7));
    } else if (viewMode === "Month") {
      newDate.setMonth(currentDate.getMonth() + (direction === "next" ? 1 : -1));
    }
    setCurrentDate(newDate);
  };

  const getDayNameFromDate = (date) => date.toLocaleDateString('en-US', { weekday: 'long' });
  const displayDayName = currentDate.toLocaleDateString('en-US', { weekday: 'long' });
  const displayDateNum = currentDate.toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit', year: '2-digit' }).replace(/\//g, '.');
  const displayMonthName = currentDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
  const visibleDays = (viewMode === "Week") ? daysOfWeek : [getDayNameFromDate(currentDate)];

  // --- HANDLERS ---
  const handleCellClick = (day, time) => {
    setNewEntry({ day, time, offered_module_id: "", room_id: "" });
    setShowModal(true);
  };

  const handleSave = async () => {
    if (!newEntry.offered_module_id || !newEntry.room_id) return alert("Select module and room");
    try {
      const startHour = parseInt(newEntry.time.split(":")[0]);
      const endHour = startHour + 1;
      const endTime = `${endHour < 10 ? '0' : ''}${endHour}:00`;
      await api.createScheduleEntry({
        offered_module_id: newEntry.offered_module_id,
        room_id: newEntry.room_id,
        day_of_week: newEntry.day,
        start_time: newEntry.time,
        end_time: endTime,
        semester: selectedSemester
      });
      setShowModal(false);
      loadSchedule();
    } catch (e) { alert("Error: " + e.message); }
  };

  const handleDelete = async (id, e) => {
    e.stopPropagation();
    if (!window.confirm("Delete session?")) return;
    try { await api.deleteScheduleEntry(id); loadSchedule(); } catch (e) { alert("Error deleting"); }
  };

  const getEntryForSlot = (day, time) => {
    const hourPrefix = time.split(":")[0];
    return filteredData.find(entry => entry.day_of_week === day && entry.start_time.startsWith(hourPrefix));
  };

  // --- RENDERIZADORES ---

  // 1. LISTA SIMPLE
  const renderListView = () => {
    const sortedList = [...filteredData].sort((a, b) => {
      const dayOrder = { "Monday": 1, "Tuesday": 2, "Wednesday": 3, "Thursday": 4, "Friday": 5 };
      if (dayOrder[a.day_of_week] !== dayOrder[b.day_of_week]) return dayOrder[a.day_of_week] - dayOrder[b.day_of_week];
      return a.start_time.localeCompare(b.start_time);
    });

    return (
      <div style={{ marginTop: "20px", overflowX: "auto", boxShadow: "0 2px 10px rgba(0,0,0,0.05)", borderRadius: "8px", border: "1px solid #eee" }}>
        <table style={{ width: "100%", borderCollapse: "collapse", background: "white" }}>
          <thead>
            <tr style={{ background: "#f8f9fa", borderBottom: "2px solid #dee2e6" }}>
              <th style={{ padding: "12px 15px", textAlign: "left", color: "#495057" }}>Day</th>
              <th style={{ padding: "12px 15px", textAlign: "left", color: "#495057" }}>Time</th>
              <th style={{ padding: "12px 15px", textAlign: "left", color: "#495057" }}>Module</th>
              <th style={{ padding: "12px 15px", textAlign: "left", color: "#495057" }}>Lecturer</th>
              <th style={{ padding: "12px 15px", textAlign: "left", color: "#495057" }}>Room</th>
            </tr>
          </thead>
          <tbody>
            {sortedList.length === 0 ? (
              <tr><td colSpan="5" style={{ padding: "20px", textAlign: "center", color: "#999" }}>No classes scheduled yet.</td></tr>
            ) : (
              sortedList.map((entry, idx) => (
                <tr key={entry.id} style={{ borderBottom: "1px solid #f1f3f5", background: idx % 2 === 0 ? "white" : "#fcfcfc" }}>
                  <td style={{ padding: "12px 15px", fontWeight: "bold", color: "#2b4a8e" }}>{entry.day_of_week}</td>
                  <td style={{ padding: "12px 15px" }}>{entry.start_time} - {entry.end_time}</td>
                  <td style={{ padding: "12px 15px", fontWeight: "600" }}>{entry.module_name}</td>
                  <td style={{ padding: "12px 15px" }}>{entry.lecturer_name}</td>
                  <td style={{ padding: "12px 15px" }}>📍 {entry.room_name}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    );
  };

  // 2. VISTA SEMESTRAL COMPLETA (Actualizado con Nombre de Profe)
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
        {/* Selector Uniforme Azul */}
        <div style={{display:"flex", justifyContent:"center", marginBottom:"20px", gap:"10px"}}>
          <button
            onClick={() => setSemesterType("Winter")}
            style={{
              padding: "8px 20px", borderRadius: "20px", border: "1px solid #2b4a8e",
              background: semesterType === "Winter" ? "#2b4a8e" : "white",
              color: semesterType === "Winter" ? "white" : "#2b4a8e",
              fontWeight: "bold", cursor: "pointer", transition: "all 0.2s"
            }}
          > Winter Semester (Oct - Feb)</button>

          <button
            onClick={() => setSemesterType("Summer")}
            style={{
              padding: "8px 20px", borderRadius: "20px", border: "1px solid #2b4a8e",
              background: semesterType === "Summer" ? "#2b4a8e" : "white",
              color: semesterType === "Summer" ? "white" : "#2b4a8e",
              fontWeight: "bold", cursor: "pointer", transition: "all 0.2s"
            }}
          > Summer Semester (Apr - Aug)</button>
        </div>

        {/* Tabla Horizontal */}
        <div style={{ display: "flex", gap: "20px", overflowX: "auto", paddingBottom: "20px" }}>
          {months.map((month, mIdx) => (
            <div key={mIdx} style={{ minWidth: "320px", background: "white", border: "1px solid #ddd", borderRadius: "8px", overflow: "hidden" }}>
              {/* Header Mes */}
              <div style={{ background: "#2b4a8e", color: "white", padding: "10px", textAlign: "center", fontWeight: "bold" }}>
                {month.name}
              </div>

              {/* Tabla Días */}
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
                      <tr key={dayNum} style={{
                        background: isWeekend ? "#e9ecef" : "white",
                        borderBottom: "1px solid #f1f3f5"
                      }}>
                        <td style={{ padding: "6px", textAlign: "center", fontWeight: "bold", color: "#666", borderRight: "1px solid #eee" }}>
                          {dayNum < 10 ? `0${dayNum}` : dayNum}
                        </td>
                        <td style={{ padding: "6px", color: isWeekend ? "#adb5bd" : "#333", fontSize: "0.75rem", borderRight: "1px solid #eee" }}>
                          {dayName.substring(0, 3)}
                        </td>
                        <td style={{ padding: "4px" }}>
                          {dailyClasses.length > 0 ? (
                            <div style={{ display: "flex", flexDirection: "column", gap: "2px" }}>
                              {dailyClasses.map(cls => (
                                <div key={cls.id} style={{
                                  background: getColorForModule(cls.module_name).bg,
                                  borderLeft: `3px solid ${getColorForModule(cls.module_name).border}`,
                                  padding: "4px 6px", borderRadius: "3px", fontSize: "0.7rem"
                                }}>
                                  <div style={{marginBottom:"2px"}}><strong>{cls.start_time}</strong> {cls.module_name}</div>
                                  {/* ✅ AQUÍ SE AGREGA EL PROFESOR */}
                                  <div style={{fontSize:"0.65rem", opacity:0.8, fontStyle:"italic"}}> {cls.lecturer_name}</div>
                                </div>
                              ))}
                            </div>
                          ) : (
                             isWeekend ? <span style={{color:"#ccc"}}>-</span> : null
                          )}
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

  // 3. VISTA MES (Calendario clásico)
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
                {cls.start_time} {cls.module_name}
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

  // 4. VISTA SEMANA / DÍA
  const renderGridView = () => (
    <div style={{ borderTop: "1px solid #e9ecef", overflowX: "auto" }}>
      <table style={{ width: "100%", borderCollapse: "collapse", minWidth: "900px", tableLayout: "fixed" }}>
        <thead>
          <tr>
            <th style={{ width: "80px", borderRight: "1px solid #e9ecef" }}></th>
            {visibleDays.map(day => (
              <th key={day} style={{ padding: "15px", textAlign: "center", fontWeight: "bold", color: "#2b4a8e", fontSize:"1.1rem", borderBottom: "2px solid #dee2e6", borderRight: "1px solid #f1f3f5" }}>
                {day}
                <div style={{fontSize: "0.8rem", color: "#888", fontWeight: "normal", marginTop: "4px"}}>
                  {viewMode === "Week" && "(Weekly Schedule)"}
                </div>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {hours.map(hour => (
            <tr key={hour}>
              <td style={{ padding: "15px 10px", textAlign: "center", color: "#343a40", fontWeight: "700", borderRight: "1px solid #e9ecef", borderBottom: "1px solid #f8f9fa", verticalAlign: "middle" }}>{hour}</td>
              {visibleDays.map(day => {
                const entry = getEntryForSlot(day, hour);
                const colors = entry ? getColorForModule(entry.module_name) : null;
                return (
                  <td key={day} onClick={() => !entry && handleCellClick(day, hour)} style={{ borderRight: "1px solid #f1f3f5", borderBottom: "1px solid #f1f3f5", height: "100px", padding: "6px", verticalAlign: "top", cursor: entry ? "default" : "pointer" }}>
                    {entry ? (
                      <div style={{ background: colors.bg, borderLeft: `5px solid ${colors.border}`, borderRadius: "6px", height: "100%", padding: "8px 10px", position: "relative", boxShadow: "0 2px 4px rgba(0,0,0,0.03)", display: "flex", flexDirection: "column", justifyContent: "space-between" }}>
                        <div>
                          <div style={{ fontWeight: "700", fontSize: "0.85rem", color: "#212529" }}>{entry.module_name}</div>
                          <div style={{ fontSize: "0.75rem", color: "#495057" }}>{entry.lecturer_name}</div>
                        </div>
                        <div style={{ fontSize: "0.75rem", fontWeight: "600" }}> {entry.room_name}</div>
                        <button onClick={(e) => handleDelete(entry.id, e)} style={{ position: "absolute", top: "5px", right: "5px", background: "none", border: "none", color: "#fa5252", cursor: "pointer", fontSize: "14px" }}>✕</button>
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
    padding: "8px 20px",
    background: viewMode === mode ? "#2b4a8e" : "white",
    color: viewMode === mode ? "white" : "#2b4a8e",
    border: "1px solid #2b4a8e", borderRadius: "4px", cursor: "pointer", fontSize: "0.8rem", fontWeight: "600", minWidth: "80px", textAlign: "center"
  });

  const filterSelectStyle = { padding: "8px 12px", borderRadius: "6px", border: "1px solid #dee2e6", background: "white", color: "#495057", minWidth: "160px", fontSize: "0.9rem" };

  return (
    <div style={{ padding: "40px", fontFamily: "'Inter', 'Segoe UI', sans-serif", background: "#ffffff", minHeight: "100vh" }}>
      <h2 style={{ margin: "0 0 30px 0", color: "#343a40", fontSize: "1.6rem", fontWeight: "700" }}>Schedule Overview</h2>

      {/* FILTROS */}
      <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: "30px", marginBottom: "40px" }}>
        <div style={{ display: "flex", alignItems: "center" }}><label style={{ marginRight: "10px", fontWeight: "bold" }}>Semester</label><select value={selectedSemester} onChange={e => setSelectedSemester(e.target.value)} style={filterSelectStyle}>{semesters.map(s => <option key={s.id} value={s.name}>{s.name}</option>)}</select></div>
        <div style={{ display: "flex", alignItems: "center" }}><label style={{ marginRight: "10px", fontWeight: "bold" }}>Groups</label><select value={filterGroup} onChange={e => setFilterGroup(e.target.value)} style={filterSelectStyle}><option value="">All Groups</option>{groups.map(g => <option key={g.id} value={g.name}>{g.name}</option>)}</select></div>
        <div style={{ display: "flex", alignItems: "center" }}><label style={{ marginRight: "10px", fontWeight: "bold" }}>Lecturer</label><select value={filterLecturer} onChange={e => setFilterLecturer(e.target.value)} style={filterSelectStyle}><option value="">All Lecturers</option>{lecturers.map(l => <option key={l.id} value={`${l.first_name} ${l.last_name}`}>{`${l.first_name} ${l.last_name}`}</option>)}</select></div>
        <div style={{ display: "flex", alignItems: "center" }}><label style={{ marginRight: "10px", fontWeight: "bold" }}>Location</label><select value={filterRoom} onChange={e => setFilterRoom(e.target.value)} style={{ ...filterSelectStyle, width: "120px" }}><option value="">All</option>{rooms.map(r => <option key={r.id} value={r.name}>{r.name}</option>)}</select></div>
      </div>

      {/* NAVEGACIÓN */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "25px" }}>
        {!isListView ? (
          <div style={{ display: "flex", gap: "10px" }}>
            <button style={navButtonStyle("Day")} onClick={() => setViewMode("Day")}>Day</button>
            <button style={navButtonStyle("Week")} onClick={() => setViewMode("Week")}>Week</button>
            <button style={navButtonStyle("Month")} onClick={() => setViewMode("Month")}>Month</button>
            <button style={navButtonStyle("Semester")} onClick={() => setViewMode("Semester")}>Semester</button>
          </div>
        ) : <div></div>}

        <div style={{ display: "flex", alignItems: "center", gap: "20px" }}>
          {!isListView && (
            <>
              {viewMode !== "Semester" && <button onClick={() => handleNavigateDate("prev")} style={{ background: "none", border: "none", cursor: "pointer", fontSize: "2rem", color: "#2b4a8e" }}>‹</button>}
              <div style={{ textAlign: "center", color: "#2b4a8e" }}>
                {viewMode === "Month" ? <div style={{ fontSize: "1.4rem", fontWeight: "700" }}>{displayMonthName}</div> :
                 viewMode === "Semester" ? <><div style={{ fontSize: "1.4rem", fontWeight: "700" }}>{selectedSemester}</div><div style={{ fontSize: "1rem", fontWeight: "600", opacity: 0.9 }}>Semester Overview</div></> :
                 <><div style={{ fontSize: "1.1rem", fontWeight: "700", lineHeight: "1.2" }}>{viewMode === "Week" ? "Week View" : displayDayName}</div><div style={{ fontSize: "1rem", fontWeight: "600", opacity: 0.9 }}>{viewMode === "Week" ? "(Mon - Fri)" : displayDateNum}</div></>}
              </div>
              {viewMode !== "Semester" && <button onClick={() => handleNavigateDate("next")} style={{ background: "none", border: "none", cursor: "pointer", fontSize: "2rem", color: "#2b4a8e" }}>›</button>}
            </>
          )}
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
          <span style={{ color: isListView ? "#2b4a8e" : "#6c757d", fontWeight: isListView ? "700" : "400", fontSize: "0.95rem" }}>List View</span>
          <div onClick={() => setIsListView(!isListView)} style={{ width: "44px", height: "24px", background: isListView ? "#6c757d" : "#2b4a8e", borderRadius: "12px", position: "relative", cursor: "pointer", display: "flex", alignItems: "center", transition: "background 0.3s" }}><div style={{ width: "18px", height: "18px", background: "white", borderRadius: "50%", position: "absolute", left: isListView ? "3px" : "auto", right: isListView ? "auto" : "3px", boxShadow: "0 1px 2px rgba(0,0,0,0.2)", transition: "all 0.3s" }}></div></div>
          <span style={{ color: !isListView ? "#2b4a8e" : "#6c757d", fontWeight: !isListView ? "700" : "400", fontSize: "0.95rem" }}>Calendar View</span>
        </div>
      </div>

      {loading ? <p>Loading...</p> : (
        isListView ? renderListView() : (
          viewMode === "Semester" ? renderSemesterPlan() :
          viewMode === "Month" ? renderMonthView() :
          renderGridView()
        )
      )}

      {showModal && (
        <div style={{ position: "fixed", top: 0, left: 0, right: 0, bottom: 0, background: "rgba(0,0,0,0.4)", display: "flex", justifyContent: "center", alignItems: "center", zIndex: 1000, backdropFilter: "blur(3px)" }}>
          <div style={{ background: "white", padding: "30px", borderRadius: "12px", width: "420px", boxShadow: "0 10px 30px rgba(0,0,0,0.15)" }}>
            <h3 style={{ marginTop: 0, marginBottom: "20px", color: "#343a40" }}>Schedule Class</h3>
            <p style={{marginBottom:"20px", color: "#6c757d"}}><strong>{newEntry.day}</strong> at <strong>{newEntry.time}</strong></p>
            <label style={{display:"block", marginBottom:"6px", fontWeight:"600"}}>Module</label>
            <select style={{width:"100%", padding:"10px", marginBottom:"20px", borderRadius:"6px", border:"1px solid #ced4da"}} value={newEntry.offered_module_id} onChange={e => setNewEntry({...newEntry, offered_module_id: e.target.value})}><option value="">-- Select Module --</option>{offeredModules.map(m => <option key={m.id} value={m.id}>{m.module_name} ({m.lecturer_name})</option>)}</select>
            <label style={{display:"block", marginBottom:"6px", fontWeight:"600"}}>Room</label>
            <select style={{width:"100%", padding:"10px", marginBottom:"30px", borderRadius:"6px", border:"1px solid #ced4da"}} value={newEntry.room_id} onChange={e => setNewEntry({...newEntry, room_id: e.target.value})}><option value="">-- Select Room --</option>{rooms.map(r => <option key={r.id} value={r.id}>{r.name}</option>)}</select>
            <div style={{ textAlign: "right", display: "flex", justifyContent: "flex-end", gap: "10px" }}><button onClick={() => setShowModal(false)} style={{ padding: "10px 20px", background: "white", border: "1px solid #ced4da", borderRadius:"6px", cursor: "pointer" }}>Cancel</button><button onClick={handleSave} style={{ padding: "10px 24px", background: "#2b4a8e", color: "white", border: "none", borderRadius:"6px", cursor: "pointer", fontWeight: "600" }}>Save Class</button></div>
          </div>
        </div>
      )}
    </div>
  );
}