import { useEffect, useMemo, useState } from "react";
import api from "../api";

// --- STYLES ---
const styles = {
  container: { 
    padding: "30px", 
    fontFamily: "'Segoe UI', Roboto, sans-serif", 
    color: "#333", 
    maxWidth: "1200px", 
    margin: "0 auto" 
  },
  headerSection: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: "20px"
  },
  title: { margin: 0, fontSize: "1.5rem", fontWeight: "700" },
  tabContainer: {
    display: "flex",
    gap: "10px",
    marginBottom: "20px",
    borderBottom: "1px solid #e0e0e0",
    paddingBottom: "10px"
  },
  tab: (isActive, isDefault) => ({
    padding: "8px 16px",
    borderRadius: "20px",
    cursor: "pointer",
    fontSize: "0.9rem",
    fontWeight: "600",
    backgroundColor: isActive ? "#3182ce" : "#f1f1f1",
    color: isActive ? "white" : "#4a5568",
    border: isDefault && !isActive ? "1px solid #3182ce" : "1px solid transparent",
    transition: "0.2s"
  }),
  searchBar: { 
    padding: "10px 15px", 
    width: "100%", 
    maxWidth: "350px", 
    borderRadius: "6px", 
    border: "1px solid #ddd" 
  },
  table: { width: "100%", borderCollapse: "collapse", background: "#fff", borderRadius: "8px", overflow: "hidden", marginTop: "20px" },
  th: { textAlign: "left", padding: "12px", borderBottom: "2px solid #eee", fontSize: "0.8rem", color: "#718096", textTransform: "uppercase" },
  td: { padding: "12px", borderBottom: "1px solid #f7f7f7" },
  statusBadge: (isAvailable) => ({
    padding: "4px 10px",
    borderRadius: "12px",
    fontSize: "0.75rem",
    fontWeight: "bold",
    background: isAvailable ? "#e6fffa" : "#fff5f5",
    color: isAvailable ? "#2c7a7b" : "#c53030"
  }),
  btn: { padding: "8px 15px", borderRadius: "6px", cursor: "pointer", border: "none", fontWeight: "500", transition: "0.2s" },
  primaryBtn: { background: "#3182ce", color: "white" },
  secondaryBtn: { background: "#edf2f7", color: "#4a5568" },
  modalOverlay: { position: "fixed", top: 0, left: 0, right: 0, bottom: 0, background: "rgba(0,0,0,0.5)", display: "flex", justifyContent: "center", alignItems: "center", zIndex: 1000 },
  modalContent: { background: "white", padding: "25px", borderRadius: "12px", width: "450px", boxShadow: "0 10px 25px rgba(0,0,0,0.1)" },
  formGroup: { marginBottom: "15px" },
  label: { display: "block", marginBottom: "5px", fontSize: "0.9rem", fontWeight: "600" },
  input: { width: "100%", padding: "10px", borderRadius: "6px", border: "1px solid #ccc", boxSizing: "border-box" }
};

export default function RoomOverview() {
  const [rooms, setRooms] = useState([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");
  
  // 1. Profile-based default location
  const userAccountLocation = "Berlin"; 
  const [selectedCampus, setSelectedCampus] = useState(userAccountLocation);
  
  const [formMode, setFormMode] = useState("overview");
  const [editingId, setEditingId] = useState(null);
  const [draft, setDraft] = useState({ name: "", capacity: "", type: "Lecture Classroom", available: true });

  const campuses = ["Berlin", "Dusseldorf", "Munich"];

  useEffect(() => {
    loadRooms();
  }, []);

  async function loadRooms() {
    setLoading(true);
    try {
      const data = await api.getRooms();
      setRooms(Array.isArray(data) ? data : []);
    } catch (e) { 
      console.error("Error fetching rooms:", e); 
    } finally { 
      setLoading(false); 
    }
  }

  const openAdd = () => {
    setEditingId(null);
    setDraft({ name: "", capacity: "", type: "Lecture Classroom", available: true, campus: selectedCampus });
    setFormMode("add");
  };

  const openEdit = (room) => {
    setEditingId(room.id);
    setDraft({ ...room });
    setFormMode("edit");
  };

  const save = async () => {
    if (!draft.name || !draft.capacity) return alert("Please fill in room details.");
    
    const payload = { ...draft, campus: selectedCampus }; 
    try {
      if (formMode === "add") {
        await api.createRoom(payload);
      } else {
        await api.updateRoom(editingId, payload);
      }
      await loadRooms();
      setFormMode("overview");
    } catch (e) { 
      alert("Error saving room data"); 
    }
  };

  const filtered = useMemo(() => {
    return rooms.filter(r => 
      r.campus === selectedCampus && 
      (r.name.toLowerCase().includes(query.toLowerCase()) || r.type.toLowerCase().includes(query.toLowerCase()))
    );
  }, [rooms, query, selectedCampus]);

  return (
    <div style={styles.container}>
      <div style={styles.headerSection}>
        <h2 style={styles.title}>Rooms Management</h2>
        <button style={{...styles.btn, ...styles.primaryBtn}} onClick={openAdd}>+ Add Room</button>
      </div>

      <div style={styles.tabContainer}>
        {campuses.map(campus => (
          <div 
            key={campus} 
            style={styles.tab(selectedCampus === campus, userAccountLocation === campus)}
            onClick={() => setSelectedCampus(campus)}
          >
            {campus} {userAccountLocation === campus && "🏠"}
          </div>
        ))}
      </div>

      <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: "10px"}}>
        <input
          style={styles.searchBar}
          placeholder={`Search rooms in ${selectedCampus}...`}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
        <p style={{fontSize: '0.85rem', color: '#718096'}}>
            Showing: <b>{selectedCampus}</b> (Default: {userAccountLocation})
        </p>
      </div>

      {loading ? <p>Loading rooms...</p> : (
        <table style={styles.table}>
          <thead>
            <tr>
              <th style={styles.th}>Room Name</th>
              <th style={styles.th}>Type</th>
              <th style={styles.th}>Capacity</th>
              <th style={styles.th}>Status</th>
              <th style={{...styles.th, textAlign: 'right'}}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr>
                <td colSpan="5" style={{textAlign: 'center', padding: '40px', color: '#a0aec0'}}>
                  No rooms found for {selectedCampus}.
                </td>
              </tr>
            ) : (
              filtered.map(r => (
                <tr key={r.id}>
                  <td style={styles.td}><b>{r.name}</b></td>
                  <td style={styles.td}>{r.type}</td>
                  <td style={styles.td}>{r.capacity}</td>
                  <td style={styles.td}>
                    <span style={styles.statusBadge(r.available)}>{r.available ? 'Available' : 'Occupied'}</span>
                  </td>
                  <td style={{...styles.td, textAlign: 'right'}}>
                    <button 
                      style={{...styles.btn, ...styles.secondaryBtn}} 
                      onClick={() => openEdit(r)}
                    >
                      Edit
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      )}

      {(formMode === "add" || formMode === "edit") && (
        <div style={styles.modalOverlay}>
          <div style={styles.modalContent}>
            <h3 style={{marginTop: 0}}>{formMode === "add" ? "Add" : "Edit"} Room</h3>
            <p style={{fontSize: '0.8rem', color: '#666'}}>Location: {selectedCampus}</p>
            
            <div style={styles.formGroup}>
              <label style={styles.label}>Room Name</label>
              <input 
                style={styles.input} 
                value={draft.name} 
                onChange={e => setDraft({...draft, name: e.target.value})} 
                placeholder="e.g. Room 101"
              />
            </div>
            
            <div style={styles.formGroup}>
              <label style={styles.label}>Capacity</label>
              <input 
                type="number" 
                style={styles.input} 
                value={draft.capacity} 
                onChange={e => setDraft({...draft, capacity: e.target.value})} 
              />
            </div>

            <div style={{display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '20px'}}>
              <button style={{...styles.btn, ...styles.secondaryBtn}} onClick={() => setFormMode("overview")}>Cancel</button>
              <button style={{...styles.btn, ...styles.primaryBtn}} onClick={save}>Save Changes</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}