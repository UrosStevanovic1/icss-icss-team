import React, { useState } from "react";
import {
  Calendar, CalendarDays, CalendarPlus, GraduationCap, BookOpen,
  User, Users, MapPin, Sliders, Clock, ChevronLeft, ChevronRight,
  Shield
} from "lucide-react";
import api from "./api";
import "./App.css";

const Layout = ({ activeTab, setActiveTab, children, currentUserRole, setCurrentUserRole }) => {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const role = (currentUserRole || "").trim().toLowerCase();
  const isStudent = role === "student";
  
  const NavLink = ({ id, icon: Icon, label, rolesAllowed = [] }) => {
    const normalizedAllowed = rolesAllowed.map(r => r.toLowerCase());

    // Permission check
    if (normalizedAllowed.length > 0 && !normalizedAllowed.includes(role)) return null;

    const isActive = activeTab === id;

    return (
      <div
        onClick={() => setActiveTab(id)}
        className={`nav-item ${isActive ? "active" : ""}`}
        title={isCollapsed ? label : ""} // Tooltip when collapsed
        style={{
          display: "flex",
          alignItems: "center",
          padding: "12px 20px",
          cursor: "pointer",
          color: isActive ? "#60a5fa" : "#cbd5e1", // Active blue, inactive slate
          background: isActive ? "rgba(59, 130, 246, 0.1)" : "transparent",
          borderLeft: isActive ? "3px solid #3b82f6" : "3px solid transparent",
          transition: "all 0.2s ease",
          justifyContent: isCollapsed ? "center" : "flex-start",
          height: "50px"
        }}
      >
        {/* Icon is always visible */}
        <Icon size={20} strokeWidth={isActive ? 2.5 : 2} />

        {/* Label is hidden when collapsed */}
        {!isCollapsed && (
          <span style={{ marginLeft: "12px", whiteSpace: "nowrap", overflow: "hidden", fontSize: "0.95rem" }}>
            {label}
          </span>
        )}
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

  const SectionTitle = ({ title }) => {
    if (isCollapsed) return <div style={{ height: "20px" }}></div>; // Spacer
    return <div className="nav-section-title" style={{ padding: "0 20px", marginTop: "20px", marginBottom: "8px", fontSize: "0.75rem", textTransform: "uppercase", color: "#64748b", fontWeight: "700" }}>{title}</div>;
  };

  return (
    <div className="app-container" style={{ display: "flex", height: "100vh", width: "100vw", overflow: "hidden" }}>

      {/* --- SIDEBAR --- */}
      <aside
        className="sidebar"
        style={{
          width: isCollapsed ? "80px" : "260px",
          background: "#1e293b",
          color: "#e2e8f0",
          display: "flex",
          flexDirection: "column",
          borderRight: "1px solid #334155",
          transition: "width 0.3s ease", // Smooth transition
          flexShrink: 0
        }}
      >
        {/* Sidebar Header */}
        <div style={{
            padding: "20px",
            display: "flex",
            alignItems: "center",
            justifyContent: isCollapsed ? "center" : "space-between",
            borderBottom: "1px solid #334155",
            height: "60px",
            boxSizing: "border-box"
        }}>
          {!isCollapsed && <span style={{ fontWeight: "bold", fontSize: "1.2rem", color: "white" }}>ICSS Scheduler</span>}
          <button
            onClick={() => setIsCollapsed(!isCollapsed)}
            style={{ background: "transparent", border: "none", color: "#94a3b8", cursor: "pointer", padding: "5px" }}
          >
            {isCollapsed ? <ChevronRight /> : <ChevronLeft />}
          </button>
        </div>

        {/* Sidebar Navigation */}
        <div className="sidebar-nav" style={{ flex: 1, overflowY: "auto", overflowX: "hidden", paddingBottom: "20px" }}>

          <SectionTitle title="Schedule & Planning" />
          <NavLink id="timetable" icon={CalendarDays} label="Timetable View" rolesAllowed={["admin", "pm", "hosp", "lecturer", "student"]} />
          <NavLink id="semester-planning" icon={CalendarPlus} label="Semester Planning" rolesAllowed={["admin", "pm", "hosp", "lecturer"]} />
          <NavLink id="semesters" icon={Calendar} label="Semesters" rolesAllowed={["admin", "pm", "hosp", "lecturer", "student"]} />

          <SectionTitle title="Core Curriculum" />
          <NavLink id="programs" icon={GraduationCap} label="Study Programs" rolesAllowed={["admin", "pm", "hosp", "lecturer", "student"]} />
          <NavLink id="modules" icon={BookOpen} label="Modules" rolesAllowed={["admin", "pm", "hosp", "lecturer", "student"]} />

          <SectionTitle title="People & Facilities" />
          <NavLink id="lecturers" icon={User} label="Lecturers" rolesAllowed={["admin", "pm", "hosp", "lecturer"]} />
          <NavLink id="groups" icon={Users} label="Student Groups" rolesAllowed={["admin", "pm", "hosp", "lecturer", "student"]} />
          {!isStudent && <NavLink id="rooms" icon={MapPin} label="Rooms" rolesAllowed={["admin", "pm", "lecturer"]} />}

          {!isStudent && (
            <>
              <SectionTitle title="Planning Logic" />
              <NavLink id="constraints" icon={Sliders} label="Constraints & Rules" rolesAllowed={["admin", "pm", "hosp", "lecturer"]} />
              <NavLink id="availabilities" icon={Clock} label="Lecturer Availability" rolesAllowed={["admin", "pm", "hosp", "lecturer"]} />
            </>
          )}
        </div>

        {/* Sidebar Footer (Role Switcher) */}
        <div style={{ borderTop: '1px solid #334155', padding: isCollapsed ? '20px 0' : '20px', background: "#0f172a" }}>

          {isCollapsed ? (
             // Collapsed View: Just an icon that expands sidebar if needed
             <div style={{ display: 'flex', justifyContent: 'center', cursor: 'pointer' }} title="Current Role">
                <Shield size={24} color="#94a3b8" />
             </div>
          ) : (
            // Expanded View: Full Dropdown
            <>
              <label style={{ fontSize: '0.75rem', textTransform: 'uppercase', color: '#94a3b8', display: 'block', marginBottom: '8px' }}>
                Switch Role:
              </label>
              <select value={dropdownVal} onChange={handleRoleChange} style={{
                  background: '#1e293b', color: 'white', border: '1px solid #475569',
                  padding: '8px', borderRadius: '6px', width: '100%', cursor: 'pointer', outline: 'none'
                }}>
                <option value="Guest" disabled>Select a Role...</option>
                <option value="PM">Program Manager (Admin)</option>
                <option value="HoSP">Head of Program</option>
                <option value="Lecturer">Lecturer</option>
                <option value="Student">Student</option>
              </select>
            </>
          )}
        </div>
      </aside>

      {/* --- MAIN CONTENT --- */}
      <main className="main-content" style={{ flex: 1, overflowY: "auto", background: "#f8fafc", position: "relative" }}>
        <div className="page-header" style={{ padding: "20px 40px", background: "white", borderBottom: "1px solid #e2e8f0" }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h1 className="page-title" style={{ margin: 0, fontSize: "1.5rem", fontWeight: "700", color: "#1e293b" }}>
              {activeTab.charAt(0).toUpperCase() + activeTab.slice(1).replace('-', ' ')}
            </h1>
            <span style={{
                background: '#eff6ff', color: '#3b82f6',
                padding: '6px 12px', borderRadius: '20px',
                fontSize: '0.8rem', fontWeight: '600', border: '1px solid #dbeafe',
                display: 'flex', alignItems: 'center', gap: '6px'
            }}>
              <User size={14} />
              {currentUserRole.toUpperCase()}
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