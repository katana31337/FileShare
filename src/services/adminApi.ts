const API_BASE = '/api';

interface LoginResponse {
  token: string;
  admin: { id: string; username: string };
}

interface SettingRecord {
  key: string;
  value: string;
  category: string;
  description: string;
  updated_at: string;
}

class AdminApiService {
  private token: string | null = null;

  constructor() {
    this.token = localStorage.getItem('admin_token');
  }

  private async request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };
    if (this.token) {
      headers['Authorization'] = `Bearer ${this.token}`;
    }

    const response = await fetch(`${API_BASE}${endpoint}`, {
      ...options,
      headers: { ...headers, ...(options.headers as Record<string, string>) },
    });

    if (response.status === 401) {
      this.logout();
      throw new Error('Unauthorized');
    }

    if (!response.ok) {
      const error = await response.json().catch(() => ({ message: 'Request failed' }));
      throw new Error(error.message || `HTTP ${response.status}`);
    }

    return response.json();
  }

  setToken(token: string): void {
    this.token = token;
    localStorage.setItem('admin_token', token);
  }

  logout(): void {
    this.token = null;
    localStorage.removeItem('admin_token');
  }

  isAuthenticated(): boolean {
    return !!this.token;
  }

  async login(username: string, password: string): Promise<LoginResponse> {
    const result = await this.request<LoginResponse>('/admin/login', {
      method: 'POST',
      body: JSON.stringify({ username, password }),
    });
    this.setToken(result.token);
    return result;
  }

  async getSettings(): Promise<SettingRecord[]> {
    return this.request<SettingRecord[]>('/admin/settings');
  }

  async getSettingsByCategory(category: string): Promise<SettingRecord[]> {
    return this.request<SettingRecord[]>(`/admin/settings/${category}`);
  }

  async updateSettings(settings: Array<{ key: string; value: string; category?: string }>): Promise<void> {
    await this.request('/admin/settings', {
      method: 'PUT',
      body: JSON.stringify({ settings }),
    });
  }

  async updateSetting(key: string, value: string, category?: string): Promise<void> {
    await this.request(`/admin/settings/${key}`, {
      method: 'PUT',
      body: JSON.stringify({ value, category }),
    });
  }

  async getStats(): Promise<any> {
    return this.request('/admin/stats');
  }

  async getShares(limit?: number, offset?: number): Promise<any[]> {
    const params = new URLSearchParams();
    if (limit) params.set('limit', String(limit));
    if (offset) params.set('offset', String(offset));
    return this.request(`/admin/shares?${params}`);
  }

  async deleteShare(id: string): Promise<void> {
    await this.request(`/admin/shares/${id}`, { method: 'DELETE' });
  }

  async cleanup(): Promise<{ deleted: number }> {
    return this.request('/admin/cleanup', { method: 'POST' });
  }

  async changePassword(oldPassword: string, newPassword: string): Promise<void> {
    await this.request('/admin/password', {
      method: 'PUT',
      body: JSON.stringify({ oldPassword, newPassword }),
    });
  }

  async getMe(): Promise<any> {
    return this.request('/admin/me');
  }

  async getPublicConfig(): Promise<any> {
    const response = await fetch(`${API_BASE}/admin/public-config`);
    return response.json();
  }
}

export const adminApi = new AdminApiService();
export default adminApi;
