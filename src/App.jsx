import React, { useState } from "react";
import "./App.css";
import Layout from "./Layout"; // Same folder (src/)

// Import components from the components folder
import ProgramOverview from "./components/ProgramOverview";
import ModuleOverview from "./components/ModuleOverview";
import LecturerOverview from "./components/LecturerOverview";
import RoomOverview from "./components/RoomOverview";
import GroupOverview from "./components/GroupOverview";
import ConstraintOverview from "./components/ConstraintOverview";
import AvailabilityOverview from "./components/AvailabilityOverview";

function App() {
  const [activeTab, setActiveTab] = useState("programs");

  const renderContent = () => {
    switch (activeTab) {
      case "programs":
        return <ProgramOverview />;
      case "modules":
        return <ModuleOverview />;
      case "lecturers":
        return <LecturerOverview />;
      case "rooms":
        return <RoomOverview />;
      case "groups":
        return <GroupOverview />;
      case "constraints":
        return <ConstraintOverview />;
      case "availabilities":
        return <AvailabilityOverview />;
      default:
        return <ProgramOverview />;
    }
  };

  return (
    <Layout activeTab={activeTab} setActiveTab={setActiveTab}>
      {renderContent()}
    </Layout>
  );
}

export default App;