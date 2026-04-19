import { useState } from 'react';
import { Layout } from './components/layout/Layout';
import { Sections } from './pages/Sections';
import { Sessions } from './pages/Sessions';
import { Attendance } from './pages/Attendance';
import { Settings } from './pages/Settings';
import { Reports } from './pages/Reports';
import { DataManagement } from './pages/DataManagement';
import { MasterData } from './pages/MasterData';
import { authService } from './services/auth.service';
import { PinLock } from './components/ui/PinLock';
import { FilterProvider, useFilter } from './context/FilterContext';
import { ThemeProvider } from './context/ThemeContext';
import { googleDriveService } from './services/googleDrive.service';
import { useEffect } from 'react';

function SnapAttendApp() {
  const [activePage, setActivePage] = useState('sessions');
  const [selectedSessionId, setSelectedSessionId] = useState<number | null>(null);
  const [isUnlocked, setIsUnlocked] = useState(authService.isUnlocked());
  const { clearFilters } = useFilter();

  const startAttendance = (sessionId: number) => {
    setSelectedSessionId(sessionId);
    setActivePage('attendance');
  };

  const handleLock = () => {
    clearFilters(); // Xóa dữ liệu tìm kiếm khi khóa
    setIsUnlocked(false);
  };

  // Global Google Redirect Handler
  useEffect(() => {
    const token = googleDriveService.handleRedirectCallback();
    if (token) {
      setActivePage('data');
    }
  }, []);

  if (!isUnlocked) {
    return <PinLock onSuccess={() => setIsUnlocked(true)} />;
  }

  const renderPage = () => {
    switch (activePage) {
      case 'master-data': return <MasterData />;
      case 'sections': return <Sections />;
      case 'sessions': return <Sessions onStartAttendance={startAttendance} />;
      case 'attendance': 
        return selectedSessionId ? (
          <Attendance 
            sessionId={selectedSessionId} 
            onBack={() => setActivePage('sessions')} 
          />
        ) : <Sessions onStartAttendance={startAttendance} />;
      case 'reports': return <Reports />;
      case 'data': return <DataManagement />;
      case 'settings': return <Settings />;
      default: return <Sessions onStartAttendance={startAttendance} />;
    }
  };

  return (
    <Layout activeId={activePage} onNavigate={setActivePage} onLock={handleLock}>
      {renderPage()}
    </Layout>
  );
}

function App() {
  return (
    <ThemeProvider>
      <FilterProvider>
        <SnapAttendApp />
      </FilterProvider>
    </ThemeProvider>
  );
}

export default App;
