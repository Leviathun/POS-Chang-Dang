/**
 * API Client — POS ร้านไก่ทอดช้างแดง
 * Reusable fetch wrapper with error handling for Vue 3 SPA
 */
const BASE_URL = window.location.origin;

async function request(method, path, body, options = {}) {
  const url = `${BASE_URL}${path}`;
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
  async daily(date) {
    return request('GET', `/api/reports/daily?date=${date}`);
  },
  async monthly(month) {
    return request('GET', `/api/reports/monthly?month=${month}`);
  },
  async yearly(year) {
    return request('GET', `/api/reports/yearly?year=${year}`);
  },
  async topItems(days = 7) {
    return request('GET', `/api/reports/top-items?days=${days}`);
  },
  async summary() {
    return request('GET', '/api/reports/summary');
  },
};

const settings = {
  async getAll() {
    return request('GET', '/api/settings');
  },
  async update(key, value) {
    return request('PUT', '/api/settings', { key, value });
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
};
