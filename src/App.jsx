import React, { useState } from "react";
import "./App.css";
import Layout from "./Layout";

// Import components
import ProgramOverview from "./components/ProgramOverview";
import ModuleOverview from "./components/ModuleOverview";
import LecturerOverview from "./components/LecturerOverview";
import RoomOverview from "./components/RoomOverview";
import GroupOverview from "./components/GroupOverview";
import ConstraintOverview from "./components/ConstraintOverview";
import AvailabilityOverview from "./components/AvailabilityOverview";

function App() {
  const [activeTab, setActiveTab] = useState("programs");

  // ✅ FIX: Removed 'setToken' causing build error (unused)
  // We only read the token here; writing happens in Layout.jsx + Reload
  const [token] = useState(localStorage.getItem("token"));
  const [currentUserRole, setCurrentUserRole] = useState(localStorage.getItem("userRole") || "Guest");

  const [navData, setNavData] = useState(null);

  const handleNavigate = (tab, data = null) => {
    setActiveTab(tab);
    setNavData(data);
  };

  // If no token is present, we show a "Welcome" screen instead of the data components.
  // This prevents the 401 -> Reload loop.
  const renderContent = () => {
    if (!token) {
      return (
        <div style={{textAlign: "center", marginTop: "100px", color: "#64748b"}}>
          <h2>Welcome to ICSS Scheduler</h2>
          <p>Please select a Role in the bottom-left corner to start testing.</p>
        </div>
      );
    }

    // Pass role to all components
    const commonProps = { currentUserRole, onNavigate: handleNavigate };

    switch (activeTab) {
      case "programs":
        return <ProgramOverview initialData={navData} clearInitialData={() => setNavData(null)} {...commonProps} />;
      case "modules":
        return <ModuleOverview onNavigate={handleNavigate} {...commonProps} />;
      case "lecturers":
        return <LecturerOverview {...commonProps} />;
      case "rooms":
        return <RoomOverview {...commonProps} />;
      case "groups":
        return <GroupOverview {...commonProps} />;
      case "constraints":
        return <ConstraintOverview {...commonProps} />;
      case "availabilities":
        return <AvailabilityOverview {...commonProps} />;
      default:
        return <ProgramOverview {...commonProps} />;
    }
  };

  return (
    <Layout
      activeTab={activeTab}
      setActiveTab={setActiveTab}
      currentUserRole={currentUserRole}
      setCurrentUserRole={setCurrentUserRole}
    >
      {renderContent()}
    </Layout>
  );
}

export default App;