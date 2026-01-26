import { useEffect, useMemo, useState } from "react";
import api from "../api";

const styles = {
  container: { padding: "20px", fontFamily: "'Segoe UI', sans-serif", color: "#333", maxWidth: "100%" },
  header: { display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px", borderBottom: "1px solid #ccc", paddingBottom: "15px" },
  title: { margin: 0, fontSize: "1.5rem" },
  searchBar: { padding: "8px 12px", width: "300px", borderRadius: "4px", border: "1px solid #ccc", marginBottom: "15px" },
  table: { width: "100%", borderCollapse: "collapse", background: "#fff", border: "1px solid #ddd", fontSize: "0.9rem" },
  thead: { background: "#f2f2f2", borderBottom: "2px solid #ccc" },
  th: { textAlign: "left", padding: "10px 15px", fontWeight: 600, color: "#444" },
  tr: { borderBottom: "1px solid #eee" },
  td: { padding: "10px 15px", verticalAlign: "middle" },
  btn: { padding: "6px 12px", borderRadius: "4px", border: "none", cursor: "pointer", fontSize: "0.9rem", marginLeft: "5px" },
  primaryBtn: { background: "#007bff", color: "white" },
  editBtn: { background: "#6c757d", color: "white" },
  deleteBtn: { background: "#dc3545", color: "white" },
  statusBadge: { padding: "4px 8px", borderRadius: "12px", fontSize: "0.8rem", fontWeight: "bold", textTransform: "uppercase" },
  active: { background: "#d4edda", color: "#155724" },
  inactive: { background: "#f8d7da", color: "#721c24" },
  modalOverlay: { position: "fixed", top: 0, left: 0, right: 0, bottom: 0, background: "rgba(0,0,0,0.5)", display: "flex", justifyContent: "center", alignItems: "center", zIndex: 1000 },
  modalContent: { background: "white", padding: "25px", borderRadius: "8px", width: "500px", maxWidth: "95%", maxHeight: "90vh", overflowY: "auto", boxShadow: "0 5px 15px rgba(0,0,0,0.3)" },
  formGroup: { marginBottom: "15px" },
  label: { display: "block", marginBottom: "5px", fontWeight: "bold", fontSize: "0.9rem" },
  input: { width: "100%", padding: "8px", borderRadius: "4px", border: "1px solid #ccc", fontSize: "1rem", boxSizing: "border-box" },
  iconBtn: { padding: "8px", width:"35px", cursor: "pointer", border: "1px solid #ccc", borderRadius: "4px", background:"#f0f0f0", display:'flex', alignItems:'center', justifyContent:'center', fontSize:'1.1rem' }
};

// ✅ Default Standard Types (Cannot be deleted)
const STANDARD_TYPES = ["Lecture Classroom", "Computer Lab", "Seminar"];

export default function RoomOverview() {
  const [rooms, setRooms] = useState([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");
  const [formMode, setFormMode] = useState("overview");
  const [editingId, setEditingId] = useState(null);

  // Store custom types created by the user or found in DB
  const [customTypes, setCustomTypes] = useState([]);

  const [draft, setDraft] = useState({
    name: "",
    type: "",
    capacity: "",
    status: true,
    equipment: "",
    campus: "",
    specific_location: "",
  });

  async function loadData() {
    setLoading(true);
    try {
      const data = await api.getRooms();
      const loadedRooms = Array.isArray(data) ? data : [];
      setRooms(loadedRooms);

      // Extract existing unique types from DB that are NOT in the standard list
      const existingCustom = loadedRooms
        .map(r => r.type)
        .filter(t => t && !STANDARD_TYPES.includes(t));

      // Update custom types list (removing duplicates)
      setCustomTypes(prev => Array.from(new Set([...prev, ...existingCustom])).sort());

    } catch (e) {
      alert("Error loading rooms: " + e.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadData();
  }, []);

  function parseLocation(locString) {
      if (!locString) return { campus: "", specific: "" };
      const parts = locString.split(" - ");
      if (parts.length > 1) {
          return { campus: parts[0], specific: parts.slice(1).join(" - ") };
      }
      return { campus: "", specific: locString };
  }

  function openAdd() {
    setEditingId(null);
    setDraft({
      name: "",
      type: "",
      capacity: "",
      status: true,
      equipment: "",
      campus: "",
      specific_location: "",
    });
    setFormMode("add");
  }

  function openEdit(r) {
    setEditingId(r.id);
    const { campus, specific } = parseLocation(r.location);

    setDraft({
      name: r.name,
      type: r.type,
      capacity: r.capacity,
      status: r.status,
      equipment: r.equipment || "",
      campus: campus,
      specific_location: specific,
    });
    setFormMode("edit");
  }

  // ✅ Add New Room Type Logic
  function addNewType() {
      const newType = prompt("Enter new room type:");
      if (newType && newType.trim() !== "") {
          const formatted = newType.trim();
          if (!STANDARD_TYPES.includes(formatted) && !customTypes.includes(formatted)) {
              setCustomTypes([...customTypes, formatted]);
          }
          setDraft({ ...draft, type: formatted });
      }
  }

  // ✅ Delete Custom Type Logic
  function deleteType() {
      if (!draft.type) return;
      if (STANDARD_TYPES.includes(draft.type)) {
          alert("Cannot delete standard room types.");
          return;
      }
      if (window.confirm(`Remove "${draft.type}" from the list?`)) {
          setCustomTypes(customTypes.filter(t => t !== draft.type));
          setDraft({ ...draft, type: "" }); // Reset selection
      }
  }

  async function save() {
    if (!draft.name || !draft.capacity || !draft.type) return alert("Name, Type, and Capacity are required");

    const finalLocation = draft.campus
        ? `${draft.campus} - ${draft.specific_location}`
        : draft.specific_location;

    const payload = {
      name: draft.name,
      type: draft.type,
      capacity: Number(draft.capacity),
      status: draft.status,
      equipment: draft.equipment,
      location: finalLocation,
    };

    try {
      if (formMode === "add") {
        await api.createRoom(payload);
      } else {
        await api.updateRoom(editingId, payload);
      }
      await loadData();
      setFormMode("overview");
    } catch (e) {
      console.error(e);
      alert("Backend error while saving room.");
    }
  }

  async function remove(id) {
    if (!window.confirm("Delete room?")) return;
    try {
      await api.deleteRoom(id);
      await loadData();
    } catch (e) {
      alert("Error deleting room.");
    }
  }

  const filtered = useMemo(() => {
    const q = query.toLowerCase();
    return rooms.filter(
      (r) =>
        (r.name || "").toLowerCase().includes(q) ||
        (r.type || "").toLowerCase().includes(q) ||
        (r.location || "").toLowerCase().includes(q)
    );
  }, [rooms, query]);

  // Combine standard and custom types for the dropdown
  const allRoomTypes = useMemo(() => [...STANDARD_TYPES, ...customTypes], [customTypes]);

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <h2 style={styles.title}>Room Overview</h2>
        <button style={{ ...styles.btn, ...styles.primaryBtn }} onClick={openAdd}>
          + New Room
        </button>
      </div>

      <input
        style={styles.searchBar}
        placeholder="Search rooms..."
        value={query}
        onChange={(e) => setQuery(e.target.value)}
      />

      {loading ? <p>Loading...</p> : (
        <table style={styles.table}>
          <thead style={styles.thead}>
            <tr>
              <th style={styles.th}>Name</th>
              <th style={styles.th}>Type</th>
              <th style={styles.th}>Cap</th>
              <th style={styles.th}>Location</th>
              <th style={styles.th}>Status</th>
              <th style={styles.th}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((r) => (
              <tr key={r.id} style={styles.tr}>
                <td style={styles.td}><strong>{r.name}</strong></td>
                <td style={styles.td}>{r.type}</td>
                <td style={styles.td}>{r.capacity}</td>
                <td style={styles.td}>{r.location || "-"}</td>
                <td style={styles.td}>
                  <span style={{...styles.statusBadge, ...(r.status ? styles.active : styles.inactive)}}>
                    {r.status ? "Available" : "Unavailable"}
                  </span>
                </td>
                <td style={{...styles.td, textAlign:'right', whiteSpace:'nowrap'}}>
                  <button style={{ ...styles.btn, ...styles.editBtn }} onClick={() => openEdit(r)}>
                    Edit
                  </button>
                  <button style={{ ...styles.btn, ...styles.deleteBtn }} onClick={() => remove(r.id)}>
                    Delete
                  </button>
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
                <h3 style={{margin:0}}>{formMode === "add" ? "Create Room" : "Edit Room"}</h3>
                <button onClick={() => setFormMode("overview")} style={{border:'none', background:'transparent', fontSize:'1.5rem', cursor:'pointer'}}>×</button>
            </div>

            <div style={styles.formGroup}>
                <label style={styles.label}>Room Name</label>
                <input style={styles.input} value={draft.name} onChange={(e) => setDraft({ ...draft, name: e.target.value })} placeholder="e.g. A-101"/>
            </div>

            {/* ✅ NEW ROOM TYPE UI: Dropdown + Add + Delete */}
            <div style={styles.formGroup}>
                <label style={styles.label}>Room Type</label>
                <div style={{display:'flex', gap:'5px'}}>
                    <select
                        style={{...styles.input, flex:1}}
                        value={draft.type}
                        onChange={(e) => setDraft({ ...draft, type: e.target.value })}
                    >
                        <option value="">-- Select Room Type --</option>
                        {/* Standard Group */}
                        <optgroup label="Standard">
                            {STANDARD_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                        </optgroup>
                        {/* Custom Group */}
                        {customTypes.length > 0 && (
                            <optgroup label="Custom">
                                {customTypes.map(t => <option key={t} value={t}>{t}</option>)}
                            </optgroup>
                        )}
                    </select>

                    {/* Add Button */}
                    <button
                        type="button"
                        title="Add new room type"
                        onClick={addNewType}
                        style={{...styles.iconBtn, background: '#e2e6ea'}}
                    >
                        +
                    </button>

                    {/* Delete Button (Only active if custom type is selected) */}
                    <button
                        type="button"
                        title="Delete selected custom type"
                        onClick={deleteType}
                        disabled={!customTypes.includes(draft.type)}
                        style={{
                            ...styles.iconBtn,
                            background: customTypes.includes(draft.type) ? '#f8d7da' : '#eee',
                            color: customTypes.includes(draft.type) ? '#721c24' : '#aaa',
                            cursor: customTypes.includes(draft.type) ? 'pointer' : 'default'
                        }}
                    >
                        🗑
                    </button>
                </div>
            </div>

            <div style={styles.formGroup}>
                <label style={styles.label}>Capacity</label>
                <input type="number" style={styles.input} value={draft.capacity} onChange={(e) => setDraft({ ...draft, capacity: e.target.value })} />
            </div>

            <div style={{display:'flex', gap:'15px'}}>
                <div style={{...styles.formGroup, flex:1}}>
                    <label style={styles.label}>Campus</label>
                    <input style={styles.input} value={draft.campus} onChange={(e) => setDraft({ ...draft, campus: e.target.value })} placeholder="e.g. North Campus"/>
                </div>
                <div style={{...styles.formGroup, flex:1}}>
                    <label style={styles.label}>Building / Room Details</label>
                    <input style={styles.input} value={draft.specific_location} onChange={(e) => setDraft({ ...draft, specific_location: e.target.value })} placeholder="e.g. Floor 2, Wing B"/>
                </div>
            </div>

            <div style={styles.formGroup}>
                <label style={styles.label}>Equipment</label>
                <input style={styles.input} value={draft.equipment} onChange={(e) => setDraft({ ...draft, equipment: e.target.value })} placeholder="Projector, PCs..." />
            </div>

            <div style={styles.formGroup}>
                <label style={{display:'flex', alignItems:'center', gap:'10px', cursor:'pointer'}}>
                    <input
                        type="checkbox"
                        checked={draft.status}
                        onChange={(e) => setDraft({ ...draft, status: e.target.checked })}
                    />
                    <strong>Available for Booking</strong>
                </label>
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