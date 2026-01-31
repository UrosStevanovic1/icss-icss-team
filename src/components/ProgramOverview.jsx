import React, { useState, useEffect } from "react";
import api from "../api";

// --- STYLES ---
const styles = {
  container: { padding: "20px", fontFamily: "'Inter', sans-serif", color: "#333", maxWidth: "1200px", margin: "0 auto" },

  // Controls Header
  controlsBar: { display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px", gap: "15px", flexWrap: "wrap" },
  leftControls: { display: "flex", gap: "15px", alignItems: "center", flex: 1 },

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

  // Toggle
  toggleContainer: { display: "flex", background: "#e2e8f0", padding: "4px", borderRadius: "8px" },
  toggleBtn: { padding: "6px 16px", border: "none", borderRadius: "6px", cursor: "pointer", fontSize: "0.9rem", fontWeight: "600", color: "#64748b", background: "transparent", transition: "all 0.2s" },
  toggleBtnActive: { background: "white", color: "#3b82f6", boxShadow: "0 1px 3px rgba(0,0,0,0.1)" },

  // LIST LAYOUT (Grid-based for perfect alignment)
  listContainer: { display: "flex", flexDirection: "column", gap: "12px" },

  listCard: {
    background: "white",
    borderRadius: "8px",
    border: "1px solid #e2e8f0",
    cursor: "pointer",
    transition: "background-color 0.2s ease", // Only animate background color
    // Grid layout: Status (Fixed) | Name (Flexible) | Metadata (Auto)
    display: "grid",
    gridTemplateColumns: "80px 1fr auto",
    alignItems: "center",
    padding: "16px 20px",
    gap: "20px",
    boxShadow: "0 1px 2px rgba(0,0,0,0.05)"
  },

  // Hover State: Just slightly darker, no movement or glow
  listCardHover: {
    backgroundColor: "#f8fafc",
    borderColor: "#cbd5e1"
  },

  // Typography
  progTitle: { margin: 0, fontSize: "1.05rem", fontWeight: "700", color: "#1e293b", lineHeight: "1.3" },
  progSubtitle: { margin: 0, fontSize: "0.85rem", color: "#64748b", fontWeight: "500" },

  // Metadata Section (Right Side)
  metaContainer: { display: "flex", alignItems: "center", gap: "20px", fontSize: "0.9rem", color: "#475569" },
  metaItem: { display: "flex", alignItems: "center", gap: "6px" },
  separator: { color: "#cbd5e1" },

  // Tabs
  tabContainer: { display: "flex", gap: "20px", marginBottom: "20px", borderBottom: "2px solid #e2e8f0" },
  tab: { padding: "12px 0", cursor: "pointer", fontSize: "1rem", color: "#64748b", fontWeight: "500", borderBottom: "2px solid transparent", marginBottom: "-2px" },
  activeTab: { color: "#3b82f6", borderBottom: "2px solid #3b82f6" },

  // Forms & Inputs
  btn: { padding: "8px 16px", borderRadius: "6px", border: "none", cursor: "pointer", fontSize: "0.9rem", fontWeight: "500", transition: "0.2s", display: "inline-flex", alignItems: "center", gap: "6px" },
  primaryBtn: { background: "#3b82f6", color: "white" },
  secondaryBtn: { background: "#e2e8f0", color: "#475569" },
  dangerBtn: { background: "#fee2e2", color: "#ef4444" },
  input: { width: "100%", padding: "10px", borderRadius: "6px", border: "1px solid #cbd5e1", fontSize: "0.95rem", marginBottom: "15px", boxSizing: "border-box" },
  select: { width: "100%", padding: "10px", borderRadius: "6px", border: "1px solid #cbd5e1", fontSize: "0.95rem", marginBottom: "15px", background: "white" },

  // Badges
  badge: { padding: "4px 0", borderRadius: "6px", fontSize: "0.75rem", fontWeight: "bold", textTransform: "uppercase", display: "block", width: "100%", textAlign: "center" },
  statusActive: { background: "#dcfce7", color: "#166534" },
  statusInactive: { background: "#f1f5f9", color: "#94a3b8" },
  ectsBadge: { fontWeight:'bold', color:'#333', background:'#f1f5f9', padding:'6px 12px', borderRadius:'6px' },

  // Modal
  overlay: { position: "fixed", top: 0, left: 0, right: 0, bottom: 0, background: "rgba(0,0,0,0.5)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000 },
  modal: { background: "white", padding: "30px", borderRadius: "12px", width: "500px", maxWidth: "90%", maxHeight: "90vh", overflowY: "auto", boxShadow: "0 20px 25px -5px rgba(0,0,0,0.1)" }
};

const formatDate = (isoDate) => {
  if (!isoDate) return "-";
  return new Date(isoDate).toLocaleDateString("de-DE");
};

export default function ProgramOverview() {
  const [view, setView] = useState("LIST");
  const [selectedProgram, setSelectedProgram] = useState(null);
  const [programs, setPrograms] = useState([]);
  const [lecturers, setLecturers] = useState([]);
  const [specializations, setSpecializations] = useState([]);
  const [modules, setModules] = useState([]);

  useEffect(() => { loadData(); }, []);

  const loadData = async () => {
    try {
        const [progData, lecData] = await Promise.all([
            api.getPrograms(),
            api.getLecturers()
        ]);
        setPrograms(progData || []);
        setLecturers(lecData || []);
    } catch(e) { console.error("Load Error", e); }
  };

  const handleProgramClick = (prog) => {
    setSelectedProgram(prog);
    setView("DETAIL");
    refreshNestedData(prog.id);
  };

  const refreshNestedData = (progId) => {
    api.getSpecializations().then(res => setSpecializations((res || []).filter(s => s.program_id === progId)));
    api.getModules().then(res => setModules((res || []).filter(m => m.program_id === progId)));
  };

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
        />
      )}
    </div>
  );
}

// --- VIEW: LIST (Wide Rows with Grid) ---
function ProgramList({ programs, lecturers, onSelect, refresh }) {
  const [showCreate, setShowCreate] = useState(false);
  const [levelFilter, setLevelFilter] = useState("Bachelor");
  const [searchQuery, setSearchQuery] = useState("");
  const [hoverId, setHoverId] = useState(null);

  const [newProg, setNewProg] = useState({
      name: "", acronym: "", head_of_program: "",
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
        <button style={{ ...styles.btn, ...styles.primaryBtn }} onClick={() => setShowCreate(true)}>+ New Program</button>
      </div>

      <div style={styles.listContainer}>
        {filtered.map(p => (
          <div
            key={p.id}
            style={{ ...styles.listCard, ...(hoverId === p.id ? styles.listCardHover : {}) }}
            onClick={() => onSelect(p)}
            onMouseEnter={() => setHoverId(p.id)}
            onMouseLeave={() => setHoverId(null)}
          >
            {/* 1. Status Column */}
            <div>
                <span style={{ ...styles.badge, ...(p.status ? styles.statusActive : styles.statusInactive) }}>
                    {p.status ? "Active" : "Inactive"}
                </span>
            </div>

            {/* 2. Name Column */}
            <div style={{minWidth: 0}}>
                <h4 style={styles.progTitle}>{p.name}</h4>
                <span style={styles.progSubtitle}>{p.acronym}</span>
            </div>

            {/* 3. Metadata Column */}
            <div style={styles.metaContainer}>
                {p.location && (
                    <div style={styles.metaItem}>Loc: {p.location}</div>
                )}
                <span style={styles.separator}>|</span>
                <div style={styles.metaItem}>Head: {p.head_of_program || "-"}</div>
                <span style={styles.separator}>|</span>
                <div style={styles.metaItem}>Start: {formatDate(p.start_date)}</div>

                <div style={styles.ectsBadge}>{p.total_ects} ECTS</div>
            </div>
          </div>
        ))}
        {filtered.length === 0 && <div style={{ color: "#94a3b8", padding: "20px", textAlign: "center", fontStyle: "italic" }}>No programs found matching your search.</div>}
      </div>

      {/* CREATE MODAL */}
      {showCreate && (
        <div style={styles.overlay}>
            <div style={styles.modal}>
                <h3 style={{marginTop:0}}>Create New Program</h3>
                <input style={styles.input} placeholder="Program Name" value={newProg.name} onChange={e => setNewProg({...newProg, name: e.target.value})} />
                <div style={{display:'flex', gap:'10px'}}>
                    <input style={styles.input} placeholder="Acronym (e.g. CS)" value={newProg.acronym} onChange={e => setNewProg({...newProg, acronym: e.target.value})} />
                    <select style={styles.select} value={newProg.level} onChange={e => setNewProg({...newProg, level: e.target.value})}>
                        <option>Bachelor</option><option>Master</option>
                    </select>
                </div>
                <div style={{display:'flex', gap:'10px'}}>
                    <input type="date" style={styles.input} value={newProg.start_date} onChange={e => setNewProg({...newProg, start_date: e.target.value})} />
                    <input style={styles.input} placeholder="Location (e.g. Berlin)" value={newProg.location} onChange={e => setNewProg({...newProg, location: e.target.value})} />
                </div>
                <select style={styles.select} value={newProg.head_of_program} onChange={e => setNewProg({...newProg, head_of_program: e.target.value})}>
                    <option value="">-- Select Head --</option>
                    {lecturers.map(l => <option key={l.id} value={`${l.first_name} ${l.last_name}`}>{l.first_name} {l.last_name}</option>)}
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

// --- VIEW: WORKSPACE (Detail) ---
function ProgramWorkspace({ program, lecturers, specializations, modules, onBack, refreshSpecs, onUpdateProgram }) {
  const [activeTab, setActiveTab] = useState("INFO");
  const [isEditing, setIsEditing] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [editDraft, setEditDraft] = useState({});

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

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px" }}>
        <button style={{ ...styles.btn, background:"transparent", color:"#64748b", padding:0 }} onClick={onBack}>← Back to List</button>
        <button style={{ ...styles.btn, ...styles.dangerBtn }} onClick={() => setShowDeleteModal(true)}>Delete Program</button>
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
                {!isEditing
                    ? <button style={{...styles.btn, ...styles.secondaryBtn}} onClick={() => setIsEditing(true)}>Edit Details</button>
                    : <div style={{display:'flex', gap:'10px'}}>
                        <button style={{...styles.btn, background:'transparent', border:'1px solid #ccc'}} onClick={() => { setIsEditing(false); setEditDraft({...program}); }}>Cancel</button>
                        <button style={{...styles.btn, ...styles.primaryBtn}} onClick={handleSaveInfo}>Save Changes</button>
                      </div>
                }
             </div>

             <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "20px", maxWidth: "800px" }}>
                <FieldDisplay label="Program Name" isEditing={isEditing} value={editDraft.name} onChange={v => setEditDraft({...editDraft, name: v})} />
                <FieldDisplay label="Acronym" isEditing={isEditing} value={editDraft.acronym} onChange={v => setEditDraft({...editDraft, acronym: v})} />

                <div>
                    <label style={{ display: "block", color: "#64748b", fontSize: "0.85rem", marginBottom: "5px" }}>Head of Program</label>
                    {isEditing ? (
                        <select style={styles.select} value={editDraft.head_of_program} onChange={e => setEditDraft({...editDraft, head_of_program: e.target.value})}>
                             {lecturers.map(l => <option key={l.id} value={`${l.first_name} ${l.last_name}`}>{l.first_name} {l.last_name}</option>)}
                        </select>
                    ) : <div style={{ fontWeight: "500" }}>{program.head_of_program}</div>}
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
            <SpecializationsManager programId={program.id} specializations={specializations} refresh={refreshSpecs} />
        )}

        {activeTab === "MODULES" && (
          <div>
            <h3>Curriculum Structure</h3>
            <div style={{ display: "grid", gap: "10px", marginTop: "20px" }}>
                {modules.map(m => (
                    <div key={m.module_code} style={{ padding: "15px", border: "1px solid #e2e8f0", borderRadius: "8px", display: "flex", justifyContent: "space-between" }}>
                        <div><strong>{m.module_code}</strong> - {m.name}</div>
                        <div style={{ color: "#64748b" }}>Semester {m.semester} • {m.ects} ECTS</div>
                    </div>
                ))}
                {modules.length === 0 && <div style={{ color: "#94a3b8" }}>No modules linked.</div>}
            </div>
          </div>
        )}
      </div>

      {showDeleteModal && (
        <DeleteConfirmationModal
            onClose={() => setShowDeleteModal(false)}
            onConfirm={() => {
                api.deleteProgram(program.id).then(() => {
                    setShowDeleteModal(false);
                    onBack();
                }).catch(err => alert("Error deleting program."));
            }}
        />
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

function SpecializationsManager({ programId, specializations, refresh }) {
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
                                            <button style={{...styles.btn, background:'#ccc', padding:'4px 8px'}} onClick={() => setEditingSpecId(null)}>Cancel</button>
                                        </div>
                                    ) : (
                                        <div style={{display:'flex', gap:'5px', justifyContent:'flex-end'}}>
                                            <button style={{ background: "none", border: "none", color: "#64748b", cursor: "pointer", fontWeight:600 }} onClick={() => startEdit(s)}>Edit</button>
                                            <button style={{ background: "none", border: "none", color: "#ef4444", cursor: "pointer", fontWeight:600 }} onClick={() => handleDelete(s.id)}>Remove</button>
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

function DeleteConfirmationModal({ onClose, onConfirm }) {
    const [input, setInput] = useState("");
    const isMatch = input === "DELETE";

    return (
        <div style={styles.overlay}>
            <div style={styles.modal}>
                <h3 style={{ marginTop: 0, color: "#991b1b" }}>⚠️ Delete Program?</h3>
                <p style={{ color: "#4b5563", marginBottom: "20px" }}>
                    This action cannot be undone. It will remove the program and unlink all related specializations and modules.
                </p>
                <p style={{ fontSize: "0.9rem", fontWeight: "bold", marginBottom: "5px" }}>
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