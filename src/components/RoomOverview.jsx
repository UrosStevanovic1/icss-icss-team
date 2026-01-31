import { useEffect, useMemo, useState } from "react";
import api from "../api";

// --- STYLES ---
const styles = {
  container: {
    padding: "30px",
    fontFamily: "'Segoe UI', Roboto, Helvetica, Arial, sans-serif",
    color: "#333",
    maxWidth: "1200px",
    margin: "0 auto",
  },
  campusGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
    gap: "25px",
    marginTop: "40px",
  },
  campusCard: {
    padding: "50px 20px",
    textAlign: "center",
    background: "#ffffff",
    border: "1px solid #e0e0e0",
    borderRadius: "12px",
    cursor: "pointer",
    transition: "all 0.2s ease",
    boxShadow: "0 4px 6px rgba(0,0,0,0.05)",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
  },
  header: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "flex-end",
    marginBottom: "25px",
    borderBottom: "2px solid #f0f0f0",
    paddingBottom: "15px",
  },
  title: { margin: 0, fontSize: "1.8rem", fontWeight: "700", color: "#2c3e50" },
  searchBar: {
    padding: "10px 15px",
    width: "100%",
    maxWidth: "400px",
    borderRadius: "6px",
    border: "1px solid #ccc",
    fontSize: "1rem",
    marginBottom: "20px",
    outline: "none",
  },
  table: {
    width: "100%",
    borderCollapse: "collapse",
    background: "#fff",
    boxShadow: "0 2px 8px rgba(0,0,0,0.06)",
    borderRadius: "8px",
    overflow: "hidden",
  },
  thead: { background: "#f8f9fa" },
  th: {
    textAlign: "left",
    padding: "15px",
    fontWeight: "600",
    borderBottom: "2px solid #dee2e6",
    textTransform: "uppercase",
    fontSize: "0.85rem",
    letterSpacing: "0.05em",
  },
  tr: { borderBottom: "1px solid #eee" },
  td: { padding: "15px", verticalAlign: "middle" },
  statusBadge: (isAvailable) => ({
    display: "inline-block",
    padding: "5px 10px",
    borderRadius: "20px",
    fontSize: "0.75rem",
    fontWeight: "bold",
    backgroundColor: isAvailable ? "#e6fffa" : "#fff5f5",
    color: isAvailable ? "#2c7a7b" : "#c53030",
    border: isAvailable ? "1px solid #b2f5ea" : "1px solid #feb2b2",
    textAlign: "center",
    minWidth: "80px",
  }),
  btn: {
    padding: "8px 16px",
    borderRadius: "6px",
    border: "1px solid transparent",
    cursor: "pointer",
    fontSize: "0.9rem",
    fontWeight: "500",
    transition: "opacity 0.2s",
  },
  primaryBtn: { background: "#3182ce", color: "white" },
  backBtn: { background: "#edf2f7", color: "#4a5568", marginBottom: "10px" },
  editBtn: { background: "#718096", color: "white", marginRight: "5px" },
  deleteBtn: { background: "#e53e3e", color: "white" },
  // Icon Button for Type Add/Delete
  iconBtn: { padding: "8px", width:"40px", cursor: "pointer", border: "1px solid #ccc", borderRadius: "4px", background:"#f0f0f0", display:'flex', alignItems:'center', justifyContent:'center', fontSize:'1.1rem' },

  modalOverlay: {
    position: "fixed", top: 0, left: 0, right: 0, bottom: 0,
    background: "rgba(0,0,0,0.6)",
    display: "flex", justifyContent: "center", alignItems: "center", zIndex: 1000,
    backdropFilter: "blur(2px)",
  },
  modalContent: {
    background: "white", padding: "30px", borderRadius: "12px",
    width: "600px", maxWidth: "95%", maxHeight: "90vh", overflowY: "auto",
  },
  formGroup: { marginBottom: "20px" },
  label: { display: "block", marginBottom: "8px", fontWeight: "600", fontSize: "0.9rem" },
  input: {
    width: "100%", padding: "10px", borderRadius: "6px",
    border: "1px solid #cbd5e0", fontSize: "1rem", boxSizing: "border-box",
  },
  checkboxWrapper: {
    display: "flex", alignItems: "center", gap: "10px", cursor: "pointer", fontSize: "1rem",
  },
};

const STANDARD_TYPES = ["Lecture Classroom", "Computer Lab", "Seminar"];

export default function RoomOverview() {
  const [rooms, setRooms] = useState([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");
  const [selectedCampus, setSelectedCampus] = useState(null);
  const [formMode, setFormMode] = useState("overview");
  const [editingId, setEditingId] = useState(null);

  // Custom Types State
  const [customTypes, setCustomTypes] = useState([]);
  const campuses = ["Berlin", "Dusseldorf", "Munich"];

  const [draft, setDraft] = useState({
    name: "",
    capacity: "",
    type: "",
    available: true,
    campus: "",
    specific_location: "",
    equipment: ""
  });

  async function loadRooms() {
    setLoading(true);
    try {
      const data = await api.getRooms();
      const rawData = Array.isArray(data) ? data : [];

      const mappedRooms = rawData.map(r => {
        // Parse "Berlin - Floor 1" back into parts
        const parts = (r.location || "").split(" - ");
        const derivedCampus = parts[0] || "Unknown";
        const derivedSpecific = parts.length > 1 ? parts.slice(1).join(" - ") : "";

        return {
            ...r,
            available: r.status,
            campus: campuses.includes(derivedCampus) ? derivedCampus : "Other",
            specific_location: derivedSpecific
        };
      });

      setRooms(mappedRooms);

      // Extract custom types from DB
      const existingCustom = mappedRooms
        .map(r => r.type)
        .filter(t => t && !STANDARD_TYPES.includes(t));
      setCustomTypes([...new Set(existingCustom)].sort());

    } catch (e) {
      console.error("Load Error:", e);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadRooms();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function openAdd() {
    setEditingId(null);
    setDraft({
      name: "",
      capacity: "",
      type: "",
      available: true,
      campus: selectedCampus,
      specific_location: "",
      equipment: ""
    });
    setFormMode("add");
  }

  function openEdit(r) {
    setEditingId(r.id);
    setDraft({
      name: r.name,
      capacity: r.capacity,
      type: r.type,
      available: r.available,
      campus: r.campus,
      specific_location: r.specific_location,
      equipment: r.equipment || ""
    });
    setFormMode("edit");
  }

  // Add/Delete Type Logic
  function addNewType() {
      const newType = prompt("Enter new room type:");
      if (newType && newType.trim() !== "") {
          const formatted = newType.trim();
          if (!STANDARD_TYPES.includes(formatted) && !customTypes.includes(formatted)) {
              setCustomTypes([...customTypes, formatted].sort());
          }
          setDraft({ ...draft, type: formatted });
      }
  }

  function deleteType() {
      if (!draft.type) return;
      if (STANDARD_TYPES.includes(draft.type)) return alert("Cannot delete standard room types.");

      if (window.confirm(`Remove "${draft.type}" from the list?`)) {
          setCustomTypes(customTypes.filter(t => t !== draft.type));
          setDraft({ ...draft, type: "" });
      }
  }

  async function save() {
    if (!draft.name.trim() || !draft.capacity || !draft.type) {
      return alert("Name, Type, and Capacity are required.");
    }

    // Combine Campus + Specific Location
    const finalLocation = draft.specific_location
        ? `${draft.campus} - ${draft.specific_location}`
        : draft.campus;

    const payload = {
      name: draft.name.trim(),
      capacity: Number(draft.capacity),
      type: draft.type,
      status: draft.available,
      location: finalLocation,
      equipment: draft.equipment
    };

    try {
      if (formMode === "add") {
        await api.createRoom(payload);
      } else {
        await api.updateRoom(editingId, payload);
      }
      await loadRooms();
      setFormMode("overview");
    } catch (e) {
      console.error(e);
      alert("Error saving room data.");
    }
  }

  async function remove(id) {
    if (!window.confirm("Are you sure you want to delete this room?")) return;
    try {
      await api.deleteRoom(id);
      loadRooms();
    } catch (e) {
      alert("Error deleting room.");
    }
  }

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return rooms.filter((r) => {
      const matchesCampus = r.campus === selectedCampus;
      const matchesQuery = r.name.toLowerCase().includes(q) || r.type.toLowerCase().includes(q);
      return matchesCampus && matchesQuery;
    });
  }, [rooms, query, selectedCampus]);

  // --- VIEW 1: CAMPUS SELECTION ---
  if (!selectedCampus) {
    return (
      <div style={styles.container}>
        <div style={{textAlign: 'center', marginBottom: '40px'}}>
          <h1 style={{fontSize: '2.5rem', color: '#1a202c', marginBottom: '10px'}}>Campus Management</h1>
          <p style={{color: '#718096'}}>Please select a location to view available rooms</p>
        </div>
        <div style={styles.campusGrid}>
          {campuses.map(campus => (
            <div
              key={campus}
              style={styles.campusCard}
              onClick={() => setSelectedCampus(campus)}
              onMouseOver={(e) => {
                e.currentTarget.style.borderColor = "#3182ce";
                e.currentTarget.style.transform = "translateY(-5px)";
              }}
              onMouseOut={(e) => {
                e.currentTarget.style.borderColor = "#e0e0e0";
                e.currentTarget.style.transform = "translateY(0)";
              }}
            >
              <span style={{fontSize: '3rem', marginBottom: '15px'}}>🏢</span>
              <h3 style={{margin: 0, color: '#2d3748'}}>{campus}</h3>
              <p style={{fontSize: '0.9rem', color: '#a0aec0', marginTop: '10px'}}>
                {rooms.filter(r => r.campus === campus).length} Rooms Registered
              </p>
            </div>
          ))}
        </div>
      </div>
    );
  }

  // --- VIEW 2: ROOM OVERVIEW ---
  return (
    <div style={styles.container}>
      <button style={{...styles.btn, ...styles.backBtn}} onClick={() => setSelectedCampus(null)}>
        ← Back to Campus Selection
      </button>

      <div style={styles.header}>
        <div>
          <h2 style={styles.title}>{selectedCampus}</h2>
          <p style={{color: '#718096', margin: '5px 0 0 0'}}>Manage room availability and details</p>
        </div>
        <button style={{...styles.btn, ...styles.primaryBtn}} onClick={openAdd}>
          + Add New Room
        </button>
      </div>

      <input
        style={styles.searchBar}
        placeholder="Search rooms by name or type..."
        value={query}
        onChange={(e) => setQuery(e.target.value)}
      />

      {loading ? <p>Loading room data...</p> : (
        <table style={styles.table}>
          <thead style={styles.thead}>
            <tr>
              <th style={styles.th}>Room Name</th>
              <th style={styles.th}>Type</th>
              <th style={styles.th}>Details</th>
              <th style={styles.th}>Cap</th>
              <th style={{...styles.th, textAlign:'center'}}>Status</th>
              <th style={{...styles.th, textAlign:'right'}}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr>
                <td colSpan="6" style={{...styles.td, textAlign: 'center', padding: '50px', color: '#a0aec0'}}>
                  No rooms found in this location.
                </td>
              </tr>
            ) : filtered.map((r) => (
              <tr key={r.id} style={styles.tr}>
                <td style={styles.td}><strong>{r.name}</strong></td>
                <td style={styles.td}>{r.type}</td>
                <td style={styles.td}>
                    {r.specific_location && <div style={{fontSize:'0.85rem', color:'#666'}}>{r.specific_location}</div>}
                    {r.equipment && <div style={{fontSize:'0.8rem', color:'#999', fontStyle:'italic'}}>{r.equipment}</div>}
                </td>
                <td style={styles.td}>{r.capacity}</td>
                <td style={{...styles.td, textAlign:'center'}}>
                  <span style={styles.statusBadge(r.available)}>
                    {r.available ? 'Available' : 'Occupied'}
                  </span>
                </td>
                <td style={{...styles.td, textAlign:'right', whiteSpace:'nowrap'}}>
                  <button style={{...styles.btn, ...styles.editBtn}} onClick={() => openEdit(r)}>Edit</button>
                  <button style={{...styles.btn, ...styles.deleteBtn}} onClick={() => remove(r.id)}>Delete</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      {/* --- MODAL --- */}
      {(formMode === "add" || formMode === "edit") && (
        <div style={styles.modalOverlay}>
            <div style={styles.modalContent}>
                <div style={{display:'flex', justifyContent:'space-between', marginBottom:'20px', alignItems: 'center'}}>
                    <h3 style={{margin:0, fontSize: '1.4rem'}}>{formMode === "add" ? "Add New Room" : "Edit Room"}</h3>
                    <button onClick={() => setFormMode("overview")} style={{border:'none', background:'transparent', fontSize:'1.8rem', cursor:'pointer', color: '#a0aec0'}}>×</button>
                </div>

                <div style={{background: '#f7fafc', padding: '10px', borderRadius: '6px', marginBottom: '20px', fontSize: '0.9rem'}}>
                  Location: <strong>{selectedCampus}</strong>
                </div>

                <div style={styles.formGroup}>
                    <label style={styles.label}>Room Name</label>
                    <input style={styles.input} value={draft.name} onChange={e => setDraft({...draft, name: e.target.value})} placeholder="e.g. Science Lab 102" />
                </div>

                {/* Custom Type Selector with Add/Delete */}
                <div style={styles.formGroup}>
                    <label style={styles.label}>Room Type</label>
                    <div style={{display:'flex', gap:'8px'}}>
                        <select
                            style={{...styles.input, flex:1}}
                            value={draft.type}
                            onChange={(e) => setDraft({ ...draft, type: e.target.value })}
                        >
                            <option value="">-- Select Room Type --</option>
                            <optgroup label="Standard">
                                {STANDARD_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                            </optgroup>
                            {customTypes.length > 0 && (
                                <optgroup label="Custom">
                                    {customTypes.map(t => <option key={t} value={t}>{t}</option>)}
                                </optgroup>
                            )}
                        </select>
                        <button type="button" title="Add Type" onClick={addNewType} style={styles.iconBtn}>+</button>
                        <button
                            type="button" title="Delete Type" onClick={deleteType}
                            disabled={!customTypes.includes(draft.type)}
                            style={{...styles.iconBtn, opacity: customTypes.includes(draft.type) ? 1 : 0.5}}
                        >🗑</button>
                    </div>
                </div>

                <div style={styles.formGroup}>
                    <label style={styles.label}>Capacity</label>
                    <input type="number" style={styles.input} value={draft.capacity} onChange={e => setDraft({...draft, capacity: e.target.value})} placeholder="0" />
                </div>

                {/* Specific Location & Equipment */}
                <div style={{display:'flex', gap:'15px', marginBottom:'20px'}}>
                    <div style={{flex:1}}>
                        <label style={styles.label}>Specific Details (Floor/Wing)</label>
                        <input style={styles.input} value={draft.specific_location} onChange={e => setDraft({...draft, specific_location: e.target.value})} placeholder="e.g. Floor 2" />
                    </div>
                    <div style={{flex:1}}>
                        <label style={styles.label}>Equipment</label>
                        <input style={styles.input} value={draft.equipment} onChange={e => setDraft({...draft, equipment: e.target.value})} placeholder="Projector, PC..." />
                    </div>
                </div>

                <div style={styles.formGroup}>
                    <label style={styles.checkboxWrapper}>
                        <input type="checkbox" checked={draft.available} style={{width: '18px', height: '18px'}} onChange={e => setDraft({...draft, available: e.target.checked})} />
                        Mark room as available for booking
                    </label>
                </div>

                <div style={{marginTop: '30px', display:'flex', justifyContent:'flex-end', gap:'12px'}}>
                    <button style={{...styles.btn, background: '#fff', border: '1px solid #cbd5e0'}} onClick={() => setFormMode("overview")}>Cancel</button>
                    <button style={{...styles.btn, ...styles.primaryBtn}} onClick={save}>
                        {formMode === "add" ? "Create Room" : "Update Details"}
                    </button>
                </div>
            </div>
        </div>
      )}
    </div>
  );
}