import { useState, useEffect } from 'react';
import { connectionMonitor, ConnectionStatus, ConnectionEvent } from '../services/ConnectionMonitor';

/**
 * useConnectionStatus — React hook for monitoring backend connection.
 */
export function useConnectionStatus() {
  const [status, setStatus] = useState<ConnectionStatus>(connectionMonitor.getStatus());
  const [lastEvent, setLastEvent] = useState<ConnectionEvent | null>(null);

  useEffect(() => {
    // Start monitoring
    connectionMonitor.start();

    // Listen for status changes
    const handleStatusChange = (event: ConnectionEvent) => {
      setStatus(event.status);
      setLastEvent(event);
    };

    connectionMonitor.on('statusChange', handleStatusChange);

    // Cleanup
    return () => {
      connectionMonitor.off('statusChange', handleStatusChange);
      connectionMonitor.stop();
    };
  }, []);

  const isConnected = status === 'connected';
  const isDisconnected = status === 'disconnected';
  const isDegraded = status === 'degraded';
  const isChecking = status === 'checking';

  return {
    status,
    lastEvent,
    isConnected,
    isDisconnected,
    isDegraded,
    isChecking,
    forceCheck: () => connectionMonitor.forceCheck(),
  };
}

export default useConnectionStatus;
