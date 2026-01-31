import React, { useEffect, useState } from "react";
import api from "../api";

const styles = {
  container: { padding: "20px", fontFamily: "'Segoe UI', sans-serif", color: "#333", maxWidth: "100%" },
  header: { display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px", borderBottom: "1px solid #ccc", paddingBottom: "15px" },
  title: { margin: 0, fontSize: "1.5rem" },
  table: { width: "100%", borderCollapse: "collapse", background: "#fff", border: "1px solid #ddd", fontSize: "0.9rem" },
  thead: { background: "#f2f2f2", borderBottom: "2px solid #ccc" },
  th: { textAlign: "left", padding: "10px 15px", fontWeight: 600, color: "#444" },
  tr: { borderBottom: "1px solid #eee", cursor: "pointer" },
  td: { padding: "10px 15px", verticalAlign: "middle" },
  btn: { padding: "6px 12px", borderRadius: "4px", border: "none", cursor: "pointer", fontSize: "0.9rem", marginLeft: "5px" },
  primaryBtn: { background: "#007bff", color: "white" },
  editBtn: { background: "#6c757d", color: "white" },
  deleteBtn: { background: "#dc3545", color: "white" },

  gridRow: { padding: "10px 0", borderBottom: "1px solid #eee" },
  dayHeader: { display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "8px" },
  dayLabel: { fontWeight: "bold", width: "100px" },
  rangeRow: { display: "flex", alignItems: "center", gap: "10px", marginTop: "5px" },
  timeInput: { padding: "5px", border: "1px solid #ccc", borderRadius: "4px", width: "90px" },
  iconBtn: { cursor: "pointer", background: "none", border: "none", color: "#dc3545", fontSize: "1.1rem", padding: "0 5px" },
  addBtn: { cursor: "pointer", background: "none", border: "none", color: "#007bff", fontSize: "0.9rem", fontWeight: "bold", marginTop: "5px" },
  expandedRow: { background: "#f8f9fa" },
  expandedContent: { padding: "15px 20px", borderLeft: "4px solid #28a745" },
  modalOverlay: { position: "fixed", top: 0, left: 0, right: 0, bottom: 0, background: "rgba(0,0,0,0.5)", display: "flex", justifyContent: "center", alignItems: "center", zIndex: 1000 },
  modalContent: { background: "white", padding: "25px", borderRadius: "8px", width: "700px", maxWidth: "95%", maxHeight: "90vh", overflowY: "auto", boxShadow: "0 5px 15px rgba(0,0,0,0.3)" },
};

const DAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];

export default function AvailabilityOverview() {
  const [lecturers, setLecturers] = useState([]);
  const [availabilities, setAvailabilities] = useState([]); // Array of { lecturer_id, schedule_data }
  const [loading, setLoading] = useState(true);

  const [modalOpen, setModalOpen] = useState(false);
  const [selectedLecturerId, setSelectedLecturerId] = useState(null);
  const [weekDraft, setWeekDraft] = useState({});
  const [expandedId, setExpandedId] = useState(null);

  useEffect(() => { loadData(); }, []);

  async function loadData() {
    setLoading(true);
    try {
      const [lecData, availData] = await Promise.all([
        api.getLecturers(),
        api.getAvailabilities()
      ]);
      setLecturers(Array.isArray(lecData) ? lecData : []);
      setAvailabilities(Array.isArray(availData) ? availData : []);
    } catch (e) {
      alert("Failed to load data");
    } finally {
      setLoading(false);
    }
  }


  function initDraft(lecturerId, existingData = {}) {
    const draft = {};
    DAYS.forEach(day => {
      if (existingData && existingData[day]) {
        // Use existing data
        draft[day] = existingData[day];
      } else {
        // Default empty state
        draft[day] = {
          is_available: false,
          ranges: [{ start: "09:00", end: "17:00" }]
        };
      }
    });
    setWeekDraft(draft);
    setSelectedLecturerId(lecturerId);
    setModalOpen(true);
  }

  function openEdit(lecturerId) {
    const record = availabilities.find(a => a.lecturer_id === lecturerId);
    initDraft(lecturerId, record ? record.schedule_data : null);
  }

  function openAdd() {
    setSelectedLecturerId("");
    initDraft(null, null);
    setModalOpen(true);
  }

  async function save() {
    if (!selectedLecturerId) return alert("Please select a lecturer");


    const payload = {
      lecturer_id: parseInt(selectedLecturerId),
      schedule_data: weekDraft
    };

    try {
      await api.updateLecturerWeek(payload);
      setModalOpen(false);
      loadData();
    } catch (e) {
      alert("Error saving availability");
    }
  }

  async function remove(lecturerId) {
    if (!window.confirm("Clear all availability rules for this lecturer?")) return;
    try {
      await api.deleteLecturerAvailability(lecturerId);
      loadData();
    } catch(e) { alert("Error deleting"); }
  }

  const toggleExpand = (id, e) => {
    if (e.target.closest('button')) return;
    setExpandedId(expandedId === id ? null : id);
  };

  const toggleDayAvailability = (day) => {
    setWeekDraft(prev => ({
        ...prev,
        [day]: { ...prev[day], is_available: !prev[day].is_available }
    }));
  };

  const addRange = (day) => {
    setWeekDraft(prev => ({
        ...prev,
        [day]: {
            ...prev[day],
            ranges: [...prev[day].ranges, { start: "09:00", end: "12:00" }]
        }
    }));
  };

  const removeRange = (day, index) => {
    setWeekDraft(prev => {
        const newRanges = [...prev[day].ranges];
        newRanges.splice(index, 1);
        return { ...prev, [day]: { ...prev[day], ranges: newRanges } };
    });
  };

  const updateRangeTime = (day, index, field, value) => {
    setWeekDraft(prev => {
        const newRanges = [...prev[day].ranges];
        newRanges[index] = { ...newRanges[index], [field]: value };
        return { ...prev, [day]: { ...prev[day], ranges: newRanges } };
    });
  };

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <h2 style={styles.title}>Work Availability Overview</h2>
        <div style={{ display: "flex", gap: 10 }}>
          <button style={{...styles.btn, background:"#fff", border:"1px solid #ccc"}} onClick={loadData}>Refresh</button>
          <button style={{...styles.btn, ...styles.primaryBtn}} onClick={openAdd}>+ Set Availability</button>
        </div>
      </div>

      {loading ? <p>Loading...</p> : (
        <table style={styles.table}>
          <thead style={styles.thead}>
            <tr>
              <th style={styles.th}></th>
              <th style={styles.th}>Lecturer Name</th>
              <th style={styles.th}>Status</th>
              <th style={styles.th}>Action</th>
            </tr>
          </thead>
          <tbody>
            {lecturers.map(l => {
              const record = availabilities.find(a => a.lecturer_id === l.id);
              const schedule = record ? record.schedule_data : {};

              // Calculate basic status for display
              let activeDays = 0;
              DAYS.forEach(d => { if (schedule[d]?.is_available) activeDays++; });

              return (
                <React.Fragment key={l.id}>
                  <tr style={styles.tr} onClick={(e) => toggleExpand(l.id, e)}>
                    <td style={styles.td}>{expandedId === l.id ? "▼" : "▶"}</td>
                    <td style={styles.td}><strong>{l.first_name} {l.last_name}</strong></td>
                    <td style={styles.td}>
                      {record
                        ? <span style={{color: activeDays > 0 ? 'green' : '#777', fontWeight:'bold'}}>
                            {activeDays > 0 ? `Available (${activeDays} days)` : "Set as Unavailable"}
                          </span>
                        : <span style={{color:'#777'}}>No constraints set</span>}
                    </td>
                    <td style={styles.td}>
                      <button style={{...styles.btn, ...styles.editBtn}} onClick={() => openEdit(l.id)}>Edit Schedule</button>
                      {record && (
                        <button style={{...styles.btn, ...styles.deleteBtn}} onClick={() => remove(l.id)}>Clear</button>
                      )}
                    </td>
                  </tr>

                  {expandedId === l.id && (
                    <tr style={styles.expandedRow}>
                      <td colSpan="4" style={{padding:0}}>
                        <div style={styles.expandedContent}>
                          <h4 style={{marginTop:0, marginBottom:'10px', color:'#28a745'}}>Weekly Schedule</h4>
                          {!record ? (
                            <p style={{color:'#666'}}>No schedule defined.</p>
                          ) : (
                            <div style={{display:'grid', gridTemplateColumns:'repeat(auto-fill, minmax(180px, 1fr))', gap:'10px'}}>
                              {DAYS.map(day => {
                                const dayData = schedule[day];
                                const isAvail = dayData?.is_available;

                                return (
                                  <div key={day} style={{
                                    border: '1px solid #ddd', padding:'10px', borderRadius:'6px',
                                    background: isAvail ? '#fff' : '#f9f9f9',
                                    opacity: isAvail ? 1 : 0.6
                                  }}>
                                    <div style={{fontWeight:'bold', marginBottom:'5px'}}>{day}</div>
                                    {isAvail ? (
                                      <div style={{fontSize:'0.85rem', color:'green'}}>
                                        {(dayData.ranges || []).map((r, idx) => (
                                            <div key={idx}>{r.start} - {r.end}</div>
                                        ))}
                                      </div>
                                    ) : (
                                      <div style={{fontSize:'0.8rem', color:'#999'}}>Unavailable</div>
                                    )}
                                  </div>
                                );
                              })}
                            </div>
                          )}
                        </div>
                      </td>
                    </tr>
                  )}
                </React.Fragment>
              );
            })}
          </tbody>
        </table>
      )}

      {modalOpen && (
        <div style={styles.modalOverlay}>
          <div style={styles.modalContent}>
             <div style={{display:'flex', justifyContent:'space-between', marginBottom:'20px'}}>
                <h3 style={{margin:0}}>Set Availability</h3>
                <button onClick={() => setModalOpen(false)} style={{border:'none', background:'transparent', fontSize:'1.5rem', cursor:'pointer'}}>×</button>
            </div>

            <div style={{marginBottom:'20px'}}>
              <label style={{fontWeight:'bold', display:'block', marginBottom:'5px'}}>Lecturer</label>
              <select
                style={{width:'100%', padding:'8px', borderRadius:'4px', border:'1px solid #ccc'}}
                value={selectedLecturerId || ""}
                onChange={(e) => {
                    setSelectedLecturerId(e.target.value);
                    const rec = availabilities.find(a => a.lecturer_id === parseInt(e.target.value));
                    initDraft(e.target.value, rec ? rec.schedule_data : null);
                }}
              >
                <option value="">-- Select Lecturer --</option>
                {lecturers.map(l => (
                    <option key={l.id} value={l.id}>{l.first_name} {l.last_name}</option>
                ))}
              </select>
            </div>

            {selectedLecturerId && (
              <div style={{border:'1px solid #eee', borderRadius:'6px', padding:'10px', background:'#fdfdfd'}}>
                 {DAYS.map(day => {
                   const dayData = weekDraft[day];
                   if (!dayData) return null;

                   return (
                     <div key={day} style={styles.gridRow}>
                        <div style={styles.dayHeader}>
                            <div style={styles.dayLabel}>{day}</div>
                            <label style={{display:'flex', alignItems:'center', gap:'5px', cursor:'pointer'}}>
                                <input
                                    type="checkbox"
                                    checked={dayData.is_available}
                                    onChange={() => toggleDayAvailability(day)}
                                />
                                <span style={{fontSize:'0.9rem', color: dayData.is_available ? '#000' : '#777'}}>
                                    {dayData.is_available ? "Available" : "Unavailable"}
                                </span>
                            </label>
                        </div>

                        {dayData.is_available && (
                            <div style={{paddingLeft:'10px'}}>
                                {dayData.ranges.map((range, index) => (
                                    <div key={index} style={styles.rangeRow}>
                                        <input
                                            type="time"
                                            style={styles.timeInput}
                                            value={range.start}
                                            onChange={(e) => updateRangeTime(day, index, 'start', e.target.value)}
                                        />
                                        <span>to</span>
                                        <input
                                            type="time"
                                            style={styles.timeInput}
                                            value={range.end}
                                            onChange={(e) => updateRangeTime(day, index, 'end', e.target.value)}
                                        />
                                        <button
                                            title="Remove time slot"
                                            style={styles.iconBtn}
                                            onClick={() => removeRange(day, index)}
                                        >
                                            ×
                                        </button>
                                    </div>
                                ))}

                                <button
                                    style={styles.addBtn}
                                    onClick={() => addRange(day)}
                                >
                                    + Add Time Slot
                                </button>
                            </div>
                        )}
                     </div>
                   );
                 })}
              </div>
            )}

            <div style={{marginTop: '25px', display:'flex', justifyContent:'flex-end', gap:'10px'}}>
                <button style={{...styles.btn, background:'#f8f9fa', border:'1px solid #ddd'}} onClick={() => setModalOpen(false)}>Cancel</button>
                <button style={{...styles.btn, ...styles.primaryBtn}} onClick={save}>Save Schedule</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}