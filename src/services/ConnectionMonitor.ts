import { EventEmitter } from './EventEmitter';

/**
 * ConnectionMonitor — Monitors backend connectivity.
 * Uses polling to detect when backend becomes available/unavailable.
 * Emits events for UI components to react.
 */

export type ConnectionStatus = 'connected' | 'disconnected' | 'checking' | 'degraded';

export interface ConnectionEvent {
  status: ConnectionStatus;
  timestamp: number;
  latency?: number;
  error?: string;
}

class ConnectionMonitor extends EventEmitter {
  private status: ConnectionStatus = 'checking';
  private intervalId: number | null = null;
  private checkInterval: number = 5000; // 5 seconds
  private healthEndpoint: string = '/api/health';
  private lastCheck: number = 0;
  private consecutiveFailures: number = 0;
  private maxFailuresBeforeDisconnect: number = 2;

  constructor() {
    super();
  }

  /**
   * Start monitoring connection
   */
  start(): void {
    if (this.intervalId) return;

    // Initial check
    this.check();

    // Periodic checks
    this.intervalId = window.setInterval(() => {
      this.check();
    }, this.checkInterval);
  }

  /**
   * Stop monitoring
   */
  stop(): void {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
  }

  /**
   * Get current status
   */
  getStatus(): ConnectionStatus {
    return this.status;
  }

  /**
   * Perform health check
   */
  private async check(): Promise<void> {
    const startTime = Date.now();
    this.lastCheck = startTime;

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 3000);

      const response = await fetch(this.healthEndpoint, {
        method: 'GET',
        signal: controller.signal,
        cache: 'no-cache',
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      const data = await response.json();
      const latency = Date.now() - startTime;

      // Check if database is healthy
      if (data.status === 'ok') {
        this.updateStatus('connected', { latency });
        this.consecutiveFailures = 0;
      } else if (data.status === 'degraded') {
        this.updateStatus('degraded', { latency, error: 'Database issues detected' });
        this.consecutiveFailures = 0;
      } else {
        throw new Error('Health check failed');
      }
    } catch (error: any) {
      this.consecutiveFailures++;

      // Only mark as disconnected after multiple failures
      if (this.consecutiveFailures >= this.maxFailuresBeforeDisconnect) {
        this.updateStatus('disconnected', {
          error: error.message || 'Connection failed',
        });
      }
    }
  }

  /**
   * Update status and emit event
   */
  private updateStatus(newStatus: ConnectionStatus, eventData: Partial<ConnectionEvent> = {}): void {
    const oldStatus = this.status;
    this.status = newStatus;

    // Only emit if status changed or it's been a while
    if (oldStatus !== newStatus || Date.now() - this.lastCheck > 30000) {
      const event: ConnectionEvent = {
        status: newStatus,
        timestamp: Date.now(),
        ...eventData,
      };

      this.emit('statusChange', event);
    }
  }

  /**
   * Force a manual check
   */
  async forceCheck(): Promise<ConnectionStatus> {
    await this.check();
    return this.status;
  }

  /**
   * Set check interval
   */
  setInterval(ms: number): void {
    this.checkInterval = ms;
    if (this.intervalId) {
      this.stop();
      this.start();
    }
  }
}

export const connectionMonitor = new ConnectionMonitor();
export default connectionMonitor;
