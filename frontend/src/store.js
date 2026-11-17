import { reactive } from 'vue';
import api from './api';
import { getToday, getCurrentMonth } from './helpers';

const sortByOrder = (a, b) => (a.sort_order !== b.sort_order ? (a.sort_order || 0) - (b.sort_order || 0) : a.id - b.id);

const getActiveBranchKey = () => {
  const id = typeof sessionStorage !== 'undefined' ? sessionStorage.getItem('selected_branch_id') : null;
  return !id || id === 'all' ? 'default' : String(id);
};

export const store = reactive({
  menuItems: [],
  categories: [],
  stockItems: [],
  lowStockThreshold: 5,
  menuLoaded: false,
  stockLoaded: false,
  modifiersLoaded: false,
  settingsLoaded: false,
  reportsLoaded: false,

  menuBranchId: null,
  stockBranchId: null,
  modifiersBranchId: null,
  _seq: { menu: 0, stock: 0, modifiers: 0, settings: 0, reports: 0 },
  _branchPromises: {},
  _lastFetchedAt: {},

  modifiers: [],
  modifierPresets: [],
  settings: {},
  settingsBranchId: null,
  branches: [],
  users: [],
  reportsBranchId: null,
  reportSummary: null,
  reportTopItems: [],
  reportDailyData: null,
  reportMonthly: null,
  reportsExpenses: [],
  reportsActivities: [],
  reportsHistory: [],
  reportMonthlyExpenses: [],
  reportMonthlyOrders: [],

  _applyStockRes(res) {
    if (res && res.success && res.data && Array.isArray(res.data.items)) {
      this.stockItems = res.data.items.map(item => ({
        ...item,
        quantity: item.stock,
        raw_quantity: item.raw_stock
      }));
      if (res.data.threshold) {
        this.lowStockThreshold = Number(res.data.threshold) || 5;
      }
    } else {
      this.stockItems = Array.isArray(res?.data) ? res.data : (Array.isArray(res) ? res : []);
    }
  },

  async _fetchForBranch(key, branchKey, force, loadedProp, branchProp, loadFn, applyFn, refreshInBackground = true) {
    const BG_REFRESH_TTL_MS = 120000;
    if (this[loadedProp] && !force && this[branchProp] === branchKey) {
      const age = Date.now() - (this._lastFetchedAt[key] || 0);
      if (refreshInBackground && age >= BG_REFRESH_TTL_MS) {
        const seq = ++this._seq[key];
        loadFn().then(res => {
          if (seq === this._seq[key]) {
            applyFn(res);
            this._lastFetchedAt[key] = Date.now();
          }
        }).catch(e => console.error(`Background ${key} fetch error:`, e));
      }
      return;
    }

    const active = this._branchPromises[key];
    if (active && !force && active.branchKey === branchKey) {
      return active.promise;
    }

    const seq = ++this._seq[key];
    const promise = (async () => {
      try {
        const res = await loadFn();
        if (seq !== this._seq[key]) return;
        applyFn(res);
        this[branchProp] = branchKey;
        this[loadedProp] = true;
        this._lastFetchedAt[key] = Date.now();
      } catch (e) {
        console.error(`Store ${key} fetch error:`, e);
        throw e;
      } finally {
        if (seq === this._seq[key]) delete this._branchPromises[key];
      }
    })();

    this._branchPromises[key] = { branchKey, promise };
    return promise;
  },

  // Fetch Menu & Categories (cached per branch unless forced, refetches in background if cached)
  async fetchMenu(force = false) {
    return this._fetchForBranch(
      'menu',
      getActiveBranchKey(),
      force,
      'menuLoaded',
      'menuBranchId',
      () => Promise.all([api.menu.getAll(), api.menu.getCategories()]),
      ([menuRes, catRes]) => {
        this.menuItems = menuRes.data || menuRes || [];
        this.categories = catRes.data || catRes || [];
      }
    );
  },

  // Fetch Stock Items (cached per branch unless forced, refetches in background if cached)
  async fetchStock(force = false) {
    return this._fetchForBranch(
      'stock',
      getActiveBranchKey(),
      force,
      'stockLoaded',
      'stockBranchId',
      () => api.stock.getAll(),
      (res) => this._applyStockRes(res)
    );
  },

  clearMenuCache() {
    this._seq.menu++;
    this.menuLoaded = false;
    this.menuBranchId = null;
    delete this._branchPromises.menu;
    delete this._lastFetchedAt.menu;
  },

  clearStockCache() {
    this._seq.stock++;
    this.stockLoaded = false;
    this.stockBranchId = null;
    delete this._branchPromises.stock;
    delete this._lastFetchedAt.stock;
  },

  addCategory(category) {
    if (!category) return;
    this.categories.push(category.data || category);
    this.categories.sort(sortByOrder);
  },

  deleteCategory(catId) {
    this.categories = this.categories.filter(c => c.id !== catId);
  },

  addMenuItem(item) {
    if (!item) return;
    const mi = item.data || item;
    this.menuItems.push(mi);
    this.menuItems.sort(sortByOrder);
    if (this.stockLoaded) {
      this.stockItems.push({
        ...mi,
        quantity: mi.stock !== undefined ? mi.stock : mi.quantity,
        raw_quantity: mi.raw_stock !== undefined ? mi.raw_stock : mi.raw_quantity
      });
      this.stockItems.sort(sortByOrder);
    }
  },

  updateMenuItem(item) {
    if (!item) return;
    const mi = item.data || item;
    const idx = this.menuItems.findIndex(m => m.id === mi.id);
    if (idx !== -1) {
      this.menuItems[idx] = mi;
      this.menuItems.sort(sortByOrder);
    }
    const sIdx = this.stockItems.findIndex(s => s.id === mi.id);
    if (sIdx !== -1) {
      this.stockItems[sIdx] = {
        ...this.stockItems[sIdx],
        ...mi,
        quantity: mi.stock !== undefined ? mi.stock : mi.quantity,
        raw_quantity: mi.raw_stock !== undefined ? mi.raw_stock : mi.raw_quantity
      };
      this.stockItems.sort(sortByOrder);
    }
  },

  deleteMenuItem(itemId) {
    this.menuItems = this.menuItems.filter(m => m.id !== itemId);
    this.stockItems = this.stockItems.filter(s => s.id !== itemId);
  },

  updateItemsOrder(orderedItems) {
    const updatedMenuItems = orderedItems.map((item, index) => ({
      ...item,
      sort_order: index
    }));
    this.menuItems = updatedMenuItems;

    if (this.stockLoaded) {
      const stockMap = new Map(this.stockItems.map(s => [s.id, s]));
      const newStockItems = [];
      for (let i = 0; i < updatedMenuItems.length; i++) {
        const item = updatedMenuItems[i];
        const stockItem = stockMap.get(item.id);
        if (stockItem) {
          newStockItems.push({
            ...stockItem,
            sort_order: item.sort_order
          });
        }
      }
      this.stockItems = newStockItems;
    }
  },

  updateStock(itemId, stock, rawStock) {
    const numId = Number(itemId);
    const idx = this.stockItems.findIndex(s => Number(s.id) === numId);
    if (idx !== -1) {
      if (stock !== undefined) this.stockItems[idx].quantity = stock;
      if (rawStock !== undefined) this.stockItems[idx].raw_quantity = rawStock;
    }
    const mIdx = this.menuItems.findIndex(m => Number(m.id) === numId);
    if (mIdx !== -1) {
      if (stock !== undefined) {
        this.menuItems[mIdx].stock = stock;
        this.menuItems[mIdx].quantity = stock;
      }
      if (rawStock !== undefined) {
        this.menuItems[mIdx].raw_stock = rawStock;
        this.menuItems[mIdx].raw_quantity = rawStock;
      }
    }
  },

  async fetchModifiers(force = false) {
    return this._fetchForBranch(
      'modifiers',
      getActiveBranchKey(),
      force,
      'modifiersLoaded',
      'modifiersBranchId',
      () => Promise.all([api.modifiers.getAll(), api.modifiers.getPresets()]),
      ([modRes, presetRes]) => {
        if (modRes.success) this.modifiers = modRes.data || [];
        if (presetRes.success) this.modifierPresets = presetRes.data || [];
      }
    );
  },

  clearModifiersCache() {
    this._seq.modifiers++;
    this.modifiersLoaded = false;
    this.modifiersBranchId = null;
    delete this._branchPromises.modifiers;
    delete this._lastFetchedAt.modifiers;
  },

  async fetchSettingsData(branchId = null, force = false) {
    const loadSettingsTuple = () => Promise.all([
      api.settings.getAll(branchId).catch(e => {
        console.error('fetchSettingsData - settings.getAll error:', e);
        return { success: false, data: {} };
      }),
      api.auth.getBranches().catch(e => {
        console.error('fetchSettingsData - auth.getBranches error:', e);
        return { success: false, data: [] };
      }),
      api.auth.getUsers().catch(e => {
        console.error('fetchSettingsData - auth.getUsers error:', e);
        return { success: false, data: [] };
      })
    ]);

    const applySettingsTuple = ([setRes, brRes, usrRes]) => {
      if (setRes && setRes.success) this.settings = setRes.data || {};
      if (brRes && brRes.success) this.branches = brRes.data || [];
      this.users = (usrRes && usrRes.data) ? usrRes.data : (Array.isArray(usrRes) ? usrRes : []);
    };

    return this._fetchForBranch(
      'settings',
      branchId,
      force,
      'settingsLoaded',
      'settingsBranchId',
      loadSettingsTuple,
      applySettingsTuple
    );
  },

  async fetchReports(branchId = null, force = false) {
    const today = getToday();
    const currentMonth = getCurrentMonth();

    return this._fetchForBranch(
      'reports',
      branchId,
      force,
      'reportsLoaded',
      'reportsBranchId',
      () => Promise.all([
        api.reports.summary(branchId).catch(() => ({ success: false, data: null })),
        api.reports.topItems(7, branchId).catch(() => ({ success: false, data: [] })),
        api.reports.daily(today, branchId).catch(() => ({ success: false, data: null })),
        api.expenses.get({ date: today, branch_id: branchId }).catch(() => ({ success: false, data: [] })),
        api.activities.get({ date: today, branch_id: branchId, limit: 1000 }).catch(() => ({ success: false, data: [] })),
        api.orders.getAll({ date: today, limit: 1000, branch_id: branchId }).catch(() => ({ success: false, data: [] })),
        api.reports.monthly(currentMonth, branchId).catch(() => ({ success: false, data: null })),
        api.expenses.get({ month: currentMonth, branch_id: branchId }).catch(() => ({ success: false, data: [] })),
        api.orders.getAll({ status: 'completed', month: currentMonth, branch_id: branchId }).catch(() => ({ success: false, data: [] }))
      ]),
      ([sum, top, daily, exp, act, hist, monthlyRes, expMonthRes, monthlyOrdersRes]) => {
        this.reportSummary = sum && sum.success ? sum.data : (sum || null);
        this.reportTopItems = top && top.success ? (top.data || []) : [];
        this.reportDailyData = daily && daily.success ? daily.data : (daily || null);
        this.reportsExpenses = exp && exp.success ? (exp.data || []) : [];
        this.reportsActivities = act && act.success ? (act.data || []) : [];
        this.reportsHistory = hist && hist.success ? (hist.data || hist || []) : [];
        this.reportMonthly = monthlyRes && monthlyRes.success ? monthlyRes.data : (monthlyRes || null);
        this.reportMonthlyExpenses = expMonthRes && expMonthRes.success ? (expMonthRes.data || []) : [];
        this.reportMonthlyOrders = monthlyOrdersRes && monthlyOrdersRes.success ? (monthlyOrdersRes.data || []) : [];
      },
      false
    );
  },

  clearSettingsCache() {
    this._seq.settings++;
    this.settingsLoaded = false;
    this.settingsBranchId = null;
    delete this._branchPromises.settings;
    delete this._lastFetchedAt.settings;
  },

  clearReportsCache() {
    this._seq.reports++;
    this.reportsLoaded = false;
    this.reportsBranchId = null;
    delete this._branchPromises.reports;
    delete this._lastFetchedAt.reports;
    this.reportMonthlyOrders = [];
  },

  clearAllCache() {
    Object.keys(this._seq).forEach(k => { this._seq[k]++; });
    this._branchPromises = {};
    this._lastFetchedAt = {};
    this.menuLoaded = false;
    this.stockLoaded = false;
    this.modifiersLoaded = false;
    this.settingsLoaded = false;
    this.reportsLoaded = false;
    this.menuBranchId = null;
    this.stockBranchId = null;
    this.modifiersBranchId = null;
    this.settingsBranchId = null;
    this.reportsBranchId = null;
    this.menuItems = [];
    this.categories = [];
    this.stockItems = [];
    this.modifiers = [];
    this.modifierPresets = [];
    this.settings = {};
    this.branches = [];
    this.users = [];
    this.reportSummary = null;
    this.reportTopItems = [];
    this.reportDailyData = null;
    this.reportMonthly = null;
    this.reportsExpenses = [];
    this.reportsActivities = [];
    this.reportsHistory = [];
    this.reportMonthlyExpenses = [];
    this.reportMonthlyOrders = [];
  }
});
