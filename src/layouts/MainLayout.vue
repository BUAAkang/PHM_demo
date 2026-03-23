<template>
  <el-container class="main-layout">
    <!-- 顶部导航 -->
    <el-header class="header">
      <div class="header-left">
        <div class="logo-icon">PHM</div>
        <span class="system-title">PHM 开放式架构平台</span>
        <span class="system-sub">健康管理与预测维修</span>
      </div>
      <div class="header-right">
        <el-tag type="success" effect="dark" size="small">系统运行中</el-tag>
        <span class="time">{{ currentTime }}</span>
      </div>
    </el-header>

    <el-container class="body-container">
      <!-- 侧边导航 -->
      <el-aside width="200px" class="aside">
        <el-menu
          :default-active="$route.path"
          router
          background-color="#0d1b2e"
          text-color="#a0b4c8"
          active-text-color="#40a9ff"
          class="side-menu"
        >
          <el-menu-item v-for="item in menuItems" :key="item.path" :index="item.path">
            <el-icon><component :is="item.icon" /></el-icon>
            <span>{{ item.label }}</span>
          </el-menu-item>
        </el-menu>
      </el-aside>

      <!-- 主内容 -->
      <el-main class="main-content">
        <router-view />
      </el-main>
    </el-container>
  </el-container>
</template>

<script setup>
import { ref, onMounted, onUnmounted } from 'vue'
import {
  Monitor, SetUp, FirstAidKit, TrendCharts, Warning, Tools
} from '@element-plus/icons-vue'

const menuItems = [
  { path: '/realtime',    label: '实时监控', icon: Monitor },
  { path: '/diagnosis',   label: '增强诊断', icon: SetUp },
  { path: '/health',      label: '健康评估', icon: FirstAidKit },
  { path: '/trend',       label: '趋势分析', icon: TrendCharts },
  { path: '/prediction',  label: '故障预测', icon: Warning },
  { path: '/maintenance', label: '维修建议', icon: Tools },
]

const currentTime = ref('')
let timer = null

function updateTime() {
  currentTime.value = new Date().toLocaleString('zh-CN')
}

onMounted(() => {
  updateTime()
  timer = setInterval(updateTime, 1000)
})

onUnmounted(() => clearInterval(timer))
</script>

<style scoped>
.main-layout {
  width: 100vw;
  height: 100vh;
  background: #0a1628;
  overflow: hidden;
}

.header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  background: linear-gradient(90deg, #0d1b2e 0%, #112240 100%);
  border-bottom: 1px solid #1a3a5c;
  padding: 0 24px;
  height: 56px;
  flex-shrink: 0;
}

.header-left {
  display: flex;
  align-items: center;
  gap: 12px;
}

.logo-icon {
  height: 32px;
  width: 52px;
  background: linear-gradient(135deg, #1677ff, #40a9ff);
  border-radius: 6px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 13px;
  font-weight: 800;
  color: #fff;
  letter-spacing: 1px;
}

.system-title {
  font-size: 18px;
  font-weight: 700;
  color: #e8f4fd;
  letter-spacing: 1px;
}

.system-sub {
  font-size: 12px;
  color: #5a8db5;
  border-left: 1px solid #2a4a6a;
  padding-left: 12px;
}

.header-right {
  display: flex;
  align-items: center;
  gap: 16px;
}

.time {
  font-size: 13px;
  color: #7aadcc;
  font-family: monospace;
}

.aside {
  background: #0d1b2e;
  border-right: 1px solid #1a3a5c;
  overflow-y: auto;
}

.side-menu {
  border-right: none;
  padding-top: 8px;
}

:deep(.el-menu-item) {
  margin: 2px 8px;
  border-radius: 6px;
}

:deep(.el-menu-item.is-active) {
  background: rgba(64, 169, 255, 0.15) !important;
  border-left: 3px solid #40a9ff;
}

.body-container {
  flex: 1;
  min-height: 0;
  overflow: hidden;
}

.main-content {
  background: #0e1f35;
  overflow-y: auto;
  padding: 20px;
}
</style>
