import { useEffect, useState } from "react";
import api from "../api";

const styles = {
  container: { padding: "20px", fontFamily: "'Segoe UI', sans-serif", maxWidth: "1200px", margin: "0 auto" },
  header: { display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "25px", borderBottom: "1px solid #e2e8f0", paddingBottom: "15px" },
  title: { margin: 0, fontSize: "1.8rem", color: "#1e293b" },
  btn: { padding: "8px 16px", borderRadius: "6px", border: "none", cursor: "pointer", fontSize: "0.9rem", fontWeight: "600", transition: "0.2s" },
  primaryBtn: { background: "#3b82f6", color: "white" },
  deleteBtn: { background: "#fee2e2", color: "#ef4444", padding: "6px 12px" },
  editBtn: { background: "#f1f5f9", color: "#475569", marginRight: "8px", padding: "6px 12px" },
  table: { width: "100%", borderCollapse: "collapse", background: "white", boxShadow: "0 1px 3px rgba(0,0,0,0.1)", borderRadius: "8px", overflow: "hidden" },
  th: { background: "#f8fafc", padding: "12px 15px", textAlign: "left", fontSize: "0.85rem", color: "#64748b", textTransform: "uppercase", letterSpacing: "0.05em" },
  td: { padding: "12px 15px", borderBottom: "1px solid #e2e8f0", fontSize: "0.9rem", color: "#333" },
  modalOverlay: { position: "fixed", top: 0, left: 0, right: 0, bottom: 0, background: "rgba(0,0,0,0.5)", display: "flex", justifyContent: "center", alignItems: "center", zIndex: 1000 },
  modalContent: { background: "white", padding: "30px", borderRadius: "12px", width: "650px", maxWidth: "95%", maxHeight: "90vh", overflowY: "auto", boxShadow: "0 10px 25px rgba(0,0,0,0.2)" },
  formGroup: { marginBottom: "15px" },
  label: { display: "block", marginBottom: "6px", fontWeight: "600", fontSize: "0.9rem", color: "#475569" },
  input: { width: "100%", padding: "10px", borderRadius: "6px", border: "1px solid #cbd5e1", fontSize: "0.95rem", boxSizing: "border-box" },
  select: { width: "100%", padding: "10px", borderRadius: "6px", border: "1px solid #cbd5e1", fontSize: "0.95rem", background: "white" },
  textArea: { width: "100%", padding: "10px", borderRadius: "6px", border: "1px solid #cbd5e1", fontSize: "0.95rem", minHeight: "80px", fontFamily: "inherit", resize: "vertical" },
  builderBox: { background: "#f0f9ff", border: "1px solid #bae6fd", padding: "15px", borderRadius: "8px", marginBottom: "15px" }
};

const formatDate = (isoDate) => isoDate ? isoDate.split("T")[0] : "";

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
    category: "Time Preference",
    scope: "Lecturer",
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
    gap: "at least 1 hour"
  });

  useEffect(() => { loadData(); }, []);

  // --- AUTO-GENERATOR: Updates rule_text when dropdowns change ---
  useEffect(() => {
    if (!modalOpen) return;

    // 1. DETERMINE THE ENTITY NAME
    const targetList = targets[draft.scope.toUpperCase()] || [];
    const targetObj = targetList.find(t => String(t.id) === String(draft.target_id));
    const targetName = targetObj ? targetObj.name : "All Entities";

    const entity = `${draft.scope} "${targetName}"`;

    let generatedText = "";

    // 2. BUILD THE SENTENCE BASED ON CATEGORY
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
      case "Workload Limit":
        generatedText = `${entity} cannot exceed ${builder.limit} of teaching per day.`;
        break;
      default:
        return;
    }

    setDraft(prev => ({ ...prev, rule_text: generatedText }));

  }, [draft.category, draft.scope, draft.target_id, builder, modalOpen, targets]); // ✅ FIXED: Added 'targets' to dependency

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
      name: "", category: "Time Preference", scope: "Lecturer", target_id: "0",
      valid_from: "", valid_to: "", rule_text: "", is_enabled: true
    });
    setBuilder({ day: "Friday", roomType: "Computer Lab", limit: "4 hours", gap: "at least 1 hour" });
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

  // --- Dynamic Inputs based on Category ---
  const renderBuilderInputs = () => {
    if (draft.category === "Time Preference") {
        return (
            <div style={{display:'flex', gap:'10px'}}>
                <select style={styles.select} value={builder.day} onChange={e => setBuilder({...builder, day: e.target.value})}>
                    {["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"].map(d => <option key={d} value={d}>{d}</option>)}
                </select>
                <span style={{alignSelf:'center', color:'#666'}}>is blocked.</span>
            </div>
        );
    }
    if (draft.category === "Room Requirement") {
        return (
            <div style={{display:'flex', gap:'10px'}}>
                <span style={{alignSelf:'center', color:'#666'}}>Needs:</span>
                <select style={styles.select} value={builder.roomType} onChange={e => setBuilder({...builder, roomType: e.target.value})}>
                    {["Lecture Classroom", "Computer Lab", "Seminar Room", "Physics Lab"].map(r => <option key={r} value={r}>{r}</option>)}
                </select>
            </div>
        );
    }
    if (draft.category === "Gap Limit") {
        return (
            <div style={{display:'flex', gap:'10px'}}>
                <span style={{alignSelf:'center', color:'#666'}}>Gap must be:</span>
                <select style={styles.select} value={builder.gap} onChange={e => setBuilder({...builder, gap: e.target.value})}>
                    <option value="at least 30 mins">at least 30 mins</option>
                    <option value="at least 1 hour">at least 1 hour</option>
                    <option value="max 2 hours">max 2 hours</option>
                </select>
            </div>
        );
    }
    if (draft.category === "Workload Limit") {
        return (
            <div style={{display:'flex', gap:'10px'}}>
                <span style={{alignSelf:'center', color:'#666'}}>Max teaching time:</span>
                <select style={styles.select} value={builder.limit} onChange={e => setBuilder({...builder, limit: e.target.value})}>
                    <option value="2 hours">2 hours</option>
                    <option value="4 hours">4 hours</option>
                    <option value="6 hours">6 hours</option>
                    <option value="8 hours">8 hours</option>
                </select>
                <span style={{alignSelf:'center', color:'#666'}}>per day.</span>
            </div>
        );
    }

    return <div style={{color:'#888', fontStyle:'italic'}}>Type a custom rule description below...</div>;
  };

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <div>
          <h2 style={styles.title}>Scheduler Constraints</h2>
          <p style={{color:'#64748b', margin:'5px 0 0 0'}}>Define rules and preferences for the scheduling system.</p>
        </div>
        <button style={{...styles.btn, ...styles.primaryBtn}} onClick={openAdd}>+ New Rule</button>
      </div>

      <table style={styles.table}>
        <thead style={{background:'#f1f5f9'}}>
          <tr>
            <th style={styles.th}>Rule Name</th>
            <th style={styles.th}>Category</th>
            <th style={styles.th}>Context (Scope)</th>
            <th style={styles.th}>Rule Description</th>
            <th style={styles.th}>Validity</th>
            <th style={styles.th}>Status</th>
            <th style={styles.th}>Action</th>
          </tr>
        </thead>
        <tbody>
          {constraints.map(c => {
             const targetName = (targets[c.scope?.toUpperCase()] || []).find(t => String(t.id) === String(c.target_id))?.name || "All";
             return (
               <tr key={c.id}>
                 <td style={styles.td}><strong>{c.name}</strong></td>
                 <td style={styles.td}><span style={{background:'#e2e8f0', padding:'2px 6px', borderRadius:'4px', fontSize:'0.8rem'}}>{c.category}</span></td>
                 <td style={styles.td}>
                    <div style={{fontWeight:'500'}}>{c.scope}</div>
                    <div style={{fontSize:'0.8rem', color:'#666'}}>{targetName}</div>
                 </td>
                 <td style={styles.td}>
                    <div style={{fontStyle:'italic', color:'#334155', background:'#f8fafc', padding:'8px', borderRadius:'4px', borderLeft:'3px solid #3b82f6'}}>
                        "{c.rule_text}"
                    </div>
                 </td>
                 <td style={styles.td} style={{fontSize:'0.85rem', color:'#64748b'}}>
                    {c.valid_from ? `${formatDate(c.valid_from)} → ${formatDate(c.valid_to)}` : "Always Valid"}
                 </td>
                 <td style={styles.td}>
                    <span style={{ color: c.is_enabled ? "#16a34a" : "#94a3b8", fontWeight:'600', fontSize:'0.85rem' }}>
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

      {modalOpen && (
        <div style={styles.modalOverlay}>
          <div style={styles.modalContent}>
             <h3 style={{margin:'0 0 20px 0', color:'#1e293b'}}>{editingId ? "Edit Rule" : "Create New Rule"}</h3>

             <div style={styles.formGroup}>
                <label style={styles.label}>Rule Name (Internal)</label>
                <input
                  style={styles.input}
                  placeholder="e.g. Mohammed Friday Restriction"
                  value={draft.name}
                  onChange={e => setDraft({...draft, name: e.target.value})}
                />
             </div>

             {/* SCOPE & TARGET */}
             <div style={{display:'flex', gap:'15px', marginBottom:'15px'}}>
               <div style={{flex:1}}>
                  <label style={styles.label}>1. Context (Who?)</label>
                  <select style={styles.select} value={draft.scope} onChange={e => setDraft({...draft, scope: e.target.value, target_id: "0"})}>
                    {["Lecturer", "Group", "Module", "Room", "Program"].map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
               </div>
               <div style={{flex:1}}>
                  <label style={styles.label}>2. Target (Which one?)</label>
                  <select style={styles.select} value={draft.target_id} onChange={e => setDraft({...draft, target_id: e.target.value})}>
                    <option value="0">-- All / Global --</option>
                    {(targets[draft.scope.toUpperCase()] || []).map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                  </select>
               </div>
             </div>

             {/* SENTENCE BUILDER */}
             <div style={styles.builderBox}>
                <label style={{...styles.label, color:'#0369a1'}}>3. Rule Builder</label>

                <div style={{marginBottom:'10px'}}>
                    <label style={{fontSize:'0.85rem', color:'#666', marginBottom:'4px', display:'block'}}>Category</label>
                    <select style={styles.select} value={draft.category} onChange={e => setDraft({...draft, category: e.target.value})}>
                        <option value="Time Preference">Time Preference</option>
                        <option value="Room Requirement">Room Requirement</option>
                        <option value="Gap Limit">Gap Limit</option>
                        <option value="Workload Limit">Workload Limit</option>
                        <option value="General">Custom / Other</option>
                    </select>
                </div>

                {renderBuilderInputs()}
             </div>

             {/* RESULTING TEXT */}
             <div style={styles.formGroup}>
                <label style={{...styles.label, color:'#3b82f6'}}>Generated Rule</label>
                <textarea
                  style={styles.textArea}
                  value={draft.rule_text}
                  onChange={e => setDraft({...draft, rule_text: e.target.value})}
                />
                <div style={{fontSize:'0.8rem', color:'#94a3b8', marginTop:'5px'}}>
                    * This rule description will be used by the scheduling system.
                </div>
             </div>

             <div style={{display:'flex', gap:'15px'}}>
               <div style={{...styles.formGroup, flex:1}}>
                 <label style={styles.label}>Valid From (Optional)</label>
                 <input type="date" style={styles.input} value={draft.valid_from} onChange={e => setDraft({...draft, valid_from: e.target.value})} />
               </div>
               <div style={{...styles.formGroup, flex:1}}>
                 <label style={styles.label}>Valid To (Optional)</label>
                 <input type="date" style={styles.input} value={draft.valid_to} onChange={e => setDraft({...draft, valid_to: e.target.value})} />
               </div>
             </div>

             <div style={styles.formGroup}>
               <label style={{display:'flex', alignItems:'center', gap:'8px', cursor:'pointer'}}>
                 <input type="checkbox" checked={draft.is_enabled} onChange={e => setDraft({...draft, is_enabled: e.target.checked})} />
                 <span style={{fontSize:'0.9rem'}}>Active Rule</span>
               </label>
             </div>

             <div style={{display:'flex', justifyContent:'flex-end', gap:'10px', marginTop:'20px'}}>
               <button style={{...styles.btn, background:'#e2e8f0', color:'#475569'}} onClick={() => setModalOpen(false)}>Cancel</button>
               <button style={{...styles.btn, ...styles.primaryBtn}} onClick={save}>Save Rule</button>
             </div>
          </div>
        </div>
      )}
    </div>
  );
}