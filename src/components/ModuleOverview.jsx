import React, { useState, useEffect, useMemo } from "react";
import api from "../api";

// --- STYLES ---
const styles = {
  container: { padding: "20px", fontFamily: "'Inter', sans-serif", color: "#333", maxWidth: "1200px", margin: "0 auto" },
  controlsBar: { display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px", gap: "15px", flexWrap: "wrap" },
  searchBar: {
    padding: "10px 15px",
    borderRadius: "8px",
    border: "1px solid #cbd5e1",
    fontSize: "0.95rem",
    width: "100%",
    maxWidth: "350px",
    background: "white",
    boxShadow: "0 1px 2px rgba(0,0,0,0.05)",
    outline: "none"
  },
  listContainer: { display: "flex", flexDirection: "column", gap: "12px" },
  listHeader: {
    display: "grid",
    gridTemplateColumns: "80px 2fr 1.5fr 80px 100px 60px 1.2fr 1.2fr 110px",
    gap: "15px",
    padding: "0 25px",
    marginBottom: "5px",
    color: "#94a3b8",
    fontSize: "0.75rem",
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: "0.05em",
    alignItems: "center"
  },
  listCard: {
    background: "white",
    borderRadius: "8px",
    border: "none",
    cursor: "pointer",
    transition: "background-color 0.2s ease",
    display: "grid",
    gridTemplateColumns: "80px 2fr 1.5fr 80px 100px 60px 1.2fr 1.2fr 110px",
    alignItems: "center",
    padding: "16px 25px",
    gap: "15px",
    boxShadow: "0 2px 8px rgba(0,0,0,0.08)"
  },
  listCardHover: { backgroundColor: "#f1f5f9" },
  codeText: { fontWeight: "700", color: "#3b82f6", fontSize: "0.95rem" },
  nameText: { fontWeight: "600", color: "#1e293b", lineHeight: "1.4" },
  programLink: { color: "#475569", cursor: "pointer", textDecoration: "underline", fontSize: "0.85rem", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" },
  centeredCell: { textAlign: "center", fontSize: "0.9rem", color: "#64748b" },
  cellText: { fontSize: "0.9rem", color: "#64748b", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" },
  catBadge: { padding: "4px 8px", borderRadius: "6px", fontSize: "0.75rem", fontWeight: "bold", textAlign: "center", textTransform: "uppercase", display: "inline-block" },
  catCore: { background: "#dbeafe", color: "#1e40af" },
  catElective: { background: "#fef3c7", color: "#92400e" },
  catShared: { background: "#f3e8ff", color: "#6b21a8" },
  btn: { padding: "8px 16px", borderRadius: "6px", border: "none", cursor: "pointer", fontSize: "0.9rem", fontWeight: "500", transition: "0.2s" },
  primaryBtn: { background: "#3b82f6", color: "white" },
  actionContainer: { display: "flex", gap: "8px", justifyContent: "flex-end" },
  actionBtn: { padding: "6px 12px", borderRadius: "6px", border: "none", cursor: "pointer", fontSize: "0.85rem", fontWeight: "600" },
  editBtn: { background: "#e2e8f0", color: "#475569" },
  deleteBtn: { background: "#fee2e2", color: "#ef4444" },
  overlay: { position: "fixed", top: 0, left: 0, right: 0, bottom: 0, background: "rgba(0,0,0,0.5)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000 },
  modal: { backgroundColor: "#ffffff", padding: "30px", borderRadius: "12px", width: "700px", maxWidth: "95%", maxHeight: "90vh", overflowY: "auto", boxShadow: "0 20px 25px -5px rgba(0,0,0,0.1)" },
  formGroup: { marginBottom: "15px" },
  label: { display: "block", marginBottom: "5px", fontWeight: "600", fontSize: "0.85rem", color: "#64748b" },
  input: { width: "100%", padding: "10px", borderRadius: "6px", border: "1px solid #cbd5e1", fontSize: "0.95rem", boxSizing: "border-box" },
  select: { width: "100%", padding: "10px", borderRadius: "6px", border: "1px solid #cbd5e1", fontSize: "0.95rem", background: "white" },
};

const STANDARD_ROOM_TYPES = ["Lecture Classroom", "Computer Lab", "Seminar"];
const ASSESSMENT_OPTIONS = ["Written Exam", "Presentation", "Project", "Report", "Oral Exam", "Midterm"];
const CATEGORY_TYPES = ["Core", "Shared", "Elective"];

export default function ModuleOverview({ onNavigate }) {
  const [modules, setModules] = useState([]);
  const [programs, setPrograms] = useState([]);
  const [specializations, setSpecializations] = useState([]);
  const [customRoomTypes, setCustomRoomTypes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");
  const [hoverId, setHoverId] = useState(null);

  const [formMode, setFormMode] = useState("overview");
  const [editingCode, setEditingCode] = useState(null);
  const [selectedSpecToAdd, setSelectedSpecToAdd] = useState("");
  
  const [draft, setDraft] = useState({
    module_code: "", name: "", ects: 5, room_type: "Lecture Classroom", semester: 1,
    assessments: [{ type: "Written Exam", weight: 100 }], // Updated to multiple
    category: "Core", program_id: "", specialization_ids: []
  });

  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [moduleToDelete, setModuleToDelete] = useState(null);

  const [currentRole, setCurrentRole] = useState(() => {
    const raw = localStorage.getItem("userRole");
    return (raw || "").replace(/"/g, "").trim().toLowerCase();
  });

  useEffect(() => {
    const handleRoleUpdate = () => {
      const raw = localStorage.getItem("userRole");
      setCurrentRole((raw || "").replace(/"/g, "").trim().toLowerCase());
    };
    window.addEventListener("role-changed", handleRoleUpdate);
    return () => window.removeEventListener("role-changed", handleRoleUpdate);
  }, []);

  const canCreate = !["student", "lecturer"].includes(currentRole);
  const canModify = !["student", "lecturer", "hosp"].includes(currentRole);

  useEffect(() => { loadData(); }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const [modData, progData, specData, roomData] = await Promise.all([
        api.getModules(),
        api.getPrograms().catch(() => []),
        api.getSpecializations(),
        api.getRooms()
      ]);
      setModules(Array.isArray(modData) ? modData : []);
      setPrograms(Array.isArray(progData) ? progData : []);
      setSpecializations(Array.isArray(specData) ? specData : []);
      const existingCustom = (Array.isArray(roomData) ? roomData : [])
        .map(r => r.type)
        .filter(t => t && !STANDARD_ROOM_TYPES.includes(t));
      setCustomRoomTypes([...new Set(existingCustom)].sort());
    } catch (e) { console.error(e); } finally { setLoading(false); }
  };

  const filteredModules = useMemo(() => {
    const q = query.trim().toLowerCase();
    return modules.filter(m => m.name.toLowerCase().includes(q) || m.module_code.toLowerCase().includes(q));
  }, [modules, query]);

  const openAdd = () => {
    setEditingCode(null);
    setSelectedSpecToAdd("");
    setDraft({
      module_code: "", name: "", ects: 5, room_type: "Lecture Classroom", semester: 1,
      assessments: [{ type: "Written Exam", weight: 100 }],
      category: "Core", program_id: "", specialization_ids: []
    });
    setFormMode("add");
  };

  const openEdit = (m) => {
    setEditingCode(m.module_code);
    setSelectedSpecToAdd("");
    
    // Check if assessment_type is a string (old data) or JSON array
    let parsedAssessments = [{ type: "Written Exam", weight: 100 }];
    try {
        if (m.assessment_type && m.assessment_type.startsWith('[')) {
            parsedAssessments = JSON.parse(m.assessment_type);
        } else if (m.assessment_type) {
            parsedAssessments = [{ type: m.assessment_type, weight: 100 }];
        }
    } catch (e) { console.error("Parse error", e); }

    setDraft({
      module_code: m.module_code, name: m.name, ects: m.ects, room_type: m.room_type,
      semester: m.semester, assessments: parsedAssessments, category: m.category || "Core",
      program_id: m.program_id ? String(m.program_id) : "",
      specialization_ids: (m.specializations || []).map(s => s.id)
    });
    setFormMode("edit");
  };

  const addAssessmentRow = () => {
      setDraft(prev => ({
          ...prev,
          assessments: [...prev.assessments, { type: "Project", weight: 0 }]
      }));
  };

  const updateAssessmentRow = (index, field, value) => {
      const newAssessments = [...draft.assessments];
      newAssessments[index][field] = field === 'weight' ? parseInt(value) || 0 : value;
      setDraft({ ...draft, assessments: newAssessments });
  };

  const removeAssessmentRow = (index) => {
      setDraft(prev => ({
          ...prev,
          assessments: prev.assessments.filter((_, i) => i !== index)
      }));
  };

  const totalWeight = draft.assessments.reduce((sum, item) => sum + item.weight, 0);

  const save = async () => {
    if (!draft.module_code || !draft.name) return alert("Code and Name are required");
    if (totalWeight !== 100) return alert(`Total weight must be 100%. Current: ${totalWeight}%`);

    const payload = { 
        ...draft, 
        ects: parseInt(draft.ects), 
        semester: parseInt(draft.semester), 
        program_id: draft.program_id ? parseInt(draft.program_id) : null,
        assessment_type: JSON.stringify(draft.assessments) // Save as JSON string
    };

    try {
      if (formMode === "add") await api.createModule(payload);
      else await api.updateModule(editingCode, payload);
      await loadData();
      setFormMode("overview");
    } catch (e) { alert("Error saving module."); }
  };

  const initiateDelete = (m) => {
    setModuleToDelete(m);
    setShowDeleteModal(true);
  };

  const confirmDelete = async () => {
    try {
        await api.deleteModule(moduleToDelete.module_code);
        setShowDeleteModal(false);
        loadData();
    } catch (e) { alert("Error deleting module."); }
  };

  const linkSpecToDraft = () => {
      const specId = parseInt(selectedSpecToAdd);
      if (specId && !draft.specialization_ids.includes(specId)) {
          setDraft(prev => ({ ...prev, specialization_ids: [...prev.specialization_ids, specId] }));
      }
      setSelectedSpecToAdd("");
  };

  const formatAssessmentDisplay = (jsonStr) => {
      try {
          const arr = JSON.parse(jsonStr);
          return arr.map(a => `${a.type} (${a.weight}%)`).join(", ");
      } catch { return jsonStr || "-"; }
  };

  return (
    <div style={styles.container}>
      <div style={styles.controlsBar}>
        <input style={styles.searchBar} placeholder="Search modules..." value={query} onChange={(e) => setQuery(e.target.value)} />
        {canCreate && <button style={{...styles.btn, ...styles.primaryBtn}} onClick={openAdd}>+ New Module</button>}
      </div>

      <div style={styles.listHeader}>
        <div>Code</div>
        <div>Module Name</div>
        <div>Program</div>
        <div style={{textAlign: "center"}}>Semester</div>
        <div style={{textAlign: "center"}}>Category</div>
        <div style={{textAlign: "center"}}>ECTS</div>
        <div>Assessment Weighting</div>
        <div>Room Type</div>
        {canModify && <div style={{textAlign: 'right'}}>Action</div>}
      </div>

      <div style={styles.listContainer}>
        {loading ? <div style={{textAlign: 'center', padding: '40px', color: '#64748b'}}>Loading modules...</div> : (
            filteredModules.map((m) => {
                const prog = programs.find(p => p.id === m.program_id);
                return (
                <div key={m.module_code} style={{ ...styles.listCard, ...(hoverId === m.module_code ? styles.listCardHover : {}) }} onMouseEnter={() => setHoverId(m.module_code)} onMouseLeave={() => setHoverId(null)}>
                    <div style={styles.codeText}>{m.module_code}</div>
                    <div style={styles.nameText}>{m.name}</div>
                    <div style={styles.programLink} onClick={() => prog && onNavigate("programs", { programId: prog.id })}>{prog?.name || "Global"}</div>
                    <div style={styles.centeredCell}>{m.semester}</div>
                    <div style={{textAlign: "center"}}><span style={{...styles.catBadge, ...((m.category === "Core" ? styles.catCore : m.category === "Elective" ? styles.catElective : styles.catShared))}}>{m.category}</span></div>
                    <div style={{...styles.centeredCell, fontWeight:'bold'}}>{m.ects}</div>
                    <div style={{...styles.cellText, fontSize:'0.8rem'}}>{formatAssessmentDisplay(m.assessment_type)}</div>
                    <div style={styles.cellText}>{m.room_type}</div>
                    {canModify && (
                        <div style={styles.actionContainer}>
                            <button style={{...styles.actionBtn, ...styles.editBtn}} onClick={() => openEdit(m)}>Edit</button>
                            <button style={{...styles.actionBtn, ...styles.deleteBtn}} onClick={() => initiateDelete(m)}>Del</button>
                        </div>
                    )}
                </div>
                );
            })
        )}
      </div>

      {/* MODAL */}
      {(formMode === "add" || formMode === "edit") && (
        <div style={styles.overlay}>
            <div style={styles.modal}>
                <div style={{display:'flex', justifyContent:'space-between', marginBottom:'20px'}}>
                    <h3 style={{margin:0}}>{formMode === "add" ? "Create Module" : "Edit Module"}</h3>
                    <button onClick={() => setFormMode("overview")} style={{border:'none', background:'transparent', fontSize:'1.5rem', cursor:'pointer'}}>×</button>
                </div>

                <div style={{display:'flex', gap:'15px'}}>
                    <div style={{...styles.formGroup, flex:1}}><label style={styles.label}>Module Code</label><input style={styles.input} value={draft.module_code} onChange={(e) => setDraft({ ...draft, module_code: e.target.value })} disabled={formMode === "edit"} /></div>
                    <div style={{...styles.formGroup, flex:2}}><label style={styles.label}>Name</label><input style={styles.input} value={draft.name} onChange={(e) => setDraft({ ...draft, name: e.target.value })} /></div>
                </div>

                <div style={{display:'flex', gap:'15px'}}>
                    <div style={{...styles.formGroup, flex:1}}><label style={styles.label}>ECTS (Default: 5)</label><input type="number" style={styles.input} value={draft.ects} onChange={(e) => setDraft({ ...draft, ects: e.target.value })} /></div>
                    <div style={{...styles.formGroup, flex:1}}><label style={styles.label}>Semester</label><input type="number" style={styles.input} value={draft.semester} onChange={(e) => setDraft({ ...draft, semester: e.target.value })} /></div>
                    <div style={{...styles.formGroup, flex:1}}><label style={styles.label}>Category</label><select style={styles.select} value={draft.category} onChange={(e) => setDraft({ ...draft, category: e.target.value })}>{CATEGORY_TYPES.map(c => <option key={c} value={c}>{c}</option>)}</select></div>
                </div>

                <div style={styles.formGroup}><label style={styles.label}>Room Type</label><select style={styles.select} value={draft.room_type} onChange={(e) => setDraft({...draft, room_type: e.target.value})}><optgroup label="Standard">{STANDARD_ROOM_TYPES.map(t => <option key={t} value={t}>{t}</option>)}</optgroup>{customRoomTypes.length > 0 && (<optgroup label="Custom">{customRoomTypes.map(t => <option key={t} value={t}>{t}</option>)}</optgroup>)}</select></div>

                {/* ASSESSMENT SECTION */}
                <div style={{background:'#f8fafc', padding:'15px', borderRadius:'8px', border:'1px solid #e2e8f0', marginBottom:'20px'}}>
                    <div style={{display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:'10px'}}>
                        <label style={{...styles.label, margin:0}}>Assessment Weighting</label>
                        <button type="button" onClick={addAssessmentRow} style={{...styles.btn, background:'#10b981', color:'white', padding:'4px 10px', fontSize:'0.8rem'}}>+ Add Option</button>
                    </div>
                    {draft.assessments.map((item, idx) => (
                        <div key={idx} style={{display:'flex', gap:'10px', marginBottom:'8px', alignItems:'center'}}>
                            <select style={{...styles.select, marginBottom:0, flex:2}} value={item.type} onChange={(e) => updateAssessmentRow(idx, 'type', e.target.value)}>
                                {ASSESSMENT_OPTIONS.map(opt => <option key={opt} value={opt}>{opt}</option>)}
                            </select>
                            <div style={{display:'flex', alignItems:'center', flex:1, gap:'5px'}}>
                                <input type="number" style={{...styles.input, marginBottom:0}} value={item.weight} onChange={(e) => updateAssessmentRow(idx, 'weight', e.target.value)} />
                                <span style={{fontSize:'0.9rem'}}>%</span>
                            </div>
                            {draft.assessments.length > 1 && (
                                <button onClick={() => removeAssessmentRow(idx)} style={{background:'none', border:'none', color:'#ef4444', cursor:'pointer', fontSize:'1.2rem'}}>×</button>
                            )}
                        </div>
                    ))}
                    <div style={{textAlign:'right', fontSize:'0.85rem', fontWeight:'bold', color: totalWeight === 100 ? '#10b981' : '#ef4444'}}>
                        Total: {totalWeight}% {totalWeight !== 100 && "(Must be 100%)"}
                    </div>
                </div>

                <div style={styles.formGroup}><label style={styles.label}>Owner Program</label><select style={styles.select} value={draft.program_id} onChange={(e) => setDraft({ ...draft, program_id: e.target.value })}><option value="">-- Global --</option>{programs.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}</select></div>

                <div style={{marginTop: '25px', display:'flex', justifyContent:'flex-end', gap:'10px'}}>
                    <button style={{...styles.btn, background:'#f8f9fa', border:'1px solid #ddd'}} onClick={() => setFormMode("overview")}>Cancel</button>
                    <button style={{...styles.btn, ...styles.primaryBtn}} onClick={save}>Save Changes</button>
                </div>
            </div>
        </div>
      )}

      {showDeleteModal && (
        <DeleteConfirmationModal moduleName={moduleToDelete?.name} onClose={() => setShowDeleteModal(false)} onConfirm={confirmDelete} />
      )}
    </div>
  );
}

function DeleteConfirmationModal({ moduleName, onClose, onConfirm }) {
    const [input, setInput] = useState("");
    return (
        <div style={styles.overlay}>
            <div style={{...styles.modal, width:'400px'}}>
                <h3 style={{color: "#991b1b"}}>Delete Module?</h3>
                <p>Type "DELETE" to confirm removing <b>{moduleName}</b>.</p>
                <input style={styles.input} value={input} onChange={e => setInput(e.target.value)} placeholder="DELETE" />
                <div style={{display: "flex", justifyContent: "flex-end", gap: "10px", marginTop:'20px'}}>
                    <button style={styles.btn} onClick={onClose}>Cancel</button>
                    <button disabled={input !== "DELETE"} style={{...styles.btn, background: input === "DELETE" ? "#dc2626" : "#fca5a5", color: "white"}} onClick={onConfirm}>Confirm</button>
                </div>
            </div>
        </div>
    );
}