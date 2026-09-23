import React, { useState } from 'react';
import { useTelemetryIngestion } from '@/hooks/useTelemetryIngestion';
import { Button } from '@/components/ui/button';
import { X, Upload, File } from 'lucide-react';

interface TelemetryDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  sessionId: string;
}

export const TelemetryDrawer: React.FC<TelemetryDrawerProps> = ({ isOpen, onClose, sessionId }) => {
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const { uploadFiles, isUploading } = useTelemetryIngestion();

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      setSelectedFiles(Array.from(e.target.files));
    }
  };

  const handleUpload = async () => {
    await uploadFiles(selectedFiles);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-black/50">
      <div className="w-full max-w-md bg-white shadow-xl transform transition-transform duration-300">
        <div className="p-6 h-full flex flex-col">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-bold">Upload Telemetry</h2>
            <Button variant="ghost" size="sm" onClick={onClose} aria-label="Close"><X className="w-4 h-4" /></Button>
          </div>
          
          <input type="file" multiple onChange={handleFileChange} className="mb-4" />
          
          <div className="flex-1 overflow-y-auto mb-6">
            {selectedFiles.map((file, i) => (
              <div key={i} className="flex items-center gap-2 p-2 bg-slate-50 rounded mb-2">
                <File className="w-4 h-4" />
                <span className="text-sm">{file.name}</span>
              </div>
            ))}
          </div>

          <Button 
            className="w-full" 
            onClick={handleUpload} 
            disabled={isUploading || selectedFiles.length === 0}
          >
            {isUploading ? 'Uploading...' : 'Confirm Upload'}
          </Button>
        </div>
      </div>
    </div>
  );
};