import React, { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Activity, Loader2, RefreshCw, AlertTriangle, CheckCircle2 } from 'lucide-react';
import { base44 } from '@/api/base44Client';

export function GarminConnectButton() {
  const [loading, setLoading] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [status, setStatus] = useState<any>(null);

  const loadStatus = async () => {
    try {
      const res = await base44.functions.invoke('garminSync', { action: 'status' });
      setStatus(res?.data || res);
    } catch {
      setStatus({ connected: false });
    }
  };

  useEffect(() => { loadStatus(); }, []);

  const handleConnect = async () => {
    setLoading(true);
    try {
      const res = await base44.functions.invoke('garminSync', { action: 'authorize' });
      const data = res?.data || res;
      if (data?.authorize_url) {
        window.location.href = data.authorize_url;
      } else {
        alert(data?.error || 'Failed to initiate Garmin authorization');
        setLoading(false);
      }
    } catch (err: any) {
      alert(err?.response?.data?.error || err.message || 'Failed to connect Garmin');
      setLoading(false);
    }
  };

  const handleSync = async () => {
    setSyncing(true);
    try {
      await base44.functions.invoke('garminSync', { action: 'sync_historical' });
      await loadStatus();
    } catch (err: any) {
      alert(err?.response?.data?.error || err.message || 'Garmin sync failed');
    } finally {
      setSyncing(false);
    }
  };

  // Expired grant: the only useful action is a fresh authorization, and the reason is
  // shown rather than swallowed.
  if (status?.needs_reconnect) {
    return (
      <div className="flex flex-col items-end gap-1">
        <Button onClick={handleConnect} disabled={loading} size="sm" variant="destructive" className="cursor-pointer">
          {loading ? <Loader2 className="w-4 h-4 mr-1 animate-spin" /> : <AlertTriangle className="w-4 h-4 mr-1" />}
          Reconnect
        </Button>
        <span className="max-w-[220px] text-right text-[11px] text-muted-foreground">
          {status?.last_error || 'Connection expired — reconnect to resume sync.'}
        </span>
      </div>
    );
  }

  if (status?.connected) {
    return (
      <div className="flex items-center gap-2">
        <span className="inline-flex items-center gap-1 text-[11px] font-medium text-emerald-400">
          <CheckCircle2 className="w-3.5 h-3.5" /> Connected
        </span>
        <Button onClick={handleSync} disabled={syncing} size="sm" variant="outline" className="cursor-pointer">
          {syncing ? <Loader2 className="w-4 h-4 mr-1 animate-spin" /> : <RefreshCw className="w-4 h-4 mr-1" />}
          Sync now
        </Button>
      </div>
    );
  }

  return (
    <Button
      onClick={handleConnect}
      disabled={loading}
      size="sm"
      className="bg-blue-600 hover:bg-blue-700 text-white cursor-pointer"
    >
      {loading ? <Loader2 className="w-4 h-4 mr-1 animate-spin" /> : <Activity className="w-4 h-4 mr-1" />}
      Connect Garmin
    </Button>
  );
}

export default GarminConnectButton;