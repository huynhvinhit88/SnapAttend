import { useState } from 'react';
import { motion } from 'framer-motion';
import { LayoutGrid, School, Users, GraduationCap, BookOpen } from 'lucide-react';
import { PageHeader } from '../components/ui/PageHeader';
import { OverviewSection } from '../components/master-data/OverviewSection';
import { ClassesSection } from '../components/master-data/ClassesSection';
import { StudentsSection } from '../components/master-data/StudentsSection';
import { TeachersSection } from '../components/master-data/TeachersSection';
import { SubjectsSection } from '../components/master-data/SubjectsSection';
import './MasterData.css';

type TabId = 'overview' | 'classes' | 'students' | 'teachers' | 'subjects';

export const MasterData = () => {
  const [activeTab, setActiveTab] = useState<TabId>('overview');

  const tabs = [
    { id: 'overview', label: 'Tổng quan', icon: LayoutGrid },
    { id: 'classes', label: 'Lớp học', icon: School },
    { id: 'students', label: 'Học sinh', icon: Users },
    { id: 'subjects', label: 'Môn học', icon: BookOpen },
    { id: 'teachers', label: 'Giáo viên', icon: GraduationCap },
  ] as const;

  const renderContent = () => {
    switch (activeTab) {
      case 'overview': return <OverviewSection onNavigateToTab={(id: any) => setActiveTab(id as TabId)} />;
      case 'classes': return <ClassesSection />;
      case 'students': return <StudentsSection />;
      case 'teachers': return <TeachersSection />;
      case 'subjects': return <SubjectsSection />;
      default: return <OverviewSection onNavigateToTab={(id: any) => setActiveTab(id as TabId)} />;
    }
  };


  return (
    <div className="space-y-8 pb-24">
      <PageHeader 
        title="Quản lý Danh mục"
        description="Trung tâm quản lý tập trung các thông tin cốt lõi của hệ thống học tập."
        icon={<LayoutGrid className="w-8 h-8 text-primary" />}
        breadcrumbs={[
          { label: 'Trang chủ' },
          { label: 'Quản lý', active: true }
        ]}
      />

      {/* Tabs Navigation */}
      <div className="flex flex-col space-y-8">
        <div className="master-data-tabs-container">
          <div className="flex items-center gap-1 p-1 bg-background-light/50 backdrop-blur-xl rounded-2xl border border-foreground/5 overflow-x-auto no-scrollbar scroll-smooth">
            {tabs.map((tab) => {
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as TabId)}
                  className={`
                    relative flex items-center gap-2 px-6 py-3 rounded-xl text-sm font-bold transition-all whitespace-nowrap
                    ${isActive ? 'text-primary' : 'text-foreground/40 hover:text-foreground/60'}
                  `}
                >
                  {isActive && (
                    <motion.div
                      layoutId="activeTab"
                      className="absolute inset-0 bg-primary/10 rounded-xl"
                      transition={{ type: "spring", bounce: 0.2, duration: 0.6 }}
                    />
                  )}
                  <tab.icon className={`w-4 h-4 relative z-10 ${isActive ? 'text-primary' : 'text-foreground/30'}`} />
                  <span className="relative z-10">{tab.label}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Tab Content */}
        <motion.div
           key={activeTab}
           initial={{ opacity: 0, x: 20 }}
           animate={{ opacity: 1, x: 0 }}
           exit={{ opacity: 0, x: -20 }}
           transition={{ duration: 0.3, ease: "easeOut" }}
           className="min-h-[500px]"
        >
          {renderContent()}
        </motion.div>
      </div>
    </div>
  );
};
