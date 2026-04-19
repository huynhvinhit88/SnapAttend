import React, { useState, useEffect } from 'react';
import { Folder, ChevronRight, ChevronLeft, Check, Loader2, Search } from 'lucide-react';
import { Button } from '../ui/Button';
import { googleDriveService } from '../../services/googleDrive.service';
import { clsx } from 'clsx';

interface DriveFolderPickerProps {
  onSelect: (folder: { id: string; name: string }) => void;
  onCancel: () => void;
}

interface FolderInfo {
  id: string;
  name: string;
}

export const DriveFolderPicker: React.FC<DriveFolderPickerProps> = ({ onSelect, onCancel }) => {
  const [folders, setFolders] = useState<any[]>([]);
  const [path, setPath] = useState<FolderInfo[]>([]); // To track navigation
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');

  const currentFolder = path.length > 0 ? path[path.length - 1] : { id: 'root', name: 'Google Drive' };

  useEffect(() => {
    loadFolders(currentFolder.id);
  }, [currentFolder.id]);

  const loadFolders = async (parentId: string) => {
    setIsLoading(true);
    setError(null);
    try {
      const folderList = await googleDriveService.listFolders(parentId === 'root' ? undefined : parentId);
      setFolders(folderList);
    } catch (err) {
      console.error('Lỗi tải thư mục:', err);
      setError('Không thể tải danh sách thư mục. Vui lòng thử lại.');
    } finally {
      setIsLoading(false);
    }
  };

  const navigateInto = (id: string, name: string) => {
    setPath([...path, { id, name }]);
    setSearchTerm('');
  };

  const navigateBack = () => {
    if (path.length > 0) {
      setPath(path.slice(0, -1));
      setSearchTerm('');
    }
  };

  const handleSelectCurrent = () => {
    if (currentFolder.id === 'root') {
      alert('Vui lòng chọn một thư mục cụ thể, không thể chọn thư mục gốc.');
      return;
    }
    onSelect(currentFolder);
  };

  const filteredFolders = folders.filter(f => 
    f.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="flex flex-col h-[500px] max-h-[80vh]">
      {/* Header / Breadcrumbs */}
      <div className="px-1 pb-4 border-b border-foreground/5 space-y-3">
        <div className="flex items-center gap-2 overflow-x-auto no-scrollbar py-1">
          <button 
            onClick={() => setPath([])}
            className={clsx(
              "text-xs font-bold whitespace-nowrap px-2 py-1 rounded-lg transition-colors",
              path.length === 0 ? "bg-primary/10 text-primary" : "text-foreground/40 hover:bg-foreground/5"
            )}
          >
            My Drive
          </button>
          {path.map((p, i) => (
            <React.Fragment key={p.id}>
              <ChevronRight className="w-3 h-3 text-foreground/20 shrink-0" />
              <button 
                onClick={() => setPath(path.slice(0, i + 1))}
                className={clsx(
                  "text-xs font-bold whitespace-nowrap px-2 py-1 rounded-lg transition-colors",
                  i === path.length - 1 ? "bg-primary/10 text-primary" : "text-foreground/40 hover:bg-foreground/5"
                )}
              >
                {p.name}
              </button>
            </React.Fragment>
          ))}
        </div>

        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-foreground/30" />
          <input 
            type="text"
            placeholder="Tìm kiếm thư mục..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-foreground/5 border-none rounded-xl pl-10 pr-4 py-2 text-sm focus:ring-2 focus:ring-primary/20 transition-all outline-none"
          />
        </div>
      </div>

      {/* List Area */}
      <div className="flex-1 overflow-y-auto py-2 custom-scrollbar">
        {isLoading ? (
          <div className="h-full flex flex-col items-center justify-center space-y-3 text-foreground/30">
            <Loader2 className="w-8 h-8 animate-spin text-primary/40" />
            <p className="text-sm font-bold animate-pulse">Đang tải thư mục...</p>
          </div>
        ) : error ? (
          <div className="h-full flex flex-col items-center justify-center p-8 text-center space-y-4">
            <p className="text-sm text-red-500 font-medium">{error}</p>
            <Button variant="secondary" onClick={() => loadFolders(currentFolder.id)}>Thử lại</Button>
          </div>
        ) : filteredFolders.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-center p-8 text-foreground/30">
            <Folder className="w-12 h-12 mb-3 opacity-10" />
            <p className="text-sm font-bold">Không có thư mục nào</p>
          </div>
        ) : (
          <div className="space-y-1">
            {filteredFolders.map((folder) => (
              <button
                key={folder.id}
                onClick={() => navigateInto(folder.id, folder.name)}
                className="w-full flex items-center justify-between p-3 rounded-2xl hover:bg-primary/5 group transition-all"
              >
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-primary/10 rounded-xl group-hover:scale-110 transition-transform">
                    <Folder className="w-5 h-5 text-primary" />
                  </div>
                  <div className="text-left">
                    <p className="text-sm font-bold text-foreground group-hover:text-primary transition-colors">{folder.name}</p>
                    <p className="text-[10px] text-foreground/30 uppercase font-black tracking-widest">
                      {new Date(folder.createdTime).toLocaleDateString('vi-VN')}
                    </p>
                  </div>
                </div>
                <ChevronRight className="w-4 h-4 text-foreground/20 group-hover:text-primary transition-colors" />
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Footer Actions */}
      <div className="pt-4 border-t border-foreground/5 flex items-center justify-between gap-3">
        <Button variant="secondary" className="flex-1" onClick={onCancel}>Hủy</Button>
        <Button 
          className="flex-1 gap-2" 
          disabled={currentFolder.id === 'root' || isLoading}
          onClick={handleSelectCurrent}
        >
          <Check className="w-4 h-4" />
          Chọn thư mục này
        </Button>
      </div>
    </div>
  );
};
