import React from "react";
import api from "./api"; // ✅ Import API to handle login
import "./App.css";

const Layout = ({ activeTab, setActiveTab, children, currentUserRole, setCurrentUserRole }) => {

  const NavLink = ({ id, icon, label }) => (
    <div
      className={`nav-item ${activeTab === id ? "active" : ""}`}
      onClick={() => setActiveTab(id)}
    >
      <span style={{ fontSize: "1.2em" }}>{icon}</span>
      <span>{label}</span>
    </div>
  );

  // ✅ Handle Role Switching via Real Login
  const handleRoleChange = async (e) => {
    const newRole = e.target.value;

    // Prevent selecting the placeholder
    if (newRole === "Guest") return;

    let email = "";
    const password = "password"; // Hardcoded from our seed script

    // Map the selected label to the seed email
    switch (newRole) {
      case "PM": email = "pm@icss.com"; break;
      case "HoSP": email = "hosp@icss.com"; break;
      case "Lecturer": email = "lecturer@icss.com"; break;
      case "Student": email = "student@icss.com"; break;
      default: return;
    }

    try {
      // 1. Call Login API
      const data = await api.login(email, password);

      // 2. Save Token + Role
      localStorage.setItem("token", data.access_token);
      localStorage.setItem("userRole", data.role);

      // ✅ 3. Save lecturerId (critical for HoSP permissions + lecturer self permissions)
      if (data.lecturer_id !== null && data.lecturer_id !== undefined) {
        localStorage.setItem("lecturerId", String(data.lecturer_id));
      } else {
        localStorage.removeItem("lecturerId");
      }

      // 4. Update State & Force Reload to apply permissions
      // (Keep state consistent with backend role string)
      setCurrentUserRole(data.role);
      window.location.reload();

    } catch (err) {
      alert("Login failed. Did you visit /api/seed yet? Error: " + err.message);
      console.error(err);
    }
  };

  // Helper to determine dropdown value (Handles backend casing)
  const getDropdownValue = () => {
    if (!currentUserRole || currentUserRole === "Guest") return "Guest";
    if (currentUserRole === "admin" || currentUserRole === "pm") return "PM";
    if (currentUserRole === "hosp") return "HoSP";
    if (currentUserRole === "lecturer") return "Lecturer";
    if (currentUserRole === "student") return "Student";
    return "Guest";
  };

  return (
    <div className="app-container">
      <aside className="sidebar">
        <div className="sidebar-header">
          ICSS Scheduler
        </div>

        <div className="sidebar-nav">
          <div className="nav-section-title">Curriculum</div>
          <NavLink id="programs" icon="" label="Study Programs" />
          <NavLink id="modules" icon="" label="Modules" />

          <div className="nav-section-title">People & Groups</div>
          <NavLink id="lecturers" icon="" label="Lecturers" />
          <NavLink id="groups" icon="" label="Student Groups" />

          <div className="nav-section-title">Facilities</div>
          <NavLink id="rooms" icon="" label="Rooms" />

          <div className="nav-section-title">Planning Logic</div>
          <NavLink id="constraints" icon="" label="Constraints & Rules" />
          <NavLink id="availabilities" icon="" label="Availability" />
        </div>

        {/* ✅ REAL LOGIN SWITCHER */}
        <div className="sidebar-footer" style={{ borderTop: '1px solid #334155', padding: '20px' }}>
          <label style={{ fontSize: '0.75rem', textTransform: 'uppercase', color: '#94a3b8', display: 'block', marginBottom: '8px' }}>
            Switch Role (Auto-Login):
          </label>
          <select
            value={getDropdownValue()}
            onChange={handleRoleChange}
            style={{
              background: '#334155',
              color: 'white',
              border: '1px solid #475569',
              padding: '8px',
              borderRadius: '6px',
              width: '100%',
              outline: 'none',
              cursor: 'pointer',
              fontSize: '0.9rem'
            }}
          >
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
            <span style={{
              background: '#e2e8f0',
              color: '#475569',
              padding: '4px 12px',
              borderRadius: '20px',
              fontSize: '0.75rem',
              fontWeight: 'bold',
              textTransform: 'uppercase',
              letterSpacing: '0.05em'
            }}>
              Logged in as: {currentUserRole}
            </span>
          </div>
        </div>
        {children}
      </main>
    </div>
  );
};

export default Layout;
