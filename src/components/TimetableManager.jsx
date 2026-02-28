import React, { useState, useEffect, useCallback, useMemo } from "react";
import api from "../api";

export default function TimetableManager({ currentUserRole }) {
  const isStudent = currentUserRole === "student";

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

  const [viewMode, setViewMode] = useState("Week"); // Day | Week | Month | Semester
  const [currentDate, setCurrentDate] = useState(new Date());
  const [isListView, setIsListView] = useState(false);

  // modal + "edit via delete+create"
  const [showModal, setShowModal] = useState(false);
  const [editingEntry, setEditingEntry] = useState(null); // schedule entry object or null

  const [form, setForm] = useState({
    day: "",
    start_time: "09:00",
    end_time: "10:00",
    offered_module_id: "",
    room_id: "",
    group_ids: [],
  });

  const daysOfWeek = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"];

  const timeToMinutes = (t) => {
    if (!t || typeof t !== "string" || !t.includes(":")) return 0;
    const [hh, mm] = t.split(":").map((x) => parseInt(x, 10));
    return hh * 60 + mm;
  };

  // --- LOADERS (uses your api.js exactly) ---
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
    (async () => {
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
    })();
  }, []);

  useEffect(() => {
    if (selectedSemester) {
      loadSchedule();
      loadDropdowns();
    }
  }, [selectedSemester, loadSchedule, loadDropdowns]);

  // --- FILTER ---
  const filteredData = useMemo(() => {
    return (scheduleData || []).filter((entry) => {
      if (filterLecturer && entry.lecturer_name !== filterLecturer) return false;
      if (filterGroup) {
        const names =
          entry.group_names ||
          (Array.isArray(entry.groups) ? entry.groups.map((x) => x.name ?? x.Name) : []);
        if (!names.includes(filterGroup)) return false;
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

  const getDayNameFromDate = (date) => date.toLocaleDateString("en-US", { weekday: "long" });

  // --- OPEN MODAL ---
  const openAdd = (day) => {
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
    setEditingEntry(entry);
    setForm({
      day: entry.day_of_week,
      start_time: entry.start_time,
      end_time: entry.end_time,
      offered_module_id: String(entry.offered_module_id ?? ""),
      // backend often doesn't send room_id, so leave blank if unknown
      room_id: "",
      group_ids: Array.isArray(entry.group_ids) ? entry.group_ids : [],
    });
    setShowModal(true);
  };

  // --- SAVE (matches previous api.js: create + delete only) ---
  const handleSave = async () => {
    if (!form.offered_module_id) return alert("Select module");
    if (!form.room_id) return alert("Select room");
    if (!form.group_ids || form.group_ids.length === 0) return alert("Select at least 1 group");

    const s = timeToMinutes(form.start_time);
    const e = timeToMinutes(form.end_time);
    if (e <= s) return alert("End time must be after start time");

    try {
      // edit without PUT => delete old then create new
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

  // --- LABEL HELPERS (DB mismatches safe) ---
  const getModuleLabel = (m) => {
    const modName = m.module_name ?? m.name ?? m.module?.name ?? m.module?.Name ?? "Unnamed module";
    const lecName = m.lecturer_name ?? m.lecturerName ?? m.lecturer?.name ?? "";
    return lecName ? `${modName} (${lecName})` : modName;
  };

  const getRoomName = (r) => r.name ?? r.Name ?? r.room_name ?? "Unnamed room";
  const getGroupName = (g) => g.name ?? g.Name ?? g.group_name ?? "Unnamed group";

  // --- AGENDA VIEW (no overlaps) ---
  const getDayEntries = (dayName) =>
    filteredData
      .filter((e) => e.day_of_week === dayName)
      .sort((a, b) => timeToMinutes(a.start_time) - timeToMinutes(b.start_time));

  const AgendaCard = ({ entry }) => {
    const groupsLine = Array.isArray(entry.group_names) ? entry.group_names.join(", ") : "—";
    return (
      <div
        onClick={() => !isStudent && openEdit(entry)}
        style={{
          border: "1px solid #e9ecef",
          borderRadius: "10px",
          padding: "12px",
          background: "white",
          boxShadow: "0 2px 10px rgba(0,0,0,0.04)",
          cursor: isStudent ? "default" : "pointer",
          position: "relative",
        }}
      >
        <div style={{ fontWeight: 900, color: "#2b4a8e", marginBottom: 6 }}>
          {entry.start_time} - {entry.end_time}
        </div>
        <div style={{ fontWeight: 900, fontSize: "1.05rem", marginBottom: 4 }}>{entry.module_name}</div>
        <div style={{ color: "#495057", fontWeight: 700, marginBottom: 6 }}>{entry.lecturer_name}</div>
        <div style={{ display: "flex", flexDirection: "column", gap: 4, fontSize: "0.95rem", color: "#495057" }}>
          <div>📍 <b>{entry.room_name}</b></div>
          <div>👥 {groupsLine}</div>
        </div>

        {!isStudent && (
          <button
            onClick={(e) => handleDelete(entry.id, e)}
            style={{
              position: "absolute",
              top: 8,
              right: 8,
              width: 28,
              height: 28,
              borderRadius: 8,
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
                <div style={{ fontWeight: 900, fontSize: "1.1rem", color: "#2b4a8e" }}>{day}</div>
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

            <div style={{ display: "flex", flexDirection: "column", gap: 10, maxHeight: 680, overflow: "auto", paddingRight: 4 }}>
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
            <div style={{ fontWeight: 900, fontSize: "1.2rem", color: "#2b4a8e" }}>{day}</div>
            <div style={{ color: "#868e96", fontWeight: 700 }}>{items.length} classes</div>
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

        <div style={{ display: "flex", flexDirection: "column", gap: 10, maxHeight: 720, overflow: "auto", paddingRight: 4 }}>
          {items.length === 0 ? (
            <div style={{ color: "#adb5bd", fontWeight: 700, padding: "10px 4px" }}>No classes</div>
          ) : (
            items.map((e) => <AgendaCard key={e.id} entry={e} />)
          )}
        </div>
      </div>
    );
  };

  // --- Month view: show more info in each cell ---
  const renderMonthView = () => {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    const firstDay = new Date(year, month, 1);
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const startDayOfWeek = firstDay.getDay() === 0 ? 6 : firstDay.getDay() - 1;

    const cells = [];
    for (let i = 0; i < startDayOfWeek; i++) {
      cells.push(<div key={`empty-${i}`} style={{ background: "#f8f9fa", border: "1px solid #eee", minHeight: 120 }} />);
    }

    for (let d = 1; d <= daysInMonth; d++) {
      const dateObj = new Date(year, month, d);
      const dayName = getDayNameFromDate(dateObj);
      const daily = filteredData
        .filter((e) => e.day_of_week === dayName)
        .sort((a, b) => timeToMinutes(a.start_time) - timeToMinutes(b.start_time));

      cells.push(
        <div key={d} style={{ border: "1px solid #eee", minHeight: 120, padding: 8, background: "white" }}>
          <div style={{ textAlign: "right", fontWeight: 900, color: "#ccc", marginBottom: 6 }}>{d}</div>
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            {daily.map((cls) => {
              const gLine = Array.isArray(cls.group_names) ? cls.group_names.join(", ") : "—";
              return (
                <div
                  key={cls.id}
                  onClick={() => !isStudent && openEdit(cls)}
                  style={{
                    fontSize: "0.78rem",
                    padding: "6px 8px",
                    borderRadius: 8,
                    border: "1px solid #e9ecef",
                    background: "#f8f9fa",
                    cursor: isStudent ? "default" : "pointer",
                  }}
                  title={`${cls.start_time}-${cls.end_time} • ${cls.module_name} • ${cls.lecturer_name} • ${cls.room_name} • ${gLine}`}
                >
                  <div style={{ fontWeight: 900, color: "#2b4a8e" }}>
                    {cls.start_time}-{cls.end_time} {cls.module_name}
                  </div>
                  <div style={{ color: "#495057", fontWeight: 700 }}>
                    {cls.lecturer_name} • 📍 {cls.room_name}
                  </div>
                  <div style={{ color: "#495057" }}>👥 {gLine}</div>
                </div>
              );
            })}
          </div>
        </div>
      );
    }

    return (
      <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: 1, background: "#ddd", border: "1px solid #ddd" }}>
        {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((x) => (
          <div key={x} style={{ background: "#2b4a8e", color: "white", padding: 12, textAlign: "center", fontWeight: 900 }}>
            {x}
          </div>
        ))}
        {cells}
      </div>
    );
  };

  // --- HEADER UI (keep simple) ---
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

  const displayMonthName = currentDate.toLocaleDateString("en-US", { month: "long", year: "numeric" });

  return (
    <div style={{ padding: "40px", fontFamily: "'Inter', 'Segoe UI', sans-serif", background: "#ffffff", minHeight: "100vh" }}>
      <h2 style={{ margin: "0 0 30px 0", color: "#343a40", fontSize: "1.9rem", fontWeight: "900" }}>
        {isStudent ? "Student Schedule" : "Schedule Overview"}
      </h2>

      {/* FILTERS */}
      <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: 26, marginBottom: 34 }}>
        <div style={{ display: "flex", alignItems: "center" }}>
          <label style={{ marginRight: 10, fontWeight: 900 }}>Semester</label>
          <select value={selectedSemester} onChange={(e) => setSelectedSemester(e.target.value)} style={filterSelectStyle}>
            {semesters.map((s) => (
              <option key={s.id} value={s.name}>{s.name}</option>
            ))}
          </select>
        </div>

        <div style={{ display: "flex", alignItems: "center" }}>
          <label style={{ marginRight: 10, fontWeight: 900 }}>Groups</label>
          <select value={filterGroup} onChange={(e) => setFilterGroup(e.target.value)} style={filterSelectStyle}>
            <option value="">All Groups</option>
            {groups.map((g) => (
              <option key={g.id} value={getGroupName(g)}>{getGroupName(g)}</option>
            ))}
          </select>
        </div>

        {!isStudent && (
          <div style={{ display: "flex", alignItems: "center" }}>
            <label style={{ marginRight: 10, fontWeight: 900 }}>Lecturer</label>
            <select value={filterLecturer} onChange={(e) => setFilterLecturer(e.target.value)} style={filterSelectStyle}>
              <option value="">All Lecturers</option>
              {lecturers.map((l) => (
                <option key={l.id} value={`${l.first_name} ${l.last_name}`}>{`${l.first_name} ${l.last_name}`}</option>
              ))}
            </select>
          </div>
        )}
      </div>

      {/* CONTROLS */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 25 }}>
        <div style={{ display: "flex", gap: 10 }}>
          <button style={navButtonStyle("Day")} onClick={() => setViewMode("Day")}>Day</button>
          <button style={navButtonStyle("Week")} onClick={() => setViewMode("Week")}>Week</button>
          <button style={navButtonStyle("Month")} onClick={() => setViewMode("Month")}>Month</button>
          <button style={navButtonStyle("Semester")} onClick={() => setViewMode("Semester")}>Semester</button>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 20 }}>
          {viewMode !== "Semester" && (
            <>
              <button onClick={() => handleNavigateDate("prev")} style={{ background: "none", border: "none", cursor: "pointer", fontSize: "2rem", color: "#2b4a8e" }}>‹</button>
              <div style={{ textAlign: "center", color: "#2b4a8e", fontWeight: 900 }}>
                {viewMode === "Month" ? displayMonthName : ""}
              </div>
              <button onClick={() => handleNavigateDate("next")} style={{ background: "none", border: "none", cursor: "pointer", fontSize: "2rem", color: "#2b4a8e" }}>›</button>
            </>
          )}
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <span style={{ color: isListView ? "#2b4a8e" : "#6c757d", fontWeight: isListView ? 900 : 600 }}>List View</span>
          <div
            onClick={() => setIsListView(!isListView)}
            style={{ width: 46, height: 26, background: isListView ? "#6c757d" : "#2b4a8e", borderRadius: 13, position: "relative", cursor: "pointer" }}
          >
            <div style={{ width: 20, height: 20, background: "white", borderRadius: "50%", position: "absolute", top: 3, left: isListView ? 3 : 23, boxShadow: "0 1px 2px rgba(0,0,0,0.2)" }} />
          </div>
          <span style={{ color: !isListView ? "#2b4a8e" : "#6c757d", fontWeight: !isListView ? 900 : 600 }}>Calendar View</span>
        </div>
      </div>

      {/* MAIN */}
      {loading ? (
        <p>Loading...</p>
      ) : viewMode === "Month" ? (
        renderMonthView()
      ) : viewMode === "Day" ? (
        renderAgendaDay()
      ) : (
        renderAgendaWeek()
      )}

      {/* MODAL */}
      {showModal && !isStudent && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.4)", display: "flex", justifyContent: "center", alignItems: "center", zIndex: 1000, backdropFilter: "blur(3px)" }}>
          <div style={{ background: "white", padding: 30, borderRadius: 14, width: 520, boxShadow: "0 10px 30px rgba(0,0,0,0.15)" }}>
            <h3 style={{ marginTop: 0, marginBottom: 10, fontSize: "1.4rem", fontWeight: 900 }}>
              {editingEntry ? "Edit Class" : "Schedule Class"}
            </h3>

            <p style={{ marginBottom: 18, color: "#6c757d", fontSize: "1.05rem" }}>
              <strong>{form.day}</strong>
            </p>

            <label style={{ display: "block", marginBottom: 6, fontWeight: 900 }}>Start time</label>
            <input
              type="time"
              step="900"
              value={form.start_time}
              onChange={(e) => setForm({ ...form, start_time: e.target.value })}
              style={{ width: "100%", padding: 12, marginBottom: 16, borderRadius: 8, border: "1px solid #ced4da" }}
            />

            <label style={{ display: "block", marginBottom: 6, fontWeight: 900 }}>End time</label>
            <input
              type="time"
              step="900"
              value={form.end_time}
              onChange={(e) => setForm({ ...form, end_time: e.target.value })}
              style={{ width: "100%", padding: 12, marginBottom: 16, borderRadius: 8, border: "1px solid #ced4da" }}
            />

            <label style={{ display: "block", marginBottom: 6, fontWeight: 900 }}>Module</label>
            <select
              value={form.offered_module_id}
              onChange={(e) => setForm({ ...form, offered_module_id: e.target.value })}
              style={{ width: "100%", padding: 12, marginBottom: 16, borderRadius: 8, border: "1px solid #ced4da" }}
            >
              <option value="">-- Select Module --</option>
              {offeredModules.map((m) => (
                <option key={m.id} value={String(m.id)}>
                  {getModuleLabel(m)}
                </option>
              ))}
            </select>

            <label style={{ display: "block", marginBottom: 6, fontWeight: 900 }}>Room</label>
            <select
              value={form.room_id}
              onChange={(e) => setForm({ ...form, room_id: e.target.value })}
              style={{ width: "100%", padding: 12, marginBottom: 16, borderRadius: 8, border: "1px solid #ced4da" }}
            >
              <option value="">-- Select Room --</option>
              {rooms.map((r) => (
                <option key={r.id} value={String(r.id)}>
                  {getRoomName(r)}
                </option>
              ))}
            </select>

            <label style={{ display: "block", marginBottom: 6, fontWeight: 900 }}>Groups</label>
            <select
              multiple
              value={form.group_ids.map(String)}
              onChange={(e) => {
                const selected = Array.from(e.target.selectedOptions).map((opt) => Number(opt.value));
                setForm({ ...form, group_ids: selected });
              }}
              style={{ width: "100%", padding: 12, marginBottom: 22, borderRadius: 8, border: "1px solid #ced4da", minHeight: 140 }}
            >
              {groups.map((g) => (
                <option key={g.id} value={String(g.id)}>
                  {getGroupName(g)}
                </option>
              ))}
            </select>

            <div style={{ display: "flex", justifyContent: "flex-end", gap: 10 }}>
              <button
                onClick={() => { setShowModal(false); setEditingEntry(null); }}
                style={{ padding: "12px 22px", background: "white", border: "1px solid #ced4da", borderRadius: 8, cursor: "pointer", fontWeight: 800 }}
              >
                Cancel
              </button>
              <button
                onClick={handleSave}
                style={{ padding: "12px 26px", background: "#2b4a8e", color: "white", border: "none", borderRadius: 8, cursor: "pointer", fontWeight: 900 }}
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