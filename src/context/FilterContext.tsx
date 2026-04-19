import React, { createContext, useContext, useState, useEffect } from 'react';

interface FilterState {
  classes: { searchTerm: string };
  students: { searchTerm: string; selectedClassId: string };
  teachers: { searchTerm: string };
  subjects: { searchTerm: string };
  sections: { searchTerm: string };
  sessions: { searchTerm: string; selectedSectionId: string; filterDate: string };
  reports: { date: string; subjectId: string; sectionId: string; status: string };
}

const initialState: FilterState = {
  classes: { searchTerm: '' },
  students: { searchTerm: '', selectedClassId: 'all' },
  teachers: { searchTerm: '' },
  subjects: { searchTerm: '' },
  sections: { searchTerm: '' },
  sessions: { searchTerm: '', selectedSectionId: 'all', filterDate: '' },
  reports: { date: '', subjectId: 'all', sectionId: 'all', status: 'all' }
};

interface FilterContextType {
  filters: FilterState;
  updateFilter: (page: keyof FilterState, data: any) => void;
  clearFilters: () => void;
}

const FilterContext = createContext<FilterContextType | undefined>(undefined);

const STORAGE_KEY = 'snapattend_filters';

export const FilterProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [filters, setFilters] = useState<FilterState>(() => {
    const saved = sessionStorage.getItem(STORAGE_KEY);
    if (!saved) return initialState;
    try {
      const parsed = JSON.parse(saved);
      // Gộp dữ liệu cũ với initialState để tránh thiếu trường mới
      return {
        ...initialState,
        ...parsed,
        // Đảm bảo các object con cũng được gộp (shallow merge cho từng trang)
        classes: { ...initialState.classes, ...(parsed?.classes || {}) },
        students: { ...initialState.students, ...(parsed?.students || {}) },
        teachers: { ...initialState.teachers, ...(parsed?.teachers || {}) },
        subjects: { ...initialState.subjects, ...(parsed?.subjects || {}) },
        sections: { ...initialState.sections, ...(parsed?.sections || {}) },
        sessions: { ...initialState.sessions, ...(parsed?.sessions || {}) },
        reports: { ...initialState.reports, ...(parsed?.reports || {}) },
      };
    } catch (e) {
      return initialState;
    }
  });

  useEffect(() => {
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(filters));
  }, [filters]);

  const updateFilter = (page: keyof FilterState, data: any) => {
    setFilters(prev => ({
      ...prev,
      [page]: { ...prev[page], ...data }
    }));
  };

  const clearFilters = () => {
    setFilters(initialState);
    sessionStorage.removeItem(STORAGE_KEY);
  };

  return (
    <FilterContext.Provider value={{ filters, updateFilter, clearFilters }}>
      {children}
    </FilterContext.Provider>
  );
};

export const useFilter = () => {
  const context = useContext(FilterContext);
  if (!context) {
    throw new Error('useFilter must be used within a FilterProvider');
  }
  return context;
};
