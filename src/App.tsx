import { useState } from 'react';
import { Layout } from './components/layout/Layout';
import { Classes } from './pages/Classes';
import { Teachers } from './pages/Teachers';
import { Students } from './pages/Students';
import { Subjects } from './pages/Subjects';
import { Sections } from './pages/Sections';
import { Sessions } from './pages/Sessions';
import { Attendance } from './pages/Attendance';
import { Settings } from './pages/Settings';
import { Reports } from './pages/Reports';
import { DataManagement } from './pages/DataManagement';
import { authService } from './services/auth.service';
import { PinLock } from './components/ui/PinLock';
import { FilterProvider, useFilter } from './context/FilterContext';

function SnapAttendApp() {
  const [activePage, setActivePage] = useState('classes');
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

  if (!isUnlocked) {
    return <PinLock onSuccess={() => setIsUnlocked(true)} />;
  }

  const renderPage = () => {
    switch (activePage) {
      case 'classes': return <Classes />;
      case 'students': return <Students />;
      case 'teachers': return <Teachers />;
      case 'subjects': return <Subjects />;
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
      default: return <Classes />;
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
    <FilterProvider>
      <SnapAttendApp />
    </FilterProvider>
  );
}

export default App;
