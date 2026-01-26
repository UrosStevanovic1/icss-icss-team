import { useState, useMemo, useEffect } from "react";
import api from "../api";

const styles = {
  container: { padding: "20px", fontFamily: "'Segoe UI', sans-serif", color: "#333", maxWidth: "100%" },
  header: { display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px", borderBottom: "1px solid #ccc", paddingBottom: "15px" },
  title: { margin: 0, fontSize: "1.5rem", color: "#333" },
  searchBar: { padding: "8px 12px", width: "300px", borderRadius: "4px", border: "1px solid #ccc", marginBottom: "15px" },
  table: { width: "100%", borderCollapse: "collapse", background: "#fff", border: "1px solid #ddd", fontSize: "0.9rem" },
  thead: { background: "#f2f2f2", borderBottom: "2px solid #ccc" },
  th: { textAlign: "left", padding: "10px 15px", fontWeight: "600", color: "#444" },
  tr: { borderBottom: "1px solid #eee" },
  td: { padding: "10px 15px", verticalAlign: "middle" },
  statusBadge: { padding: "4px 8px", borderRadius: "12px", fontSize: "0.8rem", fontWeight: "bold", textTransform: "uppercase" },
  active: { background: "#d4edda", color: "#155724" },
  inactive: { background: "#f8d7da", color: "#721c24" },
  btn: { padding: "6px 12px", borderRadius: "4px", border: "none", cursor: "pointer", fontSize: "0.9rem", marginLeft: "5px" },
  primaryBtn: { background: "#007bff", color: "white" },
  editBtn: { background: "#6c757d", color: "white" },
  deleteBtn: { background: "#dc3545", color: "white" },
  modalOverlay: { position: "fixed", top: 0, left: 0, right: 0, bottom: 0, background: "rgba(0,0,0,0.5)", display: "flex", justifyContent: "center", alignItems: "center", zIndex: 1000 },
  modalContent: { background: "white", padding: "25px", borderRadius: "8px", width: "750px", maxWidth: "95%", maxHeight: "90vh", overflowY: "auto", boxShadow: "0 5px 15px rgba(0,0,0,0.3)" },
  formGroup: { marginBottom: "15px" },
  label: { display: "block", marginBottom: "5px", fontWeight: "bold", fontSize: "0.9rem" },
  input: { width: "100%", padding: "8px", borderRadius: "4px", border: "1px solid #ccc", fontSize: "1rem", boxSizing: "border-box" },
  specItem: { display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '10px', background: '#f9f9f9', padding: '10px', borderRadius: '4px', border: '1px solid #eee' }
};

// ✅ Helper to display dates in German format (DD.MM.YYYY)
function formatDateDE(isoDate) {
  if (!isoDate) return "-";
  // Check if it looks like a date
  const date = new Date(isoDate);
  if (isNaN(date.getTime())) return isoDate; // Return original if not a valid date
  return date.toLocaleDateString("de-DE", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric"
  });
}

export default function ProgramOverview() {
  const [programs, setPrograms] = useState([]);
  const [allSpecs, setAllSpecs] = useState([]);
  const [lecturers, setLecturers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");
  const [formMode, setFormMode] = useState("overview");
  const [editingId, setEditingId] = useState(null);

  const [draft, setDraft] = useState({
    name: "",
    acronym: "",
    head: "",
    status: true,
    startDate: "",
    totalEcts: 120,
    location: "",
    specializations: []
  });

  async function loadData() {
    setLoading(true);
    try {
      const [progData, specData, lecData] = await Promise.all([
        api.getPrograms(),
        api.getSpecializations(),
        api.getLecturers()
      ]);

      const mappedProgs = (Array.isArray(progData) ? progData : []).map(p => ({
        id: p.id,
        name: p.name,
        acronym: p.acronym,
        head: p.head_of_program,
        status: p.status,
        startDate: p.start_date,
        totalEcts: p.total_ects,
        location: p.location,
        specializations: p.specializations || []
      }));
      setPrograms(mappedProgs);
      setAllSpecs(Array.isArray(specData) ? specData : []);
      setLecturers(Array.isArray(lecData) ? lecData : []);
    } catch (e) {
      alert("Error loading data: " + e.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { loadData(); }, []);

  const uniqueSpecs = useMemo(() => {
    const map = new Map();
    for (const s of allSpecs) {
        if (!map.has(s.name)) {
            map.set(s.name, s);
        }
    }
    return Array.from(map.values());
  }, [allSpecs]);

  function openAdd() {
    setEditingId(null);
    setDraft({
      name: "",
      acronym: "",
      head: "",
      status: true,
      startDate: "",
      totalEcts: 120,
      location: "",
      specializations: []
    });
    setFormMode("add");
  }

  function openEdit(row) {
    setEditingId(row.id);
    setDraft({
      name: row.name,
      acronym: row.acronym,
      head: row.head,
      status: row.status,
      startDate: row.startDate, // Ensure DB sends YYYY-MM-DD or this is valid date string
      totalEcts: row.totalEcts,
      location: row.location || "",
      specializations: (row.specializations || []).map(s => ({ ...s, status: s.status }))
    });
    setFormMode("edit");
  }

  async function save() {
    if (!draft.name.trim()) return alert("Program name is required");

    const payload = {
      name: draft.name.trim(),
      acronym: draft.acronym.trim(),
      head_of_program: draft.head.trim(),
      status: draft.status,
      start_date: draft.startDate,
      total_ects: Number(draft.totalEcts),
      location: draft.location,
    };

    try {
      if (formMode === "add") {
        const newProg = await api.createProgram(payload);
        for (const spec of draft.specializations) {
            await api.createSpecialization({
                name: spec.name,
                acronym: spec.acronym,
                start_date: spec.start_date,
                status: spec.status,
                program_id: newProg.id
            });
        }
      } else {
        await api.updateProgram(editingId, payload);
        for (const spec of draft.specializations) {
            const specPayload = {
                name: spec.name,
                acronym: spec.acronym,
                start_date: spec.start_date,
                status: spec.status,
                program_id: editingId
            };
            if (spec.id) {
                await api.updateSpecialization(spec.id, specPayload);
            } else {
                await api.createSpecialization(specPayload);
            }
        }
      }
      await loadData();
      setFormMode("overview");
    } catch (e) {
      console.error(e);
      alert("Backend error. Check console.");
    }
  }

  async function remove(id) {
    if (!window.confirm("Delete this program?")) return;
    try { await api.deleteProgram(id); loadData(); } catch (e) { alert("Error deleting."); }
  }

  function addDraftSpec(templateSpec = null) {
    const newSpec = templateSpec
      ? { name: templateSpec.name, acronym: templateSpec.acronym, start_date: templateSpec.start_date, status: true }
      : { name: "", acronym: "", start_date: "", status: true };

    setDraft({
        ...draft,
        specializations: [...draft.specializations, newSpec]
    });
  }

  function updateDraftSpec(idx, field, val) {
    const specs = [...draft.specializations];
    specs[idx][field] = val;
    setDraft({ ...draft, specializations: specs });
  }

  async function deleteSpec(idx) {
      const specToDelete = draft.specializations[idx];
      if (specToDelete.id) {
          if(!window.confirm("Delete this specialization permanently?")) return;
          try { await api.deleteSpecialization(specToDelete.id); } catch(e) { return; }
      }
      const specs = [...draft.specializations];
      specs.splice(idx, 1);
      setDraft({ ...draft, specializations: specs });
  }

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return programs.filter(p => p.name.toLowerCase().includes(q) || p.acronym.toLowerCase().includes(q));
  }, [programs, query]);

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <h2 style={styles.title}>Programs Overview</h2>
        <button style={{...styles.btn, ...styles.primaryBtn}} onClick={openAdd}>+ New Program</button>
      </div>

      <input style={styles.searchBar} placeholder="Search programs..." value={query} onChange={(e) => setQuery(e.target.value)} />

      {loading ? <p>Loading...</p> : (
        <table style={styles.table}>
          <thead style={styles.thead}>
            <tr>
              <th style={styles.th}>Name</th>
              <th style={styles.th}>Acronym</th>
              <th style={styles.th}>Head of Study Program</th>
              <th style={styles.th}>Location</th>
              <th style={styles.th}>Start Date</th>
              <th style={styles.th}>Status</th>
              <th style={{...styles.th, textAlign: 'right'}}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((p) => (
              <tr key={p.id} style={styles.tr}>
                <td style={styles.td}>
                    <strong>{p.name}</strong>
                    {p.specializations.length > 0 && (
                        <div style={{fontSize:'0.85rem', color:'#666', marginTop:'4px'}}>
                            Specs: {p.specializations.map(s => s.acronym).join(", ")}
                        </div>
                    )}
                </td>
                <td style={styles.td}>{p.acronym}</td>
                <td style={styles.td}>{p.head}</td>
                <td style={styles.td}>{p.location || "-"}</td>
                {/* ✅ Display as German Date */}
                <td style={styles.td}>{formatDateDE(p.startDate)}</td>
                <td style={styles.td}>
                  <span style={{...styles.statusBadge, ...(p.status ? styles.active : styles.inactive)}}>
                    {p.status ? "Active" : "Inactive"}
                  </span>
                </td>
                <td style={{...styles.td, textAlign: 'right', whiteSpace: 'nowrap'}}>
                  <button style={{...styles.btn, ...styles.editBtn}} onClick={() => openEdit(p)}>Edit</button>
                  <button style={{...styles.btn, ...styles.deleteBtn}} onClick={() => remove(p.id)}>Delete</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      {(formMode === "add" || formMode === "edit") && (
        <div style={styles.modalOverlay}>
            <div style={styles.modalContent}>
                <div style={{display:'flex', justifyContent:'space-between', marginBottom:'20px'}}>
                    <h3 style={{margin:0}}>{formMode === "add" ? "Create Program" : "Edit Program"}</h3>
                    <button onClick={() => setFormMode("overview")} style={{border:'none', background:'transparent', fontSize:'1.5rem', cursor:'pointer'}}>×</button>
                </div>

                <div style={styles.formGroup}><label style={styles.label}>Name</label><input style={styles.input} value={draft.name} onChange={(e) => setDraft({ ...draft, name: e.target.value })} /></div>

                <div style={{display:'flex', gap:'15px'}}>
                    <div style={{...styles.formGroup, flex:1}}><label style={styles.label}>Acronym</label><input style={styles.input} value={draft.acronym} onChange={(e) => setDraft({ ...draft, acronym: e.target.value })} /></div>

                    <div style={{...styles.formGroup, flex:1}}>
                        <label style={styles.label}>Head of Study Program</label>
                        <select
                            style={styles.input}
                            value={draft.head}
                            onChange={(e) => setDraft({ ...draft, head: e.target.value })}
                        >
                            <option value="">-- Select Head --</option>
                            {lecturers.map(l => {
                                const fullName = `${l.first_name} ${l.last_name || ""}`.trim();
                                return <option key={l.id} value={fullName}>{fullName}</option>;
                            })}
                        </select>
                    </div>
                </div>

                <div style={{display:'flex', gap:'15px'}}>
                    <div style={{...styles.formGroup, flex:1}}>
                        <label style={styles.label}>Start Date</label>
                        {/* ✅ Program Calendar Picker */}
                        <input
                            type="date"
                            style={styles.input}
                            value={draft.startDate}
                            onChange={(e) => setDraft({ ...draft, startDate: e.target.value })}
                        />
                    </div>
                    <div style={{...styles.formGroup, flex:1}}>
                        <label style={styles.label}>Location</label>
                        <input style={styles.input} value={draft.location} onChange={(e) => setDraft({ ...draft, location: e.target.value })} placeholder="e.g. Berlin Campus" />
                    </div>
                </div>

                <div style={styles.formGroup}><label style={styles.label}>Total ECTS</label><input type="number" style={styles.input} value={draft.totalEcts} onChange={(e) => setDraft({ ...draft, totalEcts: e.target.value })} /></div>

                <div style={styles.formGroup}>
                    <label style={{display:'flex', alignItems:'center', gap:'10px', cursor:'pointer'}}>
                        <input type="checkbox" checked={draft.status} onChange={(e) => setDraft({ ...draft, status: e.target.checked })} />
                        <strong>Program is Active</strong>
                    </label>
                </div>

                <hr style={{margin:'20px 0', border:'0', borderTop:'1px solid #eee'}}/>

                <div style={{display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:'10px'}}>
                    <h4 style={{margin:0}}>Specializations</h4>
                    <div style={{display:'flex', gap:'10px', alignItems: 'center'}}>
                        <select
                            style={{...styles.input, padding:'6px', fontSize:'0.85rem', width:'200px'}}
                            onChange={(e) => {
                                const selected = uniqueSpecs.find(s => s.id.toString() === e.target.value);
                                if (selected) {
                                    addDraftSpec(selected);
                                    e.target.value = "";
                                }
                            }}
                        >
                            <option value="">Copy from existing...</option>
                            {uniqueSpecs.map(s => <option key={s.id} value={s.id}>{s.name} ({s.acronym})</option>)}
                        </select>
                        <button type="button" onClick={() => addDraftSpec()} style={{...styles.btn, ...styles.primaryBtn, fontSize:'0.8rem'}}>+ Add New</button>
                    </div>
                </div>

                <div style={{maxHeight:'150px', overflowY:'auto'}}>
                    {draft.specializations.map((spec, idx) => (
                        <div key={idx} style={styles.specItem}>
                            <input style={{...styles.input, flex:2}} placeholder="Name" value={spec.name} onChange={(e) => updateDraftSpec(idx, 'name', e.target.value)} />
                            <input style={{...styles.input, flex:1}} placeholder="Acronym" value={spec.acronym} onChange={(e) => updateDraftSpec(idx, 'acronym', e.target.value)} />

                            {/* ✅ Specialization Calendar Picker */}
                            <input
                                type="date"
                                style={{...styles.input, flex:1.2}}
                                value={spec.start_date}
                                onChange={(e) => updateDraftSpec(idx, 'start_date', e.target.value)}
                            />

                            <label style={{display:'flex', alignItems:'center', gap:'5px', fontSize:'0.85rem'}}>
                                <input type="checkbox" checked={!!spec.status} onChange={(e) => updateDraftSpec(idx, 'status', e.target.checked)} />
                                Active
                            </label>
                            <button onClick={() => deleteSpec(idx)} style={{...styles.btn, background:'#dc3545', color:'white', padding:'6px 10px', marginLeft:'0'}}>×</button>
                        </div>
                    ))}
                    {draft.specializations.length === 0 && <p style={{color:'#777', fontStyle:'italic'}}>No specializations.</p>}
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