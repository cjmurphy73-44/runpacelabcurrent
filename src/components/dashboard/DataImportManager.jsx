import React, { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import FileUploader from './FileUploader';
import { useAthleteDataProcessor } from '@/hooks/useAthleteDataProcessor';

export default function DataImportManager({ athleteId }) {
  const [open, setOpen] = useState(false);
  const { processFile, processing } = useAthleteDataProcessor();

  const handleFileAccepted = async (file) => {
    const result = await processFile(file);
    if (result.success) {
      setOpen(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="w-full">Import Data</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Import Athlete Data</DialogTitle>
        </DialogHeader>
        <FileUploader onFileAccepted={handleFileAccepted} />
        {processing && <p className="text-sm text-center">Processing...</p>}
      </DialogContent>
    </Dialog>
  );
}
