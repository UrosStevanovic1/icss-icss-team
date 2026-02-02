import React, { useState, useEffect, useMemo } from "react";
import api from "../api";

// --- STYLES (UNCHANGED DESIGN) ---
const styles = {
  container: { padding: "20px", fontFamily: "'Inter', sans-serif", color: "#333", maxWidth: "1200px", margin: "0 auto" },

  // Header & Controls
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

  // LIST LAYOUT
  listContainer: { display: "flex", flexDirection: "column", gap: "12px" },

  // Grid: Code | Name | Program | Semester | Category | ECTS | Assessment | Room Type | Actions
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

  // Typography
  codeText: { fontWeight: "700", color: "#3b82f6", fontSize: "0.95rem" },
  nameText: { fontWeight: "600", color: "#1e293b", lineHeight: "1.4" },
  programLink: { color: "#475569", cursor: "pointer", textDecoration: "underline", fontSize: "0.85rem", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" },
  centeredCell: { textAlign: "center", fontSize: "0.9rem", color: "#64748b" },
  cellText: { fontSize: "0.9rem", color: "#64748b", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" },

  // Badges
  catBadge: { padding: "4px 8px", borderRadius: "6px", fontSize: "0.75rem", fontWeight: "bold", textAlign: "center", textTransform: "uppercase", display: "inline-block" },
  catCore: { background: "#dbeafe", color: "#1e40af" },
  catElective: { background: "#fef3c7", color: "#92400e" },
  catShared: { background: "#f3e8ff", color: "#6b21a8" },

  // Buttons
  btn: { padding: "8px 16px", borderRadius: "6px", border: "none", cursor: "pointer", fontSize: "0.9rem", fontWeight: "500", transition: "0.2s" },
  primaryBtn: { background: "#3b82f6", color: "white" },
  actionContainer: { display: "flex", gap: "8px", justifyContent: "flex-end" },
  actionBtn: { padding: "6px 12px", borderRadius: "6px", border: "none", cursor: "pointer", fontSize: "0.85rem", fontWeight: "600" },
  editBtn: { background: "#e2e8f0", color: "#475569" },
  deleteBtn: { background: "#fee2e2", color: "#ef4444" },
  assignBtn: { background: "#dcfce7", color: "#166534" },

  // Modal
  overlay: { position: "fixed", top: 0, left: 0, right: 0, bottom: 0, background: "rgba(0,0,0,0.5)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000 },

  modal: {
    backgroundColor: "#ffffff",
    padding: "30px",
    borderRadius: "12px",
    width: "650px",
    maxWidth: "90%",
    maxHeight: "90vh",
    overflowY: "auto",
    boxShadow: "0 20px 25px -5px rgba(0,0,0,0.1)"
  },

  formGroup: { marginBottom: "15px" },
  label: { display: "block", marginBottom: "5px", fontWeight: "600", fontSize: "0.85rem", color: "#64748b" },
  input: { width: "100%", padding: "10px", borderRadius: "6px", border: "1px solid #cbd5e1", fontSize: "0.95rem", boxSizing: "border-box", marginBottom: "15px" },
  select: { width: "100%", padding: "10px", borderRadius: "6px", border: "1px solid #cbd5e1", fontSize: "0.95rem", background: "white", marginBottom: "15px" },

  // small UI blocks
  hint: { fontSize: "0.85rem", color: "#64748b", marginTop: "-8px", marginBottom: "12px" },
  pill: { background: "white", border: "1px solid #e2e8f0", padding: "6px 10px", borderRadius: "999px", fontSize: "0.85rem", display: "inline-flex", gap: "8px", alignItems: "center" },
  warn: { background: "#fef3c7", border: "1px solid #fde68a", color: "#92400e", padding: "10px", borderRadius: "8px", fontSize: "0.9rem", marginBottom: "12px" },
  ok: { background: "#dcfce7", border: "1px solid #86efac", color: "#166534", padding: "10px", borderRadius: "8px", fontSize: "0.9rem", marginBottom: "12px" },
};

const STANDARD_ROOM_TYPES = ["Lecture Classroom", "Computer Lab", "Seminar"];
const CATEGORY_TYPES = ["Core", "Shared", "Elective"];

const ASSESSMENT_TYPES = ["Written Exam", "Presentation", "Project", "Report", "Documentation", "Oral Exam"];

// UI ONLY (same as your earlier idea)
const MOCK_LECTURERS = [
  { id: 1, name: "Mohammed Ali" },
  { id: 2, name: "Aastha Gurung" },
  { id: 3, name: "Chetan Teji" },
  { id: 4, name: "John Doe" },
];

/**
 * Backend compatibility: we store assessment_type as a single string.
 * We encode multi assessment+weight as JSON string:
 *   [{"type":"Written Exam","weight":70},{"type":"Documentation","weight":30}]
 */
function parseAssessmentString(value) {
  if (!value) return [{ type: "Written Exam", weight: 100 }];

  try {
    const parsed = JSON.parse(value);
    if (Array.isArray(parsed) && parsed.every(x => x && typeof x.type === "string")) {
      return parsed.map(x => ({ type: x.type, weight: Number(x.weight ?? 0) || 0 }));
    }
  } catch (e) { /* ignore */ }

  // fallback: if old backend stored plain string, keep it as one item
  return [{ type: String(value), weight: 100 }];
}

function buildAssessmentString(items) {
  const clean = (Array.isArray(items) ? items : [])
    .map(i => ({ type: String(i.type || "").trim(), weight: Number(i.weight ?? 0) || 0 }))
    .filter(i => i.type);
  return JSON.stringify(clean.length ? clean : [{ type: "Written Exam", weight: 100 }]);
}

function formatAssessmentForList(value) {
  const items = parseAssessmentString(value);
  return items
    .filter(i => i.type)
    .map(i => `${i.type}${Number.isFinite(i.weight) ? ` (${i.weight}%)` : ""}`)
    .join(", ");
}

export default function ModuleOverview({ onNavigate }) {
  const [modules, setModules] = useState([]);
  const [programs, setPrograms] = useState([]);
  const [specializations, setSpecializations] = useState([]);
  const [customRoomTypes, setCustomRoomTypes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");
  const [hoverId, setHoverId] = useState(null);

  // Form State
  const [formMode, setFormMode] = useState("overview");
  const [editingCode, setEditingCode] = useState(null);
  const [selectedSpecToAdd, setSelectedSpecToAdd] = useState("");

  // ✅ Draft now has assessment_items instead of single assessment_type
  const [draft, setDraft] = useState({
    module_code: "",
    name: "",
    ects: 5, // default 5 but user can type any integer
    room_type: "Lecture Classroom",
    semester: 1,
    category: "Core",
    program_id: "",
    specialization_ids: [],
    assessment_items: [{ type: "Written Exam", weight: 100 }],
  });

  // Delete State
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [moduleToDelete, setModuleToDelete] = useState(null);

  // ✅ Assign Lecturer UI ONLY: per semester + multiple lecturers
  // store in memory only: { [module_code]: [{ semester: number, lecturerIds: number[], note: string }] }
  const [teachMap, setTeachMap] = useState({});
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [assignTarget, setAssignTarget] = useState(null);
  const [assignSemester, setAssignSemester] = useState(1);
  const [assignLecturerIds, setAssignLecturerIds] = useState([]);
  const [assignNote, setAssignNote] = useState("");

  useEffect(() => { loadData(); }, []);

  const loadData = async () => {
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
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const filteredModules = useMemo(() => {
    const q = query.trim().toLowerCase();
    return modules.filter(m => (m.name || "").toLowerCase().includes(q) || (m.module_code || "").toLowerCase().includes(q));
  }, [modules, query]);

  const openAdd = () => {
    setEditingCode(null);
    setSelectedSpecToAdd("");
    setDraft({
      module_code: "",
      name: "",
      ects: 5,
      room_type: "Lecture Classroom",
      semester: 1,
      category: "Core",
      program_id: "",
      specialization_ids: [],
      assessment_items: [{ type: "Written Exam", weight: 100 }],
    });
    setFormMode("add");
  };

  const openEdit = (m) => {
    setEditingCode(m.module_code);
    setSelectedSpecToAdd("");
    setDraft({
      module_code: m.module_code,
      name: m.name,
      ects: m.ects ?? 5,
      room_type: m.room_type || "Lecture Classroom",
      semester: m.semester ?? 1,
      category: m.category || "Core",
      program_id: m.program_id ? String(m.program_id) : "",
      specialization_ids: (m.specializations || []).map(s => s.id),
      assessment_items: parseAssessmentString(m.assessment_type),
    });
    setFormMode("edit");
  };

  // ✅ assessment helpers
  const assessmentTotal = useMemo(() => {
    return (draft.assessment_items || []).reduce((sum, x) => sum + (Number(x.weight ?? 0) || 0), 0);
  }, [draft.assessment_items]);

  const addAssessmentRow = () => {
    setDraft(prev => ({
      ...prev,
      assessment_items: [...(prev.assessment_items || []), { type: "Report", weight: 0 }]
    }));
  };

  const removeAssessmentRow = (idx) => {
    setDraft(prev => {
      const next = [...(prev.assessment_items || [])];
      next.splice(idx, 1);
      return { ...prev, assessment_items: next.length ? next : [{ type: "Written Exam", weight: 100 }] };
    });
  };

  const updateAssessmentRow = (idx, patch) => {
    setDraft(prev => {
      const next = [...(prev.assessment_items || [])];
      next[idx] = { ...next[idx], ...patch };
      return { ...prev, assessment_items: next };
    });
  };

  const save = async () => {
    if (!draft.module_code || !draft.name) return alert("Code and Name are required");

    const ectsNum = Number.parseInt(draft.ects, 10);
    const semesterNum = Number.parseInt(draft.semester, 10);

    const payload = {
      module_code: String(draft.module_code).trim(),
      name: String(draft.name).trim(),

      // ✅ ECTS any integer (default 5)
      ects: Number.isFinite(ectsNum) ? ectsNum : 5,

      room_type: draft.room_type,
      semester: Number.isFinite(semesterNum) ? semesterNum : 1,

      // ✅ store multi-assessment weights in backend string (JSON)
      assessment_type: buildAssessmentString(draft.assessment_items),

      category: draft.category,
      program_id: draft.program_id ? parseInt(draft.program_id, 10) : null,
      specialization_ids: draft.specialization_ids
    };

    try {
      if (formMode === "add") await api.createModule(payload);
      else await api.updateModule(editingCode, payload);

      await loadData();
      setFormMode("overview");
    } catch (e) {
      console.error(e);
      alert("Error saving module.");
    }
  };

  const initiateDelete = (m) => {
    setModuleToDelete(m);
    setShowDeleteModal(true);
  };

  const confirmDelete = async () => {
    if (!moduleToDelete) return;
    try {
      await api.deleteModule(moduleToDelete.module_code);
      setShowDeleteModal(false);
      setModuleToDelete(null);
      loadData();
    } catch (e) {
      alert("Error deleting module.");
    }
  };

  const linkSpecToDraft = () => {
    if (!selectedSpecToAdd) return;
    const specId = parseInt(selectedSpecToAdd, 10);
    if (!draft.specialization_ids.includes(specId)) {
      setDraft(prev => ({ ...prev, specialization_ids: [...prev.specialization_ids, specId] }));
    }
    setSelectedSpecToAdd("");
  };

  const unlinkSpecFromDraft = (specId) => {
    setDraft(prev => ({ ...prev, specialization_ids: prev.specialization_ids.filter(id => id !== specId) }));
  };

  const handleProgramClick = (programId) => {
    if (programId && onNavigate) {
      onNavigate("programs", { programId: programId });
    }
  };

  const getCategoryStyle = (cat) => {
    if (cat === "Core") return styles.catCore;
    if (cat === "Elective") return styles.catElective;
    return styles.catShared;
  };

  // ---------- Assign lecturer (UI only) ----------
  const openAssign = (m) => {
    setAssignTarget(m);
    setAssignSemester(Number(m.semester) || 1);
    setAssignLecturerIds([]);
    setAssignNote("");
    setShowAssignModal(true);
  };

  const closeAssign = () => {
    setShowAssignModal(false);
    setAssignTarget(null);
    setAssignSemester(1);
    setAssignLecturerIds([]);
    setAssignNote("");
  };

  const toggleLecturer = (id) => {
    setAssignLecturerIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  };

  const saveAssign = () => {
    if (!assignTarget) return;
    if (!assignLecturerIds.length) return;

    const entry = {
      semester: Number(assignSemester) || 1,
      lecturerIds: assignLecturerIds,
      note: assignNote || ""
    };

    setTeachMap(prev => {
      const current = prev[assignTarget.module_code] || [];
      return { ...prev, [assignTarget.module_code]: [...current, entry] };
    });

    closeAssign();
  };

  const removeAssignEntry = (moduleCode, index) => {
    setTeachMap(prev => {
      const current = prev[moduleCode] || [];
      const next = [...current];
      next.splice(index, 1);
      return { ...prev, [moduleCode]: next };
    });
  };

  const getTeachingLabel = (moduleCode) => {
    const entries = teachMap[moduleCode] || [];
    if (!entries.length) return "Unassigned";
    // show last assignment semester + count lecturers
    const last = entries[entries.length - 1];
    return `Sem ${last.semester}: ${last.lecturerIds.length} lecturer(s)`;
  };

  return (
    <div style={styles.container}>
      {/* Controls */}
      <div style={styles.controlsBar}>
        <input style={styles.searchBar} placeholder="Search modules..." value={query} onChange={(e) => setQuery(e.target.value)} />
        <button style={{ ...styles.btn, ...styles.primaryBtn }} onClick={openAdd}>+ New Module</button>
      </div>

      {/* Header Row */}
      <div style={styles.listHeader}>
        <div>Code</div>
        <div>Module Name</div>
        <div>Program</div>
        <div style={{ textAlign: "center" }}>Semester</div>
        <div style={{ textAlign: "center" }}>Category</div>
        <div style={{ textAlign: "center" }}>ECTS</div>
        <div>Assessment</div>
        <div>Room Type</div>
        <div style={{ textAlign: "right" }}>Action</div>
      </div>

      {/* List Container */}
      <div style={styles.listContainer}>
        {loading ? (
          <div style={{ textAlign: 'center', padding: '40px', color: '#64748b' }}>Loading modules...</div>
        ) : (
          filteredModules.map((m) => {
            const prog = programs.find(p => p.id === m.program_id);
            return (
              <div
                key={m.module_code}
                style={{ ...styles.listCard, ...(hoverId === m.module_code ? styles.listCardHover : {}) }}
                onMouseEnter={() => setHoverId(m.module_code)}
                onMouseLeave={() => setHoverId(null)}
              >
                <div style={styles.codeText}>{m.module_code}</div>
                <div style={styles.nameText}>{m.name}</div>

                <div>
                  {prog ? (
                    <span
                      style={styles.programLink}
                      onClick={(e) => { e.stopPropagation(); handleProgramClick(prog.id); }}
                    >
                      {prog.name}
                    </span>
                  ) : (
                    <span style={{ ...styles.cellText, fontStyle: 'italic' }}>Global</span>
                  )}
                </div>

                <div style={styles.centeredCell}>{m.semester}</div>

                <div style={{ textAlign: "center" }}>
                  <span style={{ ...styles.catBadge, ...getCategoryStyle(m.category) }}>{m.category}</span>
                </div>

                <div style={{ ...styles.centeredCell, fontWeight: 'bold', color: '#475569' }}>{m.ects}</div>

                {/* ✅ show multi-assessment readable */}
                <div style={styles.cellText}>{formatAssessmentForList(m.assessment_type) || "-"}</div>

                <div style={styles.cellText}>{m.room_type}</div>

                <div style={styles.actionContainer}>
                  {/* ✅ Assign lecturer UI button */}
                  <button
                    style={{ ...styles.actionBtn, ...styles.assignBtn }}
                    onClick={(e) => { e.stopPropagation(); openAssign(m); }}
                    title={getTeachingLabel(m.module_code)}
                  >
                    Assign
                  </button>
                  <button style={{ ...styles.actionBtn, ...styles.editBtn }} onClick={() => openEdit(m)}>Edit</button>
                  <button style={{ ...styles.actionBtn, ...styles.deleteBtn }} onClick={() => initiateDelete(m)}>Del</button>
                </div>
              </div>
            );
          })
        )}
        {!loading && filteredModules.length === 0 && (
          <div style={{ color: "#94a3b8", padding: "40px", textAlign: "center", fontStyle: "italic" }}>
            No modules found.
          </div>
        )}
      </div>

      {/* MODAL (Create/Edit) */}
      {(formMode === "add" || formMode === "edit") && (
        <div style={styles.overlay}>
          <div style={styles.modal}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '20px' }}>
              <h3 style={{ margin: 0 }}>{formMode === "add" ? "Create Module" : "Edit Module"}</h3>
              <button onClick={() => setFormMode("overview")} style={{ border: 'none', background: 'transparent', fontSize: '1.5rem', cursor: 'pointer' }}>×</button>
            </div>

            <div style={{ display: 'flex', gap: '15px' }}>
              <div style={{ ...styles.formGroup, flex: 1 }}>
                <label style={styles.label}>Module Code</label>
                <input
                  style={styles.input}
                  value={draft.module_code}
                  onChange={(e) => setDraft({ ...draft, module_code: e.target.value })}
                  disabled={formMode === "edit"}
                  placeholder="CS101"
                />
              </div>
              <div style={{ ...styles.formGroup, flex: 2 }}>
                <label style={styles.label}>Name</label>
                <input style={styles.input} value={draft.name} onChange={(e) => setDraft({ ...draft, name: e.target.value })} />
              </div>
            </div>

            <div style={{ display: 'flex', gap: '15px' }}>
              {/* ✅ ECTS customizable integer (default 5) */}
              <div style={{ ...styles.formGroup, flex: 1 }}>
                <label style={styles.label}>ECTS</label>
                <input
                  type="number"
                  style={styles.input}
                  value={draft.ects}
                  onChange={(e) => setDraft({ ...draft, ects: e.target.value })}
                  min="0"
                  step="1"
                  placeholder="5"
                />
                <div style={styles.hint}>Default is 5, but you can type any number.</div>
              </div>

              <div style={{ ...styles.formGroup, flex: 1 }}>
                <label style={styles.label}>Semester</label>
                <input type="number" style={styles.input} value={draft.semester} onChange={(e) => setDraft({ ...draft, semester: e.target.value })} />
              </div>

              <div style={{ ...styles.formGroup, flex: 1 }}>
                <label style={styles.label}>Category</label>
                <select style={styles.select} value={draft.category} onChange={(e) => setDraft({ ...draft, category: e.target.value })}>
                  {CATEGORY_TYPES.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
            </div>

            <div style={{ display: 'flex', gap: '15px' }}>
              <div style={{ ...styles.formGroup, flex: 1 }}>
                <label style={styles.label}>Room Type</label>
                <select style={styles.select} value={draft.room_type} onChange={(e) => setDraft({ ...draft, room_type: e.target.value })}>
                  <optgroup label="Standard">{STANDARD_ROOM_TYPES.map(t => <option key={t} value={t}>{t}</option>)}</optgroup>
                  {customRoomTypes.length > 0 && (
                    <optgroup label="Custom">{customRoomTypes.map(t => <option key={t} value={t}>{t}</option>)}</optgroup>
                  )}
                </select>
              </div>

              {/* ✅ Assessment multi + weight */}
              <div style={{ ...styles.formGroup, flex: 1 }}>
                <label style={styles.label}>Assessment (multiple + weight %)</label>

                {assessmentTotal === 100 ? (
                  <div style={styles.ok}>Total weight: <strong>{assessmentTotal}%</strong></div>
                ) : (
                  <div style={styles.warn}>Total weight: <strong>{assessmentTotal}%</strong> (should be 100%)</div>
                )}

                {(draft.assessment_items || []).map((item, idx) => (
                  <div key={idx} style={{ display: "flex", gap: "10px", alignItems: "center" }}>
                    <select
                      style={{ ...styles.select, marginBottom: "10px" }}
                      value={item.type}
                      onChange={(e) => updateAssessmentRow(idx, { type: e.target.value })}
                    >
                      {ASSESSMENT_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                    </select>

                    <input
                      type="number"
                      style={{ ...styles.input, marginBottom: "10px" }}
                      value={item.weight}
                      min="0"
                      step="1"
                      placeholder="%"
                      onChange={(e) => updateAssessmentRow(idx, { weight: e.target.value })}
                    />

                    <button
                      type="button"
                      style={{ ...styles.actionBtn, ...styles.deleteBtn, height: "38px", marginBottom: "10px" }}
                      onClick={() => removeAssessmentRow(idx)}
                      title="Remove assessment"
                    >
                      ×
                    </button>
                  </div>
                ))}

                <button
                  type="button"
                  style={{ ...styles.btn, ...styles.primaryBtn, width: "100%", marginTop: "5px" }}
                  onClick={addAssessmentRow}
                >
                  + Add Assessment Part
                </button>
              </div>
            </div>

            <hr style={{ margin: '20px 0', border: '0', borderTop: '1px solid #eee' }} />

            <div style={styles.formGroup}>
              <label style={styles.label}>Study Program (Owner)</label>
              <select style={styles.select} value={draft.program_id} onChange={(e) => setDraft({ ...draft, program_id: e.target.value })}>
                <option value="">-- None / Global Module --</option>
                {programs.map(p => (<option key={p.id} value={p.id}>{p.name} ({p.level})</option>))}
              </select>
            </div>

            <div style={{ ...styles.formGroup, background: '#f9f9f9', padding: '15px', borderRadius: '6px', border: '1px solid #eee' }}>
              <label style={{ ...styles.label, marginBottom: '10px' }}>Linked Specializations</label>
              <div style={{ display: 'flex', gap: '10px', marginBottom: '15px' }}>
                <select style={styles.select} value={selectedSpecToAdd} onChange={(e) => setSelectedSpecToAdd(e.target.value)}>
                  <option value="">-- Select Specialization --</option>
                  {specializations.filter(s => !draft.specialization_ids.includes(s.id)).map(s => (
                    <option key={s.id} value={s.id}>{s.name} ({s.acronym})</option>
                  ))}
                </select>
                <button type="button" style={{ ...styles.btn, ...styles.primaryBtn }} onClick={linkSpecToDraft}>Link</button>
              </div>

              <div style={{ maxHeight: '150px', overflowY: 'auto', display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                {draft.specialization_ids.map(specId => {
                  const spec = specializations.find(s => s.id === specId);
                  if (!spec) return null;
                  return (
                    <div key={spec.id} style={{ background: 'white', border: '1px solid #ddd', padding: '4px 10px', borderRadius: '15px', fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span>{spec.name} ({spec.acronym})</span>
                      <button onClick={() => unlinkSpecFromDraft(spec.id)} style={{ border: 'none', background: 'transparent', color: '#ef4444', cursor: 'pointer', fontWeight: 'bold' }}>×</button>
                    </div>
                  );
                })}
                {draft.specialization_ids.length === 0 && <div style={{ fontStyle: 'italic', color: '#999' }}>No specializations linked.</div>}
              </div>
            </div>

            <div style={{ marginTop: '25px', display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
              <button style={{ ...styles.btn, background: '#f8f9fa', border: '1px solid #ddd' }} onClick={() => setFormMode("overview")}>Cancel</button>
              <button style={{ ...styles.btn, ...styles.primaryBtn }} onClick={save}>Save</button>
            </div>
          </div>
        </div>
      )}

      {/* ASSIGN LECTURER MODAL (UI ONLY) */}
      {showAssignModal && assignTarget && (
        <div style={styles.overlay}>
          <div style={styles.modal}>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "15px" }}>
              <h3 style={{ margin: 0 }}>Assign Lecturer(s)</h3>
              <button onClick={closeAssign} style={{ border: 'none', background: 'transparent', fontSize: '1.5rem', cursor: 'pointer' }}>×</button>
            </div>

            <div style={styles.formGroup}>
              <label style={styles.label}>Module</label>
              <div style={styles.pill}>
                <strong style={{ color: "#1e293b" }}>{assignTarget.module_code}</strong>
                <span style={{ color: "#64748b" }}>{assignTarget.name}</span>
              </div>
            </div>

            <div style={{ display: "flex", gap: "15px" }}>
              <div style={{ ...styles.formGroup, flex: 1 }}>
                <label style={styles.label}>Semester (teaching)</label>
                <input
                  type="number"
                  style={styles.input}
                  value={assignSemester}
                  onChange={(e) => setAssignSemester(e.target.value)}
                  min="1"
                  step="1"
                />
                <div style={styles.hint}>This lets you assign different lecturers per semester.</div>
              </div>
              <div style={{ ...styles.formGroup, flex: 2 }}>
                <label style={styles.label}>Note (optional)</label>
                <input
                  style={styles.input}
                  value={assignNote}
                  onChange={(e) => setAssignNote(e.target.value)}
                  placeholder="e.g. Group A / Group B split"
                />
              </div>
            </div>

            <div style={styles.formGroup}>
              <label style={styles.label}>Select Lecturer(s)</label>
              <div style={{ display: "flex", flexWrap: "wrap", gap: "10px" }}>
                {MOCK_LECTURERS.map(l => {
                  const checked = assignLecturerIds.includes(l.id);
                  return (
                    <label key={l.id} style={{ ...styles.pill, cursor: "pointer", userSelect: "none" }}>
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={() => toggleLecturer(l.id)}
                      />
                      {l.name}
                    </label>
                  );
                })}
              </div>
              <div style={styles.hint}>UI-only: stored in frontend state. (No backend call.)</div>
            </div>

            <div style={{ marginTop: "10px", display: "flex", justifyContent: "flex-end", gap: "10px" }}>
              <button style={{ ...styles.btn, background: "#e5e7eb", color: "#374151" }} onClick={closeAssign}>Cancel</button>
              <button
                style={{ ...styles.btn, ...styles.primaryBtn, opacity: assignLecturerIds.length ? 1 : 0.6 }}
                disabled={!assignLecturerIds.length}
                onClick={saveAssign}
              >
                Save Assignment
              </button>
            </div>

            {/* Show existing assignments for that module */}
            <hr style={{ margin: '20px 0', border: '0', borderTop: '1px solid #eee' }} />
            <h4 style={{ margin: "0 0 10px 0", color: "#334155" }}>Existing Assignments (UI only)</h4>

            {(teachMap[assignTarget.module_code] || []).length === 0 ? (
              <div style={{ fontStyle: "italic", color: "#94a3b8" }}>No assignments yet.</div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                {(teachMap[assignTarget.module_code] || []).map((a, idx) => (
                  <div key={idx} style={{ border: "1px solid #e2e8f0", borderRadius: "10px", padding: "12px", background: "#f8fafc" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: "10px" }}>
                      <div>
                        <div style={{ fontWeight: 700, color: "#0f172a" }}>Semester {a.semester}</div>
                        <div style={{ color: "#64748b", marginTop: 2 }}>
                          {(a.lecturerIds || []).map(id => MOCK_LECTURERS.find(x => x.id === id)?.name).filter(Boolean).join(", ")}
                        </div>
                        {a.note ? <div style={{ marginTop: 6, color: "#475569" }}>Note: {a.note}</div> : null}
                      </div>
                      <button
                        style={{ ...styles.actionBtn, ...styles.deleteBtn }}
                        onClick={() => removeAssignEntry(assignTarget.module_code, idx)}
                      >
                        Remove
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* DELETE MODAL */}
      {showDeleteModal && (
        <DeleteConfirmationModal
          moduleName={moduleToDelete?.name}
          onClose={() => setShowDeleteModal(false)}
          onConfirm={confirmDelete}
        />
      )}
    </div>
  );
}

// --- HELPER: Delete Confirmation Modal ---
function DeleteConfirmationModal({ moduleName, onClose, onConfirm }) {
  const [input, setInput] = useState("");
  const isMatch = input === "DELETE";

  return (
    <div style={styles.overlay}>
      <div style={{ ...styles.modal, width: '450px', maxHeight: 'none' }}>
        <h3 style={{ marginTop: 0, color: "#991b1b" }}>⚠️ Delete Module?</h3>
        <p style={{ color: "#4b5563", marginBottom: "20px", lineHeight: '1.5' }}>
          Are you sure you want to delete <strong>{moduleName}</strong>?<br />
          This action cannot be undone.
        </p>
        <p style={{ fontSize: "0.9rem", fontWeight: "bold", marginBottom: "8px", color: '#374151' }}>
          Type "DELETE" to confirm:
        </p>
        <input
          style={styles.input}
          value={input}
          onChange={e => setInput(e.target.value)}
          placeholder="DELETE"
        />
        <div style={{ display: "flex", justifyContent: "flex-end", gap: "10px" }}>
          <button style={{ ...styles.btn, background: "#e5e7eb", color: "#374151" }} onClick={onClose}>Cancel</button>
          <button
            disabled={!isMatch}
            style={{
              ...styles.btn,
              background: isMatch ? "#dc2626" : "#fca5a5",
              color: "white",
              cursor: isMatch ? "pointer" : "not-allowed"
            }}
            onClick={onConfirm}
          >
            Permanently Delete
          </button>
        </div>
      </div>
    </div>
  );
}
