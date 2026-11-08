import React, { useRef, useState } from 'react';
import { Download } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/lib/AuthContext';
import { downloadWorkoutFile } from '@/services/workoutExport';

export default function WorkoutExportButton({ session, className = '' }) {
  const { user } = useAuth();
  return <ExportControl key={`${user?.id}:${session?.id}:${session?.date}`} session={session} className={className} />;
}

function ExportControl({ session, className }) {
  const lock = useRef(false);
  const [status, setStatus] = useState('idle');
  const exportFile = async () => {
    if (lock.current || !session) return;
    lock.current = true;
    setStatus('pending');
    try { await downloadWorkoutFile(session); setStatus('requested'); }
    catch { setStatus('error'); }
    finally { lock.current = false; }
  };
  return <div className="space-y-1">
    <Button size="sm" variant="outline" className={`gap-1.5 ${className}`} disabled={!session || status === 'pending'} onClick={exportFile}>
      <Download className="w-3.5 h-3.5" />
      {status === 'pending' ? 'Preparing export...' : status === 'error' ? 'Retry JSON export' : 'Export workout JSON'}
    </Button>
    <p className="text-xs text-muted-foreground">TrainPaceLab JSON format. Direct watch import is not verified.</p>
    {status === 'requested' && <p role="status" className="text-xs text-muted-foreground">Download requested. Check your browser downloads.</p>}
    {status === 'error' && <p role="alert" className="text-xs text-destructive">Could not start the download. Retry the export.</p>}
  </div>;
}
