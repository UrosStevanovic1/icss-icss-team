import React, { useState, useEffect, useMemo } from "react";
import api from "../api";

const ENABLE_V2_FIELDS = true;

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
    gridTemplateColumns: "80px 2fr 1.5fr 80px 100px 60px 2.2fr 1.2fr 110px",
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
  sectionBox: { background: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: "10px", padding: "14px", marginBottom: "15px" },
  sectionTitle: { margin: "0 0 10px 0", fontSize: "0.95rem", fontWeight: "700", color: "#334155" },
  row: { display: "flex", gap: "10px", alignItems: "center", flexWrap: "wrap" },
  miniBtn: { padding: "8px 10px", borderRadius: "6px", border: "1px solid #e2e8f0", background: "white", cursor: "pointer", fontWeight: 600, color: "#334155" },
  dangerMiniBtn: { padding: "8px 10px", borderRadius: "6px", border: "1px solid #fecaca", background: "#fff1f2", cursor: "pointer", fontWeight: 700, color: "#e11d48" },
  trLine: { borderTop: "1px solid #e2e8f0" },
  pill: { display: "inline-flex", alignItems: "center", gap: "6px", padding: "6px 10px", borderRadius: "999px", border: "1px solid #e2e8f0", background: "white", fontSize: "0.85rem", color: "#475569" },
  totalOk: { background: "#ecfdf5", borderColor: "#bbf7d0", color: "#065f46" },
  totalBad: { background: "#fff1f2", borderColor: "#fecaca", color: "#9f1239" },
  helpText: { fontSize: "0.85rem", color: "#64748b", marginTop: "6px", lineHeight: 1.4 }
};

const STANDARD_ROOM_TYPES = ["Lecture Classroom", "Computer Lab", "Seminar"];
const ASSESSMENT_TYPES = ["Written Exam", "Presentation", "Project", "Report"];
const CATEGORY_TYPES = ["Core", "Shared", "Elective"];

function safeInt(v, fallback) {
  const n = parseInt(v, 10);
  return Number.isFinite(n) ? n : fallback;
}

function assessmentSummaryFromDraft(draft) {
  if (Array.isArray(draft.assessments) && draft.assessments.length > 0) {
    return draft.assessments
      .filter(a => a?.type)
      .map(a => `${a.type}${a.weight !== "" && a.weight !== null && a.weight !== undefined ? ` (${safeInt(a.weight, 0)}%)` : ""}`)
      .join(", ");
  }
  return draft.assessment_type || "-";
}
function formatAssessmentForList(m) {
  const ab = Array.isArray(m?.assessment_breakdown) ? m.assessment_breakdown : [];
  if (ab.length > 0) {
    return ab
      .filter(a => a?.type)
      .map(a => `${a.type}${a.weight !== null && a.weight !== undefined ? ` (${a.weight}%)` : ""}`)
      .join(", ");
  }
  return m?.assessment_type || "-";
}

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
    module_code: "",
    name: "",
    ects: 5,
    room_type: "Lecture Classroom",
    semester: 1,
    assessment_type: "Written Exam",
    assessments: [{ type: "Written Exam", weight: 100 }],
    category: "Core",
    program_id: "",
    specialization_ids: []
  });

  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [moduleToDelete, setModuleToDelete] = useState(null);

  useEffect(() => { loadData(); }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const [modData, progData, specData, roomData] = await Promise.all([
        api.getModules(),
        api.getPrograms(),
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
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const filteredModules = useMemo(() => {
    const q = query.trim().toLowerCase();
    return modules.filter(m => (m?.name || "").toLowerCase().includes(q) || (m?.module_code || "").toLowerCase().includes(q));
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
      assessment_type: "Written Exam",
      assessments: [{ type: "Written Exam", weight: 100 }],
      category: "Core",
      program_id: "",
      specialization_ids: []
    });
    setFormMode("add");
  };

  const openEdit = (m) => {
    setEditingCode(m.module_code);
    setSelectedSpecToAdd("");

    const fromV2 = Array.isArray(m.assessment_breakdown) && m.assessment_breakdown.length > 0
      ? m.assessment_breakdown
      : null;

    const inferredAssessments = fromV2
      ? fromV2
      : [{ type: (m.assessment_type || "Written Exam"), weight: 100 }];

    const normalized = inferredAssessments.map(a => ({
      type: a?.type || "Written Exam",
      weight: a?.weight === null || a?.weight === undefined ? "" : String(a.weight)
    }));

    if (normalized.length === 1) normalized[0].weight = "100";

    setDraft({
      module_code: m.module_code,
      name: m.name,
      ects: m.ects ?? 5,
      room_type: m.room_type,
      semester: m.semester,
      assessment_type: m.assessment_type || "Written Exam",
      assessments: normalized,
      category: m.category || "Core",
      program_id: m.program_id ? String(m.program_id) : "",
      specialization_ids: (m.specializations || []).map(s => s.id)
    });

    setFormMode("edit");
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

  const assessmentTotal = useMemo(() => {
    return (draft.assessments || []).reduce((sum, a) => sum + safeInt(a.weight, 0), 0);
  }, [draft.assessments]);

  const addAssessmentRow = () => {
    setDraft(prev => ({
      ...prev,
      assessments: [...(prev.assessments || []), { type: "Project", weight: "" }]
    }));
  };

  const removeAssessmentRow = (idx) => {
    setDraft(prev => {
      const next = [...(prev.assessments || [])];
      next.splice(idx, 1);
      if (next.length === 0) return { ...prev, assessments: [{ type: "Written Exam", weight: "100" }] };
      if (next.length === 1) next[0].weight = "100";
      return { ...prev, assessments: next };
    });
  };

  const updateAssessment = (idx, patch) => {
    setDraft(prev => {
      const next = [...(prev.assessments || [])];
      next[idx] = { ...next[idx], ...patch };
      if (next.length === 1) next[0].weight = "100";
      return { ...prev, assessments: next };
    });
  };

  const validateBeforeSave = () => {
    if (!draft.module_code || !draft.name) {
      alert("Code and Name are required");
      
      if (assessmentTotal !== 100) {
        alert(`Assessment weights must total 100%. Current: ${assessmentTotal}%`);
        return false;
}

    }

    const ects = safeInt(draft.ects, 5);
    if (ects < 0) {
      alert("ECTS cannot be negative.");
      return false;
    }

    const list = draft.assessments || [];
    if (list.length === 0) {
      alert("Please add at least one assessment.");
      return false;
    }

    const hasEmptyType = list.some(a => !a?.type);
    if (hasEmptyType) {
      alert("Each assessment must have a type.");
      return false;
    }

    const badWeight = list.some(a => {
      if (a.weight === "" || a.weight === null || a.weight === undefined) return false;
      const w = safeInt(a.weight, NaN);
      return !Number.isFinite(w) || w < 0 || w > 100;
    });
    if (badWeight) {
      alert("Weights must be between 0 and 100 (or left empty).");
      return false;
    }

    if (list.length === 1 && safeInt(list[0].weight, 0) !== 100) {
      alert("If only 1 assessment is provided, weight must be 100.");
      return false;
    }

    return true;
  };

  const save = async () => {
    if (!validateBeforeSave()) return;

    const payload = {
      module_code: draft.module_code,
      name: draft.name,
      ects: safeInt(draft.ects, 5),
      room_type: draft.room_type,
      semester: safeInt(draft.semester, 1),
      assessment_type: (draft.assessments?.[0]?.type || draft.assessment_type || "Written Exam"),
      category: draft.category,
      program_id: draft.program_id ? safeInt(draft.program_id, null) : null,
      specialization_ids: draft.specialization_ids
    };

    if (ENABLE_V2_FIELDS) {
      payload.assessment_breakdown = (draft.assessments || []).map(a => ({
        type: a.type,
        weight: a.weight === "" || a.weight === null || a.weight === undefined ? null : safeInt(a.weight, 0)
      }));
    }

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

  return (
    <div style={styles.container}>
      <div style={styles.controlsBar}>
        <input
          style={styles.searchBar}
          placeholder="Search modules..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
        <button style={{ ...styles.btn, ...styles.primaryBtn }} onClick={openAdd}>+ New Module</button>
      </div>

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

               {(() => {
  const assessmentText = formatAssessmentForList(m);
  return (
    <div
      style={{ ...styles.cellText, whiteSpace: "normal", overflow: "visible", textOverflow: "clip" }}
      title={assessmentText}
    >
      {assessmentText}
    </div>
  );
})()}



                <div style={styles.cellText}>{m.room_type}</div>

                <div style={styles.actionContainer}>
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

      {(formMode === "add" || formMode === "edit") && (
        <div style={styles.overlay}>
          <div style={styles.modal}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '20px' }}>
              <h3 style={{ margin: 0 }}>{formMode === "add" ? "Create Module" : "Edit Module"}</h3>
              <button
                onClick={() => setFormMode("overview")}
                style={{ border: 'none', background: 'transparent', fontSize: '1.5rem', cursor: 'pointer' }}
              >
                ×
              </button>
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
                <input
                  style={styles.input}
                  value={draft.name}
                  onChange={(e) => setDraft({ ...draft, name: e.target.value })}
                />
              </div>
            </div>

            <div style={{ display: 'flex', gap: '15px' }}>
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
              </div>

              <div style={{ ...styles.formGroup, flex: 1 }}>
                <label style={styles.label}>Semester</label>
                <input
                  type="number"
                  style={styles.input}
                  value={draft.semester}
                  onChange={(e) => setDraft({ ...draft, semester: e.target.value })}
                  min="1"
                  step="1"
                />
              </div>

              <div style={{ ...styles.formGroup, flex: 1 }}>
                <label style={styles.label}>Category</label>
                <select
                  style={styles.select}
                  value={draft.category}
                  onChange={(e) => setDraft({ ...draft, category: e.target.value })}
                >
                  {CATEGORY_TYPES.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
            </div>

            <div style={{ display: 'flex', gap: '15px' }}>
              <div style={{ ...styles.formGroup, flex: 1 }}>
                <label style={styles.label}>Room Type</label>
                <select
                  style={styles.select}
                  value={draft.room_type}
                  onChange={(e) => setDraft({ ...draft, room_type: e.target.value })}
                >
                  <optgroup label="Standard">
                    {STANDARD_ROOM_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                  </optgroup>
                  {customRoomTypes.length > 0 && (
                    <optgroup label="Custom">
                      {customRoomTypes.map(t => <option key={t} value={t}>{t}</option>)}
                    </optgroup>
                  )}
                </select>
              </div>

              <div style={{ ...styles.formGroup, flex: 1 }}>
                <label style={styles.label}>Assessment (summary)</label>
                <input
                  style={styles.input}
                  value={assessmentSummaryFromDraft(draft)}
                  readOnly
                />
              </div>
            </div>

            <div style={styles.sectionBox}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: "10px" }}>
                <h4 style={styles.sectionTitle}>Assessment breakdown</h4>

                <div style={{ display: "flex", alignItems: "center", gap: "10px", flexWrap: "wrap", justifyContent: "flex-end" }}>
                  <span
                    style={{
                      ...styles.pill,
                      ...(assessmentTotal === 100 ? styles.totalOk : styles.totalBad)
                    }}
                    title="Total should be 100%"
                  >
                    Total: <strong>{assessmentTotal}%</strong>
                    {assessmentTotal === 100 ? " ✅" : " ⚠️"}
                  </span>

                  <button type="button" style={{ ...styles.miniBtn, borderColor: "#bfdbfe" }} onClick={addAssessmentRow}>
                    + Add assessment
                  </button>
                </div>
              </div>
              

              <div style={styles.helpText}>
                Add one or more assessment types and set weights. Total weight MUST be 100%.
              </div>

              <div style={{ marginTop: "12px" }}>
                {(draft.assessments || []).map((a, idx) => {
                  const single = (draft.assessments || []).length === 1;
                  return (
                    <div key={idx} style={{ ...styles.row, padding: "10px 0", ...(idx > 0 ? styles.trLine : {}) }}>
                      <div style={{ flex: 2, minWidth: "220px" }}>
                        <label style={styles.label}>Type</label>
                        <select
                          style={{ ...styles.select, marginBottom: 0 }}
                          value={a.type}
                          onChange={(e) => updateAssessment(idx, { type: e.target.value })}
                        >
                          {ASSESSMENT_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                        </select>
                      </div>

                      <div style={{ flex: 1, minWidth: "140px" }}>
                        <label style={styles.label}>Weight (%)</label>
                        <input
                          type="number"
                          style={{ ...styles.input, marginBottom: 0 }}
                          value={single ? 100 : a.weight}
                          onChange={(e) => updateAssessment(idx, { weight: e.target.value })}
                          min="0"
                          max="100"
                          step="1"
                          disabled={single}
                        />
                      </div>

                      <div style={{ display: "flex", alignItems: "end", paddingBottom: "1px" }}>
                        <button
                          type="button"
                          style={{ ...styles.dangerMiniBtn, opacity: single ? 0.5 : 1, cursor: single ? "not-allowed" : "pointer" }}
                          onClick={() => !single && removeAssessmentRow(idx)}
                          disabled={single}
                          title="Remove assessment"
                        >
                          ×
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            <hr style={{ margin: '20px 0', border: '0', borderTop: '1px solid #eee' }} />

            <div style={styles.formGroup}>
              <label style={styles.label}>Study Program (Owner)</label>
              <select
                style={styles.select}
                value={draft.program_id}
                onChange={(e) => setDraft({ ...draft, program_id: e.target.value })}
              >
                <option value="">-- None / Global Module --</option>
                {programs.map(p => (<option key={p.id} value={p.id}>{p.name} ({p.level})</option>))}
              </select>
            </div>

            <div style={{ ...styles.formGroup, background: '#f9f9f9', padding: '15px', borderRadius: '6px', border: '1px solid #eee' }}>
              <label style={{ ...styles.label, marginBottom: '10px' }}>Linked Specializations</label>
              <div style={{ display: 'flex', gap: '10px', marginBottom: '15px' }}>
                <select
                  style={styles.select}
                  value={selectedSpecToAdd}
                  onChange={(e) => setSelectedSpecToAdd(e.target.value)}
                >
                  <option value="">-- Select Specialization --</option>
                  {specializations
                    .filter(s => !draft.specialization_ids.includes(s.id))
                    .map(s => (
                      <option key={s.id} value={s.id}>
                        {s.name} ({s.acronym})
                      </option>
                    ))}
                </select>
                <button type="button" style={{ ...styles.btn, ...styles.primaryBtn }} onClick={linkSpecToDraft}>Link</button>
              </div>

              <div style={{ maxHeight: '150px', overflowY: 'auto', display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                {draft.specialization_ids.map(specId => {
                  const spec = specializations.find(s => s.id === specId);
                  if (!spec) return null;
                  return (
                    <div
                      key={spec.id}
                      style={{
                        background: 'white',
                        border: '1px solid #ddd',
                        padding: '4px 10px',
                        borderRadius: '15px',
                        fontSize: '0.85rem',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px'
                      }}
                    >
                      <span>{spec.name} ({spec.acronym})</span>
                      <button
                        onClick={() => unlinkSpecFromDraft(spec.id)}
                        style={{ border: 'none', background: 'transparent', color: '#ef4444', cursor: 'pointer', fontWeight: 'bold' }}
                      >
                        ×
                      </button>
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
