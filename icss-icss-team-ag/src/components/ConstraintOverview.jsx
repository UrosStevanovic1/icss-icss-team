import { useEffect, useState, useMemo } from "react";
import api from "../api";

const styles = {
  container: { padding: "20px", fontFamily: "'Inter', 'Segoe UI', sans-serif", maxWidth: "1200px", margin: "0 auto", color: "#334155" },
  header: { display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "30px", borderBottom: "1px solid #e2e8f0", paddingBottom: "20px" },
  title: { margin: 0, fontSize: "1.75rem", fontWeight: "700", color: "#0f172a" },
  subtitle: { margin: "5px 0 0 0", color: "#64748b", fontSize: "0.95rem" },

  controlsBar: { display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px" },
  filterContainer: { display: "flex", gap: "10px", alignItems: "center" },

  btn: { padding: "10px 18px", borderRadius: "8px", border: "none", cursor: "pointer", fontSize: "0.9rem", fontWeight: "600", transition: "all 0.2s", display: "inline-flex", alignItems: "center", gap: "6px" },
  primaryBtn: { background: "#2563eb", color: "white", boxShadow: "0 2px 4px rgba(37,99,235,0.2)" },
  secondaryBtn: { background: "#f1f5f9", color: "#475569", border: "1px solid #cbd5e1" },
  
  actionContainer: { display: "flex", gap: "8px", justifyContent: "flex-end" },
  actionBtn: { padding: "4px 8px", borderRadius: "6px", border: "none", cursor: "pointer", fontSize: "0.8rem", fontWeight: "600" },
  editBtn: { background: "#e2e8f0", color: "#475569" },
  delBtn: { background: "#fee2e2", color: "#ef4444" },

  groupSection: { marginBottom: "30px" },
  groupHeader: { fontSize: "1.1rem", fontWeight: "700", color: "#1e293b", marginBottom: "10px", borderLeft: "4px solid #3b82f6", paddingLeft: "10px", display: "flex", alignItems: "center", gap: "10px" },
  groupCount: { fontSize: "0.8rem", color: "#64748b", fontWeight: "500", background: "#f1f5f9", padding: "2px 8px", borderRadius: "10px" },

  tableContainer: { border: "1px solid #e2e8f0", borderRadius: "10px", overflow: "hidden", boxShadow: "0 1px 2px rgba(0,0,0,0.05)" },
  
  table: { width: "100%", borderCollapse: "collapse", background: "white", fontSize: "0.95rem", tableLayout: "fixed" },
  th: { background: "#f8fafc", padding: "14px 16px", textAlign: "left", fontSize: "0.8rem", fontWeight: "700", color: "#475569", textTransform: "uppercase", letterSpacing: "0.05em", borderBottom: "1px solid #e2e8f0" },
  td: { padding: "14px 16px", borderBottom: "1px solid #f1f5f9", color: "#334155", verticalAlign: "top", wordWrap: "break-word" },

  overlay: { position: "fixed", top: 0, left: 0, right: 0, bottom: 0, background: "rgba(0,0,0,0.5)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000 },
  modal: { backgroundColor: "#ffffff", padding: "30px", borderRadius: "12px", width: "700px", maxWidth: "90%", maxHeight: "90vh", overflowY: "auto", boxShadow: "0 20px 25px -5px rgba(0,0,0,0.1)" },

  sectionLabel: { fontSize: "0.85rem", fontWeight: "700", color: "#64748b", marginBottom: "12px", textTransform: "uppercase", letterSpacing: "0.05em" },
  formRow: { display: "flex", gap: "20px", marginBottom: "16px" },
  formGroup: { marginBottom: "16px", flex: 1 },
  label: { display: "block", marginBottom: "8px", fontWeight: "600", fontSize: "0.9rem", color: "#334155" },
  input: { width: "100%", padding: "10px 12px", borderRadius: "8px", border: "1px solid #cbd5e1", fontSize: "0.95rem", transition: "border-color 0.2s", boxSizing: "border-box", outline: "none" },
  select: { width: "100%", padding: "10px 12px", borderRadius: "8px", border: "1px solid #cbd5e1", fontSize: "0.95rem", background: "white", cursor: "pointer", outline: "none" },

  builderBox: { background: "#f8fafc", border: "1px solid #e2e8f0", padding: "20px", borderRadius: "10px", marginBottom: "20px" },
  generatedBox: { background: "#eff6ff", border: "1px solid #dbeafe", padding: "16px", borderRadius: "8px", marginTop: "4px" },
  generatedText: { width: "100%", padding: "10px", borderRadius: "6px", border: "1px solid #bfdbfe", fontSize: "0.95rem", fontFamily: "inherit", background: "white", minHeight: "80px", resize: "vertical", color: "#1e3a8a" },

  badge: { display: "inline-block", padding: "2px 8px", borderRadius: "12px", fontSize: "0.75rem", fontWeight: "600", textTransform: "uppercase" },

  checkboxGrid: { display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(100px, 1fr))", gap: "10px", marginTop: "8px" },
  checkboxLabel: { display: "flex", alignItems: "center", gap: "6px", fontSize: "0.9rem", cursor: "pointer" }
};

const formatDate = (isoDate) => isoDate ? isoDate.split("T")[0] : "";
const formatGermanDate = (isoDate) => {
    if (!isoDate) return "-";
    const d = new Date(isoDate);
    if (isNaN(d.getTime())) return "-";
    return d.toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric' });
};

const SCOPE_CATEGORIES = {
    University: [
        { value: "University Open Days", label: "University Open Days" },
        { value: "University Policy", label: "University Policy (Opening Hours)" },
        { value: "Holiday", label: "Holiday / Break" },
        { value: "Time Definition", label: "Time Definition (Lecture Slots)" },
        { value: "Custom", label: "Custom" }
    ],
    Lecturer: [
        { value: "Custom", label: "Custom" }
    ],
    Module: [
        { value: "Delivery Mode", label: "Delivery Mode" },
        { value: "Duration", label: "Duration" },
        { value: "Custom", label: "Custom" }
    ],
    Group: [
        { value: "Custom", label: "Custom" }
    ],
    Room: [
         { value: "Unavailable Days", label: "Availability" },
         { value: "Custom", label: "Custom" }
    ],
    Program: [
        { value: "Delivery Mode", label: "Delivery Mode" },
        { value: "Custom", label: "Custom" }
    ]
};

const DAYS_OF_WEEK = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];

export default function ConstraintOverview() {
  const [constraints, setConstraints] = useState([]);
  const [targets, setTargets] = useState({
    LECTURER: [], GROUP: [], MODULE: [], ROOM: [], PROGRAM: [],
    UNIVERSITY: [{ id: "0", name: "Entire University" }],
  });

  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);

  const [scopeFilter, setScopeFilter] = useState("ALL");
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [itemToDelete, setItemToDelete] = useState(null);

  const [draft, setDraft] = useState({
    name: "", category: "Custom", scope: "University", target_id: "0",
    valid_from: "", valid_to: "", rule_text: "", is_enabled: true
  });

  const [builder, setBuilder] = useState({
    day: "Friday", limit: "4 hours", gap: "at least 1 hour", startTime: "08:00", endTime: "20:00",
    slotDuration: "90", breakDuration: "15", workloadLimit: "18", semesterSeason: "Winter",
    semesterYear: new Date().getFullYear(), deliveryMode: "Onsite", holidayName: "Public Holiday",
    customDuration: "180", selectedDays: ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"]
  });

  useEffect(() => { loadData(); }, []);

  useEffect(() => {
    if (!modalOpen) return;

    const targetList = targets[draft.scope.toUpperCase()] || [];
    const targetObj = targetList.find(t => String(t.id) === String(draft.target_id));

    let entity = `${draft.scope} "${targetObj ? targetObj.name : 'Unknown'}"`;
    if (draft.scope === "University") {
        if (String(draft.target_id) === "0") {
            entity = "The University";
        } else {
            const cleanName = targetObj?.name.replace("Campus: ", "") || "Campus";
            entity = `The ${cleanName} Campus`;
        }
    } else if (String(draft.target_id) === "0") {
        entity = `All ${draft.scope}s`;
    }

    let generatedText = "";

    switch (draft.category) {
      case "University Open Days":
        const daysText = builder.selectedDays.length > 0 ? builder.selectedDays.join(", ") : "No Days";
        generatedText = `${entity} is open on: ${daysText}.`;
        break;
      case "University Policy":
        generatedText = `${entity} is open from ${builder.startTime} to ${builder.endTime}.`;
        break;
      case "Holiday":
        generatedText = `Holiday '${builder.holidayName}' is from ${draft.valid_from || '[Date]'} to ${draft.valid_to || '[Date]'}.`;
        break;
      case "Time Definition":
        generatedText = `Standard lecture slots are ${builder.slotDuration} minutes long with a ${builder.breakDuration} minute break.`;
        break;
      case "Delivery Mode":
        generatedText = `${entity} must be conducted ${builder.deliveryMode}.`;
        break;
      case "Duration":
        generatedText = `${entity} has a specific duration of ${builder.customDuration} minutes.`;
        break;
      case "Unavailable Days":
        generatedText = `${entity} is unavailable on ${builder.day}s.`;
        break;
      default:
        // Do not generate anything for "Custom" so it stays empty for the user to type
        break;
    }

    if (generatedText && generatedText !== draft.rule_text) {
        setDraft(prev => ({ ...prev, rule_text: generatedText }));
    }

  }, [draft.category, draft.scope, draft.target_id, draft.valid_from, draft.valid_to, builder, modalOpen, targets, draft.rule_text]);

  async function loadData() {
    try {
      const [cRes, lRes, gRes, mRes, rRes, pRes] = await Promise.all([
        api.getConstraints(), api.getLecturers(), api.getGroups(),
        api.getModules(), api.getRooms(), api.getPrograms()
      ]);

      setConstraints(cRes || []);

      const staticLocations = ["Berlin", "Düsseldorf", "Munich"];
      const campusTargets = staticLocations.map((loc, idx) => ({
          id: String(10000 + idx), name: `Campus: ${loc}`
      }));

      const progs = pRes || [];
      const programTargets = progs.map(p => ({
          id: String(p.id), name: `[${p.degree_type || p.level || '-'}] ${p.name}`, rawName: p.name
      })).sort((a, b) => a.rawName.localeCompare(b.rawName)).map(t => ({ id: t.id, name: t.name }));

      const moduleTargets = (mRes || []).map(m => {
          const prog = progs.find(p => p.id === m.program_id);
          const progName = prog ? prog.name : "Unassigned";
          return { id: String(m.module_code), name: `[${progName}] ${m.module_code} - ${m.name}`, progName, code: m.module_code };
      }).sort((a, b) => {
          if (a.progName === b.progName) return a.code.localeCompare(b.code, undefined, {numeric: true});
          return a.progName.localeCompare(b.progName);
      }).map(t => ({ id: t.id, name: t.name }));

      const roomTargets = (rRes || []).map(r => ({
          id: String(r.id), name: r.location ? `${r.location} - ${r.name}` : r.name, location: r.location || "Unknown", rawName: r.name
      })).sort((a, b) => {
          if (a.location === b.location) return a.rawName.localeCompare(b.rawName, undefined, {numeric: true});
          return a.location.localeCompare(b.location);
      }).map(t => ({ id: t.id, name: t.name }));

      setTargets({
        LECTURER: (lRes || []).map(x => ({ id: String(x.id), name: `${x.first_name} ${x.last_name}` })).sort((a,b) => a.name.localeCompare(b.name)),
        GROUP: (gRes || []).map(x => ({ id: String(x.id), name: x.name })).sort((a,b) => a.name.localeCompare(b.name)),
        MODULE: moduleTargets,
        ROOM: roomTargets,
        PROGRAM: programTargets,
        UNIVERSITY: [{ id: "0", name: "Entire University" }, ...campusTargets]
      });

    } catch (e) { console.error("Load Error", e); }
  }

  function openAdd() {
    setEditingId(null);
    setDraft({
      name: "", category: "Custom", scope: "University", target_id: "0",
      valid_from: "", valid_to: "", rule_text: "", is_enabled: true
    });
    setBuilder(prev => ({
        ...prev, day: "Friday", startTime: "08:00", endTime: "20:00", slotDuration: "90", breakDuration: "15",
        deliveryMode: "Onsite", holidayName: "Public Holiday", customDuration: "180",
        selectedDays: ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"]
    }));
    setModalOpen(true);
  }

  function openEdit(c) {
    setEditingId(c.id);
    setDraft({
      name: c.name, category: c.category, scope: c.scope, target_id: String(c.target_id || "0"),
      rule_text: c.rule_text, is_enabled: c.is_enabled,
      valid_from: formatDate(c.valid_from), valid_to: formatDate(c.valid_to)
    });
    setModalOpen(true);
  }

  const confirmDelete = (item) => {
      setItemToDelete(item);
      setDeleteModalOpen(true);
  };

  const handleDelete = async () => {
      if (!itemToDelete) return;
      try {
          await api.deleteConstraint(itemToDelete.id);
          setDeleteModalOpen(false);
          setItemToDelete(null);
          loadData();
      } catch (e) { alert("Error deleting constraint."); }
  };

  async function save() {
    try {
      const payload = {
        name: draft.name, category: draft.category, scope: draft.scope, target_id: String(draft.target_id),
        rule_text: draft.rule_text, valid_from: draft.valid_from || null, valid_to: draft.valid_to || null, is_enabled: draft.is_enabled
      };

      if (editingId) await api.updateConstraint(editingId, payload);
      else await api.createConstraint(payload);

      setModalOpen(false);
      loadData();
    } catch (e) { alert("Error saving constraint."); }
  }

  const handleScopeChange = (newScope) => {
      const allowedCategories = SCOPE_CATEGORIES[newScope] || SCOPE_CATEGORIES["University"];
      const defaultCategory = allowedCategories[0].value;
      
      //  If switching to custom, clear the text box
      setDraft({ 
        ...draft, 
        scope: newScope, 
        target_id: "0", 
        category: defaultCategory,
        rule_text: defaultCategory === "Custom" ? "" : draft.rule_text 
      });
  };

  const handleCategoryChange = (newCategory) => {
      // If switching to custom, clear the text box so they can type freely
      setDraft({ 
        ...draft, 
        category: newCategory, 
        rule_text: newCategory === "Custom" ? "" : draft.rule_text 
      });
  };

  const toggleDay = (day) => {
      setBuilder(prev => {
          const days = prev.selectedDays.includes(day)
            ? prev.selectedDays.filter(d => d !== day) : [...prev.selectedDays, day];
          const sorter = { "Monday": 1, "Tuesday": 2, "Wednesday": 3, "Thursday": 4, "Friday": 5, "Saturday": 6, "Sunday": 7 };
          days.sort((a,b) => sorter[a] - sorter[b]);
          return { ...prev, selectedDays: days };
      });
  };

  const renderBuilderInputs = () => {
    if (draft.category === "University Open Days") {
        return (
            <div>
                <label style={{...styles.label, marginBottom:'10px'}}>Select Open Days:</label>
                <div style={styles.checkboxGrid}>
                    {DAYS_OF_WEEK.map(day => (
                        <label key={day} style={styles.checkboxLabel}>
                            <input type="checkbox" checked={builder.selectedDays.includes(day)} onChange={() => toggleDay(day)} /> {day}
                        </label>
                    ))}
                </div>
            </div>
        );
    }
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
    if (draft.category === "Holiday") {
        return (
            <div>
                <div style={{marginBottom:'10px'}}>
                    <label style={styles.label}>Holiday Name</label>
                    <input style={styles.input} placeholder="e.g. Christmas Break" value={builder.holidayName} onChange={e => setBuilder({...builder, holidayName: e.target.value})} />
                </div>
                <div style={styles.formRow}>
                   <div style={{flex:1}}>
                     <label style={styles.label}>Start Date</label>
                     <input type="date" style={styles.input} value={draft.valid_from} onChange={e => setDraft({...draft, valid_from: e.target.value})} />
                   </div>
                   <div style={{flex:1}}>
                     <label style={styles.label}>End Date</label>
                     <input type="date" style={styles.input} value={draft.valid_to} onChange={e => setDraft({...draft, valid_to: e.target.value})} />
                   </div>
                </div>
            </div>
        );
    }
    if (draft.category === "Time Definition") {
        return (
            <div style={{display:'flex', gap:'15px', alignItems:'center', flexWrap:'wrap'}}>
                <div style={{display:'flex', alignItems:'center', gap:'8px'}}>
                    <span>Slot Duration:</span>
                    <select style={{...styles.select, width:'auto'}} value={builder.slotDuration} onChange={e => setBuilder({...builder, slotDuration: e.target.value})}>
                        <option value="45">45 mins</option><option value="60">60 mins</option><option value="90">90 mins</option>
                    </select>
                </div>
                <div style={{display:'flex', alignItems:'center', gap:'8px'}}>
                    <span>Break:</span>
                    <select style={{...styles.select, width:'auto'}} value={builder.breakDuration} onChange={e => setBuilder({...builder, breakDuration: e.target.value})}>
                        <option value="0">None</option><option value="15">15 mins</option><option value="30">30 mins</option>
                    </select>
                </div>
            </div>
        );
    }
    if (draft.category === "Delivery Mode") {
        return (
            <div style={{display:'flex', gap:'12px', alignItems:'center'}}>
                <span>Mode:</span>
                <select style={{...styles.select, width:'auto'}} value={builder.deliveryMode} onChange={e => setBuilder({...builder, deliveryMode: e.target.value})}>
                    <option value="Onsite">Onsite (In Person)</option><option value="Online">Online (Remote)</option><option value="Hybrid">Hybrid</option>
                </select>
            </div>
        );
    }
    if (draft.category === "Duration") {
        return (
            <div style={{display:'flex', gap:'12px', alignItems:'center'}}>
                <span>Specific Duration:</span>
                <input type="number" style={{...styles.input, width:'100px'}} value={builder.customDuration} onChange={e => setBuilder({...builder, customDuration: e.target.value})} />
                <span>minutes</span>
            </div>
        );
    }
    if (draft.category === "Unavailable Days") {
        return (
            <div style={{display:'flex', gap:'12px', alignItems:'center'}}>
                <select style={{...styles.select, width:'auto'}} value={builder.day} onChange={e => setBuilder({...builder, day: e.target.value})}>
                    {DAYS_OF_WEEK.map(d => <option key={d} value={d}>{d}</option>)}
                </select>
                <span>is unavailable / closed.</span>
            </div>
        );
    }
    return <div style={{color:'#64748b', fontStyle:'italic'}}>Use the text box below to describe a custom rule.</div>;
  };

  const currentCategories = SCOPE_CATEGORIES[draft.scope] || SCOPE_CATEGORIES["University"];
  const showGenericValidity = !["Holiday"].includes(draft.category);

  const groupedConstraints = useMemo(() => {
      let filtered = constraints;
      if (scopeFilter !== "ALL") filtered = constraints.filter(c => c.scope === scopeFilter);
      const groups = {};
      filtered.forEach(c => {
          if (!groups[c.scope]) groups[c.scope] = [];
          groups[c.scope].push(c);
      });
      return groups;
  }, [constraints, scopeFilter]);

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <div>
          <h2 style={styles.title}>Scheduler Constraints</h2>
          <p style={styles.subtitle}>Define rules, policies, and preferences for the scheduling AI.</p>
        </div>
        <button style={{...styles.btn, ...styles.primaryBtn}} onClick={openAdd}>+ New Rule</button>
      </div>

      <div style={styles.controlsBar}>
          <div style={styles.filterContainer}>
              <label style={{fontSize:'0.9rem', fontWeight:'600'}}>Filter by Scope:</label>
              <select style={{...styles.select, width:'auto', minWidth:'200px'}} value={scopeFilter} onChange={e => setScopeFilter(e.target.value)}>
                  <option value="ALL">All Scopes</option>
                  {Object.keys(SCOPE_CATEGORIES).map(scope => (<option key={scope} value={scope}>{scope}</option>))}
              </select>
          </div>
      </div>

      {Object.keys(groupedConstraints).length === 0 ? (
          <div style={{padding:'40px', textAlign:'center', color:'#94a3b8', background:'#f8fafc', borderRadius:'10px'}}>
              No rules found matching your filter.
          </div>
      ) : (
          Object.keys(groupedConstraints).sort().map(scope => (
              <div key={scope} style={styles.groupSection}>
                  <div style={styles.groupHeader}>
                      {scope}
                      <span style={styles.groupCount}>{groupedConstraints[scope].length}</span>
                  </div>
                  <div style={styles.tableContainer}>
                    <table style={styles.table}>
                        <thead style={{background:'#f8fafc'}}>
                        <tr>
                            <th style={{...styles.th, width: '16%'}}>Rule Name</th>
                            <th style={{...styles.th, width: '18%'}}>Scope & Target</th>
                            <th style={{...styles.th, width: '28%'}}>Description</th>
                            <th style={{...styles.th, width: '12%'}}>Validity Window</th>
                            <th style={{...styles.th, width: '10%'}}>Created On</th>
                            <th style={{...styles.th, width: '8%', textAlign: 'center'}}>Status</th>
                            <th style={{...styles.th, width: '8%', textAlign: 'right'}}>Action</th>
                        </tr>
                        </thead>
                        <tbody>
                        {groupedConstraints[scope].map(c => {
                            const targetName = (targets[c.scope?.toUpperCase()] || []).find(t => String(t.id) === String(c.target_id))?.name || "All";
                            const isGlobal = String(c.target_id) === "0";

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
                                </td>
                                <td style={styles.td}>
                                    {c.valid_from ? (
                                        <div style={{fontSize:'0.85rem', color:'#475569', fontWeight: '500'}}>
                                            {formatDate(c.valid_from)} <br/>
                                            <span style={{color:'#94a3b8', fontSize:'0.75rem'}}>to</span> <br/>
                                            {formatDate(c.valid_to)}
                                        </div>
                                    ) : (
                                        <span style={{color: '#94a3b8', fontSize: '0.85rem'}}>Always Active</span>
                                    )}
                                </td>
                                <td style={styles.td}>
                                    <div style={{fontSize:'0.85rem', color:'#64748b'}}>
                                        {formatGermanDate(c.created_at || c.createdAt)}
                                    </div>
                                </td>
                                <td style={{...styles.td, textAlign: 'center'}}>
                                    <span style={{
                                        ...styles.badge,
                                        background: c.is_enabled ? '#dcfce7' : '#f1f5f9',
                                        color: c.is_enabled ? '#166534' : '#94a3b8'
                                    }}>
                                        {c.is_enabled ? "Active" : "Disabled"}
                                    </span>
                                </td>
                                <td style={{...styles.td, textAlign: 'right'}}>
                                    <div style={{display:'flex', gap:'5px', justifyContent:'flex-end'}}>
                                        <button style={{...styles.actionBtn, ...styles.editBtn}} onClick={() => openEdit(c)}>Edit</button>
                                        <button style={{...styles.actionBtn, ...styles.delBtn}} onClick={() => confirmDelete(c)}>Delete</button>
                                    </div>
                                </td>
                            </tr>
                            );
                        })}
                        </tbody>
                    </table>
                  </div>
              </div>
          ))
      )}

      {/* --- ADD/EDIT MODAL --- */}
      {modalOpen && (
        <div style={styles.overlay}>
          <div style={styles.modal}>
             <div style={{display:'flex', justifyContent:'space-between', marginBottom:'20px'}}>
                <h3 style={{margin:0, fontSize:'1.25rem', color:'#0f172a'}}>{editingId ? "Edit Rule" : "Create New Rule"}</h3>
                <button onClick={() => setModalOpen(false)} style={{border:'none', background:'transparent', fontSize:'1.5rem', cursor:'pointer', color:'#94a3b8'}}>×</button>
             </div>

             <div style={styles.formGroup}>
                <label style={styles.label}>Rule Name</label>
                <input style={styles.input} placeholder="e.g. Winter Semester Dates" value={draft.name} onChange={e => setDraft({...draft, name: e.target.value})} />
             </div>

             <div style={styles.formRow}>
               <div style={{flex:1}}>
                  <label style={styles.label}>Scope (Who does this apply to?)</label>
                  <select style={styles.select} value={draft.scope} onChange={e => handleScopeChange(e.target.value)}>
                    {Object.keys(SCOPE_CATEGORIES).map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
               </div>
               <div style={{flex:1}}>
                  <label style={styles.label}>Target</label>
                  <select style={styles.select} value={draft.target_id} onChange={e => setDraft({...draft, target_id: e.target.value})}>
                    <option value="0">-- All / Global --</option>
                    {(targets[draft.scope.toUpperCase()] || []).map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                  </select>
               </div>
             </div>

             <div style={styles.builderBox}>
                <div style={{marginBottom:'15px'}}>
                    <label style={styles.label}>Rule Category</label>
                    <select style={styles.select} value={draft.category} onChange={e => handleCategoryChange(e.target.value)}>
                        {currentCategories.map(opt => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
                    </select>
                </div>
                <div style={{background:'white', padding:'15px', borderRadius:'8px', border:'1px solid #e2e8f0'}}>
                    {renderBuilderInputs()}
                </div>
             </div>

             <div style={styles.generatedBox}>
                <label style={{...styles.label, color:'#1e40af', fontSize:'0.85rem'}}>
                    {draft.category === "Custom" ? "Custom Rule Description" : "Generated Rule Description"}
                </label>
                
                {/* ✅ Added Placeholder and ReadOnly dynamically */}
                <textarea 
                  style={{
                      ...styles.generatedText,
                      background: draft.category === "Custom" ? "white" : "#f1f5f9",
                      color: draft.category === "Custom" ? "#1e3a8a" : "#475569",
                      cursor: draft.category === "Custom" ? "text" : "not-allowed"
                  }} 
                  value={draft.rule_text} 
                  onChange={e => setDraft({...draft, rule_text: e.target.value})} 
                  placeholder="Enter custom rule description here..."
                  readOnly={draft.category !== "Custom"}
                />
                
                <div style={{fontSize:'0.8rem', color:'#64748b', marginTop:'6px', display:'flex', justifyContent:'space-between'}}>
                    <label style={{cursor:'pointer', fontWeight:'600', color:'#0f172a', display:'flex', alignItems:'center', gap:'6px'}}>
                        <input type="checkbox" checked={draft.is_enabled} onChange={e => setDraft({...draft, is_enabled: e.target.checked})} />
                        Active Rule
                    </label>
                </div>
             </div>

             {showGenericValidity && (
                 <div style={{marginTop:'20px', borderTop:'1px solid #e2e8f0', paddingTop:'15px'}}>
                     <div style={styles.sectionLabel}>Validity Window (Optional)</div>
                     <div style={styles.formRow}>
                       <div style={{flex:1}}>
                         <label style={styles.label}>Valid From</label>
                         <input type="date" style={styles.input} value={draft.valid_from} onChange={e => setDraft({...draft, valid_from: e.target.value})} />
                       </div>
                       <div style={{flex:1}}>
                         <label style={styles.label}>Valid To</label>
                         <input type="date" style={styles.input} value={draft.valid_to} onChange={e => setDraft({...draft, valid_to: e.target.value})} />
                       </div>
                     </div>
                 </div>
             )}

             <div style={{display:'flex', justifyContent:'flex-end', gap:'12px', marginTop:'24px'}}>
               <button style={{...styles.btn, ...styles.secondaryBtn}} onClick={() => setModalOpen(false)}>Cancel</button>
               <button style={{...styles.btn, ...styles.primaryBtn}} onClick={save}>Save Rule</button>
             </div>
          </div>
        </div>
      )}

      {/* --- DELETE CONFIRMATION MODAL --- */}
      {deleteModalOpen && (
          <DeleteConfirmationModal
            title="Delete Constraint?"
            msg="Are you sure you want to delete this rule? This action cannot be undone."
            itemName={itemToDelete?.name}
            onClose={() => setDeleteModalOpen(false)}
            onConfirm={handleDelete}
          />
      )}
    </div>
  );
}

function DeleteConfirmationModal({ title, msg, itemName, onClose, onConfirm }) {
    const [input, setInput] = useState("");
    const isMatch = input === "DELETE";

    return (
        <div style={styles.overlay}>
            <div style={{...styles.modal, width:'450px', maxHeight:'none'}}>
                <h3 style={{ marginTop: 0, color: "#991b1b", marginBottom: "15px" }}>{title}</h3>
                
                <p style={{ color: "#4b5563", marginBottom: "25px", lineHeight:'1.5' }}>
                    {msg}
                    {itemName && <strong style={{display: 'block', marginTop: '10px'}}>{itemName}</strong>}
                </p>
                
                <div style={{ background: "#fef2f2", padding: "15px", borderRadius: "8px", border: "1px solid #fecaca", marginBottom: "25px" }}>
                    <p style={{ fontSize: "0.9rem", fontWeight: "bold", margin: "0 0 10px 0", color:'#991b1b' }}>
                        Type "DELETE" to confirm:
                    </p>
                    <input
                        style={{...styles.input, marginBottom: 0, borderColor: '#fca5a5'}}
                        value={input}
                        onChange={e => setInput(e.target.value)}
                        placeholder="DELETE"
                    />
                </div>

                <div style={{ display: "flex", justifyContent: "flex-end", gap: "12px" }}>
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
