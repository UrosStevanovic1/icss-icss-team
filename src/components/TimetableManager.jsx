import React, { useState, useEffect } from "react";
import api from "../api";

export default function TimetableManager() {
  // --- ESTADOS ---
  const [semesters, setSemesters] = useState([]);
  const [selectedSemester, setSelectedSemester] = useState("");
  const [scheduleData, setScheduleData] = useState([]);
  const [offeredModules, setOfferedModules] = useState([]);
  const [rooms, setRooms] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showModal, setShowModal] = useState(false);

  // ESTADO DE FECHA Y VISTA
  const [viewMode, setViewMode] = useState("Week"); // "Day" | "Week" | "Month" | "Year"
  const [currentDate, setCurrentDate] = useState(new Date());

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
  useEffect(() => {
    async function loadSemesters() {
      try {
        const s = await api.getSemesters();
        setSemesters(s);
        if (s.length > 0) setSelectedSemester(s[0].name);
      } catch (e) { console.error(e); }
    }
    loadSemesters();
  }, []);

  useEffect(() => {
    if (selectedSemester) {
      loadSchedule();
      loadDropdowns();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedSemester]);

  async function loadSchedule() {
    setLoading(true);
    try {
      const data = await api.getSchedule(selectedSemester);
      setScheduleData(data);
    } catch (e) { console.error(e); }
    setLoading(false);
  }

  async function loadDropdowns() {
    try {
      const mods = await api.getOfferedModules(selectedSemester);
      setOfferedModules(mods);
      const r = await api.getRooms();
      setRooms(r);
    } catch (e) { console.error(e); }
  }

  // --- LÓGICA DE FECHAS ---
  const handleNavigateDate = (direction) => {
    const newDate = new Date(currentDate);
    if (viewMode === "Day") {
      newDate.setDate(currentDate.getDate() + (direction === "next" ? 1 : -1));
    } else if (viewMode === "Week") {
      newDate.setDate(currentDate.getDate() + (direction === "next" ? 7 : -7));
    }
    setCurrentDate(newDate);
  };

  const getDayNameFromDate = (date) => date.toLocaleDateString('en-US', { weekday: 'long' });

  // Formateo específico para replicar la imagen (Día arriba, Fecha abajo)
  const displayDayName = currentDate.toLocaleDateString('en-US', { weekday: 'long' });
  const displayDateNum = currentDate.toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit', year: '2-digit' }).replace(/\//g, '.');

  const visibleDays = viewMode === "Week" ? daysOfWeek : [getDayNameFromDate(currentDate)];
  const isWeekend = (dayName) => dayName === "Saturday" || dayName === "Sunday";

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
    return scheduleData.find(entry => entry.day_of_week === day && entry.start_time.startsWith(hourPrefix));
  };

  // ESTILOS
  const navButtonStyle = (mode) => ({
    padding: "8px 24px",
    background: viewMode === mode ? "#2b4a8e" : "white",
    color: viewMode === mode ? "white" : "#2b4a8e",
    border: "1px solid #2b4a8e",
    borderRadius: "4px",
    cursor: "pointer",
    fontSize: "0.8rem",
    fontWeight: "600",
    minWidth: "80px",
    textAlign: "center"
  });

  const filterLabelStyle = {
    fontSize: "0.85rem", fontWeight: "bold", color: "#343a40", marginRight: "10px"
  };

  const filterSelectStyle = {
    padding: "8px 12px", borderRadius: "6px", border: "1px solid #dee2e6", background: "white", color: "#495057", minWidth: "160px", fontSize: "0.9rem"
  };

  return (
    <div style={{ padding: "40px", fontFamily: "'Inter', 'Segoe UI', sans-serif", background: "#ffffff", minHeight: "100vh" }}>

      {/* 1. TÍTULO PRINCIPAL */}
      <h2 style={{ margin: "0 0 30px 0", color: "#343a40", fontSize: "1.6rem", fontWeight: "700" }}>Schedule Overview</h2>

      {/* 2. FILA DE FILTROS (Semester, Groups, Lecturer, Location) */}
      <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: "30px", marginBottom: "40px" }}>

        {/* Semester */}
        <div style={{ display: "flex", alignItems: "center" }}>
          <label style={filterLabelStyle}>Semester</label>
          <select value={selectedSemester} onChange={e => setSelectedSemester(e.target.value)} style={filterSelectStyle}>
            {semesters.map(s => <option key={s.id} value={s.name}>{s.name}</option>)}
          </select>
        </div>

        {/* Groups */}
        <div style={{ display: "flex", alignItems: "center" }}>
          <label style={filterLabelStyle}>Groups</label>
          <select disabled style={{ ...filterSelectStyle, background: "#f8f9fa", color: "#aaa" }}>
            <option>BIT 0525, DFD 1024...</option>
          </select>
        </div>

        {/* Lecturer */}
        <div style={{ display: "flex", alignItems: "center" }}>
          <label style={filterLabelStyle}>Lecturer</label>
          <select disabled style={{ ...filterSelectStyle, background: "#f8f9fa", color: "#aaa" }}>
            <option>All</option>
          </select>
        </div>

        {/* Location */}
        <div style={{ display: "flex", alignItems: "center" }}>
          <label style={filterLabelStyle}>Location</label>
          <select disabled style={{ ...filterSelectStyle, background: "#f8f9fa", color: "#aaa", width: "100px" }}>
            <option>All</option>
          </select>
        </div>
      </div>

      {/* 3. BARRA DE NAVEGACIÓN Y VISTA */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "25px" }}>

        {/* Izquierda: Botones de Vista (Day, Week, Month, Year) */}
        <div style={{ display: "flex", gap: "15px" }}>
          <button style={navButtonStyle("Day")} onClick={() => setViewMode("Day")}>Day</button>
          <button style={navButtonStyle("Week")} onClick={() => setViewMode("Week")}>Week</button>
          <button style={navButtonStyle("Month")} onClick={() => setViewMode("Month")}>Month</button>
          <button style={navButtonStyle("Year")} onClick={() => setViewMode("Year")}>Year</button>
        </div>

        {/* Centro: Flechas y Fecha (Apiladas como en la foto) */}
        <div style={{ display: "flex", alignItems: "center", gap: "20px" }}>
          <button
            onClick={() => handleNavigateDate("prev")}
            style={{ background: "none", border: "none", cursor: "pointer", fontSize: "2rem", color: "#2b4a8e", fontWeight: "300" }}
          >‹</button>

          <div style={{ textAlign: "center", color: "#2b4a8e" }}>
            <div style={{ fontSize: "1.1rem", fontWeight: "700", lineHeight: "1.2" }}>
              {viewMode === "Week" ? "Week View" : displayDayName}
            </div>
            <div style={{ fontSize: "1rem", fontWeight: "600", opacity: 0.9 }}>
              {viewMode === "Week" ? "(Mon - Fri)" : displayDateNum}
            </div>
          </div>

          <button
            onClick={() => handleNavigateDate("next")}
            style={{ background: "none", border: "none", cursor: "pointer", fontSize: "2rem", color: "#2b4a8e", fontWeight: "300" }}
          >›</button>
        </div>

        {/* Derecha: Toggle List/Calendar */}
        <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
          <span style={{ color: "#6c757d", fontSize: "0.95rem" }}>List View</span>

          {/* Custom Toggle Switch */}
          <div style={{
            width: "44px", height: "24px", background: "#2b4a8e", borderRadius: "12px",
            position: "relative", cursor: "pointer", display: "flex", alignItems: "center"
          }}>
            <div style={{
              width: "18px", height: "18px", background: "white", borderRadius: "50%",
              position: "absolute", right: "3px", boxShadow: "0 1px 2px rgba(0,0,0,0.2)"
            }}></div>
          </div>

          <span style={{ color: "#2b4a8e", fontWeight: "700", fontSize: "0.95rem" }}>Calendar View</span>
        </div>
      </div>

      {/* 4. REJILLA DEL CALENDARIO */}
      {loading ? <p>Loading...</p> : (
        <div style={{ borderTop: "1px solid #e9ecef", overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", minWidth: "900px" }}>
            <tbody>
              {/* Header de la Tabla (Solo días) */}
              <tr>
                <td style={{width: "80px", borderRight: "1px solid #e9ecef"}}></td>
                {visibleDays.map(day => (
                  <td key={day} style={{ padding: "15px", borderBottom: "1px solid #e9ecef", borderRight: "1px solid #f1f3f5" }}>
                    {/* Si quisieras poner la fecha en cada columna también, iría aquí, pero tu diseño lo tiene en el centro arriba para 'Day view' */}
                  </td>
                ))}
              </tr>

              {hours.map(hour => (
                <tr key={hour}>
                  {/* Columna de Hora */}
                  <td style={{
                    padding: "15px 10px", verticalAlign: "top", textAlign: "center",
                    color: "#343a40", fontSize: "0.85rem", fontWeight: "700",
                    borderRight: "1px solid #e9ecef", borderBottom: "1px solid #f8f9fa"
                  }}>
                    {hour}
                  </td>

                  {/* Celdas */}
                  {visibleDays.map(day => {
                    if (isWeekend(day) && viewMode === "Day") return <td key={day} style={{padding:"20px", textAlign:"center", color:"#ccc"}}>Weekend</td>;

                    const entry = getEntryForSlot(day, hour);
                    const colors = entry ? getColorForModule(entry.module_name) : null;

                    return (
                      <td
                        key={day}
                        onClick={() => !entry && handleCellClick(day, hour)}
                        style={{
                          borderRight: "1px solid #f1f3f5", borderBottom: "1px solid #f1f3f5",
                          height: "100px", padding: "6px", verticalAlign: "top",
                          cursor: entry ? "default" : "pointer"
                        }}
                        onMouseEnter={(e) => { if(!entry) e.currentTarget.style.background = "#f8f9fa"; }}
                        onMouseLeave={(e) => { if(!entry) e.currentTarget.style.background = "transparent"; }}
                      >
                        {entry ? (
                          <div style={{
                            background: colors.bg,
                            borderLeft: `5px solid ${colors.border}`,
                            borderRadius: "6px",
                            height: "100%",
                            padding: "8px 10px",
                            boxSizing: "border-box",
                            position: "relative",
                            boxShadow: "0 2px 4px rgba(0,0,0,0.03)",
                            display: "flex", flexDirection: "column", justifyContent: "space-between"
                          }}>
                            <div>
                              <div style={{ fontWeight: "700", fontSize: "0.85rem", color: "#212529", marginBottom: "4px", lineHeight: "1.3" }}>
                                {entry.module_name}
                              </div>
                              <div style={{ fontSize: "0.75rem", color: "#495057" }}>
                                {entry.lecturer_name}
                              </div>
                            </div>

                            <div style={{ fontSize: "0.75rem", color: "#495057", fontWeight: "600" }}>
                               📍 {entry.room_name} <span style={{fontWeight:"400", opacity:0.7, marginLeft:"5px"}}>{entry.start_time}-{entry.end_time}</span>
                            </div>

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
      )}

      {/* MODAL */}
      {showModal && (
        <div style={{ position: "fixed", top: 0, left: 0, right: 0, bottom: 0, background: "rgba(0,0,0,0.4)", display: "flex", justifyContent: "center", alignItems: "center", zIndex: 1000, backdropFilter: "blur(3px)" }}>
          <div style={{ background: "white", padding: "30px", borderRadius: "12px", width: "420px", boxShadow: "0 10px 30px rgba(0,0,0,0.15)" }}>
            <h3 style={{ marginTop: 0, marginBottom: "20px", color: "#343a40" }}>Schedule Class</h3>
            <p style={{marginBottom:"20px", color: "#6c757d"}}>Adding to: <strong>{newEntry.day}</strong> at <strong>{newEntry.time}</strong></p>

            <label style={{display:"block", marginBottom:"6px", fontWeight:"600", fontSize:"0.9rem", color:"#495057"}}>Module</label>
            <select style={{width:"100%", padding:"10px", marginBottom:"20px", borderRadius:"6px", border:"1px solid #ced4da"}} value={newEntry.offered_module_id} onChange={e => setNewEntry({...newEntry, offered_module_id: e.target.value})}>
              <option value="">-- Select Module --</option>
              {offeredModules.map(m => <option key={m.id} value={m.id}>{m.module_name} ({m.lecturer_name})</option>)}
            </select>

            <label style={{display:"block", marginBottom:"6px", fontWeight:"600", fontSize:"0.9rem", color:"#495057"}}>Room</label>
            <select style={{width:"100%", padding:"10px", marginBottom:"30px", borderRadius:"6px", border:"1px solid #ced4da"}} value={newEntry.room_id} onChange={e => setNewEntry({...newEntry, room_id: e.target.value})}>
              <option value="">-- Select Room --</option>
              {rooms.map(r => <option key={r.id} value={r.id}>{r.name}</option>)}
            </select>

            <div style={{ textAlign: "right", display: "flex", justifyContent: "flex-end", gap: "10px" }}>
              <button onClick={() => setShowModal(false)} style={{ padding: "10px 20px", background: "white", border: "1px solid #ced4da", borderRadius:"6px", cursor: "pointer", color: "#495057" }}>Cancel</button>
              <button onClick={handleSave} style={{ padding: "10px 24px", background: "#2b4a8e", color: "white", border: "none", borderRadius:"6px", cursor: "pointer", fontWeight: "600" }}>Save Class</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}