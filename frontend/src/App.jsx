import React, { useState, useEffect } from 'react';
import Sidebar from './components/layout/Sidebar';
import TopBar from './components/layout/TopBar';
import ConfirmationModal from './components/common/ConfirmationModal';

import DashboardView from './views/DashboardView';
import AIAssistantView from './views/AIAssistantView';
import CalendarView from './views/CalendarView';
import PlannerView from './views/PlannerView';
import NotesView from './views/NotesView';
import SettingsView from './views/SettingsView';

import { getHealth, getSemesters, confirmAction } from './services/api';

export default function App() {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [collapsed, setCollapsed] = useState(false);
  const [backendOnline, setBackendOnline] = useState(false);
  const [activeSemester, setActiveSemester] = useState(null);

  // Proposal Confirmation Modal State
  const [currentProposal, setCurrentProposal] = useState(null);

  useEffect(() => {
    async function checkHealthAndSemesters() {
      try {
        const health = await getHealth();
        if (health.status === 'healthy') {
          setBackendOnline(true);
        }
        const sems = await getSemesters();
        if (sems.length > 0) {
          setActiveSemester(sems[0]);
        }
      } catch (e) {
        setBackendOnline(false);
      }
    }
    checkHealthAndSemesters();
    const interval = setInterval(checkHealthAndSemesters, 15000);
    return () => clearInterval(interval);
  }, []);

  const handleConfirmAction = async (proposalId, confirm, editedPayload) => {
    await confirmAction(proposalId, confirm);
  };

  const getTitle = () => {
    switch (activeTab) {
      case 'dashboard': return 'Dashboard Overview';
      case 'assistant': return 'AI Academic Assistant';
      case 'calendar': return 'Academic Calendar & Deadlines';
      case 'planner': return 'Todo List & Dynamic Planner';
      case 'notes': return 'Notes & Document Manager';
      case 'settings': return 'System Settings';
      default: return 'S.Butler Workspace';
    }
  };

  return (
    <div className="app-container">
      {/* Sidebar Navigation */}
      <Sidebar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        collapsed={collapsed}
        setCollapsed={setCollapsed}
      />

      {/* Main Wrapper */}
      <div className="main-wrapper">
        <TopBar
          title={getTitle()}
          activeSemester={activeSemester}
          backendOnline={backendOnline}
        />

        <main className="content-area">
          {activeTab === 'dashboard' && <DashboardView onNavigate={setActiveTab} />}
          {activeTab === 'assistant' && <AIAssistantView onOpenConfirmation={setCurrentProposal} />}
          {activeTab === 'calendar' && <CalendarView />}
          {activeTab === 'planner' && <PlannerView />}
          {activeTab === 'notes' && <NotesView />}
          {activeTab === 'settings' && <SettingsView />}
        </main>
      </div>

      {/* Reusable Confirmation Modal for AI Action Proposals */}
      {currentProposal && (
        <ConfirmationModal
          proposal={currentProposal}
          onClose={() => setCurrentProposal(null)}
          onConfirm={handleConfirmAction}
        />
      )}
    </div>
  );
}
