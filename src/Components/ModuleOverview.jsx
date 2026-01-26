import { useEffect, useMemo, useState } from "react";
import api from "../api";

const styles = {
  container: { padding: "20px", fontFamily: "'Segoe UI', sans-serif", color: "#333", maxWidth: "100%" },
  header: { display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px", borderBottom: "1px solid #ccc", paddingBottom: "15px" },
  title: { margin: 0, fontSize: "1.5rem", color: "#333" },
  searchBar: { padding: "8px 12px", width: "300px", borderRadius: "4px", border: "1px solid #ccc", marginBottom: "15px" },
  table: { width: "100%", borderCollapse: "collapse", background: "#fff", border: "1px solid #ddd", fontSize: "0.9rem" },
  thead: { background: "#f2f2f2", borderBottom: "2px solid #ccc" },
  th: { textAlign: "left", padding: "10px 15px", fontWeight: "600", color: "#444" },
  tr: { borderBottom: "1px solid #eee" },
  td: { padding: "10px 15px", verticalAlign: "middle" },
  btn: { padding: "6px 12px", borderRadius: "4px", border: "none", cursor: "pointer", fontSize: "0.9rem", marginLeft: "5px" },
  primaryBtn: { background: "#007bff", color: "white" },
  editBtn: { background: "#6c757d", color: "white" },
  deleteBtn: { background: "#dc3545", color: "white" },
  modalOverlay: { position: "fixed", top: 0, left: 0, right: 0, bottom: 0, background: "rgba(0,0,0,0.5)", display: "flex", justifyContent: "center", alignItems: "center", zIndex: 1000 },
  modalContent: { background: "white", padding: "25px", borderRadius: "8px", width: "700px", maxWidth: "95%", maxHeight: "90vh", overflowY: "auto", boxShadow: "0 5px 15px rgba(0,0,0,0.3)" },
  formGroup: { marginBottom: "15px", flex: 1 },
  label: { display: "block", marginBottom: "5px", fontWeight: "bold", fontSize: "0.9rem" },
  input: { width: "100%", padding: "8px", borderRadius: "4px", border: "1px solid #ccc", fontSize: "1rem", boxSizing: "border-box" },
  row: { display: "flex", gap: "15px" }
};

export default function ModuleOverview() {
  const [modules, setModules] = useState([]);
  const [programs, setPrograms] = useState([]);
  const [specializations, setSpecializations] = useState([]);
  const [roomTypes, setRoomTypes] = useState([]); // ✅ Store unique room types
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");
  const [formMode, setFormMode] = useState("overview");
  const [editingId, setEditingId] = useState(null);

  const [draft, setDraft] = useState({
    moduleCode: "",
    name: "",
    ects: 5,
    typeOfModule: "", // Reset default so user must select one
    semester: 1,
    assessmentType: "Written Exam",
    category: "Core",
    programId: "",
    specializationId: ""
  });

  async function loadData() {
    setLoading(true);
    try {
      // ✅ Fetch Rooms alongside other data
      const [modData, progData, specData, roomData] = await Promise.all([
        api.getModules(),
        api.getPrograms(),
        api.getSpecializations(),
        api.getRooms()
      ]);

      const mappedModules = (Array.isArray(modData) ? modData : []).map(m => ({
        ...m,
        moduleCode: m.module_code,
        roomType: m.room_type,
        assessmentType: m.assessment_type,
        programId: m.program_id,
        specializationId: m.specialization_id
      }));

      setModules(mappedModules);
      setPrograms(Array.isArray(progData) ? progData : []);
      setSpecializations(Array.isArray(specData) ? specData : []);

      // ✅ Extract unique room types from the fetched rooms
      const uniqueTypes = [...new Set((Array.isArray(roomData) ? roomData : []).map(r => r.type).filter(Boolean))];
      setRoomTypes(uniqueTypes.sort());

    } catch (e) {
      alert("Error loading data: " + e.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadData();
  }, []);

  function openAdd() {
    setEditingId(null);
    setDraft({
      moduleCode: "",
      name: "",
      ects: 5,
      typeOfModule: "",
      semester: 1,
      assessmentType: "Written Exam",
      category: "Core",
      programId: "",
      specializationId: ""
    });
    setFormMode("add");
  }

  function openEdit(row) {
    setEditingId(row.moduleCode);
    setDraft({
      moduleCode: row.moduleCode,
      name: row.name,
      ects: row.ects || 5,
      typeOfModule: row.roomType || "",
      semester: row.semester || 1,
      assessmentType: row.assessmentType || "Written Exam",
      category: row.category || "Core",
      programId: row.programId || "",
      specializationId: row.specializationId || ""
    });
    setFormMode("edit");
  }

  async function save() {
    if (!draft.moduleCode.trim() || !draft.name.trim()) {
      return alert("Module Code and Name are required.");
    }
    if (!draft.typeOfModule) {
        return alert("Please select a Room Type.");
    }

    const payload = {
      module_code: draft.moduleCode.trim(),
      name: draft.name.trim(),
      ects: Number(draft.ects),
      room_type: draft.typeOfModule,
      semester: Number(draft.semester),
      assessment_type: draft.assessmentType,
      category: draft.category,
      program_id: draft.programId ? Number(draft.programId) : null,
      specialization_id: draft.specializationId ? Number(draft.specializationId) : null
    };

    try {
      if (formMode === "add") {
        await api.createModule(payload);
      } else {
        await api.updateModule(editingId, payload);
      }
      await loadData();
      setFormMode("overview");
    } catch (e) {
      console.error(e);
      alert("Backend error while saving module. Check console.");
    }
  }

  async function remove(id) {
    if (!window.confirm("Delete this module?")) return;
    try {
      await api.deleteModule(id);
      await loadData();
    } catch (e) {
      alert("Error deleting module.");
    }
  }

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return modules;
    return modules.filter(m =>
      m.name.toLowerCase().includes(q) ||
      m.moduleCode.toLowerCase().includes(q)
    );
  }, [modules, query]);

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <h2 style={styles.title}>Module Overview</h2>
        <button style={{...styles.btn, ...styles.primaryBtn}} onClick={openAdd}>
          + New Module
        </button>
      </div>

      <input
        style={styles.searchBar}
        placeholder="Search by name or code..."
        value={query}
        onChange={(e) => setQuery(e.target.value)}
      />

      {loading ? <p>Loading...</p> : (
        <table style={styles.table}>
          <thead style={styles.thead}>
            <tr>
              <th style={styles.th}>Code</th>
              <th style={styles.th}>Name</th>
              <th style={styles.th}>Program</th>
              <th style={styles.th}>Semesters</th>
              <th style={styles.th}>ECTS</th>
              <th style={styles.th}>Type</th>
              <th style={styles.th}>Category</th>
              <th style={{...styles.th, textAlign:'right'}}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((m) => {
               const progName = programs.find(p => p.id === m.programId)?.name || "-";
               return (
                <tr key={m.moduleCode} style={styles.tr}>
                  <td style={styles.td}><strong>{m.moduleCode}</strong></td>
                  <td style={styles.td}>{m.name}</td>
                  <td style={styles.td}><small>{progName}</small></td>
                  <td style={styles.td}>{m.semester}</td>
                  <td style={styles.td}>{m.ects}</td>
                  <td style={styles.td}>{m.roomType}</td>
                  <td style={styles.td}>
                    <span style={{
                        padding: "2px 6px", borderRadius: "4px", fontSize: "0.8rem",
                        background: m.category === "Core" ? "#d1e7dd" : "#fff3cd",
                        color: "#333"
                    }}>
                        {m.category || "-"}
                    </span>
                  </td>
                  <td style={{...styles.td, textAlign:'right', whiteSpace:'nowrap'}}>
                    <button style={{...styles.btn, ...styles.editBtn}} onClick={() => openEdit(m)}>Edit</button>
                    <button style={{...styles.btn, ...styles.deleteBtn}} onClick={() => remove(m.moduleCode)}>Delete</button>
                  </td>
                </tr>
               );
            })}
          </tbody>
        </table>
      )}

      {(formMode === "add" || formMode === "edit") && (
        <div style={styles.modalOverlay}>
            <div style={styles.modalContent}>
                <div style={{display:'flex', justifyContent:'space-between', marginBottom:'20px'}}>
                    <h3 style={{margin:0}}>{formMode === "add" ? "Create Module" : "Edit Module"}</h3>
                    <button onClick={() => setFormMode("overview")} style={{border:'none', background:'transparent', fontSize:'1.5rem', cursor:'pointer'}}>×</button>
                </div>

                <div style={styles.row}>
                    <div style={{...styles.formGroup, flex: 1}}>
                        <label style={styles.label}>Module Code</label>
                        <input
                            style={styles.input}
                            value={draft.moduleCode}
                            onChange={e => setDraft({...draft, moduleCode: e.target.value})}
                        />
                    </div>
                    <div style={{...styles.formGroup, flex: 3}}>
                        <label style={styles.label}>Module Name</label>
                        <input style={styles.input} value={draft.name} onChange={e => setDraft({...draft, name: e.target.value})} />
                    </div>
                </div>

                <div style={styles.row}>
                    <div style={styles.formGroup}>
                        <label style={styles.label}>Study Program</label>
                        <select style={styles.input} value={draft.programId} onChange={e => setDraft({...draft, programId: e.target.value})}>
                            <option value="">-- Select Program --</option>
                            {programs.map(p => (
                                <option key={p.id} value={p.id}>{p.name} ({p.acronym})</option>
                            ))}
                        </select>
                    </div>
                    <div style={styles.formGroup}>
                        <label style={styles.label}>Specialization (Optional)</label>
                        <select style={styles.input} value={draft.specializationId} onChange={e => setDraft({...draft, specializationId: e.target.value})}>
                            <option value="">-- None --</option>
                            {specializations.map(s => (
                                <option key={s.id} value={s.id}>{s.name} ({s.acronym})</option>
                            ))}
                        </select>
                    </div>
                </div>

                <div style={styles.row}>
                    <div style={styles.formGroup}>
                        <label style={styles.label}>ECTS</label>
                        <input type="number" style={styles.input} value={draft.ects} onChange={e => setDraft({...draft, ects: e.target.value})} />
                    </div>
                    <div style={styles.formGroup}>
                        <label style={styles.label}>Semester</label>
                        <input type="number" style={styles.input} value={draft.semester} onChange={e => setDraft({...draft, semester: e.target.value})} />
                    </div>
                    <div style={styles.formGroup}>
                        <label style={styles.label}>Category</label>
                        <select style={styles.input} value={draft.category} onChange={e => setDraft({...draft, category: e.target.value})}>
                            <option value="Core">Core</option>
                            <option value="Elective">Elective</option>
                            <option value="Shared">Shared</option>
                            <option value="Project">Project</option>
                        </select>
                    </div>
                </div>

                <div style={styles.row}>
                    <div style={styles.formGroup}>
                        <label style={styles.label}>Room Type</label>
                        {/* ✅ Dynamic Dropdown from DB Room Types */}
                        <select style={styles.input} value={draft.typeOfModule} onChange={e => setDraft({...draft, typeOfModule: e.target.value})}>
                          <option value="">-- Select Room Type --</option>
                          {roomTypes.length > 0 ? (
                              roomTypes.map((type, idx) => (
                                  <option key={idx} value={type}>{type}</option>
                              ))
                          ) : (
                              <option disabled>No room types found (Create a Room first)</option>
                          )}
                        </select>
                    </div>
                    <div style={styles.formGroup}>
                        <label style={styles.label}>Assessment Type</label>
                        <select style={styles.input} value={draft.assessmentType} onChange={e => setDraft({...draft, assessmentType: e.target.value})}>
                          <option value="Written Exam">Written Exam</option>
                          <option value="Project Work">Project Work</option>
                          <option value="Oral Exam">Oral Exam</option>
                          <option value="Presentation">Presentation</option>
                        </select>
                    </div>
                </div>

                <div style={{marginTop: '25px', display:'flex', justifyContent:'flex-end', gap:'10px'}}>
                    <button style={{...styles.btn, background:'#f8f9fa', border:'1px solid #ddd'}} onClick={() => setFormMode("overview")}>Cancel</button>
                    <button style={{...styles.btn, ...styles.primaryBtn}} onClick={save}>
                        {formMode === "add" ? "Create Module" : "Update Module"}
                    </button>
                </div>
            </div>
        </div>
      )}
    </div>
  );
}