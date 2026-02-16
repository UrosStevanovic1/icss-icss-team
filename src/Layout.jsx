import React from "react";
import api from "./api";
import "./App.css";

const Layout = ({ activeTab, setActiveTab, children, currentUserRole, setCurrentUserRole }) => {
  const role = (currentUserRole || "").trim().toLowerCase();
  const isStudent = role === "student";

  const NavLink = ({ id, icon, label, rolesAllowed = [] }) => {
    const normalizedAllowed = rolesAllowed.map(r => r.toLowerCase());

    if (normalizedAllowed.length > 0 && !normalizedAllowed.includes(role)) return null;

    return (
      <div className={`nav-item ${activeTab === id ? "active" : ""}`} onClick={() => setActiveTab(id)}>
        <span style={{ fontSize: "1.2em" }}>{icon}</span>
        <span>{label}</span>
      </div>
    );
  };

  const handleRoleChange = async (e) => {
    const newRole = (e.target.value || "").trim().toLowerCase();
    if (newRole === "guest") return;

    let email = "";
    const password = "password";

    switch (newRole) {
      case "pm": email = "pm@icss.com"; break;
      case "hosp": email = "hosp@icss.com"; break;
      case "lecturer": email = "lecturer@icss.com"; break;
      case "student": email = "student@icss.com"; break;
      default: return;
    }

    try {
      const data = await api.login(email, password);
      const normalizedBackendRole = String(data.role || "").trim().toLowerCase();

      localStorage.setItem("token", data.access_token);
      localStorage.setItem("userRole", normalizedBackendRole);

      if (data.lecturer_id) localStorage.setItem("lecturerId", String(data.lecturer_id));
      else localStorage.removeItem("lecturerId");

      setCurrentUserRole(normalizedBackendRole);
      window.dispatchEvent(new Event("role-changed"));

    } catch (err) {
      alert("Login Error: " + err.message);
    }
  };

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


          <NavLink id="semesters" label="Semesters" rolesAllowed={["admin", "pm", "hosp", "lecturer", "student"]} />

          {/* Botón de Semester Planning (Tú) */}
          <NavLink id="semester-planning" label="Semester Planning" rolesAllowed={["admin", "pm", "hosp", "lecturer"]} />


          <NavLink id="timetable" label="Timetable View" rolesAllowed={["admin", "pm", "hosp", "lecturer", "student"]} />

          <NavLink id="programs" label="Study Programs" rolesAllowed={["admin", "pm", "hosp", "lecturer", "student"]} />
          <NavLink id="modules" label="Modules" rolesAllowed={["admin", "pm", "hosp", "lecturer", "student"]} />

          <div className="nav-section-title">People & Groups</div>
          <NavLink id="lecturers" label="Lecturers" rolesAllowed={["admin", "pm", "hosp", "lecturer"]} />
          <NavLink id="groups" label="Student Groups" rolesAllowed={["admin", "pm", "hosp", "lecturer", "student"]} />

          {!isStudent && (
            <>
              <div className="nav-section-title">Facilities</div>
              <NavLink id="rooms" label="Rooms" rolesAllowed={["pm"]} />
            </>
          )}

          {!isStudent && (
            <>
              <div className="nav-section-title">Planning Logic</div>
              <NavLink id="constraints" label="Constraints & Rules" rolesAllowed={["admin", "pm", "hosp", "lecturer"]} />
              <NavLink id="availabilities" label="Availability" rolesAllowed={["admin", "pm", "hosp", "lecturer"]} />
            </>
          )}
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