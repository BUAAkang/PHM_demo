import { createRouter, createWebHistory } from 'vue-router'

const routes = [
  {
    path: '/',
    component: () => import('../layouts/MainLayout.vue'),
    children: [
      { path: '', redirect: '/realtime' },
      { path: 'realtime', component: () => import('../views/Realtime/index.vue'), meta: { title: '实时监控' } },
      { path: 'diagnosis', component: () => import('../views/Diagnosis/index.vue'), meta: { title: '增强诊断' } },
      { path: 'health', component: () => import('../views/Health/index.vue'), meta: { title: '健康评估' } },
      { path: 'trend', component: () => import('../views/Trend/index.vue'), meta: { title: '趋势分析' } },
      { path: 'prediction', component: () => import('../views/Prediction/index.vue'), meta: { title: '故障预测' } },
      { path: 'maintenance', component: () => import('../views/Maintenance/index.vue'), meta: { title: '维修建议' } },
    ],
  },
]

const router = createRouter({
  history: createWebHistory(),
  routes,
})

export default router
