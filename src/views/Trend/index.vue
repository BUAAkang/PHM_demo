<template>
  <div>
    <div class="page-title">趋势分析</div>

    <el-tabs v-model="activeTab" type="border-card" class="trend-tabs">
      <!-- Tab 1: 预防性维修到检信息 -->
      <el-tab-pane label="预防性维修到检信息" name="pm">
        <el-row :gutter="16">
          <!-- 左：筛选+检查项 -->
          <el-col :span="9">
            <el-card style="height: calc(100vh - 290px); overflow-y: auto">
              <template #header>
                <div class="section-header">
                  <span class="section-title"><el-icon><List /></el-icon> 检查项列表</span>
                </div>
              </template>
              <div style="display: flex; gap: 8px; align-items: center; margin-bottom: 12px; flex-wrap: wrap">
                <PlaneSelector />
                <el-select v-model="pmSpecialty" size="small" style="width: 110px" placeholder="专业">
                  <el-option value="" label="全部专业" />
                  <el-option value="机械专业" label="机械专业" />
                  <el-option value="军械专业" label="军械专业" />
                  <el-option value="航电专业" label="航电专业" />
                </el-select>
              </div>
              <el-empty v-if="filteredPM.length === 0" description="暂无维修到检信息" :image-size="60" />
              <div
                v-for="item in filteredPM"
                :key="item.id"
                class="pm-item"
                :class="{ active: selectedPM?.id === item.id, [item.status]: true }"
                @click="selectedPM = item"
              >
                <div style="display: flex; justify-content: space-between; align-items: center">
                  <span class="pm-name">{{ item.name }}</span>
                  <el-tag :type="pmStatusType(item.status)" size="small" effect="dark">
                    {{ pmStatusLabel(item.status) }}
                  </el-tag>
                </div>
                <div class="pm-meta">
                  <span>{{ item.specialty }}</span>
                  <span>{{ item.checkType }}</span>
                  <span>到检：{{ item.dueDate }}</span>
                </div>
                <el-progress
                  :percentage="Math.min(item.accumulatedHours / item.checkInterval * 100, 100)"
                  :color="pmProgressColor(item.status)"
                  :stroke-width="4"
                  :show-text="false"
                  style="margin-top: 6px"
                />
                <div class="pm-progress-text">{{ item.accumulatedHours }}/{{ item.checkInterval }}</div>
              </div>
            </el-card>
          </el-col>

          <!-- 右：趋势图 -->
          <el-col :span="15">
            <el-card style="height: calc(100vh - 290px); overflow-y: auto">
              <template #header>
                <span class="section-title"><el-icon><TrendCharts /></el-icon> 检查状态趋势</span>
              </template>
              <el-empty v-if="!selectedPM" description="请选择检查项查看趋势" :image-size="70" />
              <template v-else>
                <el-descriptions :column="3" border size="small" style="margin-bottom: 16px">
                  <el-descriptions-item label="检查项">{{ selectedPM.name }}</el-descriptions-item>
                  <el-descriptions-item label="类型">{{ selectedPM.checkType }}</el-descriptions-item>
                  <el-descriptions-item label="上次检查">{{ selectedPM.lastDate }}</el-descriptions-item>
                  <el-descriptions-item label="到检日期">{{ selectedPM.dueDate }}</el-descriptions-item>
                  <el-descriptions-item label="累计时间">{{ selectedPM.accumulatedHours }}/{{ selectedPM.checkInterval }}</el-descriptions-item>
                  <el-descriptions-item label="状态">
                    <el-tag :type="pmStatusType(selectedPM.status)" size="small">{{ pmStatusLabel(selectedPM.status) }}</el-tag>
                  </el-descriptions-item>
                </el-descriptions>
                <!-- 通过/不通过趋势折线 -->
                <div style="font-size: 12px; color: #7aadcc; margin-bottom: 6px">检查通过情况趋势（1=通过，0=不通过）：</div>
                <TimeSeriesChart
                  :series-data="{ '通过情况': selectedPM.trendData.map((d, i) => ({ t: d.time, v: d.pass })) }"
                  :limits="{ '通过情况': 0.5 }"
                  x-label="时间片"
                  height="260px"
                />
              </template>
            </el-card>
          </el-col>
        </el-row>
      </el-tab-pane>

      <!-- Tab 2: 整机/系统趋势分析 -->
      <el-tab-pane label="整机/系统趋势分析" name="sys">
        <el-row :gutter="16">
          <!-- 左：趋势项列表 -->
          <el-col :span="8">
            <el-card style="height: calc(100vh - 290px); overflow-y: auto">
              <template #header>
                <div class="section-header">
                  <span class="section-title"><el-icon><DataLine /></el-icon> 趋势项列表</span>
                </div>
              </template>
              <div style="margin-bottom: 12px">
                <PlaneSelector />
              </div>
              <el-empty v-if="currentTrends.length === 0" description="暂无趋势分析数据" :image-size="60" />
              <div
                v-for="tr in currentTrends"
                :key="tr.id"
                class="trend-item"
                :class="{ active: selectedTrend?.id === tr.id }"
                @click="selectedTrend = tr"
              >
                <div class="trend-name">{{ tr.name }}</div>
                <div class="trend-meta">
                  <span>对象：{{ tr.target }}</span>
                  <span>统计量：{{ tr.statFunc }}</span>
                </div>
                <div class="trend-meta">
                  <span>参数：{{ tr.param }}</span>
                  <span v-if="tr.limit" style="color: #faad14">限值：{{ tr.limit }}</span>
                </div>
              </div>
            </el-card>
          </el-col>

          <!-- 右：趋势折线图 -->
          <el-col :span="16">
            <el-card style="height: calc(100vh - 290px); overflow-y: auto">
              <template #header>
                <span class="section-title"><el-icon><TrendCharts /></el-icon> 趋势折线图</span>
              </template>
              <el-empty v-if="!selectedTrend" description="请从左侧选择趋势项" :image-size="70" />
              <template v-else>
                <el-descriptions :column="3" border size="small" style="margin-bottom: 16px">
                  <el-descriptions-item label="趋势名称">{{ selectedTrend.name }}</el-descriptions-item>
                  <el-descriptions-item label="趋势对象">{{ selectedTrend.target }}</el-descriptions-item>
                  <el-descriptions-item label="统计函数">{{ selectedTrend.statFunc }}</el-descriptions-item>
                </el-descriptions>
                <TimeSeriesChart
                  :series-data="{ [selectedTrend.param]: selectedTrend.trendData }"
                  :limits="selectedTrend.limit ? { [selectedTrend.param]: selectedTrend.limit } : {}"
                  x-label="飞行架次"
                  height="300px"
                />
              </template>
            </el-card>
          </el-col>
        </el-row>
      </el-tab-pane>
    </el-tabs>
  </div>
</template>

<script setup>
import { ref, computed, watch } from 'vue'
import { useAppStore } from '../../stores/appStore'
import PlaneSelector from '../../components/common/PlaneSelector.vue'
import TimeSeriesChart from '../../components/common/TimeSeriesChart.vue'
import { preventiveMaintenanceData, systemTrendData } from '../../mock/trend'

const store = useAppStore()
const activeTab = ref('pm')
const pmSpecialty = ref('')
const selectedPM = ref(null)
const selectedTrend = ref(null)

const allPM = computed(() => preventiveMaintenanceData[store.selectedPlaneId] || [])
const filteredPM = computed(() => {
  if (!pmSpecialty.value) return allPM.value
  return allPM.value.filter(p => p.specialty === pmSpecialty.value)
})
const currentTrends = computed(() => systemTrendData[store.selectedPlaneId] || [])

function pmStatusType(s) {
  return s === 'normal' ? 'success' : s === 'warning' ? 'warning' : 'danger'
}
function pmStatusLabel(s) {
  return s === 'normal' ? '正常' : s === 'warning' ? '即将到检' : '已超时'
}
function pmProgressColor(s) {
  return s === 'normal' ? '#52c41a' : s === 'warning' ? '#faad14' : '#ff4d4f'
}

watch(() => store.selectedPlaneId, () => {
  selectedPM.value = null
  selectedTrend.value = null
})
</script>

<style scoped>
.trend-tabs { background: #112240 !important; border-color: #1a3a5c !important; }
:deep(.el-tabs__content) { background: #112240; padding: 16px; }
:deep(.el-tabs--border-card > .el-tabs__header) { background: #0d1b2e; border-color: #1a3a5c; }
:deep(.el-tabs--border-card > .el-tabs__header .el-tabs__item.is-active) { background: #112240; color: #40a9ff; }
:deep(.el-tabs--border-card > .el-tabs__header .el-tabs__item) { color: #7aadcc; }

.pm-item, .trend-item {
  padding: 10px 12px;
  border-radius: 6px;
  cursor: pointer;
  margin-bottom: 8px;
  border: 1px solid #1a3a5c;
  border-left: 3px solid #1a3a5c;
  transition: all 0.2s;
}
.pm-item:hover, .pm-item.active,
.trend-item:hover, .trend-item.active {
  background: rgba(64,169,255,0.08);
  border-color: #40a9ff;
  border-left-color: #40a9ff;
}
.pm-item.warning { border-left-color: #faad14; }
.pm-item.overdue { border-left-color: #ff4d4f; }

.pm-name, .trend-name {
  font-size: 13px;
  font-weight: 600;
  color: #e0f0ff;
  margin-bottom: 4px;
}
.pm-meta, .trend-meta {
  display: flex;
  gap: 10px;
  font-size: 11px;
  color: #7aadcc;
  margin-bottom: 2px;
}
.pm-progress-text {
  font-size: 11px;
  color: #7aadcc;
  text-align: right;
  margin-top: 2px;
}
</style>
