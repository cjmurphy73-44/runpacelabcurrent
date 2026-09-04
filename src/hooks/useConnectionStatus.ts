import { useState, useEffect, useCallback } from 'react';

export interface ConnectionStatus {
  isConnected: boolean;
  isChecking: boolean;
  lastError: string | null;
  retry: () => Promise<void>;
}

export const useConnectionStatus = (healthEndpoint: string = '/api/cookbook/state'): ConnectionStatus => {
  const [isConnected, setIsConnected] = useState<boolean>(true);
  const [isChecking, setIsChecking] = useState<boolean>(false);
  const [lastError, setLastError] = useState<string | null>(null);

  const checkConnection = useCallback(async () => {
    setIsChecking(true);
    try {
      const response = await fetch(healthEndpoint, { method: 'GET', cache: 'no-store' });
      if (response.ok) {
        setIsConnected(true);
        setLastError(null);
      } else {
        setIsConnected(false);
        setLastError(`Server responded with status ${response.status}`);
      }
    } catch (err: any) {
      setIsConnected(false);
      setLastError(err.message || 'Network connection failed');
    } finally {
      setIsChecking(false);
    }
  }, [healthEndpoint]);

  useEffect(() => {
    checkConnection();
    const interval = setInterval(checkConnection, 30000); // Check every 30s
    return () => clearInterval(interval);
  }, [checkConnection]);

  return {
    isConnected,
    isChecking,
    lastError,
    retry: checkConnection,
  };
};
