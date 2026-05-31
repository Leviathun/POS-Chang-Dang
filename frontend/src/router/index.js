import { createRouter, createWebHashHistory } from 'vue-router'
import Pos from '../views/Pos.vue'
import Menu from '../views/Menu.vue'
import Stock from '../views/Stock.vue'
import Reports from '../views/Reports.vue'
import Settings from '../views/Settings.vue'
import { getUser, isAdmin } from '../helpers'

const routes = [
  {
    path: '/',
    redirect: '/pos'
  },
  {
    path: '/pos',
    name: 'Pos',
    component: Pos
  },
  {
    path: '/menu',
    name: 'Menu',
    component: Menu
  },
  {
    path: '/stock',
    name: 'Stock',
    component: Stock
  },
  {
    path: '/reports',
    name: 'Reports',
    component: Reports,
    beforeEnter: (to, from, next) => {
      // Admin only
      if (isAdmin()) {
        next()
      } else {
        next('/pos')
      }
    }
  },
  {
    path: '/settings',
    name: 'Settings',
    component: Settings,
    beforeEnter: (to, from, next) => {
      // Admin only
      if (isAdmin()) {
        next()
      } else {
        next('/pos')
      }
    }
  },
  {
    path: '/:pathMatch(.*)*',
    redirect: '/pos'
  }
]

const router = createRouter({
  history: createWebHashHistory(),
  routes
})

export default router
