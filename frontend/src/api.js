/**
 * API Client — POS ร้านไก่ทอดช้างแดง
 * Reusable fetch wrapper with error handling for Vue 3 SPA
 */
const BASE_URL = window.location.origin;

async function request(method, path, body, options = {}) {
  let urlPath = path;
  if (method === 'GET') {
    const buster = `_cb=${Date.now()}`;
    urlPath = urlPath.includes('?') ? `${urlPath}&${buster}` : `${urlPath}?${buster}`;
  }
  const url = `${BASE_URL}${urlPath}`;
  const headers = {
    'Content-Type': 'application/json',
  };

  // Include user id from session
  const user = sessionStorage.getItem('pos_user');
  if (user) {
    try {
      const parsed = JSON.parse(user);
      if (parsed.id) {
        headers['x-user-id'] = String(parsed.id);
      }
    } catch (e) { /* ignore */ }
  }

  const config = {
    method,
    headers,
    ...options,
  };

  if (body && method !== 'GET') {
    config.body = JSON.stringify(body);
  }

  try {
    const response = await fetch(url, config);
    const data = await response.json().catch(() => ({}));

    if (!response.ok) {
      const errorMsg = data.error || data.message || `เกิดข้อผิดพลาด (${response.status})`;
      throw new Error(errorMsg);
    }

    return data;
  } catch (error) {
    if (error.name === 'TypeError' && error.message.includes('fetch')) {
      throw new Error('ไม่สามารถเชื่อมต่อเซิร์ฟเวอร์ได้');
    }
    throw error;
  }
}

const auth = {
  async login(pin, branchId) {
    return request('POST', '/api/auth/login', { pin, branch_id: branchId });
  },
  async getBranches() {
    return request('GET', '/api/auth/branches');
  },
  async createBranch(data) {
    return request('POST', '/api/auth/branches', data);
  },
  async updateBranch(id, data) {
    return request('PUT', `/api/auth/branches/${id}`, data);
  },
  async deleteBranch(id) {
    return request('DELETE', `/api/auth/branches/${id}`);
  },
  async getUsers() {
    return request('GET', '/api/auth/users');
  },
  async createUser(data) {
    return request('POST', '/api/auth/users', data);
  },
  async updateUser(id, data) {
    return request('PUT', `/api/auth/users/${id}`, data);
  },
  async deleteUser(id) {
    return request('DELETE', `/api/auth/users/${id}`);
  },
};

const menu = {
  async getAll() {
    return request('GET', '/api/menu');
  },
  async getCategories() {
    return request('GET', '/api/menu/categories');
  },
  async createCategory(data) {
    return request('POST', '/api/menu/categories', data);
  },
  async deleteCategory(id) {
    return request('DELETE', `/api/menu/categories/${id}`);
  },
  async create(data) {
    return request('POST', '/api/menu', data);
  },
  async update(id, data) {
    return request('PUT', `/api/menu/${id}`, data);
  },
  async delete(id) {
    return request('DELETE', `/api/menu/${id}`);
  },
  async toggle(id) {
    return request('POST', `/api/menu/${id}/toggle`);
  },
};

const orders = {
  async create(data) {
    return request('POST', '/api/orders', data);
  },
  async getAll(params = {}) {
    const query = new URLSearchParams(params).toString();
    const path = query ? `/api/orders?${query}` : '/api/orders';
    return request('GET', path);
  },
  async getById(id) {
    return request('GET', `/api/orders/${id}`);
  },
  async complete(id, data) {
    return request('POST', `/api/orders/${id}/complete`, data);
  },
  async cancel(id, reason) {
    return request('POST', `/api/orders/${id}/cancel`, { reason });
  },
  async getQR(id) {
    return request('GET', `/api/orders/${id}/qr`);
  },
};

const stock = {
  async getAll() {
    return request('GET', '/api/stock');
  },
  async restock(id, data) {
    return request('POST', `/api/stock/${id}/restock`, data);
  },
  async adjust(id, data) {
    return request('POST', `/api/stock/${id}/adjust`, data);
  },
  async fry(id, data) {
    return request('POST', `/api/stock/${id}/fry`, data);
  },
  async getLogs(id) {
    return request('GET', `/api/stock/${id}/logs`);
  },
  async bulkAdjust(data) {
    return request('POST', '/api/stock/bulk-adjust', data);
  },
};

const reports = {
  async daily(date, branchId = null) {
    let path = `/api/reports/daily?date=${date}`;
    if (branchId) path += `&branch_id=${branchId}`;
    return request('GET', path);
  },
  async monthly(month, branchId = null) {
    let path = `/api/reports/monthly?month=${month}`;
    if (branchId) path += `&branch_id=${branchId}`;
    return request('GET', path);
  },
  async yearly(year, branchId = null) {
    let path = `/api/reports/yearly?year=${year}`;
    if (branchId) path += `&branch_id=${branchId}`;
    return request('GET', path);
  },
  async topItems(days = 7, branchId = null) {
    let path = `/api/reports/top-items?days=${days}`;
    if (branchId) path += `&branch_id=${branchId}`;
    return request('GET', path);
  },
  async summary(branchId = null) {
    let path = '/api/reports/summary';
    if (branchId) path += `?branch_id=${branchId}`;
    return request('GET', path);
  },
};

const settings = {
  async getAll(branchId = null) {
    let path = '/api/settings';
    if (branchId) path += `?branch_id=${branchId}`;
    return request('GET', path);
  },
  async update(key, value, branchId = null) {
    const body = { key, value };
    if (branchId) body.branch_id = branchId;
    return request('PUT', '/api/settings', body);
  },
  async exportBackup() {
    return request('GET', '/api/settings/backup/export');
  },
  async importBackup(backup) {
    return request('POST', '/api/settings/backup/import', { backup });
  },
  async archiveOrders(months) {
    return request('POST', '/api/settings/archive', { months });
  },
};

const freeModifiers = {
  async getAll() {
    return request('GET', '/api/modifiers');
  },
  async restock(modifierId, bags, note) {
    return request('POST', '/api/modifiers/restock', { modifier_id: modifierId, bags, note });
  },
  async adjust(modifierId, quantity, reason, note) {
    return request('POST', '/api/modifiers/adjust', { modifier_id: modifierId, quantity, reason, note });
  },
  async toggle(id) {
    return request('POST', `/api/modifiers/toggle/${id}`);
  },
  async getPresets() {
    return request('GET', '/api/modifiers/presets');
  },
  async createPreset(data) {
    return request('POST', '/api/modifiers/presets', data);
  },
  async updatePreset(id, data) {
    return request('PUT', `/api/modifiers/presets/${id}`, data);
  },
  async deletePreset(id) {
    return request('DELETE', `/api/modifiers/presets/${id}`);
  },
  async getLogs(id) {
    return request('GET', `/api/modifiers/${id}/logs`);
  },
};

const expenses = {
  async create(data) {
    return request('POST', '/api/expenses', data);
  },
  async get(dateOrParams) {
    if (dateOrParams && typeof dateOrParams === 'object') {
      const query = new URLSearchParams(dateOrParams).toString();
      return request('GET', `/api/expenses?${query}`);
    }
    return request('GET', `/api/expenses?date=${dateOrParams}`);
  },
  async delete(id) {
    return request('DELETE', `/api/expenses/${id}`);
  },
};

const activities = {
  async get(dateOrParams, userId) {
    if (dateOrParams && typeof dateOrParams === 'object') {
      const query = new URLSearchParams(dateOrParams).toString();
      return request('GET', `/api/activities?${query}`);
    }
    let path = `/api/activities?date=${dateOrParams}`;
    if (userId) path += `&user_id=${userId}`;
    return request('GET', path);
  },
};

export default {
  auth,
  menu,
  orders,
  stock,
  reports,
  settings,
  expenses,
  activities,
  freeModifiers,
  modifiers: freeModifiers,
};
