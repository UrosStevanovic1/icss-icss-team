import React, { useState, useEffect } from "react";
import api from "../api";

export default function OfferedModules() {
  // ✅ INTEGRACIÓN: Variable para guardar los semestres REALES de la base de datos
  const [availableSemesters, setAvailableSemesters] = useState([]);

  const [semester, setSemester] = useState("");
  const [offers, setOffers] = useState([]);

  const [allModules, setAllModules] = useState([]);
  const [programs, setPrograms] = useState([]);
  const [lecturers, setLecturers] = useState([]);

  const [showModal, setShowModal] = useState(false);
  const [selectedProgramId, setSelectedProgramId] = useState("");
  const [newOffer, setNewOffer] = useState({ module_code: "", lecturer_id: "" });

  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [itemToDelete, setItemToDelete] = useState(null);
  const [deleteInput, setDeleteInput] = useState("");

  // 1. CARGAR SEMESTRES DE SHAYAN AL INICIO
  useEffect(() => {
    async function fetchSemesters() {
      try {
        const s = await api.getSemesters(); // Llamada a la tabla real
        setAvailableSemesters(s);

        // Si hay semestres, seleccionar el primero automáticamente para que no salga vacío
        if (s && s.length > 0) {
            setSemester(s[0].name);
        }
      } catch (e) { console.error("Error fetching semesters", e); }
    }
    fetchSemesters();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // 2. Cargar Ofertas cuando cambia el semestre
  useEffect(() => {
    if (semester) {
        loadTableData();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [semester]);

  // 3. Cargar Listas (Programas, Materias, Profes)
  useEffect(() => {
    loadDropdownData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function loadTableData() {
    try {
      const data = await api.getOfferedModules(semester);
      setOffers(data);
    } catch (e) { console.error("Error loading offers:", e); }
  }

  async function loadDropdownData() {
    try {
      const p = await api.getPrograms();
      const m = await api.getModules();
      const l = await api.getLecturers();
      setPrograms(p);
      setAllModules(m);
      setLecturers(l);
    } catch (e) { console.error("Error loading dropdowns:", e); }
  }

  const filteredModules = selectedProgramId
    ? allModules.filter(m => m.program_id === parseInt(selectedProgramId))
    : allModules;

  // --- LOGICA DE CREAR ---
  async function handleSave() {
    if (!newOffer.module_code) return alert("Please select a module");
    if (!semester) return alert("Please select a semester first");

    try {
      await api.createOfferedModule({
        module_code: newOffer.module_code,
        lecturer_id: newOffer.lecturer_id || null,
        semester: semester, // Enviamos el nombre real del semestre
        status: "Confirmed"
      });
      setShowModal(false);
      loadTableData();
      setNewOffer({ module_code: "", lecturer_id: "" });
      setSelectedProgramId("");
    } catch (e) {
      alert("Error: " + (e.response?.data?.detail || e.message));
    }
  }

  // --- LOGICA DE ELIMINAR ---
  function onClickDelete(offer) {
    setItemToDelete(offer);
    setDeleteInput("");
    setShowDeleteModal(true);
  }

  async function executeDelete() {
    if (deleteInput !== "DELETE") return;
    try {
      await api.deleteOfferedModule(itemToDelete.id);
      setShowDeleteModal(false);
      setItemToDelete(null);
      loadTableData();
    } catch (e) { alert("Error deleting"); }
  }

  return (
    <div style={{ padding: "20px", fontFamily: "Segoe UI, sans-serif" }}>
      {/* HEADER */}
      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "20px", borderBottom:"1px solid #ccc", paddingBottom:"15px" }}>
        <div>
            <h2 style={{margin:0}}>Semester Planning</h2>
            <div style={{marginTop: "5px", color:"#666"}}>
                <label style={{marginRight: "10px"}}>Manage offers for:</label>

                {/* SELECTOR CONECTADO A LA BD REAL */}
                <select
                    style={{ padding:"5px", fontWeight:"bold", minWidth: "150px" }}
                    value={semester}
                    onChange={e => setSemester(e.target.value)}
                >
                    {availableSemesters.length === 0 && <option value="">Loading semesters...</option>}
                    {availableSemesters.map(s => (
                        <option key={s.id} value={s.name}>
                            {s.name} ({s.acronym})
                        </option>
                    ))}
                </select>
            </div>
        </div>

        <button
            disabled={!semester}
            onClick={() => setShowModal(true)}
            style={{
                padding: "10px 20px",
                background: semester ? "#007bff" : "#ccc",
                color: "white",
                border: "none",
                borderRadius: "5px",
                cursor: semester ? "pointer" : "not-allowed"
            }}
        >
            + Offer Module
        </button>
      </div>

      {/* TABLA PRINCIPAL */}
      <table style={{ width: "100%", borderCollapse: "collapse", boxShadow: "0 2px 5px rgba(0,0,0,0.1)", background: "white" }}>
        <thead style={{ background: "#f8f9fa" }}>
          <tr>
            <th style={{ padding: "12px", textAlign: "left" }}>Module</th>
            <th style={{ padding: "12px", textAlign: "left" }}>Code</th>
            <th style={{ padding: "12px", textAlign: "left" }}>Lecturer</th>
            <th style={{ padding: "12px", textAlign: "right" }}>Action</th>
          </tr>
        </thead>
        <tbody>
          {offers.map((offer) => (
            <tr key={offer.id} style={{ borderBottom: "1px solid #eee" }}>
              <td style={{ padding: "12px" }}>{offer.module_name}</td>
              <td style={{ padding: "12px", color: "#666" }}>{offer.module_code}</td>
              <td style={{ padding: "12px" }}>{offer.lecturer_name}</td>
              <td style={{ padding: "12px", textAlign: "right" }}>
                <button onClick={() => onClickDelete(offer)} style={{ background: "#dc3545", color: "white", border: "none", padding: "5px 10px", borderRadius: "3px", cursor: "pointer" }}>Delete</button>
              </td>
            </tr>
          ))}
          {offers.length === 0 && (
            <tr>
                <td colSpan="4" style={{ padding: "20px", textAlign: "center", color: "#666" }}>
                    {semester ? `No modules offered in ${semester} yet.` : "Please select a semester above."}
                </td>
            </tr>
          )}
        </tbody>
      </table>

      {/* MODAL CREAR */}
      {showModal && (
        <div style={{ position: "fixed", top: 0, left: 0, right: 0, bottom: 0, background: "rgba(0,0,0,0.5)", display: "flex", justifyContent: "center", alignItems: "center", zIndex: 1000 }}>
          <div style={{ background: "white", padding: "30px", borderRadius: "8px", width: "400px" }}>
            <h3>Add Module to {semester}</h3>

            <label style={{display:"block", marginTop:"10px", fontWeight:"bold"}}>Filter by Program:</label>
            <select style={{width:"100%", padding:"8px"}} value={selectedProgramId} onChange={e => setSelectedProgramId(e.target.value)}>
                <option value="">-- All Programs --</option>
                {programs.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>

            <label style={{display:"block", marginTop:"10px", fontWeight:"bold"}}>Module <span style={{color:"red"}}>*</span>:</label>
            <select style={{width:"100%", padding:"8px", background: selectedProgramId ? "#eef" : "white"}} onChange={e => setNewOffer({...newOffer, module_code: e.target.value})}>
                <option value="">-- Select Module --</option>
                {filteredModules.map(m => <option key={m.module_code} value={m.module_code}>{m.name} ({m.module_code})</option>)}
            </select>

            <label style={{display:"block", marginTop:"10px", fontWeight:"bold"}}>Lecturer (Optional):</label>
            <select style={{width:"100%", padding:"8px"}} onChange={e => setNewOffer({...newOffer, lecturer_id: e.target.value})}>
                <option value="">-- None --</option>
                {lecturers.map(l => <option key={l.id} value={l.id}>{l.first_name} {l.last_name}</option>)}
            </select>

            <div style={{ marginTop: "20px", textAlign: "right" }}>
                <button onClick={() => setShowModal(false)} style={{ marginRight: "10px", padding: "8px 15px", cursor:"pointer" }}>Cancel</button>
                <button onClick={handleSave} style={{ background: "#007bff", color: "white", border: "none", padding: "8px 15px", borderRadius:"4px", cursor:"pointer" }}>Save</button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL ELIMINAR */}
      {showDeleteModal && itemToDelete && (
        <div style={{ position: "fixed", top: 0, left: 0, right: 0, bottom: 0, background: "rgba(0,0,0,0.5)", display: "flex", justifyContent: "center", alignItems: "center", zIndex: 1000 }}>
          <div style={{ background: "white", padding: "30px", borderRadius: "8px", width: "450px", boxShadow: "0 4px 10px rgba(0,0,0,0.2)" }}>
            <h3 style={{ margin: "0 0 15px 0", color: "#dc3545" }}>Delete Module Offer?</h3>
            <p style={{ color: "#555", lineHeight: "1.5" }}>
              This action cannot be undone. It will remove the offer for: <br/>
              <strong style={{ color: "#000" }}>{itemToDelete.module_name}</strong> <br/>
              from the semester <strong>{semester}</strong>.
            </p>
            <label style={{ display: "block", marginTop: "20px", fontWeight: "bold", fontSize: "0.9rem" }}>Type "DELETE" to confirm:</label>
            <input
              type="text"
              value={deleteInput}
              onChange={(e) => setDeleteInput(e.target.value)}
              placeholder="DELETE"
              style={{ width: "100%", padding: "10px", marginTop: "5px", borderRadius: "5px", border: "1px solid #ccc", fontSize: "1rem" }}
            />
            <div style={{ marginTop: "25px", textAlign: "right", display: "flex", justifyContent: "flex-end", gap: "10px" }}>
                <button onClick={() => setShowDeleteModal(false)} style={{ padding: "10px 20px", background: "#e2e6ea", border: "1px solid #ccc", borderRadius: "5px", cursor: "pointer", fontWeight: "600", color: "#333" }}>Cancel</button>
                <button onClick={executeDelete} disabled={deleteInput !== "DELETE"} style={{ padding: "10px 20px", background: deleteInput === "DELETE" ? "#dc3545" : "#f5c6cb", color: "white", border: "none", borderRadius: "5px", cursor: deleteInput === "DELETE" ? "pointer" : "not-allowed", fontWeight: "600" }}>Permanently Delete</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}