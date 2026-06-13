import { reactive } from 'vue';
import api from './api';

export const store = reactive({
  menuItems: [],
  categories: [],
  stockItems: [],
  lowStockThreshold: 5,
  menuLoaded: false,
  stockLoaded: false,

  // Fetch Menu & Categories (cached unless forced, refetches in background if cached)
  async fetchMenu(force = false) {
    if (this.menuLoaded && !force) {
      // Revalidate in the background (stale-while-revalidate)
      Promise.all([
        api.menu.getAll(),
        api.menu.getCategories()
      ]).then(([menuRes, catRes]) => {
        this.menuItems = menuRes.data || menuRes || [];
        this.categories = catRes.data || catRes || [];
      }).catch(e => {
        console.error('Background menu fetch error:', e);
      });
      return;
    }

    // First-time load or forced reload
    try {
      const [menuRes, catRes] = await Promise.all([
        api.menu.getAll(),
        api.menu.getCategories()
      ]);
      this.menuItems = menuRes.data || menuRes || [];
      this.categories = catRes.data || catRes || [];
      this.menuLoaded = true;
    } catch (e) {
      console.error('Store menu fetch error:', e);
      throw e;
    }
  },

  // Fetch Stock Items (cached unless forced, refetches in background if cached)
  async fetchStock(force = false) {
    if (this.stockLoaded && !force) {
      // Revalidate in the background (stale-while-revalidate)
      api.stock.getAll().then(res => {
        if (res.success && res.data && Array.isArray(res.data.items)) {
          this.stockItems = res.data.items.map(item => ({
            ...item,
            quantity: item.stock,
            raw_quantity: item.raw_stock
          }));
          if (res.data.threshold) {
            this.lowStockThreshold = Number(res.data.threshold) || 5;
          }
        } else {
          this.stockItems = Array.isArray(res.data) ? res.data : (Array.isArray(res) ? res : []);
        }
      }).catch(e => {
        console.error('Background stock fetch error:', e);
      });
      return;
    }

    // First-time load or forced reload
    try {
      const res = await api.stock.getAll();
      if (res.success && res.data && Array.isArray(res.data.items)) {
        this.stockItems = res.data.items.map(item => ({
          ...item,
          quantity: item.stock,
          raw_quantity: item.raw_stock
        }));
        if (res.data.threshold) {
          this.lowStockThreshold = Number(res.data.threshold) || 5;
        }
      } else {
        this.stockItems = Array.isArray(res.data) ? res.data : (Array.isArray(res) ? res : []);
      }
      this.stockLoaded = true;
    } catch (e) {
      console.error('Store stock fetch error:', e);
      throw e;
    }
  },

  // Invalidate specific cache stores on change
  clearMenuCache() {
    this.menuLoaded = false;
  },

  clearStockCache() {
    this.stockLoaded = false;
  },

  clearAllCache() {
    this.menuLoaded = false;
    this.stockLoaded = false;
    this.menuItems = [];
    this.categories = [];
    this.stockItems = [];
  }
});
