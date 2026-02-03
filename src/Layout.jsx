import React from "react";
import api from "./api";
import "./App.css";

const Layout = ({ activeTab, setActiveTab, children, currentUserRole, setCurrentUserRole }) => {
  // Normalizamos el rol actual para comparaciones
  const role = (currentUserRole || "").toLowerCase();

  const NavLink = ({ id, icon, label, rolesAllowed = [] }) => {
    // Si la lista de permitidos tiene roles y el mío no está, adiós.
    if (rolesAllowed.length > 0 && !rolesAllowed.includes(role)) {
      return null;
    }
    return (
      <div
        className={`nav-item ${activeTab === id ? "active" : ""}`}
        onClick={() => setActiveTab(id)}
      >
        <span style={{ fontSize: "1.2em" }}>{icon}</span>
        <span>{label}</span>
      </div>
    );
  };

  const handleRoleChange = async (e) => {
    const newRole = e.target.value;
    if (newRole === "Guest") return;

    let email = "";
    const password = "password";

    if (newRole === "PM") email = "pm@icss.com";
    else if (newRole === "HoSP") email = "hosp@icss.com";
    else if (newRole === "Lecturer") email = "lecturer@icss.com";
    else if (newRole === "Student") email = "student@icss.com";
    else return;

    try {
      const data = await api.login(email, password);

      // 1. Guardamos en LocalStorage
      localStorage.setItem("token", data.access_token);
      localStorage.setItem("userRole", data.role);

      if (data.lecturer_id) {
        localStorage.setItem("lecturerId", String(data.lecturer_id));
      } else {
        localStorage.removeItem("lecturerId");
      }

      // 2. Actualizamos el estado de React
      setCurrentUserRole(data.role);

      // 🔥 3. DISPARAMOS EL EVENTO PARA QUE LOS MÓDULOS SE ENTEREN AL INSTANTE
      window.dispatchEvent(new Event("role-changed"));

      // 4. Recargamos la página para limpiar memoria
      window.location.reload();
    } catch (err) {
      console.error(err);
      alert("Login Error: " + err.message);
    }
  };

  // Valor del dropdown para la UI
  let dropdownVal = "Guest";
  if (role === "admin" || role === "pm") dropdownVal = "PM";
  else if (role === "hosp") dropdownVal = "HoSP";
  else if (role === "lecturer") dropdownVal = "Lecturer";
  else if (role === "student") dropdownVal = "Student";

  return (
    <div className="app-container">
      <aside className="sidebar">
        <div className="sidebar-header">ICSS Scheduler</div>

        <div className="sidebar-nav">
          <div className="nav-section-title">Curriculum</div>
          <NavLink id="programs" label="Study Programs" rolesAllowed={["admin", "pm", "hosp", "lecturer", "student"]} />
          <NavLink id="modules" label="Modules" rolesAllowed={["admin", "pm", "hosp", "lecturer", "student"]} />

          <div className="nav-section-title">People & Groups</div>
          <NavLink id="lecturers" label="Lecturers" rolesAllowed={["admin", "pm", "hosp", "lecturer", "student"]} />

          {/* ✅ Student incluido */}
          <NavLink id="groups" label="Student Groups" rolesAllowed={["admin", "pm", "hosp", "lecturer", "student"]} />

          <div className="nav-section-title">Facilities</div>
          <NavLink id="rooms" label="Rooms" rolesAllowed={["admin", "pm", "hosp"]} />

          <div className="nav-section-title">Planning Logic</div>
          <NavLink id="constraints" label="Constraints & Rules" rolesAllowed={["admin", "pm", "hosp", "lecturer"]} />
          <NavLink id="availabilities" label="Availability" rolesAllowed={["admin", "pm", "hosp", "lecturer"]} />
        </div>

        <div className="sidebar-footer" style={{ borderTop: '1px solid #334155', padding: '20px' }}>
          <label style={{ fontSize: '0.75rem', textTransform: 'uppercase', color: '#94a3b8', display: 'block', marginBottom: '8px' }}>
            Switch Role:
          </label>
          <select value={dropdownVal} onChange={handleRoleChange} style={{
              background: '#1e293b', color: 'white', border: '1px solid #475569',
              padding: '8px', borderRadius: '6px', width: '100%', cursor: 'pointer'
            }}>
            <option value="Guest" disabled>Select a Role...</option>
            <option value="PM">Program Manager (Admin)</option>
            <option value="HoSP">Head of Program</option>
            <option value="Lecturer">Lecturer</option>
            <option value="Student">Student</option>
          </select>
        </div>
      </aside>

      <main className="main-content">
        <div className="page-header">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h1 className="page-title">
              {activeTab.charAt(0).toUpperCase() + activeTab.slice(1).replace('-', ' ')}
            </h1>
            <span style={{ background: '#e2e8f0', color: '#475569', padding: '4px 12px', borderRadius: '20px', fontSize: '0.75rem', fontWeight: 'bold' }}>
              Role: {currentUserRole}
            </span>
          </div>
        </div>
        <div className="content-container">
            {children}
        </div>
      </main>
    </div>
  );
};

export default Layout;