import { useEffect, useState } from "react";
import api from "../api";


const styles = {
  container: {
    padding: "20px",
    fontFamily: "'Segoe UI', Tahoma, Geneva, Verdana, sans-serif",
    color: "#333",
    maxWidth: "100%",
  },
  header: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: "20px",
    borderBottom: "1px solid #ccc",
    paddingBottom: "15px",
  },
  title: {
    margin: 0,
    fontSize: "1.5rem",
    color: "#333",
  },
  table: {
    width: "100%",
    borderCollapse: "collapse",
    background: "#fff",
    border: "1px solid #ddd",
    fontSize: "0.9rem",
  },
  thead: {
    background: "#f2f2f2",
    borderBottom: "2px solid #ccc",
  },
  th: {
    textAlign: "left",
    padding: "10px 15px",
    fontWeight: "600",
    color: "#444",
  },
  tr: {
    borderBottom: "1px solid #eee",
  },
  td: {
    padding: "10px 15px",
    verticalAlign: "middle",
  },
  btn: {
    padding: "6px 12px",
    borderRadius: "4px",
    border: "1px solid transparent",
    cursor: "pointer",
    fontSize: "0.9rem",
    marginLeft: "5px",
  },
  primaryBtn: { background: "#007bff", color: "white" },
  editBtn: { background: "#6c757d", color: "white" },
  deleteBtn: { background: "#dc3545", color: "white" },
  modalOverlay: {
    position: "fixed", top: 0, left: 0, right: 0, bottom: 0,
    background: "rgba(0,0,0,0.5)",
    display: "flex", justifyContent: "center", alignItems: "center", zIndex: 1000,
  },
  modalContent: {
    background: "white", padding: "25px", borderRadius: "8px",
    width: "600px", maxWidth: "95%", maxHeight: "90vh", overflowY: "auto",
    boxShadow: "0 5px 15px rgba(0,0,0,0.3)",
  },
  formGroup: { marginBottom: "15px" },
  label: { display: "block", marginBottom: "5px", fontWeight: "bold", fontSize: "0.9rem" },
  input: {
    width: "100%", padding: "8px", borderRadius: "4px",
    border: "1px solid #ccc", fontSize: "1rem", boxSizing: "border-box",
  },
};

export default function ScheduleOverview() {
  const [modules, setModules] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");

  const [formMode, setFormMode] = useState("overview"); // overview | add | edit
  const [editingId, setEditingId] = useState(null);

  const [draft, setDraft] = useState({
    moduleName: "",
    roomType: "Lecture Classroom",
    sessionsPerWeek: 1,
    semester: 1,
    totalSessions: 14,
    classDuration: 90,
    numberOfStudents: 25,
    onsiteOnline: "Hybrid",
  });

  async function loadModules() {
    setLoading(true);
    setLoadError("");
    try {
      const data = await api.getModules();
      setModules(Array.isArray(data) ? data : []);
    } catch (e) {
      setLoadError(e?.message || "Failed to load modules");
      setModules([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadModules();
  }, []);

  function openAdd() {
    setEditingId(null);
    setDraft({
      moduleName: "",
      roomType: "Lecture Classroom",
      sessionsPerWeek: 1,
      semester: 1,
      totalSessions: 14,
      classDuration: 90,
      numberOfStudents: 25,
      onsiteOnline: "Hybrid",
    });
    setFormMode("add");
  }

  function openEdit(row) {
    setEditingId(row.module_id);
    setDraft({
      moduleName: row.module_name,
      roomType: row.room_type,
      sessionsPerWeek: row.sessions_per_week,
      semester: row.semester,
      totalSessions: row.total_sessions,
      classDuration: row.class_duration,
      numberOfStudents: row.number_of_students,
      onsiteOnline: row.onsite_online,
    });
    setFormMode("edit");
  }

  async function save() {
    if (!draft.moduleName.trim()) return alert("Module name is required");

    const payload = {
      module_name: draft.moduleName.trim(),
      room_type: draft.roomType,
      sessions_per_week: Number(draft.sessionsPerWeek),
      semester: Number(draft.semester),
      total_sessions: Number(draft.totalSessions),
      class_duration: Number(draft.classDuration),
      number_of_students: Number(draft.numberOfStudents),
      onsite_online: draft.onsiteOnline,
    };

    try {
      if (formMode === "add") {
        await api.createModule(payload);
      } else {
        await api.updateModule(editingId, payload);
      }
      await loadModules();
      setFormMode("overview");
      setEditingId(null);
    } catch (e) {
      console.error(e);
      alert("Backend error while saving module.");
    }
  }

  async function remove(id) {
    const ok = window.confirm("Delete this module?");
    if (!ok) return;

    try {
      await api.deleteModule(id);
      await loadModules();
    } catch (e) {
      console.error(e);
      alert("Backend error while deleting module.");
    }
  }

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <h2 style={styles.title}>Schedule Overview (Modules)</h2>

        <div style={{ display: "flex", gap: 10 }}>
          <button
            style={{...styles.btn, background: "#fff", border: "1px solid #ccc", color:"#333"}}
            onClick={loadModules}
          >
            ↻ Refresh
          </button>
          <button style={{...styles.btn, ...styles.primaryBtn}} onClick={openAdd}>
            + Add Module
          </button>
        </div>
      </div>

      {loading && <p>Loading modules...</p>}

      {loadError && (
        <p style={{ color: "crimson", fontWeight: "bold" }}>
          Backend error: {loadError}
        </p>
      )}

      {!loading && !loadError && (
        <table style={styles.table}>
          <thead style={styles.thead}>
            <tr>
              <th style={styles.th}>Name</th>
              <th style={styles.th}>Room Type</th>
              <th style={styles.th}>Sessions/Week</th>
              <th style={styles.th}>Sem.</th>
              <th style={styles.th}>Total</th>
              <th style={styles.th}>Duration</th>
              <th style={styles.th}>Students</th>
              <th style={styles.th}>Type</th>
              <th style={{...styles.th, textAlign: 'right', width: '160px'}}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {modules.map((m) => (
              <tr key={m.module_id} style={styles.tr}>
                <td style={styles.td}><strong>{m.module_name}</strong></td>
                <td style={styles.td}>{m.room_type}</td>
                <td style={styles.td}>{m.sessions_per_week}</td>
                <td style={styles.td}>{m.semester}</td>
                <td style={styles.td}>{m.total_sessions}</td>
                <td style={styles.td}>{m.class_duration} min</td>
                <td style={styles.td}>{m.number_of_students}</td>
                <td style={styles.td}>
                   <span style={{
                      padding:"3px 8px",
                      borderRadius:"4px",
                      fontSize:"0.8rem",
                      background: m.onsite_online === "Online" ? "#fff3cd" : "#d1e7dd",
                      color: "#333"
                   }}>
                     {m.onsite_online}
                   </span>
                </td>
                <td style={{...styles.td, textAlign: 'right', whiteSpace: 'nowrap'}}>
                  <button style={{...styles.btn, ...styles.editBtn}} onClick={() => openEdit(m)}>
                    Edit
                  </button>
                  <button style={{...styles.btn, ...styles.deleteBtn}} onClick={() => remove(m.module_id)}>
                    Delete
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      {/* --- MODAL --- */}
      {(formMode === "add" || formMode === "edit") && (
        <div style={styles.modalOverlay}>
          <div style={styles.modalContent}>
            <div style={{display:'flex', justifyContent:'space-between', marginBottom:'20px'}}>
               <h3 style={{margin:0}}>{formMode === "add" ? "Add Module" : "Edit Module"}</h3>
               <button onClick={() => setFormMode("overview")} style={{border:'none', background:'transparent', fontSize:'1.5rem', cursor:'pointer'}}>×</button>
            </div>

            <div style={styles.formGroup}>
              <label style={styles.label}>Module Name</label>
              <input
                style={styles.input}
                value={draft.moduleName}
                onChange={(e) => setDraft({ ...draft, moduleName: e.target.value })}
                placeholder="e.g., Databases"
              />
            </div>

            <div style={{display:'flex', gap:'15px'}}>
                <div style={{...styles.formGroup, flex:1}}>
                  <label style={styles.label}>Room Type</label>
                  <select
                    style={styles.input}
                    value={draft.roomType}
                    onChange={(e) => setDraft({ ...draft, roomType: e.target.value })}
                  >
                    <option value="Lecture Classroom">Lecture Classroom</option>
                    <option value="Computer Lab">Computer Lab</option>
                    <option value="Game Design">Game Design</option>
                    <option value="Seminar">Seminar</option>
                  </select>
                </div>
                <div style={{...styles.formGroup, flex:1}}>
                   <label style={styles.label}>Mode</label>
                    <select
                      style={styles.input}
                      value={draft.onsiteOnline}
                      onChange={(e) => setDraft({ ...draft, onsiteOnline: e.target.value })}
                    >
                      <option value="Onsite">Onsite</option>
                      <option value="Online">Online</option>
                      <option value="Hybrid">Hybrid</option>
                    </select>
                </div>
            </div>

            <div style={{display:'flex', gap:'15px'}}>
                <div style={{...styles.formGroup, flex:1}}>
                  <label style={styles.label}>Sessions/Week</label>
                  <input
                    style={styles.input}
                    type="number"
                    value={draft.sessionsPerWeek}
                    onChange={(e) => setDraft({ ...draft, sessionsPerWeek: e.target.value })}
                  />
                </div>
                <div style={{...styles.formGroup, flex:1}}>
                  <label style={styles.label}>Semester</label>
                  <input
                    style={styles.input}
                    type="number"
                    value={draft.semester}
                    onChange={(e) => setDraft({ ...draft, semester: e.target.value })}
                  />
                </div>
            </div>

            <div style={{display:'flex', gap:'15px'}}>
                <div style={{...styles.formGroup, flex:1}}>
                  <label style={styles.label}>Total Sessions</label>
                  <input
                    style={styles.input}
                    type="number"
                    value={draft.totalSessions}
                    onChange={(e) => setDraft({ ...draft, totalSessions: e.target.value })}
                  />
                </div>
                <div style={{...styles.formGroup, flex:1}}>
                  <label style={styles.label}>Duration (min)</label>
                  <input
                    style={styles.input}
                    type="number"
                    value={draft.classDuration}
                    onChange={(e) => setDraft({ ...draft, classDuration: e.target.value })}
                  />
                </div>
                 <div style={{...styles.formGroup, flex:1}}>
                  <label style={styles.label}># Students</label>
                  <input
                    style={styles.input}
                    type="number"
                    value={draft.numberOfStudents}
                    onChange={(e) => setDraft({ ...draft, numberOfStudents: e.target.value })}
                  />
                </div>
            </div>

            <div style={{marginTop: '25px', display:'flex', justifyContent:'flex-end', gap:'10px'}}>
                <button style={{...styles.btn, background:'#f8f9fa', border:'1px solid #ddd', color:'#333'}} onClick={() => setFormMode("overview")}>Cancel</button>
                <button style={{...styles.btn, ...styles.primaryBtn}} onClick={save}>
                    {formMode === "add" ? "Create" : "Update"}
                </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}