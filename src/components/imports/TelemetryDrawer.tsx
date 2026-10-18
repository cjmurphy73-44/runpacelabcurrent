import React, { useState } from 'react';
import { useTelemetryIngestion } from '@/hooks/useTelemetryIngestion';
import { TelemetryIngestionEngine } from '@/lib/telemetry/TelemetryIngestionEngine';
import { processActivityStreams, ProcessedActivityStreams } from '@/services/telemetryProcessor';
import { Button } from '@/components/ui/button';
import { X, File, Activity, AlertCircle } from 'lucide-react';

interface TelemetryDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  sessionId: string;
}

export const TelemetryDrawer: React.FC<TelemetryDrawerProps> = ({ isOpen, onClose, sessionId }) => {
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [analysisResults, setAnalysisResults] = useState<Record<string, ProcessedActivityStreams>>({});
  const [parseErrors, setParseErrors] = useState<Record<string, string>>({});
  const { uploadFiles, isUploading } = useTelemetryIngestion();

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const files = Array.from(e.target.files);
      setSelectedFiles(files);

      const results: Record<string, ProcessedActivityStreams> = {};
      const errors: Record<string, string> = {};

      for (const file of files) {
        try {
          const buffer = await file.arrayBuffer();
          const ingestionResult = await TelemetryIngestionEngine.ingestAndReconcile([
            { filename: file.name, buffer }
          ]);

          const streams = (ingestionResult.reconciledStream[0] as any) || [];
          results[file.name] = processActivityStreams(streams, 300, 20000);
        } catch (err: any) {
          errors[file.name] = err?.message || 'Failed to parse telemetry streams';
        }
      }

      setAnalysisResults(results);
      setParseErrors(errors);
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
          
          <input type="file" multiple onChange={handleFileChange} className="mb-4 text-sm" />
          
          <div className="flex-1 overflow-y-auto mb-6">
            {selectedFiles.map((file, i) => {
              const analysis = analysisResults[file.name];
              const error = parseErrors[file.name];
              return (
                <div key={i} className="p-3 bg-slate-50 rounded mb-3 border border-slate-100">
                  <div className="flex items-center gap-2 mb-1">
                    <File className="w-4 h-4 text-slate-500" />
                    <span className="text-sm font-medium">{file.name}</span>
                  </div>
                  {analysis && (
                    <div className="flex items-center gap-2 text-xs text-slate-600 mt-2 pl-6">
                      <Activity className="w-3.5 h-3.5 text-blue-600" />
                      <span>Max W' Depletion: <strong>{analysis.maxDepletionPercent}%</strong></span>
                    </div>
                  )}
                  {error && (
                    <div className="flex items-center gap-2 text-xs text-red-600 mt-2 pl-6">
                      <AlertCircle className="w-3.5 h-3.5" />
                      <span>{error}</span>
                    </div>
                  )}
                </div>
              );
            })}
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
