import { createRouter, createWebHashHistory } from 'vue-router'
import Pos from '../views/Pos.vue'
import { getUser, isManagerOrAdmin } from '../helpers'

const requireLogin = (to, from, next) => (getUser() ? next() : next('/pos'))
const requireManager = (to, from, next) => (isManagerOrAdmin() ? next() : next('/pos'))

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
    path: '/management',
    name: 'Management',
    component: () => import('../views/Management.vue'),
    beforeEnter: requireManager
  },
  {
    path: '/menu',
    name: 'Menu',
    component: () => import('../views/Menu.vue'),
    beforeEnter: requireManager
  },
  {
    path: '/stock',
    name: 'Stock',
    component: () => import('../views/Stock.vue')
  },
  {
    path: '/stock/bulk',
    name: 'StockBulk',
    component: () => import('../views/StockBulk.vue'),
    beforeEnter: requireManager
  },
  {
    path: '/reports',
    name: 'Reports',
    component: () => import('../views/Reports.vue'),
    beforeEnter: requireLogin
  },
  {
    path: '/settings',
    name: 'Settings',
    component: () => import('../views/Settings.vue'),
    beforeEnter: requireLogin
  },
  {
    path: '/central-kitchen',
    redirect: '/central-kitchen/catalog'
  },
  {
    path: '/central-kitchen/:tab',
    name: 'CentralKitchen',
    component: () => import('../views/CentralKitchenView.vue'),
    beforeEnter: requireManager
  },
  {
    path: '/requisition',
    name: 'BranchRequisition',
    component: () => import('../views/BranchRequisitionView.vue'),
    beforeEnter: requireLogin
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
