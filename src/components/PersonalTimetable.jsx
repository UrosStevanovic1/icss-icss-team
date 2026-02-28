import React, { useState, useEffect, useCallback } from "react";
import api from "../api";

export default function PersonalTimetable() {
  // --- ESTADOS ---
  const [semesters, setSemesters] = useState([]);
  const [selectedSemester, setSelectedSemester] = useState("");
  const [scheduleData, setScheduleData] = useState([]);

  // Simulación de Usuario Logueado
  const [lecturers, setLecturers] = useState([]);
  const [currentUser, setCurrentUser] = useState("");

  const [loading, setLoading] = useState(false);

  // VISTA Y MODO
  const [viewMode, setViewMode] = useState("Week");
  const [currentDate] = useState(new Date());
  const [isListView, setIsListView] = useState(false);

  const daysOfWeek = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"];
  const hours = ["08:00", "09:00", "10:00", "11:00", "12:00", "13:00", "14:00", "15:00", "16:00", "17:00", "18:00", "19:00", "20:00"];

  // Colores
  const myColor = { bg: "#e3f2fd", border: "#2196f3", text: "#0d47a1" };

  // --- CARGA DE DATOS ---
  useEffect(() => {
    async function loadInitialData() {
      try {
        const s = await api.getSemesters();
        setSemesters(s);
        if (s.length > 0) setSelectedSemester(s[0].name);

        const l = await api.getLecturers();
        setLecturers(l);
        if (l.length > 0) setCurrentUser(`${l[0].first_name} ${l[0].last_name}`);
      } catch (e) { console.error(e); }
    }
    loadInitialData();
  }, []);

  // Cargar MI horario
  const loadMySchedule = useCallback(async () => {
    if (!selectedSemester || !currentUser) return;
    setLoading(true);
    try {
      const data = await api.getLecturerSchedule(selectedSemester, currentUser);
      setScheduleData(data);
    } catch (e) { console.error(e); }
    setLoading(false);
  }, [selectedSemester, currentUser]);

  useEffect(() => {
    loadMySchedule();
  }, [selectedSemester, currentUser, loadMySchedule]);


  // --- HELPERS DE FECHA ---
  const getDayNameFromDate = (date) => date.toLocaleDateString('en-US', { weekday: 'long' });
  const displayMonthName = currentDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
  const visibleDays = (viewMode === "Week") ? daysOfWeek : [getDayNameFromDate(currentDate)];

  const getEntryForSlot = (day, time) => {
    const hourPrefix = time.split(":")[0];
    return scheduleData.find(entry => entry.day_of_week === day && entry.start_time.startsWith(hourPrefix));
  };

  // --- RENDERIZADORES ---

  const renderListView = () => {
    const sortedList = [...scheduleData].sort((a, b) => a.start_time.localeCompare(b.start_time));
    return (
      <div style={{ marginTop: "20px", overflowX: "auto", boxShadow: "0 2px 10px rgba(0,0,0,0.05)", borderRadius: "8px", border: "1px solid #eee" }}>
        <table style={{ width: "100%", borderCollapse: "collapse", background: "white" }}>
          <thead>
            <tr style={{ background: "#f8f9fa", borderBottom: "2px solid #dee2e6" }}>
              <th style={{ padding: "12px" }}>Day</th>
              <th style={{ padding: "12px" }}>Time</th>
              <th style={{ padding: "12px" }}>Module</th>
              <th style={{ padding: "12px" }}>Room</th>
            </tr>
          </thead>
          <tbody>
            {sortedList.map((entry, idx) => (
              <tr key={entry.id} style={{ borderBottom: "1px solid #f1f3f5" }}>
                <td style={{ padding: "12px", fontWeight: "bold" }}>{entry.day_of_week}</td>
                <td style={{ padding: "12px" }}>{entry.start_time} - {entry.end_time}</td>
                <td style={{ padding: "12px" }}>{entry.module_name}</td>
                <td style={{ padding: "12px" }}>📍 {entry.room_name}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  };

  const renderGridView = () => (
    <div style={{ borderTop: "1px solid #e9ecef", overflowX: "auto" }}>
      <table style={{ width: "100%", borderCollapse: "collapse", minWidth: "900px", tableLayout: "fixed" }}>
        <thead>
          <tr>
            <th style={{ width: "80px", borderRight: "1px solid #e9ecef" }}></th>
            {visibleDays.map(day => <th key={day} style={{ padding: "15px", textAlign: "center", color: "#2b4a8e", borderBottom: "2px solid #dee2e6", borderRight: "1px solid #f1f3f5" }}>{day}</th>)}
          </tr>
        </thead>
        <tbody>
          {hours.map(hour => (
            <tr key={hour}>
              <td style={{ padding: "15px 10px", textAlign: "center", fontWeight: "bold", borderRight: "1px solid #e9ecef", borderBottom: "1px solid #f8f9fa" }}>{hour}</td>
              {visibleDays.map(day => {
                const entry = getEntryForSlot(day, hour);
                return (
                  <td key={day} style={{ borderRight: "1px solid #f1f3f5", borderBottom: "1px solid #f1f3f5", height: "100px", padding: "6px", verticalAlign: "top" }}>
                    {entry && (
                      <div style={{ background: myColor.bg, borderLeft: `5px solid ${myColor.border}`, borderRadius: "6px", height: "100%", padding: "8px 10px" }}>
                        <div style={{ fontWeight: "700", fontSize: "0.85rem", color: "#212529" }}>{entry.module_name}</div>
                        <div style={{ fontSize: "0.75rem", fontWeight: "600", marginTop: "5px" }}>📍 {entry.room_name}</div>
                      </div>
                    )}
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );

  return (
    <div style={{ padding: "40px", fontFamily: "'Inter', sans-serif", background: "#ffffff", minHeight: "100vh" }}>

      {/* HEADER */}
      <div style={{display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "30px"}}>
        <h2 style={{ margin: 0, color: "#343a40", fontSize: "1.6rem", fontWeight: "700" }}>My Teaching Schedule</h2>

        <div style={{background: "#f8f9fa", padding: "10px", borderRadius: "8px", border: "1px solid #ddd"}}>
          <small style={{display:"block", marginBottom:"5px", color:"#666"}}>Viewing as:</small>
          <select value={currentUser} onChange={e => setCurrentUser(e.target.value)} style={{padding: "5px", borderRadius: "4px"}}>
            {lecturers.map(l => <option key={l.id} value={`${l.first_name} ${l.last_name}`}>{l.first_name} {l.last_name}</option>)}
          </select>
        </div>
      </div>

      {/* CONTROLES */}
      <div style={{ marginBottom: "30px" }}>
        <label style={{ marginRight: "10px", fontWeight: "bold" }}>Semester:</label>
        <select value={selectedSemester} onChange={e => setSelectedSemester(e.target.value)} style={{ padding: "8px", borderRadius: "6px", border: "1px solid #dee2e6" }}>
          {semesters.map(s => <option key={s.id} value={s.name}>{s.name}</option>)}
        </select>
      </div>

      {/* NAVEGACIÓN */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "25px" }}>
        <div style={{ display: "flex", gap: "10px" }}>
          <button style={{padding:"8px 20px", background: viewMode==="Week"?"#2b4a8e":"white", color: viewMode==="Week"?"white":"#2b4a8e", border:"1px solid #2b4a8e", borderRadius:"4px", cursor:"pointer"}} onClick={() => setViewMode("Week")}>Week</button>
          <button style={{padding:"8px 20px", background: viewMode==="Month"?"#2b4a8e":"white", color: viewMode==="Month"?"white":"#2b4a8e", border:"1px solid #2b4a8e", borderRadius:"4px", cursor:"pointer"}} onClick={() => setViewMode("Month")}>Month</button>
        </div>

        <div style={{ textAlign: "center", color: "#2b4a8e" }}>
          <div style={{ fontSize: "1.1rem", fontWeight: "700" }}>{viewMode === "Week" ? "Week View" : displayMonthName}</div>
          <div style={{ fontSize: "1rem" }}>{viewMode === "Week" ? "(Mon - Fri)" : ""}</div>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
          <span style={{ color: isListView ? "#2b4a8e" : "#ccc" }}>List</span>
          <div onClick={() => setIsListView(!isListView)} style={{ width: "40px", height: "20px", background: isListView ? "#ccc" : "#2b4a8e", borderRadius: "10px", position: "relative", cursor: "pointer" }}>
            <div style={{ width: "16px", height: "16px", background: "white", borderRadius: "50%", position: "absolute", top:"2px", left: isListView ? "2px" : "22px", transition: "all 0.3s" }}></div>
          </div>
          <span style={{ color: !isListView ? "#2b4a8e" : "#ccc" }}>Calendar</span>
        </div>
      </div>

      {loading ? <p>Loading...</p> : (isListView ? renderListView() : renderGridView())}
    </div>
  );
}