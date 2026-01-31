import { useState, useEffect, useMemo } from "react";
import api from "../api";

const styles = {
  container: { padding: "20px", fontFamily: "'Segoe UI', sans-serif", color: "#333", maxWidth: "100%" },
  header: { display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px", borderBottom: "1px solid #ccc", paddingBottom: "15px" },
  title: { margin: 0, fontSize: "1.5rem", color: "#333" },
  searchBar: { padding: "8px 12px", width: "300px", borderRadius: "4px", border: "1px solid #ccc", marginBottom: "15px" },
  table: { width: "100%", borderCollapse: "collapse", background: "#fff", border: "1px solid #ddd", fontSize: "0.9rem" },
  thead: { background: "#f2f2f2", borderBottom: "2px solid #ccc" },
  th: { textAlign: "left", padding: "10px 15px", fontWeight: "600", color: "#444" },
  tr: { borderBottom: "1px solid #eee", cursor: "pointer" },
  td: { padding: "10px 15px", verticalAlign: "middle" },
  btn: { padding: "6px 12px", borderRadius: "4px", border: "none", cursor: "pointer", fontSize: "0.9rem", marginLeft: "5px" },
  primaryBtn: { background: "#007bff", color: "white" },
  editBtn: { background: "#6c757d", color: "white" },
  deleteBtn: { background: "#dc3545", color: "white" },
  navBtn: { background: "#17a2b8", color: "white" },

  modalOverlay: { position: "fixed", top: 0, left: 0, right: 0, bottom: 0, background: "rgba(0,0,0,0.5)", display: "flex", justifyContent: "center", alignItems: "center", zIndex: 1000 },
  modalContent: { background: "white", padding: "25px", borderRadius: "8px", width: "650px", maxWidth: "95%", maxHeight: "90vh", overflowY: "auto", boxShadow: "0 5px 15px rgba(0,0,0,0.3)" },
  formGroup: { marginBottom: "15px" },
  label: { display: "block", marginBottom: "5px", fontWeight: "bold", fontSize: "0.9rem" },
  input: { width: "100%", padding: "8px", borderRadius: "4px", border: "1px solid #ccc", fontSize: "1rem", boxSizing: "border-box" },
  select: { width: "100%", padding: "8px", borderRadius: "4px", border: "1px solid #ccc", fontSize: "1rem", boxSizing: "border-box", background: "white" },

  expandedRow: { background: "#f8f9fa" },
  expandedContent: { padding: "15px 20px", borderLeft: "4px solid #007bff" },
  sectionTitle: { marginTop: 0, marginBottom: "10px", fontSize: "1rem", color: "#0056b3", borderBottom: "1px solid #dee2e6", paddingBottom: "5px" },

  listItem: { display: "flex", justifyContent: "space-between", alignItems: "center", padding: "8px", borderBottom: "1px solid #eee", background: "#fff", marginBottom: "4px", borderRadius: "4px", border: "1px solid #eee" },

  innerTable: { width: "100%", borderCollapse: "collapse", marginTop: "10px", fontSize: "0.85rem", background: "white", border: "1px solid #ddd" },
  innerTh: { textAlign: "left", padding: "8px", background: "#eaeaea", borderBottom: "1px solid #ccc", color: "#555" },
  innerTd: { padding: "8px", borderBottom: "1px solid #eee" }
};

const STANDARD_ROOM_TYPES = ["Lecture Classroom", "Computer Lab", "Seminar"];
const ASSESSMENT_TYPES = ["Written Exam", "Presentation", "Project", "Report"];
const CATEGORY_TYPES = ["Core", "Shared", "Elective"];

function formatDateDE(isoDate) {
  if (!isoDate) return "-";
  const date = new Date(isoDate);
  if (isNaN(date.getTime())) return isoDate;
  return date.toLocaleDateString("de-DE", { day: "2-digit", month: "2-digit", year: "numeric" });
}

export default function ModuleOverview({ navigate, initialFilter = {} }) {
  const [modules, setModules] = useState([]);
  const [programs, setPrograms] = useState([]);
  const [specializations, setSpecializations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");

  const [customRoomTypes, setCustomRoomTypes] = useState([]);
  const [filter, setFilter] = useState(initialFilter);
  const [formMode, setFormMode] = useState("overview");
  const [editingCode, setEditingCode] = useState(null);
  const [expandedCode, setExpandedCode] = useState(null);
  const [selectedSpecToAdd, setSelectedSpecToAdd] = useState("");

  const [draft, setDraft] = useState({
    module_code: "", name: "", ects: 5, room_type: "Lecture Classroom", semester: 1,
    assessment_type: "Written Exam", category: "Core", program_id: "", specialization_ids: []
  });

  async function loadData() {
    setLoading(true);
    try {
      const [modData, progData, specData, roomData] = await Promise.all([
        api.getModules(), api.getPrograms(), api.getSpecializations(), api.getRooms()
      ]);
      setModules(Array.isArray(modData) ? modData : []);
      setPrograms(Array.isArray(progData) ? progData : []);
      setSpecializations(Array.isArray(specData) ? specData : []);

      const existingCustom = (Array.isArray(roomData) ? roomData : [])
        .map(r => r.type)
        .filter(t => t && !STANDARD_ROOM_TYPES.includes(t));
      setCustomRoomTypes([...new Set(existingCustom)].sort());
    } catch (e) { alert("Error loading data: " + e.message); } finally { setLoading(false); }
  }
  useEffect(() => { loadData(); }, []);
  useEffect(() => { setFilter(initialFilter); }, [initialFilter]);

  const filteredModules = useMemo(() => {
    const q = query.trim().toLowerCase();
    let result = modules;
    if (filter.programId) result = result.filter(m => m.program_id === filter.programId);
    if (filter.specializationId) result = result.filter(m => (m.specializations || []).some(s => s.id === filter.specializationId));
    return result.filter(m => m.name.toLowerCase().includes(q) || m.module_code.toLowerCase().includes(q));
  }, [modules, filter, query]);

  const getProgramName = (id) => programs.find(p => p.id === id)?.name || "Global / None";

  const linkSpecToDraft = () => {
      if (!selectedSpecToAdd) return;
      const specId = parseInt(selectedSpecToAdd);
      if (draft.specialization_ids.includes(specId)) return;
      setDraft(prev => ({ ...prev, specialization_ids: [...prev.specialization_ids, specId] }));
      setSelectedSpecToAdd("");
  };

  const unlinkSpecFromDraft = (specId) => {
      setDraft(prev => ({ ...prev, specialization_ids: prev.specialization_ids.filter(id => id !== specId) }));
  };

  const activeFilterName = useMemo(() => {
    if (filter.programId) return `Program: ${programs.find(p => p.id === filter.programId)?.name || "-"}`;
    if (filter.specializationId) return `Specialization: ${specializations.find(s => s.id === filter.specializationId)?.name || "-"}`;
    return null;
  }, [filter, programs, specializations]);

  function openAdd() {
    setEditingCode(null);
    setSelectedSpecToAdd("");
    setDraft({
      module_code: "", name: "", ects: 5, room_type: "Lecture Classroom", semester: 1,
      assessment_type: "Written Exam", category: "Core", program_id: "", specialization_ids: []
    });
    setFormMode("add");
  }

  function openEdit(row) {
    setEditingCode(row.module_code);
    setSelectedSpecToAdd("");
    setDraft({
      module_code: row.module_code, name: row.name, ects: row.ects, room_type: row.room_type,
      semester: row.semester, assessment_type: row.assessment_type || "Written Exam", category: row.category || "Core",
      program_id: row.program_id || "", specialization_ids: (row.specializations || []).map(s => s.id)
    });
    setFormMode("edit");
  }

  async function save() {
    if (!draft.module_code || !draft.name) return alert("Code and Name are required");
    const payload = {
        module_code: draft.module_code, name: draft.name, ects: parseInt(draft.ects), room_type: draft.room_type,
        semester: parseInt(draft.semester), assessment_type: draft.assessment_type, category: draft.category,
        program_id: draft.program_id ? parseInt(draft.program_id) : null, specialization_ids: draft.specialization_ids
    };
    try {
      if (formMode === "add") await api.createModule(payload); else await api.updateModule(editingCode, payload);
      await loadData();
      setFormMode("overview");
    } catch (e) { console.error(e); alert("Error saving module. Check console."); }
  }

  async function remove(code) {
    if (!window.confirm(`Delete module ${code}?`)) return;
    try { await api.deleteModule(code); loadData(); } catch (e) { alert("Error deleting module."); }
  }

  const toggleExpand = (code, e) => { if (e.target.closest('button')) return; setExpandedCode(expandedCode === code ? null : code); };

  const goToProgram = (programId) => {
    const prog = programs.find(p => p.id === programId);
    if (prog && navigate) {
        navigate("programs", { level: prog.level });
    } else if (navigate) {
        navigate("programs");
    }
  };

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <h2 style={styles.title}>Modules Overview</h2>
        <button style={{...styles.btn, ...styles.primaryBtn}} onClick={openAdd}>+ New Module</button>
      </div>

      {activeFilterName && (
        <div style={styles.filterBanner}>
            <span>Showing modules for <strong>{activeFilterName}</strong></span>
            <button style={styles.clearBtn} onClick={() => setFilter({})}>Clear Filter</button>
        </div>
      )}

      <input style={styles.searchBar} placeholder="Search modules..." value={query} onChange={(e) => setQuery(e.target.value)} />

      {loading ? <p>Loading...</p> : (
        <table style={styles.table}>
          <thead style={styles.thead}>
            <tr>
              <th style={styles.th}></th><th style={styles.th}>Code</th><th style={styles.th}>Name</th><th style={styles.th}>ECTS</th>
              <th style={styles.th}>Semester</th>
              <th style={styles.th}>Category</th>
              <th style={styles.th}>Assessment</th><th style={styles.th}>Room Type</th><th style={{...styles.th, textAlign: 'right'}}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {filteredModules.map((m) => (
              <>
                <tr key={m.module_code} style={styles.tr} onClick={(e) => toggleExpand(m.module_code, e)}>
                  <td style={styles.td}>{expandedCode === m.module_code ? "▼" : "▶"}</td>
                  <td style={styles.td}><strong>{m.module_code}</strong></td><td style={styles.td}>{m.name}</td><td style={styles.td}>{m.ects}</td>
                  <td style={styles.td}>{m.semester}</td>
                  <td style={styles.td}>{m.category}</td>
                  <td style={styles.td}>{m.assessment_type}</td><td style={styles.td}>{m.room_type}</td>
                  <td style={{...styles.td, textAlign: 'right', whiteSpace: 'nowrap'}}>
                    <button style={{...styles.btn, ...styles.editBtn}} onClick={() => openEdit(m)}>Edit</button>
                    <button style={{...styles.btn, ...styles.deleteBtn}} onClick={() => remove(m.module_code)}>Delete</button>
                  </td>
                </tr>
                {expandedCode === m.module_code && (
                  <tr style={styles.expandedRow}>
                    <td colSpan="9" style={{padding: 0}}>
                      <div style={styles.expandedContent}>
                        <h4 style={styles.sectionTitle}>Study Program</h4>
                        <div style={{display:'flex', alignItems:'center', gap:'15px', marginBottom:'15px'}}>
                            <span>{m.program_id ? <strong>{getProgramName(m.program_id)}</strong> : <span style={{color:'#777', fontStyle:'italic'}}>Global Module</span>}</span>
                            {m.program_id && <button style={{...styles.btn, ...styles.navBtn, padding:'4px 8px', fontSize:'0.8rem'}} onClick={() => goToProgram(m.program_id)}>Go to Program Page</button>}
                        </div>

                        <h4 style={styles.sectionTitle}>Linked Specializations</h4>
                        {(m.specializations || []).length === 0 ? <p style={{color:'#777', fontStyle:'italic'}}>No specializations linked.</p> : (
                            <table style={styles.innerTable}>
                                <thead>
                                    <tr>
                                        <th style={styles.innerTh}>Name</th>
                                        <th style={styles.innerTh}>Acronym</th>
                                        <th style={styles.innerTh}>Start Date</th>
                                        <th style={styles.innerTh}>Status</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {m.specializations.map(s => (
                                        <tr key={s.id}>
                                            <td style={styles.innerTd}>{s.name}</td>
                                            <td style={styles.innerTd}>{s.acronym}</td>
                                            <td style={styles.innerTd}>{formatDateDE(s.start_date)}</td>
                                            <td style={styles.innerTd}>
                                                <span style={{
                                                    padding: "3px 8px", borderRadius: "12px", fontSize: "0.75rem", fontWeight: "bold",
                                                    background: s.status ? "#d4edda" : "#f8d7da",
                                                    color: s.status ? "#155724" : "#721c24"
                                                }}>
                                                    {s.status ? "Active" : "Inactive"}
                                                </span>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        )}
                      </div>
                    </td>
                  </tr>
                )}
              </>
            ))}
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
                <div style={{display:'flex', gap:'15px'}}>
                    <div style={{...styles.formGroup, flex:1}}><label style={styles.label}>Module Code</label><input style={styles.input} value={draft.module_code} onChange={(e) => setDraft({ ...draft, module_code: e.target.value })} disabled={formMode === "edit"} placeholder="e.g. CS101" /></div>
                    <div style={{...styles.formGroup, flex:2}}><label style={styles.label}>Name</label><input style={styles.input} value={draft.name} onChange={(e) => setDraft({ ...draft, name: e.target.value })} /></div>
                </div>
                <div style={{display:'flex', gap:'15px'}}>
                    <div style={{...styles.formGroup, flex:1}}><label style={styles.label}>ECTS</label><input type="number" style={styles.input} value={draft.ects} onChange={(e) => setDraft({ ...draft, ects: e.target.value })} /></div>
                    <div style={{...styles.formGroup, flex:1}}><label style={styles.label}>Semester</label><input type="number" style={styles.input} value={draft.semester} onChange={(e) => setDraft({ ...draft, semester: e.target.value })} /></div>
                    <div style={{...styles.formGroup, flex:1}}><label style={styles.label}>Category</label><select style={styles.select} value={draft.category} onChange={(e) => setDraft({ ...draft, category: e.target.value })}>{CATEGORY_TYPES.map(c => <option key={c} value={c}>{c}</option>)}</select></div>
                </div>
                <div style={{display:'flex', gap:'15px'}}>
                    <div style={{...styles.formGroup, flex:1}}><label style={styles.label}>Room Type</label><select style={styles.select} value={draft.room_type} onChange={(e) => setDraft({...draft, room_type: e.target.value})}><optgroup label="Standard">{STANDARD_ROOM_TYPES.map(t => <option key={t} value={t}>{t}</option>)}</optgroup>{customRoomTypes.length > 0 && (<optgroup label="Custom">{customRoomTypes.map(t => <option key={t} value={t}>{t}</option>)}</optgroup>)}</select></div>
                    <div style={{...styles.formGroup, flex:1}}><label style={styles.label}>Assessment</label><select style={styles.select} value={draft.assessment_type} onChange={(e) => setDraft({ ...draft, assessment_type: e.target.value })}>{ASSESSMENT_TYPES.map(t => <option key={t} value={t}>{t}</option>)}</select></div>
                </div>
                <hr style={{margin:'20px 0', border:'0', borderTop:'1px solid #eee'}} />
                <h4 style={{margin:'0 0 15px 0', color:'#555'}}>Associations</h4>
                <div style={styles.formGroup}>
                    <label style={styles.label}>Link to Study Program (Primary Owner)</label>
                    <select style={styles.select} value={draft.program_id} onChange={(e) => setDraft({ ...draft, program_id: e.target.value })}>
                        <option value="">-- None / Global Module --</option>
                        {programs.map(p => (<option key={p.id} value={p.id}>{p.name} ({p.level})</option>))}
                    </select>
                </div>
                <div style={{...styles.formGroup, background: '#f9f9f9', padding: '15px', borderRadius: '6px', border:'1px solid #eee'}}>
                    <label style={{...styles.label, marginBottom:'10px'}}>Linked Specializations</label>
                    <div style={{display:'flex', gap:'10px', marginBottom:'15px'}}>
                        <select style={styles.select} value={selectedSpecToAdd} onChange={(e) => setSelectedSpecToAdd(e.target.value)}>
                            <option value="">-- Select Specialization to Link --</option>
                            {specializations.filter(s => !draft.specialization_ids.includes(s.id)).map(s => (<option key={s.id} value={s.id}>{s.name} ({s.acronym})</option>))}
                        </select>
                        <button type="button" style={{...styles.btn, ...styles.primaryBtn}} onClick={linkSpecToDraft}>Link</button>
                    </div>
                    <div style={{maxHeight:'200px', overflowY:'auto'}}>
                        {draft.specialization_ids.length === 0 ? (
                            <div style={{padding:'10px', color:'#777', fontStyle:'italic', textAlign:'center', border:'1px dashed #ccc', borderRadius:'4px'}}>No specializations linked.</div>
                        ) : (
                            draft.specialization_ids.map(specId => {
                                const spec = specializations.find(s => s.id === specId);
                                if (!spec) return null;
                                return (
                                    <div key={spec.id} style={styles.listItem}>
                                        <span><strong>{spec.acronym}</strong> - {spec.name}</span>
                                        <button type="button" style={{...styles.btn, ...styles.deleteBtn, padding:'4px 8px', fontSize:'0.8rem'}} onClick={() => unlinkSpecFromDraft(spec.id)}>Unlink</button>
                                    </div>
                                );
                            })
                        )}
                    </div>
                </div>
                <div style={{marginTop: '25px', display:'flex', justifyContent:'flex-end', gap:'10px'}}>
                    <button style={{...styles.btn, background:'#f8f9fa', border:'1px solid #ddd'}} onClick={() => setFormMode("overview")}>Cancel</button>
                    <button style={{...styles.btn, ...styles.primaryBtn}} onClick={save}>Save</button>
                </div>
            </div>
        </div>
      )}
    </div>
  );
}