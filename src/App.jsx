import { useState } from "react";
import "./App.css";

import ProgramOverview from "./Components/ProgramOverview";
import GroupOverview from "./Components/GroupOverview";
import LecturerOverview from "./Components/LecturerOverview";
import ModuleOverview from "./Components/ModuleOverview";
import RoomOverview from "./Components/RoomOverview";
import ScheduleOverview from "./Components/ScheduleOverview";
import ConstraintOverview from "./Components/ConstraintOverview";
import AvailabilityOverview from "./Components/AvailabilityOverview";

export default function App() {
  const [page, setPage] = useState("programs");

  return (
    <div className="app">
      <Topbar page={page} setPage={setPage} />

      <div className="page-container">
        {page === "programs" && <ProgramOverview />}
        {page === "groups" && <GroupOverview />}
        {page === "lecturers" && <LecturerOverview />}
        {page === "modules" && <ModuleOverview />}
        {page === "rooms" && <RoomOverview />}
        {page === "schedule" && <ScheduleOverview />}
        {page === "constraints" && <ConstraintOverview />}
        {page === "availability" && <AvailabilityOverview />}
      </div>
    </div>
  );
}

function Topbar({ page, setPage }) {
  const tabs = [
    { key: "programs", label: "Study Programs" },
    { key: "groups", label: "Groups Overview" },
    { key: "lecturers", label: "Lecturers Overview" },
    { key: "modules", label: "Modules Overview" },
    { key: "rooms", label: "Rooms Overview" },
    { key: "schedule", label: "Schedule Overview" },
    { key: "constraints", label: "Constraints Overview" },
    { key: "availability", label: "Availability Overview" },
  ];

  return (
    <div className="topbar">
      <div className="logo">MDH</div>

      <div className="nav">
        {tabs.map((tab) => (
          <button
            key={tab.key}
            className={page === tab.key ? "active" : ""}
            onClick={() => setPage(tab.key)}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <div className="user">User</div>
    </div>
  );
}

