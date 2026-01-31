import React, { useState, useEffect, useCallback } from "react";
import api from "../api";

// --- CONSTANTS ---
const DEGREE_OPTIONS = {
  Bachelor: ["B.Sc.", "B.A.", "LL.B."],
  Master: ["M.Sc.", "M.A.", "LL.M."]
};

const DEGREE_STYLES = {
  "B.Sc.": { bg: "#e0f2fe", color: "#0369a1" },
  "M.Sc.": { bg: "#e0f2fe", color: "#0369a1" },
  "B.A.": { bg: "#ffe4e6", color: "#be123c" },
  "M.A.": { bg: "#ffe4e6", color: "#be123c" },
  "LL.B.": { bg: "#fef3c7", color: "#b45309" },
  "LL.M.": { bg: "#fef3c7", color: "#b45309" },
  "default": { bg: "#f1f5f9", color: "#64748b" }
};

const STANDARD_ROOM_TYPES = ["Lecture Classroom", "Computer Lab", "Seminar"];
const ASSESSMENT_TYPES = ["Written Exam", "Presentation", "Project", "Report"];
const CATEGORY_TYPES = ["Core", "Shared", "Elective"];

// --- STYLES ---
const styles = {
  container: { padding: "20px", fontFamily: "'Inter', sans-serif", color: "#333", maxWidth: "1200px", margin: "0 auto" },
  controlsBar: { display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px", gap: "15px", flexWrap: "wrap" },
  leftControls: { display: "flex", gap: "15px", alignItems: "center", flex: 1 },
  searchBar: { padding: "10px 15px", borderRadius: "8px", border: "1px solid #cbd5e1", fontSize: "0.95rem", width: "100%", maxWidth: "350px", background: "white", boxShadow: "0 1px 2px rgba(0,0,0,0.05)", outline: "none" },
  toggleContainer: { display: "flex", background: "#e2e8f0", padding: "4px", borderRadius: "8px" },
  toggleBtn: { padding: "6px 16px", border: "none", borderRadius: "6px", cursor: "pointer", fontSize: "0.9rem", fontWeight: "600", color: "#64748b", background: "transparent", transition: "all 0.2s" },
  toggleBtnActive: { background: "white", color: "#3b82f6", boxShadow: "0 1px 3px rgba(0,0,0,0.1)" },
  listContainer: { display: "flex", flexDirection: "column", gap: "12px" },
  listHeader: { display: "grid", gridTemplateColumns: "90px 70px 2fr 1.2fr 1.5fr 1fr 80px", gap: "15px", padding: "0 25px", marginBottom: "5px", color: "#94a3b8", fontSize: "0.75rem", fontWeight: "700", textTransform: "uppercase", letterSpacing: "0.05em", alignItems: "center" },
  listCard: { background: "white", borderRadius: "8px", border: "none", cursor: "pointer", transition: "background-color 0.15s ease", display: "grid", gridTemplateColumns: "90px 70px 2fr 1.2fr 1.5fr 1fr 80px", alignItems: "center", padding: "18px 25px", gap: "15px", boxShadow: "0 2px 8px rgba(0,0,0,0.08)" },
  listCardHover: { backgroundColor: "#f1f5f9" },
  moduleHeader: { display: "grid", gridTemplateColumns: "80px 3fr 80px 100px 60px 1.2fr 1.2fr 1.5fr 130px", gap: "15px", padding: "10px 15px", background: "#f8fafc", borderBottom: "1px solid #e2e8f0", color: "#94a3b8", fontSize: "0.7rem", fontWeight: "700", textTransform: "uppercase", letterSpacing: "0.05em", alignItems: "center", borderTopLeftRadius: "8px", borderTopRightRadius: "8px" },
  moduleCard: { background: "white", borderBottom: "1px solid #f1f5f9", display: "grid", gridTemplateColumns: "80px 3fr 80px 100px 60px 1.2fr 1.2fr 1.5fr 130px", alignItems: "center", padding: "12px 15px", gap: "15px", fontSize: "0.9rem" },
  progTitle: { margin: 0, fontSize: "1rem", fontWeight: "600", color: "#1e293b", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" },
  progSubtitle: { margin: 0, fontSize: "0.85rem", color: "#64748b", fontWeight: "500" },
  codeText: { fontWeight: "700", color: "#3b82f6", fontSize: "0.9rem" },
  nameText: { fontWeight: "600", color: "#1e293b", lineHeight: "1.3" },
  cellText: { fontSize: "0.85rem", color: "#64748b", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" },
  centeredCell: { textAlign: "center", fontSize: "0.85rem", color: "#64748b" },
  tabContainer: { display: "flex", gap: "20px", marginBottom: "20px", borderBottom: "2px solid #e2e8f0" },
  tab: { padding: "12px 0", cursor: "pointer", fontSize: "1rem", color: "#64748b", fontWeight: "500", borderBottom: "2px solid transparent", marginBottom: "-2px" },
  activeTab: { color: "#3b82f6", borderBottom: "2px solid #3b82f6" },
  btn: { padding: "8px 16px", borderRadius: "6px", border: "none", cursor: "pointer", fontSize: "0.9rem", fontWeight: "500", transition: "0.2s", display: "inline-flex", alignItems: "center", gap: "6px" },
  primaryBtn: { background: "#3b82f6", color: "white" },
  secondaryBtn: { background: "#e2e8f0", color: "#475569" },
  dangerBtn: { background: "#fee2e2", color: "#ef4444" },
  input: { width: "100%", padding: "10px", borderRadius: "6px", border: "1px solid #cbd5e1", fontSize: "0.95rem", marginBottom: "15px", boxSizing: "border-box" },
  select: { width: "100%", padding: "10px", borderRadius: "6px", border: "1px solid #cbd5e1", fontSize: "0.95rem", marginBottom: "15px", background: "white" },
  formGroup: { marginBottom: "15px" },
  label: { display: "block", marginBottom: "5px", fontWeight: "600", fontSize: "0.85rem", color: "#64748b" },
  badge: { padding: "4px 0", borderRadius: "6px", fontSize: "0.75rem", fontWeight: "bold", textTransform: "uppercase", display: "block", width: "100%", textAlign: "center" },
  statusActive: { background: "#dcfce7", color: "#166534" },
  statusInactive: { background: "#f1f5f9", color: "#94a3b8" },
  ectsBadge: { fontWeight:'bold', color:'#333', background:'#f1f5f9', padding:'6px 0', borderRadius:'6px', textAlign:'center', fontSize:'0.85rem' },
  degreeBadge: { padding: "4px 0", borderRadius: "6px", fontSize: "0.75rem", fontWeight: "bold", textAlign: "center", display: "block", width: "100%" },
  catBadge: { padding: "4px 8px", borderRadius: "6px", fontSize: "0.75rem", fontWeight: "bold", textAlign: "center", textTransform: "uppercase", display: "inline-block" },
  catCore: { background: "#dbeafe", color: "#1e40af" },
  catElective: { background: "#fef3c7", color: "#92400e" },
  catShared: { background: "#f3e8ff", color: "#6b21a8" },
  actionContainer: { display: "flex", gap: "8px", justifyContent: "flex-end" },
  actionBtn: { padding: "4px 8px", borderRadius: "6px", border: "none", cursor: "pointer", fontSize: "0.8rem", fontWeight: "600" },
  editBtn: { background: "#e2e8f0", color: "#475569" },
  delBtn: { background: "#fee2e2", color: "#ef4444" },
  overlay: { position: "fixed", top: 0, left: 0, right: 0, bottom: 0, background: "rgba(0,0,0,0.5)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000 },
  modal: { backgroundColor: "#ffffff", padding: "30px", borderRadius: "12px", width: "650px", maxWidth: "90%", maxHeight: "90vh", overflowY: "auto", boxShadow: "0 20px 25px -5px rgba(0,0,0,0.1)" }
};

// ✅ FORMAT DATE Utility (15.01.2026 fix)
const formatDate = (isoDate) => {
  if (!isoDate) return "-";
  const d = new Date(isoDate);
  if (isNaN(d.getTime())) return isoDate;
  const day = String(d.getDate()).padStart(2, '0');
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const year = d.getFullYear();
  return `${day}.${month}.${year}`;
};

export default function ProgramOverview({ initialData, clearInitialData, currentUserRole }) {
  const [view, setView] = useState("LIST");
  const [selectedProgram, setSelectedProgram] = useState(null);
  const [programs, setPrograms] = useState([]);
  const [lecturers, setLecturers] = useState([]);
  const [specializations, setSpecializations] = useState([]);
  const [modules, setModules] = useState([]);

  // ✅ ROLE-BASED PERMISSIONS (Lowercase FIX)
  const role = currentUserRole?.toLowerCase();
  const isPM = ["admin", "pm"].includes(role);

  // Helper function to determine if the user can manage a specific program
  const canManageProgram = (program) => {
    if (isPM) return true;
    if (role === "hosp") {
        const loggedInLecturerId = parseInt(localStorage.getItem("lecturerId"));
        return program.head_of_program_id === loggedInLecturerId;
    }
    return false;
  };

  const refreshNestedData = useCallback((progId) => {
    api.getSpecializations().then(res => setSpecializations((res || []).filter(s => s.program_id === progId)));
    api.getModules().then(allModules => {
        setModules((allModules || []).filter(m => m.program_id === progId));
    });
  }, []);

  const handleProgramClick = useCallback((prog) => {
    setSelectedProgram(prog);
    setView("DETAIL");
    refreshNestedData(prog.id);
  }, [refreshNestedData]);

  const loadData = useCallback(async () => {
    try {
        const [progData, lecData] = await Promise.all([
            api.getPrograms(),
            api.getLecturers()
        ]);
        setPrograms(progData || []);
        setLecturers(lecData || []);

        if (initialData && initialData.programId) {
            const target = (progData || []).find(p => p.id === initialData.programId);
            if (target) {
                setSelectedProgram(target);
                setView("DETAIL");
                refreshNestedData(target.id);
                if (clearInitialData) clearInitialData();
            }
        }
    } catch(e) { console.error("Load Error", e); }
  }, [initialData, clearInitialData, refreshNestedData]);

  useEffect(() => { loadData(); }, [loadData]);

  const handleBack = () => {
    setSelectedProgram(null);
    setView("LIST");
    loadData();
  };

  return (
    <div style={styles.container}>
      {view === "LIST" ? (
        <ProgramList
          programs={programs}
          lecturers={lecturers}
          onSelect={handleProgramClick}
          refresh={loadData}
          isPM={isPM}
          canManageProgram={canManageProgram}
        />
      ) : (
        <ProgramWorkspace
          program={selectedProgram}
          lecturers={lecturers}
          specializations={specializations}
          modules={modules}
          onBack={handleBack}
          refreshSpecs={() => refreshNestedData(selectedProgram.id)}
          onUpdateProgram={(updated) => setSelectedProgram(updated)}
          canEdit={canManageProgram(selectedProgram)}
        />
      )}
    </div>
  );
}

function ProgramList({ programs, lecturers, onSelect, refresh, isPM, canManageProgram }) {
  const [showCreate, setShowCreate] = useState(false);
  const [levelFilter, setLevelFilter] = useState("Bachelor");
  const [searchQuery, setSearchQuery] = useState("");
  const [hoverId, setHoverId] = useState(null);

  const [newProg, setNewProg] = useState({
      name: "", acronym: "", head_of_program_id: null, degree_type: "B.Sc.",
      total_ects: 180, level: "Bachelor", status: true,
      start_date: "", location: ""
  });

  const handleCreate = async () => {
    if(!newProg.name || !newProg.acronym) return alert("Name and Acronym are required.");
    try {
        await api.createProgram(newProg);
        setShowCreate(false);
        refresh();
    } catch(e) { alert("Failed to create program."); }
  };

  const handleLevelChange = (newLevel) => {
      const defaultDegree = newLevel === "Bachelor" ? "B.Sc." : "M.Sc.";
      setNewProg({ ...newProg, level: newLevel, degree_type: defaultDegree });
  };

  const filtered = programs.filter(p => {
      const matchesLevel = p.level === levelFilter;
      const q = searchQuery.toLowerCase();
      const matchesSearch =
          p.name.toLowerCase().includes(q) ||
          p.acronym.toLowerCase().includes(q) ||
          (p.location && p.location.toLowerCase().includes(q));
      return matchesLevel && matchesSearch;
  });

  return (
    <div>
      <div style={styles.controlsBar}>
        <div style={styles.leftControls}>
            <div style={styles.toggleContainer}>
            <button style={{ ...styles.toggleBtn, ...(levelFilter === "Bachelor" ? styles.toggleBtnActive : {}) }} onClick={() => setLevelFilter("Bachelor")}>Bachelor</button>
            <button style={{ ...styles.toggleBtn, ...(levelFilter === "Master" ? styles.toggleBtnActive : {}) }} onClick={() => setLevelFilter("Master")}>Master</button>
            </div>
            <input
                style={styles.searchBar}
                placeholder="Search programs..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
            />
        </div>
        {isPM && (
            <button style={{ ...styles.btn, ...styles.primaryBtn }} onClick={() => setShowCreate(true)}>+ New Program</button>
        )}
      </div>

      <div style={styles.listHeader}>
        <div>Status</div>
        <div>Degree</div>
        <div>Program Name</div>
        <div>Location</div>
        <div>HoSP</div>
        <div>Start Date</div>
        <div style={{textAlign:'center'}}>ECTS</div>
      </div>

      <div style={styles.listContainer}>
        {filtered.map(p => {
            const degreeStyle = DEGREE_STYLES[p.degree_type] || DEGREE_STYLES["default"];
            const hasEditRights = canManageProgram(p);
            return (
                <div
                    key={p.id}
                    style={{
                      ...styles.listCard,
                      ...(hoverId === p.id ? styles.listCardHover : {}),
                      borderLeft: hasEditRights ? '4px solid #3b82f6' : '4px solid transparent'
                    }}
                    onClick={() => onSelect(p)}
                    onMouseEnter={() => setHoverId(p.id)}
                    onMouseLeave={() => setHoverId(null)}
                >
                    <div>
                        <span style={{ ...styles.badge, ...(p.status ? styles.statusActive : styles.statusInactive) }}>
                            {p.status ? "Active" : "Inactive"}
                        </span>
                    </div>
                    <div>
                        <span style={{ ...styles.degreeBadge, background: degreeStyle.bg, color: degreeStyle.color }}>
                            {p.degree_type || "-"}
                        </span>
                    </div>
                    <div style={{minWidth: 0}}>
                        <h4 style={styles.progTitle}>{p.name}</h4>
                        <span style={styles.progSubtitle}>{p.acronym}</span>
                    </div>
                    <div style={styles.cellText}>{p.location || "-"}</div>

                    {/* ✅ DISPLAY COMPUTED NAME (Title First Last): */}
                    <div style={styles.cellText}>
                        {p.head_lecturer
                            ? `${p.head_lecturer.title} ${p.head_lecturer.first_name} ${p.head_lecturer.last_name}`
                            : "-"}
                    </div>

                    <div style={styles.cellText}>{formatDate(p.start_date)}</div>
                    <div style={styles.ectsBadge}>{p.total_ects} ECTS</div>
                </div>
            );
        })}
        {filtered.length === 0 && <div style={{ color: "#94a3b8", padding: "40px", textAlign: "center", fontStyle: "italic" }}>No programs found matching your search.</div>}
      </div>

      {showCreate && (
        <div style={styles.overlay}>
            <div style={styles.modal}>
                <h3 style={{marginTop:0}}>Create New Program</h3>

                <div style={{display:'flex', gap:'10px'}}>
                    <div style={{flex: 1}}>
                        <select
                            style={styles.select}
                            value={newProg.degree_type}
                            onChange={e => setNewProg({...newProg, degree_type: e.target.value})}
                        >
                            {DEGREE_OPTIONS[newProg.level].map(opt => <option key={opt} value={opt}>{opt}</option>)}
                        </select>
                    </div>
                    <div style={{flex: 3}}>
                        <input style={styles.input} placeholder="Program Name" value={newProg.name} onChange={e => setNewProg({...newProg, name: e.target.value})} />
                    </div>
                </div>

                <div style={{display:'flex', gap:'10px'}}>
                    <input style={styles.input} placeholder="Acronym (e.g. CS)" value={newProg.acronym} onChange={e => setNewProg({...newProg, acronym: e.target.value})} />
                    <select style={styles.select} value={newProg.level} onChange={e => handleLevelChange(e.target.value)}>
                        <option value="Bachelor">Bachelor</option>
                        <option value="Master">Master</option>
                    </select>
                </div>
                <div style={{display:'flex', gap:'10px'}}>
                    <input type="date" style={styles.input} value={newProg.start_date} onChange={e => setNewProg({...newProg, start_date: e.target.value})} />
                    <input style={styles.input} placeholder="Location (e.g. Berlin)" value={newProg.location} onChange={e => setNewProg({...newProg, location: e.target.value})} />
                </div>

                <select
                    style={styles.select}
                    value={newProg.head_of_program_id || ""}
                    onChange={e => setNewProg({...newProg, head_of_program_id: e.target.value ? parseInt(e.target.value) : null})}
                >
                    <option value="">-- Select Head --</option>
                    {lecturers.map(l => <option key={l.id} value={l.id}>{l.title} {l.first_name} {l.last_name}</option>)}
                </select>
                <div style={{display:'flex', gap:'10px', alignItems:'center', marginBottom:'15px'}}>
                    <input type="number" style={{...styles.input, marginBottom:0}} placeholder="ECTS" value={newProg.total_ects} onChange={e => setNewProg({...newProg, total_ects: e.target.value})} />
                    <label style={{display:'flex', alignItems:'center', gap:'10px', cursor:'pointer', whiteSpace:'nowrap'}}>
                        <input type="checkbox" checked={newProg.status} onChange={e => setNewProg({...newProg, status: e.target.checked})} />
                        Active Status
                    </label>
                </div>

                <div style={{display:'flex', justifyContent:'flex-end', gap:'10px', marginTop:'20px'}}>
                    <button style={{...styles.btn, ...styles.secondaryBtn}} onClick={() => setShowCreate(false)}>Cancel</button>
                    <button style={{...styles.btn, ...styles.primaryBtn}} onClick={handleCreate}>Create</button>
                </div>
            </div>
        </div>
      )}
    </div>
  );
}

function ProgramWorkspace({ program, lecturers, specializations, modules, onBack, refreshSpecs, onUpdateProgram, canEdit }) {
  const [activeTab, setActiveTab] = useState("INFO");
  const [isEditing, setIsEditing] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [editDraft, setEditDraft] = useState({});

  const [moduleFormMode, setModuleFormMode] = useState("none");
  const [moduleEditingCode, setModuleEditingCode] = useState(null);
  const [moduleDraft, setModuleDraft] = useState({});
  const [selectedSpecToAdd, setSelectedSpecToAdd] = useState("");
  const [showModuleDeleteModal, setShowModuleDeleteModal] = useState(false);
  const [moduleToDelete, setModuleToDelete] = useState(null);

  useEffect(() => {
    setEditDraft({ ...program });
  }, [program]);

  const handleSaveInfo = async () => {
    try {
        await api.updateProgram(program.id, editDraft);
        onUpdateProgram(editDraft);
        setIsEditing(false);
    } catch(e) { alert("Failed to update program."); }
  };

  const getCategoryStyle = (cat) => {
      if (cat === "Core") return styles.catCore;
      if (cat === "Elective") return styles.catElective;
      return styles.catShared;
  };

  const getLinkedSpecName = (module) => {
      if (!module.specializations || module.specializations.length === 0) return "Common";
      const relevantSpecs = module.specializations.filter(s => s.program_id === program.id);
      if (relevantSpecs.length === 0) return "Common";
      return relevantSpecs.map(s => s.acronym).join(", ");
  };

  const openModuleAdd = () => {
      setModuleEditingCode(null);
      setSelectedSpecToAdd("");
      setModuleDraft({
          module_code: "", name: "", ects: 5, room_type: "Lecture Classroom", semester: 1,
          assessment_type: "Written Exam", category: "Core",
          program_id: String(program.id),
          specialization_ids: []
      });
      setModuleFormMode("add");
  };

  const openModuleEdit = (m) => {
      setModuleEditingCode(m.module_code);
      setSelectedSpecToAdd("");
      setModuleDraft({
          module_code: m.module_code, name: m.name, ects: m.ects, room_type: m.room_type,
          semester: m.semester, assessment_type: m.assessment_type || "Written Exam", category: m.category || "Core",
          program_id: m.program_id ? String(m.program_id) : String(program.id),
          specialization_ids: (m.specializations || []).map(s => s.id)
      });
      setModuleFormMode("edit");
  };

  const initiateModuleDelete = (m) => {
      setModuleToDelete(m);
      setShowModuleDeleteModal(true);
  };

  const confirmModuleDelete = async () => {
      if (!moduleToDelete) return;
      try {
          await api.deleteModule(moduleToDelete.module_code);
          setShowModuleDeleteModal(false);
          setModuleToDelete(null);
          refreshSpecs();
      } catch (e) { alert("Error deleting module."); }
  };

  const saveModule = async () => {
      if (!moduleDraft.module_code || !moduleDraft.name) return alert("Code and Name are required");

      const payload = {
          ...moduleDraft,
          ects: parseInt(moduleDraft.ects),
          semester: parseInt(moduleDraft.semester),
          program_id: parseInt(moduleDraft.program_id)
      };

      try {
          if (moduleFormMode === "add") await api.createModule(payload);
          else await api.updateModule(moduleEditingCode, payload);
          setModuleFormMode("none");
          refreshSpecs();
      } catch (e) { alert("Error saving module."); }
  };

  const linkSpecToDraft = () => {
      if (!selectedSpecToAdd) return;
      const specId = parseInt(selectedSpecToAdd);
      if (!moduleDraft.specialization_ids.includes(specId)) {
          setModuleDraft(prev => ({ ...prev, specialization_ids: [...prev.specialization_ids, specId] }));
      }
      setSelectedSpecToAdd("");
  };

  const unlinkSpecFromDraft = (specId) => {
      setModuleDraft(prev => ({ ...prev, specialization_ids: prev.specialization_ids.filter(id => id !== specId) }));
  };

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px" }}>
        <button style={{ ...styles.btn, background:"transparent", color:"#64748b", padding:0 }} onClick={onBack}>← Back to List</button>
        {canEdit && (
            <button style={{ ...styles.btn, ...styles.dangerBtn }} onClick={() => setShowDeleteModal(true)}>Delete Program</button>
        )}
      </div>

      <div style={{ marginBottom: "20px" }}>
        <h1 style={{ margin: 0, fontSize: "2rem", color: "#1e293b", fontWeight: "700" }}>{program.name}</h1>
        <div style={{ color: "#64748b", marginTop: "5px" }}>{program.level} • {program.acronym}</div>
      </div>

      <div style={styles.tabContainer}>
        {["INFO", "SPECS", "MODULES"].map(t => (
            <div
                key={t}
                style={{ ...styles.tab, ...(activeTab === t ? styles.activeTab : {}) }}
                onClick={() => setActiveTab(t)}
            >
                {t === "INFO" ? "General Info" : t === "SPECS" ? `Specializations (${specializations.length})` : `Curriculum (${modules.length})`}
            </div>
        ))}
      </div>

      <div style={{ background: "white", padding: "30px", borderRadius: "12px", border: "1px solid #e2e8f0" }}>

        {activeTab === "INFO" && (
          <div>
             <div style={{display:'flex', justifyContent:'space-between', marginBottom:'20px'}}>
                <h3>Program Details</h3>
                {canEdit && (
                    !isEditing
                        ? <button style={{...styles.btn, ...styles.secondaryBtn}} onClick={() => setIsEditing(true)}>Edit Details</button>
                        : <div style={{display:'flex', gap:'10px'}}>
                            <button style={{...styles.btn, background:'transparent', border:'1px solid #ccc'}} onClick={() => { setIsEditing(false); setEditDraft({...program}); }}>Cancel</button>
                            <button style={{...styles.btn, ...styles.primaryBtn}} onClick={handleSaveInfo}>Save Changes</button>
                        </div>
                )}
             </div>

             <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "20px", maxWidth: "800px" }}>
                <div>
                    <label style={{ display: "block", color: "#64748b", fontSize: "0.85rem", marginBottom: "5px" }}>Degree Type</label>
                    {isEditing ? (
                        <select
                            style={styles.select}
                            value={editDraft.degree_type || ""}
                            onChange={e => setEditDraft({...editDraft, degree_type: e.target.value})}
                        >
                            {DEGREE_OPTIONS[editDraft.level || "Bachelor"].map(opt => <option key={opt} value={opt}>{opt}</option>)}
                        </select>
                    ) : (
                        <div style={{ fontSize: "1rem", fontWeight: "500" }}>{program.degree_type || "-"}</div>
                    )}
                </div>

                <FieldDisplay label="Program Name" isEditing={isEditing} value={editDraft.name} onChange={v => setEditDraft({...editDraft, name: v})} />
                <FieldDisplay label="Acronym" isEditing={isEditing} value={editDraft.acronym} onChange={v => setEditDraft({...editDraft, acronym: v})} />

                <div>
                    <label style={{ display: "block", color: "#64748b", fontSize: "0.85rem", marginBottom: "5px" }}>Head of Program</label>
                    {isEditing ? (
                        <select
                            style={styles.select}
                            value={editDraft.head_of_program_id || ""}
                            onChange={e => setEditDraft({...editDraft, head_of_program_id: e.target.value ? parseInt(e.target.value) : null})}
                        >
                             <option value="">-- Select Head --</option>
                             {lecturers.map(l => <option key={l.id} value={l.id}>{l.title} {l.first_name} {l.last_name}</option>)}
                        </select>
                    ) : (
                        <div style={{ fontWeight: "500" }}>
                            {program.head_lecturer
                                ? `${program.head_lecturer.title} ${program.head_lecturer.first_name} ${program.head_lecturer.last_name}`
                                : "-"}
                        </div>
                    )}
                </div>
                <FieldDisplay label="Total ECTS" type="number" isEditing={isEditing} value={editDraft.total_ects} onChange={v => setEditDraft({...editDraft, total_ects: v})} />
                <FieldDisplay label="Start Date" type="date" isEditing={isEditing} value={editDraft.start_date} onChange={v => setEditDraft({...editDraft, start_date: v})} />
                <FieldDisplay label="Location" isEditing={isEditing} value={editDraft.location} onChange={v => setEditDraft({...editDraft, location: v})} />

                <div>
                    <label style={{ display: "block", color: "#64748b", fontSize: "0.85rem", marginBottom: "5px" }}>Status</label>
                    {isEditing ? (
                        <label style={{display:'flex', alignItems:'center', gap:'10px', cursor:'pointer'}}>
                            <input type="checkbox" checked={editDraft.status} onChange={e => setEditDraft({...editDraft, status: e.target.checked})} />
                            {editDraft.status ? "Active" : "Inactive"}
                        </label>
                    ) : (
                        <span style={{ ...styles.badge, ...(program.status ? styles.statusActive : styles.statusInactive), width: 'auto', display: 'inline-block', padding: '4px 12px' }}>
                            {program.status ? "Active" : "Inactive"}
                        </span>
                    )}
                </div>
             </div>
          </div>
        )}

        {activeTab === "SPECS" && (
            <SpecializationsManager programId={program.id} specializations={specializations} refresh={refreshSpecs} canEdit={canEdit} />
        )}

        {activeTab === "MODULES" && (
          <div>
            <div style={{display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:'15px'}}>
                <h3 style={{margin:0}}>Modules</h3>
                {canEdit && (
                    <button style={{...styles.btn, ...styles.primaryBtn}} onClick={openModuleAdd}>+ New Module</button>
                )}
            </div>

            <div style={styles.moduleHeader}>
                <div>Code</div>
                <div>Module Name</div>
                <div style={{textAlign:'center'}}>Semester</div>
                <div style={{textAlign:'center'}}>Category</div>
                <div style={{textAlign:'center'}}>ECTS</div>
                <div>Assessment</div>
                <div>Room Type</div>
                <div>Specialization</div>
                <div style={{textAlign:'right'}}>Actions</div>
            </div>

            <div style={{border: '1px solid #e2e8f0', borderTop: 'none', borderBottomLeftRadius: '8px', borderBottomRightRadius: '8px', overflow:'hidden'}}>
                {modules.map(m => (
                    <div key={m.module_code} style={styles.moduleCard}>
                        <div style={styles.codeText}>{m.module_code}</div>
                        <div style={styles.nameText}>{m.name}</div>
                        <div style={styles.centeredCell}>{m.semester}</div>

                        <div style={{textAlign:'center'}}>
                            <span style={{...styles.catBadge, ...getCategoryStyle(m.category)}}>{m.category}</span>
                        </div>

                        <div style={{...styles.centeredCell, fontWeight:'bold'}}>{m.ects}</div>
                        <div style={styles.cellText}>{m.assessment_type || "-"}</div>
                        <div style={styles.cellText}>{m.room_type}</div>

                        <div style={styles.cellText}>
                            <span style={{fontSize:'0.85rem', color:'#475569', fontWeight:'500'}}>
                                {getLinkedSpecName(m)}
                            </span>
                        </div>

                        <div style={styles.actionContainer}>
                            {canEdit ? (
                                <>
                                    <button style={{...styles.actionBtn, ...styles.editBtn}} onClick={() => openModuleEdit(m)}>Edit</button>
                                    <button style={{...styles.actionBtn, ...styles.delBtn}} onClick={() => initiateModuleDelete(m)}>Delete</button>
                                </>
                            ) : (
                                <span style={{fontSize:'0.8rem', color:'#94a3b8'}}>Read Only</span>
                            )}
                        </div>
                    </div>
                ))}
                {modules.length === 0 && <div style={{ color: "#94a3b8", padding: "40px", textAlign: "center", fontStyle: "italic" }}>No modules linked.</div>}
            </div>
          </div>
        )}

      </div>

      {showDeleteModal && (
        <DeleteConfirmationModal
            title="Delete Program?"
            msg="This action cannot be undone. It will remove the program and unlink all related specializations and modules."
            itemName={program.name}
            onClose={() => setShowDeleteModal(false)}
            onConfirm={() => {
                api.deleteProgram(program.id).then(() => {
                    setShowDeleteModal(false);
                    onBack();
                }).catch(err => alert("Error deleting program."));
            }}
        />
      )}

      {showModuleDeleteModal && (
        <DeleteConfirmationModal
            title="Delete Module?"
            msg="Are you sure you want to delete this module? This action cannot be undone."
            itemName={moduleToDelete?.name}
            onClose={() => setShowModuleDeleteModal(false)}
            onConfirm={confirmModuleDelete}
        />
      )}

      {(moduleFormMode === "add" || moduleFormMode === "edit") && (
        <div style={styles.overlay}>
            <div style={{...styles.modal, width:'650px'}}>
                <div style={{display:'flex', justifyContent:'space-between', marginBottom:'20px'}}>
                    <h3 style={{margin:0}}>{moduleFormMode === "add" ? "Create Module" : "Edit Module"}</h3>
                    <button onClick={() => setModuleFormMode("none")} style={{border:'none', background:'transparent', fontSize:'1.5rem', cursor:'pointer'}}>×</button>
                </div>

                <div style={{display:'flex', gap:'15px'}}>
                    <div style={{...styles.formGroup, flex:1}}><label style={styles.label}>Module Code</label><input style={styles.input} value={moduleDraft.module_code} onChange={(e) => setModuleDraft({ ...moduleDraft, module_code: e.target.value })} disabled={moduleFormMode === "edit"} placeholder="CS101" /></div>
                    <div style={{...styles.formGroup, flex:2}}><label style={styles.label}>Name</label><input style={styles.input} value={moduleDraft.name} onChange={(e) => setModuleDraft({ ...moduleDraft, name: e.target.value })} /></div>
                </div>

                <div style={{display:'flex', gap:'15px'}}>
                    <div style={{...styles.formGroup, flex:1}}><label style={styles.label}>ECTS</label><input type="number" style={styles.input} value={moduleDraft.ects} onChange={(e) => setModuleDraft({ ...moduleDraft, ects: e.target.value })} /></div>
                    <div style={{...styles.formGroup, flex:1}}><label style={styles.label}>Semester</label><input type="number" style={styles.input} value={moduleDraft.semester} onChange={(e) => setModuleDraft({ ...moduleDraft, semester: e.target.value })} /></div>
                    <div style={{...styles.formGroup, flex:1}}><label style={styles.label}>Category</label><select style={styles.select} value={moduleDraft.category} onChange={(e) => setModuleDraft({ ...moduleDraft, category: e.target.value })}>{CATEGORY_TYPES.map(c => <option key={c} value={c}>{c}</option>)}</select></div>
                </div>

                <div style={{display:'flex', gap:'15px'}}>
                    <div style={{...styles.formGroup, flex:1}}><label style={styles.label}>Room Type</label><select style={styles.select} value={moduleDraft.room_type} onChange={(e) => setModuleDraft({...moduleDraft, room_type: e.target.value})}><optgroup label="Standard">{STANDARD_ROOM_TYPES.map(t => <option key={t} value={t}>{t}</option>)}</optgroup></select></div>
                    <div style={{...styles.formGroup, flex:1}}><label style={styles.label}>Assessment</label><select style={styles.select} value={moduleDraft.assessment_type} onChange={(e) => setModuleDraft({ ...moduleDraft, assessment_type: e.target.value })}>{ASSESSMENT_TYPES.map(t => <option key={t} value={t}>{t}</option>)}</select></div>
                </div>

                <hr style={{margin:'20px 0', border:'0', borderTop:'1px solid #eee'}} />

                {/* Specialization Linking */}
                <div style={{...styles.formGroup, background: '#f9f9f9', padding: '15px', borderRadius: '6px', border:'1px solid #eee'}}>
                    <label style={{...styles.label, marginBottom:'10px'}}>Linked Specializations</label>
                    <div style={{display:'flex', gap:'10px', marginBottom:'15px'}}>
                        <select style={styles.select} value={selectedSpecToAdd} onChange={(e) => setSelectedSpecToAdd(e.target.value)}>
                            <option value="">-- Select Specialization --</option>
                            {specializations.filter(s => !moduleDraft.specialization_ids.includes(s.id)).map(s => (<option key={s.id} value={s.id}>{s.name} ({s.acronym})</option>))}
                        </select>
                        <button type="button" style={{...styles.btn, ...styles.primaryBtn}} onClick={linkSpecToDraft}>Link</button>
                    </div>
                    <div style={{maxHeight:'150px', overflowY:'auto', display:'flex', flexWrap:'wrap', gap:'8px'}}>
                        {moduleDraft.specialization_ids.map(specId => {
                            const spec = specializations.find(s => s.id === specId);
                            if (!spec) return null;
                            return (
                                <div key={spec.id} style={{background:'white', border:'1px solid #ddd', padding:'4px 10px', borderRadius:'15px', fontSize:'0.85rem', display:'flex', alignItems:'center', gap:'8px'}}>
                                    <span>{spec.name} ({spec.acronym})</span>
                                    <button onClick={() => unlinkSpecFromDraft(spec.id)} style={{border:'none', background:'transparent', color:'#ef4444', cursor:'pointer', fontWeight:'bold'}}>×</button>
                                </div>
                            );
                        })}
                        {moduleDraft.specialization_ids.length === 0 && <div style={{fontStyle:'italic', color:'#999'}}>No specializations linked.</div>}
                    </div>
                </div>

                <div style={{marginTop: '25px', display:'flex', justifyContent:'flex-end', gap:'10px'}}>
                    <button style={{...styles.btn, background:'#f8f9fa', border:'1px solid #ddd'}} onClick={() => setModuleFormMode("none")}>Cancel</button>
                    <button style={{...styles.btn, ...styles.primaryBtn}} onClick={saveModule}>Save</button>
                </div>
            </div>
        </div>
      )}
    </div>
  );
}

const FieldDisplay = ({ label, value, onChange, isEditing, type = "text" }) => (
    <div>
        <label style={{ display: "block", color: "#64748b", fontSize: "0.85rem", marginBottom: "5px" }}>{label}</label>
        {isEditing ? (
            <input
                type={type}
                style={{...styles.input, marginBottom:0}}
                value={value || ""}
                onChange={e => onChange(e.target.value)}
            />
        ) : (
            <div style={{ fontSize: "1rem", fontWeight: "500" }}>{type === 'date' ? formatDate(value) : value || "-"}</div>
        )}
    </div>
);

function SpecializationsManager({ programId, specializations, refresh, canEdit }) {
    const [newSpec, setNewSpec] = useState({ name: "", acronym: "", start_date: "", status: true });
    const [editingSpecId, setEditingSpecId] = useState(null);
    const [editDraft, setEditDraft] = useState({});

    const handleAdd = async () => {
        if(!newSpec.name) return;
        await api.createSpecialization({ ...newSpec, program_id: programId });
        setNewSpec({ name: "", acronym: "", start_date: "", status: true });
        refresh();
    };

    const handleDelete = async (id) => {
        if(!window.confirm("Delete specialization?")) return;
        await api.deleteSpecialization(id);
        refresh();
    };

    const startEdit = (spec) => {
        setEditingSpecId(spec.id);
        setEditDraft({ ...spec });
    };

    const saveEdit = async () => {
        try {
            await api.updateSpecialization(editingSpecId, editDraft);
            setEditingSpecId(null);
            refresh();
        } catch(e) { alert("Update failed"); }
    };

    return (
        <div>
            {canEdit && (
                <div style={{background:'#f8fafc', padding:'15px', borderRadius:'8px', marginBottom:'20px', display:'flex', gap:'10px', alignItems:'flex-end'}}>
                    <div style={{flex:2}}>
                        <label style={{fontSize:'0.8rem', fontWeight:'bold'}}>Name</label>
                        <input style={{...styles.input, marginBottom:0}} value={newSpec.name} onChange={e => setNewSpec({...newSpec, name: e.target.value})} placeholder="e.g. AI" />
                    </div>
                    <div style={{flex:1}}>
                        <label style={{fontSize:'0.8rem', fontWeight:'bold'}}>Acronym</label>
                        <input style={{...styles.input, marginBottom:0}} value={newSpec.acronym} onChange={e => setNewSpec({...newSpec, acronym: e.target.value})} placeholder="AI" />
                    </div>
                    <div style={{flex:1}}>
                        <label style={{fontSize:'0.8rem', fontWeight:'bold'}}>Start Date</label>
                        <input type="date" style={{...styles.input, marginBottom:0}} value={newSpec.start_date} onChange={e => setNewSpec({...newSpec, start_date: e.target.value})} />
                    </div>
                    <div style={{flex:0.5}}>
                        <label style={{fontSize:'0.8rem', fontWeight:'bold'}}>Status</label>
                        <select style={{...styles.input, marginBottom:0}} value={newSpec.status} onChange={e => setNewSpec({...newSpec, status: e.target.value === 'true'})}>
                            <option value="true">Active</option>
                            <option value="false">Inactive</option>
                        </select>
                    </div>
                    <button style={{...styles.btn, ...styles.primaryBtn, height:'42px'}} onClick={handleAdd}>Add Spec</button>
                </div>
            )}

            <table style={{ width: "100%", borderCollapse: "collapse" }}>
                <thead>
                    <tr style={{ borderBottom: "2px solid #e2e8f0", textAlign: "left" }}>
                        <th style={{ padding: "10px" }}>Name</th>
                        <th style={{ padding: "10px" }}>Acronym</th>
                        <th style={{ padding: "10px" }}>Start Date</th>
                        <th style={{ padding: "10px" }}>Status</th>
                        <th style={{ padding: "10px", textAlign: "right" }}>Action</th>
                    </tr>
                </thead>
                <tbody>
                    {specializations.map(s => {
                        const isEditing = editingSpecId === s.id;
                        return (
                            <tr key={s.id} style={{ borderBottom: "1px solid #f1f5f9" }}>
                                <td style={{ padding: "12px 10px" }}>
                                    {isEditing ? <input style={styles.input} value={editDraft.name} onChange={e => setEditDraft({...editDraft, name: e.target.value})} /> : s.name}
                                </td>
                                <td style={{ padding: "12px 10px", fontWeight: "600" }}>
                                    {isEditing ? <input style={styles.input} value={editDraft.acronym} onChange={e => setEditDraft({...editDraft, acronym: e.target.value})} /> : s.acronym}
                                </td>
                                <td style={{ padding: "12px 10px" }}>
                                    {isEditing ? <input type="date" style={styles.input} value={editDraft.start_date} onChange={e => setEditDraft({...editDraft, start_date: e.target.value})} /> : formatDate(s.start_date)}
                                </td>
                                <td style={{ padding: "12px 10px" }}>
                                    {isEditing ? (
                                        <select style={styles.input} value={editDraft.status} onChange={e => setEditDraft({...editDraft, status: e.target.value === 'true'})}>
                                            <option value="true">Active</option>
                                            <option value="false">Inactive</option>
                                        </select>
                                    ) : (
                                        <span style={{ ...styles.badge, ...(s.status ? styles.statusActive : styles.statusInactive), width:'auto', padding:'4px 8px' }}>{s.status ? "Active" : "Inactive"}</span>
                                    )}
                                </td>
                                <td style={{ padding: "12px 10px", textAlign: "right" }}>
                                    {isEditing ? (
                                        <div style={{display:'flex', gap:'5px', justifyContent:'flex-end'}}>
                                            <button style={{...styles.btn, ...styles.primaryBtn, padding:'4px 8px'}} onClick={saveEdit}>Save</button>
                                            <button style={{...styles.btn, background:'#e2e8f0', color:'#475569', padding:'4px 8px'}} onClick={() => setEditingSpecId(null)}>Cancel</button>
                                        </div>
                                    ) : (
                                        <div style={styles.actionContainer}>
                                            {canEdit ? (
                                                <>
                                                    <button style={{...styles.actionBtn, ...styles.editBtn}} onClick={() => startEdit(s)}>Edit</button>
                                                    <button style={{...styles.actionBtn, ...styles.delBtn}} onClick={() => handleDelete(s.id)}>Delete</button>
                                                </>
                                            ) : (
                                                <span style={{fontSize:'0.8rem', color:'#94a3b8'}}>Locked</span>
                                            )}
                                        </div>
                                    )}
                                </td>
                            </tr>
                        );
                    })}
                    {specializations.length === 0 && <tr><td colSpan="5" style={{padding:'20px', textAlign:'center', color:'#94a3b8'}}>No specializations yet.</td></tr>}
                </tbody>
            </table>
        </div>
    );
}

function DeleteConfirmationModal({ title, msg, itemName, onClose, onConfirm }) {
    const [input, setInput] = useState("");
    const isMatch = input === "DELETE";

    return (
        <div style={styles.overlay}>
            <div style={{...styles.modal, width:'450px', maxHeight:'none'}}>
                <h3 style={{ marginTop: 0, color: "#991b1b" }}>{title}</h3>
                <p style={{ color: "#4b5563", marginBottom: "20px", lineHeight:'1.5' }}>
                    {msg} <br/>
                    {itemName && <strong>{itemName}</strong>}
                </p>
                <p style={{ fontSize: "0.9rem", fontWeight: "bold", marginBottom: "8px", color:'#374151' }}>
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
                        style={{ ...styles.btn, background: isMatch ? "#dc2626" : "#fca5a5", color: "white", cursor: isMatch ? "pointer" : "not-allowed" }}
                        onClick={onConfirm}
                    >
                        Permanently Delete
                    </button>
                </div>
            </div>
        </div>
    );
}