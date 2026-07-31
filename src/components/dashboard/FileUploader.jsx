import React, { useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import { Upload } from 'lucide-react';

export default function FileUploader({ onFileAccepted }) {
  const onDrop = useCallback((acceptedFiles) => {
    onFileAccepted(acceptedFiles[0]);
  }, [onFileAccepted]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({ 
    onDrop,
    accept: {
      'application/octet-stream': ['.fit'],
      'text/csv': ['.csv'],
      'image/*': ['.jpg', '.jpeg', '.png'],
      'application/pdf': ['.pdf']
    }
  });

  return (
    <div {...getRootProps()} className={`border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors ${isDragActive ? 'border-primary bg-primary/5' : 'border-slate-300 hover:border-primary'}`}>
      <input {...getInputProps()} />
      <Upload className="mx-auto mb-2 text-slate-400" />
      <p className="text-sm text-slate-600">Drag & drop files or click to upload</p>
      <p className="text-xs text-slate-400 mt-1">Supports .fit, .csv, images, PDF</p>
    </div>
  );
}
