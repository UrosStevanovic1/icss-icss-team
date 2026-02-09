import { useEffect, useState } from "react";
import api from "../api";

const styles = {
  container: { padding: "20px", fontFamily: "'Inter', 'Segoe UI', sans-serif", maxWidth: "1200px", margin: "0 auto", color: "#334155" },
  header: { display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "30px", borderBottom: "1px solid #e2e8f0", paddingBottom: "20px" },
  title: { margin: 0, fontSize: "1.75rem", fontWeight: "700", color: "#0f172a" },
  subtitle: { margin: "5px 0 0 0", color: "#64748b", fontSize: "0.95rem" },

  // Buttons
  btn: { padding: "10px 18px", borderRadius: "8px", border: "none", cursor: "pointer", fontSize: "0.9rem", fontWeight: "600", transition: "all 0.2s", display: "inline-flex", alignItems: "center", gap: "6px" },
  primaryBtn: { background: "#2563eb", color: "white", boxShadow: "0 2px 4px rgba(37,99,235,0.2)" },
  secondaryBtn: { background: "#f1f5f9", color: "#475569", border: "1px solid #cbd5e1" },
  deleteBtn: { background: "#fee2e2", color: "#ef4444", padding: "6px 12px", fontSize: "0.85rem" },
  editBtn: { background: "#f8fafc", color: "#475569", border: "1px solid #e2e8f0", padding: "6px 12px", fontSize: "0.85rem", marginRight: "6px" },

  // Table
  tableContainer: { border: "1px solid #e2e8f0", borderRadius: "10px", overflow: "hidden", boxShadow: "0 1px 2px rgba(0,0,0,0.05)" },
  table: { width: "100%", borderCollapse: "collapse", background: "white", fontSize: "0.95rem" },
  th: { background: "#f8fafc", padding: "14px 16px", textAlign: "left", fontSize: "0.8rem", fontWeight: "700", color: "#475569", textTransform: "uppercase", letterSpacing: "0.05em", borderBottom: "1px solid #e2e8f0" },
  td: { padding: "14px 16px", borderBottom: "1px solid #f1f5f9", color: "#334155" },

  // Modal
  modalOverlay: { position: "fixed", top: 0, left: 0, right: 0, bottom: 0, background: "rgba(15, 23, 42, 0.6)", backdropFilter: "blur(2px)", display: "flex", justifyContent: "center", alignItems: "center", zIndex: 1000 },
  modalContent: { background: "white", padding: "32px", borderRadius: "16px", width: "700px", maxWidth: "95%", maxHeight: "90vh", overflowY: "auto", boxShadow: "0 20px 25px -5px rgba(0,0,0,0.1), 0 8px 10px -6px rgba(0,0,0,0.1)" },

  // Form Elements
  sectionTitle: { fontSize: "1rem", fontWeight: "700", color: "#0f172a", marginTop: "20px", marginBottom: "12px", display: "flex", alignItems: "center", gap: "8px" },
  formRow: { display: "flex", gap: "20px", marginBottom: "16px" },
  formGroup: { marginBottom: "16px", flex: 1 },
  label: { display: "block", marginBottom: "8px", fontWeight: "600", fontSize: "0.9rem", color: "#334155" },
  input: { width: "100%", padding: "10px 12px", borderRadius: "8px", border: "1px solid #cbd5e1", fontSize: "0.95rem", transition: "border-color 0.2s", boxSizing: "border-box", outline: "none" },
  select: { width: "100%", padding: "10px 12px", borderRadius: "8px", border: "1px solid #cbd5e1", fontSize: "0.95rem", background: "white", cursor: "pointer", outline: "none" },

  // Builder Area
  builderBox: { background: "#f8fafc", border: "1px solid #e2e8f0", padding: "20px", borderRadius: "10px", marginBottom: "20px" },
  generatedBox: { background: "#eff6ff", border: "1px solid #dbeafe", padding: "16px", borderRadius: "8px", marginTop: "4px" },
  generatedText: { width: "100%", padding: "10px", borderRadius: "6px", border: "1px solid #bfdbfe", fontSize: "0.95rem", fontFamily: "inherit", background: "white", minHeight: "80px", resize: "vertical", color: "#1e3a8a" },

  badge: { display: "inline-block", padding: "2px 8px", borderRadius: "12px", fontSize: "0.75rem", fontWeight: "600", textTransform: "uppercase" }
};

const formatDate = (isoDate) => isoDate ? isoDate.split("T")[0] : "";

// --- CONFIGURATION: Which categories allow which inputs? ---
const SCOPE_CATEGORIES = {
    Global: [
        { value: "University Policy", label: "University Policy (Opening Hours)" },
        { value: "Academic Calendar", label: "Academic Calendar (Semester Dates)" },
        { value: "Time Definition", label: "Time Definition (Lecture Slots)" },
        { value: "General", label: "General / Custom" }
    ],
    Lecturer: [
        { value: "Time Preference", label: "Time Preference (Unavailable Days)" },
        { value: "Legal Requirement", label: "Legal Requirement (Workload Limit)" },
        { value: "General", label: "General / Custom" }
    ],
    Module: [
        { value: "Room Requirement", label: "Room Requirement" },
        { value: "Time Preference", label: "Time Preference" },
        { value: "General", label: "General / Custom" }
    ],
    Group: [
        { value: "Gap Limit", label: "Gap Limit" },
        { value: "Time Preference", label: "Time Preference" },
        { value: "General", label: "General / Custom" }
    ],
    Room: [
         { value: "Time Preference", label: "Availability (Maintenance)" },
         { value: "General", label: "General / Custom" }
    ],
    Program: [
        { value: "General", label: "General / Custom" }
    ]
};

export default function ConstraintOverview() {
  const [constraints, setConstraints] = useState([]);
  const [targets, setTargets] = useState({
    LECTURER: [], GROUP: [], MODULE: [], ROOM: [], PROGRAM: [],
    GLOBAL: [{ id: 0, name: "Global (All)" }],
  });

  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);

  // DRAFT STATE
  const [draft, setDraft] = useState({
    name: "",
    category: "General",
    scope: "Global",
    target_id: "0",
    valid_from: "",
    valid_to: "",
    rule_text: "",
    is_enabled: true
  });

  // BUILDER STATE
  const [builder, setBuilder] = useState({
    day: "Friday",
    roomType: "Computer Lab",
    limit: "4 hours",
    gap: "at least 1 hour",
    startTime: "08:00",
    endTime: "20:00",
    semesterName: "Winter 2026",
    slotDuration: "90",
    breakDuration: "15",
    workloadLimit: "18"
  });

  useEffect(() => { loadData(); }, []);

  // --- AUTO-GENERATOR ---
  useEffect(() => {
    if (!modalOpen) return;

    const targetList = targets[draft.scope.toUpperCase()] || [];
    const targetObj = targetList.find(t => String(t.id) === String(draft.target_id));
    const targetName = targetObj ? targetObj.name : "All Entities";

    let entity = `${draft.scope} "${targetName}"`;
    if (draft.target_id === "0" || draft.target_id === 0) {
        if (draft.scope === "Global") entity = "The University";
        else entity = `All ${draft.scope}s`;
    }

    let generatedText = "";

    switch (draft.category) {
      case "Time Preference":
        generatedText = `${entity} is not available on ${builder.day}s.`;
        break;
      case "Room Requirement":
        generatedText = `${entity} requires a room of type ${builder.roomType}.`;
        break;
      case "Gap Limit":
        generatedText = `${entity} must have a gap of ${builder.gap} between classes.`;
        break;
      case "University Policy":
        generatedText = `The University is open from ${builder.startTime} to ${builder.endTime}.`;
        break;
      case "Academic Calendar":
        generatedText = `${builder.semesterName} starts on ${draft.valid_from || '[Date]'} and ends on ${draft.valid_to || '[Date]'}.`;
        break;
      case "Time Definition":
        generatedText = `Standard lecture slots are ${builder.slotDuration} minutes long with a ${builder.breakDuration} minute break.`;
        break;
      case "Legal Requirement":
        generatedText = `Lecturers must not exceed ${builder.workloadLimit} teaching units per week.`;
        break;
      default:
        // Don't overwrite if manual
        return;
    }

    setDraft(prev => ({ ...prev, rule_text: generatedText }));

  }, [draft.category, draft.scope, draft.target_id, draft.valid_from, draft.valid_to, builder, modalOpen, targets]);

  async function loadData() {
    try {
      const [cRes, lRes, gRes, mRes, rRes, pRes] = await Promise.all([
        api.getConstraints(),
        api.getLecturers(),
        api.getGroups(),
        api.getModules(),
        api.getRooms(),
        api.getPrograms()
      ]);

      setConstraints(cRes || []);
      setTargets({
        LECTURER: (lRes || []).map(x => ({ id: x.id, name: `${x.first_name} ${x.last_name}` })),
        GROUP: (gRes || []).map(x => ({ id: x.id, name: x.name })),
        MODULE: (mRes || []).map(x => ({ id: x.module_code, name: x.name })),
        ROOM: (rRes || []).map(x => ({ id: x.id, name: x.name })),
        PROGRAM: (pRes || []).map(x => ({ id: x.id, name: x.name })),
        GLOBAL: [{ id: 0, name: "Global (All)" }]
      });
    } catch (e) { console.error("Load Error", e); }
  }

  function openAdd() {
    setEditingId(null);
    setDraft({
      name: "", category: "University Policy", scope: "Global", target_id: "0",
      valid_from: "", valid_to: "", rule_text: "", is_enabled: true
    });
    setBuilder({
        day: "Friday", roomType: "Computer Lab", limit: "4 hours", gap: "at least 1 hour",
        startTime: "08:00", endTime: "20:00", semesterName: "Winter 2026", slotDuration: "90", breakDuration: "15", workloadLimit: "18"
    });
    setModalOpen(true);
  }

  function openEdit(c) {
    setEditingId(c.id);
    setDraft({
      ...c,
      target_id: String(c.target_id || "0"),
      valid_from: formatDate(c.valid_from),
      valid_to: formatDate(c.valid_to)
    });
    setModalOpen(true);
  }

  async function save() {
    try {
      const payload = {
        ...draft,
        target_id: Number(draft.target_id),
        valid_from: draft.valid_from || null,
        valid_to: draft.valid_to || null,
      };

      if (editingId) await api.updateConstraint(editingId, payload);
      else await api.createConstraint(payload);

      setModalOpen(false);
      loadData();
    } catch (e) { alert("Error saving constraint."); }
  }

  // --- Change Scope -> Reset Category ---
  const handleScopeChange = (newScope) => {
      const allowedCategories = SCOPE_CATEGORIES[newScope] || SCOPE_CATEGORIES["Global"];
      // Default to the first allowed category for this scope
      const defaultCategory = allowedCategories[0].value;

      setDraft({
          ...draft,
          scope: newScope,
          target_id: "0",
          category: defaultCategory
      });
  };

  // --- Change Category -> Smart Target Reset (Optional) ---
  const handleCategoryChange = (newCategory) => {
    // If selecting "Legal Requirement" (Workload), it usually applies to ALL lecturers
    let newTarget = draft.target_id;
    if (newCategory === "Legal Requirement" && draft.scope === "Lecturer") {
        newTarget = "0";
    }
    setDraft({ ...draft, category: newCategory, target_id: newTarget });
  };

  const renderBuilderInputs = () => {
    if (draft.category === "University Policy") {
        return (
            <div style={{display:'flex', gap:'12px', alignItems:'center'}}>
                <span>Open from</span>
                <input type="time" style={{...styles.input, width:'auto'}} value={builder.startTime} onChange={e => setBuilder({...builder, startTime: e.target.value})} />
                <span>to</span>
                <input type="time" style={{...styles.input, width:'auto'}} value={builder.endTime} onChange={e => setBuilder({...builder, endTime: e.target.value})} />
            </div>
        );
    }
    if (draft.category === "Academic Calendar") {
        return (
            <div style={{display:'flex', gap:'12px', alignItems:'center'}}>
                <input style={{...styles.input, flex:1}} placeholder="e.g. Winter Semester 2026" value={builder.semesterName} onChange={e => setBuilder({...builder, semesterName: e.target.value})} />
                <span style={{fontSize:'0.85rem', color:'#64748b', fontStyle:'italic'}}>(Requires valid dates below)</span>
            </div>
        );
    }
    if (draft.category === "Time Definition") {
        return (
            <div style={{display:'flex', gap:'15px', alignItems:'center', flexWrap:'wrap'}}>
                <div style={{display:'flex', alignItems:'center', gap:'8px'}}>
                    <span>Slot Duration:</span>
                    <select style={{...styles.select, width:'auto'}} value={builder.slotDuration} onChange={e => setBuilder({...builder, slotDuration: e.target.value})}>
                        <option value="45">45 mins</option>
                        <option value="60">60 mins</option>
                        <option value="90">90 mins</option>
                    </select>
                </div>
                <div style={{display:'flex', alignItems:'center', gap:'8px'}}>
                    <span>Break:</span>
                    <select style={{...styles.select, width:'auto'}} value={builder.breakDuration} onChange={e => setBuilder({...builder, breakDuration: e.target.value})}>
                        <option value="0">None</option>
                        <option value="15">15 mins</option>
                        <option value="30">30 mins</option>
                    </select>
                </div>
            </div>
        );
    }
    if (draft.category === "Legal Requirement") {
        return (
            <div style={{display:'flex', gap:'12px', alignItems:'center'}}>
                <span>Max Weekly Workload:</span>
                <input type="number" style={{...styles.input, width:'100px'}} value={builder.workloadLimit} onChange={e => setBuilder({...builder, workloadLimit: e.target.value})} />
                <span>Teaching Units (UE)</span>
            </div>
        );
    }
    if (draft.category === "Time Preference") {
        return (
            <div style={{display:'flex', gap:'12px', alignItems:'center'}}>
                <select style={{...styles.select, width:'auto'}} value={builder.day} onChange={e => setBuilder({...builder, day: e.target.value})}>
                    {["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"].map(d => <option key={d} value={d}>{d}</option>)}
                </select>
                <span>is strictly blocked / unavailable.</span>
            </div>
        );
    }
    if (draft.category === "Room Requirement") {
        return (
            <div style={{display:'flex', gap:'12px', alignItems:'center'}}>
                <span>Requires a room of type:</span>
                <select style={{...styles.select, width:'auto'}} value={builder.roomType} onChange={e => setBuilder({...builder, roomType: e.target.value})}>
                    {["Lecture Classroom", "Computer Lab", "Seminar Room", "Physics Lab"].map(r => <option key={r} value={r}>{r}</option>)}
                </select>
            </div>
        );
    }

    return <div style={{color:'#64748b', fontStyle:'italic'}}>Use the text box below to describe a custom rule.</div>;
  };

  // Helper to get allowed categories for current scope
  const currentCategories = SCOPE_CATEGORIES[draft.scope] || SCOPE_CATEGORIES["Global"];

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <div>
          <h2 style={styles.title}>Scheduler Constraints</h2>
          <p style={styles.subtitle}>Define rules, policies, and preferences for the scheduling AI.</p>
        </div>
        <button style={{...styles.btn, ...styles.primaryBtn}} onClick={openAdd}>+ New Rule</button>
      </div>

      <div style={styles.tableContainer}>
        <table style={styles.table}>
            <thead style={{background:'#f8fafc'}}>
            <tr>
                <th style={styles.th}>Rule Name</th>
                <th style={styles.th}>Scope & Target</th>
                <th style={styles.th}>Description</th>
                <th style={styles.th}>Status</th>
                <th style={styles.th}>Action</th>
            </tr>
            </thead>
            <tbody>
            {constraints.length === 0 && (
                <tr><td colSpan="5" style={{...styles.td, textAlign:'center', color:'#94a3b8', padding:'30px'}}>No rules defined yet.</td></tr>
            )}
            {constraints.map(c => {
                const targetName = (targets[c.scope?.toUpperCase()] || []).find(t => String(t.id) === String(c.target_id))?.name || "All";
                const isGlobal = c.target_id === 0;

                return (
                <tr key={c.id}>
                    <td style={styles.td}>
                        <div style={{fontWeight:'600', color:'#0f172a'}}>{c.name}</div>
                        <div style={{fontSize:'0.8rem', color:'#64748b'}}>{c.category}</div>
                    </td>
                    <td style={styles.td}>
                        <span style={{...styles.badge, background:'#e2e8f0', color:'#475569'}}>{c.scope}</span>
                        {!isGlobal && <div style={{marginTop:'4px', fontSize:'0.9rem', fontWeight:'500'}}>{targetName}</div>}
                    </td>
                    <td style={styles.td}>
                        <div style={{fontSize:'0.9rem', color:'#334155', lineHeight:'1.4'}}>
                            "{c.rule_text}"
                        </div>
                        {c.valid_from && (
                            <div style={{fontSize:'0.8rem', color:'#64748b', marginTop:'4px'}}>
                                📅 {formatDate(c.valid_from)} → {formatDate(c.valid_to)}
                            </div>
                        )}
                    </td>
                    <td style={styles.td}>
                        <span style={{
                            ...styles.badge,
                            background: c.is_enabled ? '#dcfce7' : '#f1f5f9',
                            color: c.is_enabled ? '#166534' : '#94a3b8'
                        }}>
                            {c.is_enabled ? "Active" : "Disabled"}
                        </span>
                    </td>
                    <td style={styles.td}>
                        <div style={{display:'flex'}}>
                            <button style={{...styles.btn, ...styles.editBtn}} onClick={() => openEdit(c)}>Edit</button>
                            <button style={{...styles.btn, ...styles.deleteBtn}} onClick={() => api.deleteConstraint(c.id).then(loadData)}>Delete</button>
                        </div>
                    </td>
                </tr>
                );
            })}
            </tbody>
        </table>
      </div>

      {modalOpen && (
        <div style={styles.modalOverlay}>
          <div style={styles.modalContent}>
             <div style={{display:'flex', justifyContent:'space-between', marginBottom:'20px'}}>
                <h3 style={{margin:0, fontSize:'1.25rem', color:'#0f172a'}}>{editingId ? "Edit Rule" : "Create New Rule"}</h3>
                <button onClick={() => setModalOpen(false)} style={{border:'none', background:'transparent', fontSize:'1.5rem', cursor:'pointer', color:'#94a3b8'}}>×</button>
             </div>

             {/* 1. NAME & DATES */}
             <div style={styles.formGroup}>
                <label style={styles.label}>Rule Internal Name</label>
                <input
                  style={styles.input}
                  placeholder="e.g. Winter Semester Dates"
                  value={draft.name}
                  onChange={e => setDraft({...draft, name: e.target.value})}
                />
             </div>

             <div style={styles.formRow}>
               <div style={{flex:1}}>
                 <label style={styles.label}>Valid From (Optional)</label>
                 <input type="date" style={styles.input} value={draft.valid_from} onChange={e => setDraft({...draft, valid_from: e.target.value})} />
               </div>
               <div style={{flex:1}}>
                 <label style={styles.label}>Valid To (Optional)</label>
                 <input type="date" style={styles.input} value={draft.valid_to} onChange={e => setDraft({...draft, valid_to: e.target.value})} />
               </div>
             </div>

             <div style={{borderTop:'1px solid #e2e8f0', margin:'20px 0'}}></div>

             {/* 2. CONTEXT SELECTION */}
             <div style={styles.sectionTitle}>
                 <span style={{background:'#3b82f6', color:'white', width:'24px', height:'24px', borderRadius:'50%', display:'flex', alignItems:'center', justifyContent:'center', fontSize:'0.8rem'}}>1</span>
                 Context & Scope
             </div>

             <div style={styles.formRow}>
               <div style={{flex:1}}>
                  <label style={styles.label}>Scope (Who does this apply to?)</label>
                  <select style={styles.select} value={draft.scope} onChange={e => handleScopeChange(e.target.value)}>
                    {Object.keys(SCOPE_CATEGORIES).map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
               </div>
               <div style={{flex:1}}>
                  <label style={styles.label}>Specific Target</label>
                  <select style={styles.select} value={draft.target_id} onChange={e => setDraft({...draft, target_id: e.target.value})}>
                    <option value="0">-- All / Global --</option>
                    {(targets[draft.scope.toUpperCase()] || []).map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                  </select>
               </div>
             </div>

             {/* 3. RULE BUILDER */}
             <div style={styles.sectionTitle}>
                 <span style={{background:'#3b82f6', color:'white', width:'24px', height:'24px', borderRadius:'50%', display:'flex', alignItems:'center', justifyContent:'center', fontSize:'0.8rem'}}>2</span>
                 Rule Definition
             </div>

             <div style={styles.builderBox}>
                <div style={{marginBottom:'15px'}}>
                    <label style={{fontSize:'0.85rem', color:'#64748b', marginBottom:'6px', display:'block', textTransform:'uppercase', letterSpacing:'0.05em', fontWeight:'700'}}>Rule Category</label>
                    <select style={styles.select} value={draft.category} onChange={e => handleCategoryChange(e.target.value)}>
                        {currentCategories.map(opt => (
                            <option key={opt.value} value={opt.value}>{opt.label}</option>
                        ))}
                    </select>
                </div>

                <div style={{background:'white', padding:'15px', borderRadius:'8px', border:'1px solid #e2e8f0'}}>
                    {renderBuilderInputs()}
                </div>
             </div>

             {/* 4. RESULT */}
             <div style={styles.generatedBox}>
                <label style={{...styles.label, color:'#1e40af', fontSize:'0.85rem'}}>Generated Rule Description</label>
                <textarea
                  style={styles.generatedText}
                  value={draft.rule_text}
                  onChange={e => setDraft({...draft, rule_text: e.target.value})}
                />
                <div style={{fontSize:'0.8rem', color:'#64748b', marginTop:'6px', display:'flex', justifyContent:'space-between'}}>
                    <span>* The scheduler will use this exact text.</span>
                    <label style={{cursor:'pointer', fontWeight:'600', color:'#0f172a', display:'flex', alignItems:'center', gap:'6px'}}>
                        <input type="checkbox" checked={draft.is_enabled} onChange={e => setDraft({...draft, is_enabled: e.target.checked})} />
                        Active Rule
                    </label>
                </div>
             </div>

             <div style={{display:'flex', justifyContent:'flex-end', gap:'12px', marginTop:'24px'}}>
               <button style={{...styles.btn, ...styles.secondaryBtn}} onClick={() => setModalOpen(false)}>Cancel</button>
               <button style={{...styles.btn, ...styles.primaryBtn}} onClick={save}>Save Rule</button>
             </div>
          </div>
        </div>
      )}
    </div>
  );
}