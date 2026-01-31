import React, { useState, useEffect } from "react";
import api from "../api";

// --- STYLES ---
const styles = {
  container: { padding: "20px", fontFamily: "'Inter', sans-serif", color: "#333", maxWidth: "100%" },

  // Header Controls
  controlsBar: { display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "25px", paddingBottom: "15px", borderBottom: "1px solid #e2e8f0" },

  // Toggle
  toggleContainer: { display: "flex", background: "#e2e8f0", padding: "4px", borderRadius: "8px" },
  toggleBtn: { padding: "6px 16px", border: "none", borderRadius: "6px", cursor: "pointer", fontSize: "0.9rem", fontWeight: "600", color: "#64748b", background: "transparent", transition: "all 0.2s" },
  toggleBtnActive: { background: "white", color: "#3b82f6", boxShadow: "0 1px 3px rgba(0,0,0,0.1)" },

  // Card Grid
  grid: { display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))", gap: "20px" },
  card: { background: "white", borderRadius: "12px", padding: "24px", boxShadow: "0 4px 6px -1px rgba(0,0,0,0.05), 0 2px 4px -1px rgba(0,0,0,0.03)", border: "1px solid #e2e8f0", cursor: "pointer", transition: "transform 0.2s, box-shadow 0.2s", position: "relative" },
  cardHover: { transform: "translateY(-2px)", boxShadow: "0 10px 15px -3px rgba(0,0,0,0.1)" },

  // Tabs (Workspace)
  tabContainer: { display: "flex", gap: "20px", marginBottom: "20px", borderBottom: "2px solid #e2e8f0" },
  tab: { padding: "12px 0", cursor: "pointer", fontSize: "1rem", color: "#64748b", fontWeight: "500", borderBottom: "2px solid transparent", marginBottom: "-2px" },
  activeTab: { color: "#3b82f6", borderBottom: "2px solid #3b82f6" },

  // Buttons & Inputs
  btn: { padding: "8px 16px", borderRadius: "6px", border: "none", cursor: "pointer", fontSize: "0.9rem", fontWeight: "500", transition: "0.2s" },
  primaryBtn: { background: "#3b82f6", color: "white" },
  input: { width: "100%", padding: "10px", borderRadius: "6px", border: "1px solid #cbd5e1", fontSize: "0.95rem", marginBottom: "15px" },

  // Badges
  badge: { padding: "4px 8px", borderRadius: "99px", fontSize: "0.75rem", fontWeight: "bold", textTransform: "uppercase", display: "inline-block" },
  statusActive: { background: "#dcfce7", color: "#166534" },
  statusInactive: { background: "#f1f5f9", color: "#64748b" },

  // Modal Overlay
  overlay: { position: "fixed", top: 0, left: 0, right: 0, bottom: 0, background: "rgba(0,0,0,0.5)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000 },
  modal: { background: "white", padding: "30px", borderRadius: "12px", width: "400px", maxWidth: "90%", boxShadow: "0 20px 25px -5px rgba(0,0,0,0.1)" }
};

export default function ProgramOverview() {
  const [view, setView] = useState("LIST"); // LIST | DETAIL
  const [selectedProgram, setSelectedProgram] = useState(null);
  const [programs, setPrograms] = useState([]);
  const [specializations, setSpecializations] = useState([]);
  const [modules, setModules] = useState([]);

  useEffect(() => { loadPrograms(); }, []);

  const loadPrograms = () => {
    // API returns array directly
    api.getPrograms().then(res => setPrograms(res || []));
  };

  const handleProgramClick = (prog) => {
    setSelectedProgram(prog);
    setView("DETAIL");
    refreshNestedData(prog.id);
  };

  const refreshNestedData = (progId) => {
    api.getSpecializations().then(res => {
        setSpecializations((res || []).filter(s => s.program_id === progId));
    });
    api.getModules().then(res => {
        setModules((res || []).filter(m => m.program_id === progId));
    });
  };

  const handleBack = () => {
    setSelectedProgram(null);
    setView("LIST");
    loadPrograms();
  };

  return (
    <div style={styles.container}>
      {view === "LIST" ? (
        <ProgramList
          programs={programs}
          onSelect={handleProgramClick}
          refresh={loadPrograms}
        />
      ) : (
        <ProgramWorkspace
          program={selectedProgram}
          specializations={specializations}
          modules={modules}
          onBack={handleBack}
          refreshSpecs={() => refreshNestedData(selectedProgram.id)}
          onDeleteSuccess={handleBack}
        />
      )}
    </div>
  );
}

// --- SUB-COMPONENT: The List View ---
function ProgramList({ programs, onSelect, refresh }) {
  const [showCreate, setShowCreate] = useState(false);
  const [levelFilter, setLevelFilter] = useState("Bachelor"); // 'Bachelor' | 'Master'
  const [newProg, setNewProg] = useState({ name: "", acronym: "", head_of_program: "", total_ects: 180, level: "Bachelor" });

  const handleCreate = async () => {
    await api.createProgram({ ...newProg, start_date: new Date().toISOString().split('T')[0] });
    setShowCreate(false);
    refresh();
  };

  const filteredPrograms = programs.filter(p => p.level === levelFilter);

  return (
    <div>
      {/* Controls Header */}
      <div style={styles.controlsBar}>
        {/* Level Toggle */}
        <div style={styles.toggleContainer}>
          <button
            style={{ ...styles.toggleBtn, ...(levelFilter === "Bachelor" ? styles.toggleBtnActive : {}) }}
            onClick={() => setLevelFilter("Bachelor")}
          >
            Bachelor
          </button>
          <button
            style={{ ...styles.toggleBtn, ...(levelFilter === "Master" ? styles.toggleBtnActive : {}) }}
            onClick={() => setLevelFilter("Master")}
          >
            Master
          </button>
        </div>

        <button style={{ ...styles.btn, ...styles.primaryBtn }} onClick={() => setShowCreate(!showCreate)}>
          + New Program
        </button>
      </div>

      {showCreate && (
        <div style={{ background: "#f8fafc", padding: "20px", borderRadius: "8px", marginBottom: "20px", border: "1px dashed #cbd5e1" }}>
          <h4 style={{marginTop:0}}>Create New Program</h4>
          <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr 1fr", gap: "10px" }}>
            <input style={styles.input} placeholder="Program Name" value={newProg.name} onChange={e => setNewProg({...newProg, name: e.target.value})} />
            <input style={styles.input} placeholder="Acronym (e.g. CS)" value={newProg.acronym} onChange={e => setNewProg({...newProg, acronym: e.target.value})} />
            <select style={styles.input} value={newProg.level} onChange={e => setNewProg({...newProg, level: e.target.value})}>
                <option>Bachelor</option><option>Master</option>
            </select>
          </div>
          <input style={styles.input} placeholder="Head of Program" value={newProg.head_of_program} onChange={e => setNewProg({...newProg, head_of_program: e.target.value})} />
          <button style={{...styles.btn, ...styles.primaryBtn}} onClick={handleCreate}>Create Program</button>
        </div>
      )}

      <div style={styles.grid}>
        {filteredPrograms.map(p => (
          <div
            key={p.id}
            style={styles.card}
            onClick={() => onSelect(p)}
            onMouseEnter={e => { e.currentTarget.style.transform = styles.cardHover.transform; e.currentTarget.style.boxShadow = styles.cardHover.boxShadow; }}
            onMouseLeave={e => { e.currentTarget.style.transform = "none"; e.currentTarget.style.boxShadow = styles.card.boxShadow; }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "10px" }}>
              <span style={{ ...styles.badge, ...(p.status ? styles.statusActive : styles.statusInactive) }}>
                {p.status ? "Active" : "Inactive"}
              </span>
              <span style={{ color: "#94a3b8", fontSize: "0.85rem", fontWeight: "600" }}>{p.total_ects} ECTS</span>
            </div>
            <h3 style={{ margin: "0 0 5px 0", color: "#1e293b" }}>{p.name}</h3>
            <p style={{ margin: 0, color: "#64748b" }}>{p.acronym} • Head: {p.head_of_program}</p>
          </div>
        ))}
        {filteredPrograms.length === 0 && (
          <div style={{ color: "#94a3b8", fontStyle: "italic", padding: "20px" }}>No {levelFilter} programs found.</div>
        )}
      </div>
    </div>
  );
}

// --- SUB-COMPONENT: The Detail Workspace ---
function ProgramWorkspace({ program, specializations, modules, onBack, refreshSpecs, onDeleteSuccess }) {
  const [activeTab, setActiveTab] = useState("INFO");
  const [newSpec, setNewSpec] = useState("");
  const [showDeleteModal, setShowDeleteModal] = useState(false);

  const handleAddSpec = async () => {
    if (!newSpec) return;
    await api.createSpecialization({
        name: newSpec,
        acronym: newSpec.substring(0,3).toUpperCase(),
        program_id: program.id,
        start_date: new Date().toISOString().split('T')[0]
    });
    setNewSpec("");
    refreshSpecs();
  };

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "20px" }}>
        <button style={{ background: "transparent", border: "none", color: "#64748b", cursor: "pointer", fontSize: "1rem", fontWeight: "600" }} onClick={onBack}>
          ← Back
        </button>
        <button
          onClick={() => setShowDeleteModal(true)}
          style={{ background: "#fee2e2", color: "#ef4444", border: "none", borderRadius: "6px", padding: "6px 12px", cursor: "pointer", fontWeight: "600", fontSize: "0.85rem" }}
        >
          Delete Program
        </button>
      </div>

      <div style={{ marginBottom: "20px" }}>
        <h1 style={{ margin: 0, fontSize: "2rem", color: "#1e293b", fontWeight: "700" }}>{program.name}</h1>
        <div style={{ color: "#64748b", marginTop: "5px" }}>{program.level} • {program.acronym} • {program.head_of_program}</div>
      </div>

      {/* Tabs */}
      <div style={styles.tabContainer}>
        <div style={{ ...styles.tab, ...(activeTab === "INFO" ? styles.activeTab : {}) }} onClick={() => setActiveTab("INFO")}>
          General Info
        </div>
        <div style={{ ...styles.tab, ...(activeTab === "SPECS" ? styles.activeTab : {}) }} onClick={() => setActiveTab("SPECS")}>
          Specializations ({specializations.length})
        </div>
        <div style={{ ...styles.tab, ...(activeTab === "MODULES" ? styles.activeTab : {}) }} onClick={() => setActiveTab("MODULES")}>
          Curriculum ({modules.length} Modules)
        </div>
      </div>

      {/* Tab Content */}
      <div style={{ background: "white", padding: "30px", borderRadius: "12px", border: "1px solid #e2e8f0" }}>

        {activeTab === "INFO" && (
          <div>
            <h3>Program Details</h3>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "20px", maxWidth: "600px" }}>
              <div>
                <label style={{ display: "block", color: "#64748b", fontSize: "0.85rem", marginBottom: "5px" }}>Program Name</label>
                <div style={{ fontSize: "1.1rem", fontWeight: "500" }}>{program.name}</div>
              </div>
              <div>
                <label style={{ display: "block", color: "#64748b", fontSize: "0.85rem", marginBottom: "5px" }}>Acronym</label>
                <div style={{ fontSize: "1.1rem", fontWeight: "500" }}>{program.acronym}</div>
              </div>
              <div>
                <label style={{ display: "block", color: "#64748b", fontSize: "0.85rem", marginBottom: "5px" }}>Head of Program</label>
                <div style={{ fontSize: "1.1rem", fontWeight: "500" }}>{program.head_of_program}</div>
              </div>
              <div>
                <label style={{ display: "block", color: "#64748b", fontSize: "0.85rem", marginBottom: "5px" }}>Total ECTS</label>
                <div style={{ fontSize: "1.1rem", fontWeight: "500" }}>{program.total_ects}</div>
              </div>
              <div>
                <label style={{ display: "block", color: "#64748b", fontSize: "0.85rem", marginBottom: "5px" }}>Status</label>
                <span style={{ ...styles.badge, ...(program.status ? styles.statusActive : styles.statusInactive) }}>
                  {program.status ? "Active" : "Inactive"}
                </span>
              </div>
            </div>
          </div>
        )}

        {activeTab === "SPECS" && (
          <div>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px" }}>
              <h3>Specializations</h3>
              <div style={{ display: "flex", gap: "10px" }}>
                <input
                    placeholder="New Specialization Name"
                    value={newSpec}
                    onChange={e => setNewSpec(e.target.value)}
                    style={{ ...styles.input, marginBottom: 0, width: "250px" }}
                />
                <button style={{ ...styles.btn, ...styles.primaryBtn }} onClick={handleAddSpec}>Add</button>
              </div>
            </div>

            {specializations.length === 0 ? (
                <div style={{ padding: "40px", textAlign: "center", color: "#94a3b8", background: "#f8fafc", borderRadius: "8px" }}>
                    No specializations found. Add one above.
                </div>
            ) : (
                <table style={{ width: "100%", borderCollapse: "collapse" }}>
                    <thead>
                        <tr style={{ borderBottom: "2px solid #e2e8f0", textAlign: "left" }}>
                            <th style={{ padding: "10px" }}>Acronym</th>
                            <th style={{ padding: "10px" }}>Name</th>
                            <th style={{ padding: "10px" }}>Status</th>
                            <th style={{ padding: "10px", textAlign: "right" }}>Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        {specializations.map(s => (
                            <tr key={s.id} style={{ borderBottom: "1px solid #f1f5f9" }}>
                                <td style={{ padding: "12px 10px", fontWeight: "600" }}>{s.acronym}</td>
                                <td style={{ padding: "12px 10px" }}>{s.name}</td>
                                <td style={{ padding: "12px 10px" }}>
                                    <span style={{ ...styles.badge, background: "#dcfce7", color: "#166534" }}>Active</span>
                                </td>
                                <td style={{ padding: "12px 10px", textAlign: "right" }}>
                                    <button style={{ background: "none", border: "none", color: "#ef4444", cursor: "pointer", fontWeight: "600" }}>Remove</button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            )}
          </div>
        )}

        {activeTab === "MODULES" && (
          <div>
            <h3>Curriculum Structure</h3>
            <div style={{ display: "grid", gap: "10px", marginTop: "20px" }}>
                {modules.map(m => (
                    <div key={m.module_code} style={{ padding: "15px", border: "1px solid #e2e8f0", borderRadius: "8px", display: "flex", justifyContent: "space-between" }}>
                        <div>
                            <strong>{m.module_code}</strong> - {m.name}
                        </div>
                        <div style={{ color: "#64748b" }}>
                            Semester {m.semester} • {m.ects} ECTS
                        </div>
                    </div>
                ))}
                {modules.length === 0 && <div style={{ color: "#94a3b8" }}>No modules assigned yet.</div>}
            </div>
          </div>
        )}
      </div>

      {/* Security Modal for Deletion */}
      {showDeleteModal && (
        <DeleteConfirmationModal
            onClose={() => setShowDeleteModal(false)}
            onConfirm={() => {
                api.deleteProgram(program.id).then(() => {
                    setShowDeleteModal(false);
                    onDeleteSuccess();
                });
            }}
        />
      )}
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