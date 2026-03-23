<template>
  <div>
    <div class="page-title">故障预测</div>

    <el-tabs v-model="activeTab" type="border-card" class="pred-tabs">
      <!-- Tab 1: 单机寿命监控 -->
      <el-tab-pane label="单机寿命监控" name="life">
        <el-row :gutter="16" style="margin-bottom: 16px">
          <el-col :span="24">
            <div class="card-dark" style="display: flex; gap: 12px; align-items: center">
              <PlaneSelector />
            </div>
          </el-col>
        </el-row>

        <el-row :gutter="16">
          <!-- 寿命消耗饼图 -->
          <el-col :span="10">
            <el-card>
              <template #header>
                <span class="section-title"><el-icon><PieChart /></el-icon> 各系统寿命消耗占比</span>
              </template>
              <div style="height: 320px">
                <v-chart :option="pieOption" autoresize />
              </div>
            </el-card>
          </el-col>

          <!-- 寿命消耗柱状图 -->
          <el-col :span="14">
            <el-card>
              <template #header>
                <span class="section-title"><el-icon><DataAnalysis /></el-icon> 各系统寿命消耗详情</span>
              </template>
              <div style="height: 320px">
                <v-chart :option="barOption" autoresize />
              </div>
            </el-card>
          </el-col>
        </el-row>
      </el-tab-pane>

      <!-- Tab 2: 有寿件使用信息监控 -->
      <el-tab-pane label="有寿件使用信息监控" name="llp">
        <el-row :gutter="16" style="margin-bottom: 16px">
          <el-col>
            <div class="card-dark" style="display: flex; align-items: center; gap: 12px; padding: 8px 12px">
              <PlaneSelector />
            </div>
          </el-col>
        </el-row>
        <el-table :data="currentLLPs" size="small">
          <el-table-column prop="name" label="有寿件名称" width="160" />
          <el-table-column prop="model" label="型号" width="100" />
          <el-table-column label="已使用" width="80">
            <template #default="{ row }">{{ row.usedLife }}<span style="font-size:10px;color:#7aadcc"> {{ row.unit }}</span></template>
          </el-table-column>
          <el-table-column label="剩余" width="80">
            <template #default="{ row }">
              <span :style="{ color: row.remainLife <= row.warnThreshold ? '#ff4d4f' : row.remainLife <= row.warnThreshold * 2 ? '#faad14' : '#52c41a' }">
                {{ row.remainLife }}
              </span>
              <span style="font-size:10px;color:#7aadcc"> {{ row.unit }}</span>
            </template>
          </el-table-column>
          <el-table-column label="寿命进度" min-width="140">
            <template #default="{ row }">
              <el-progress
                :percentage="Math.min(Math.round(row.usedLife / row.totalLife * 100), 100)"
                :color="llpColor(row)"
                :stroke-width="6"
              />
            </template>
          </el-table-column>
          <el-table-column label="状态" width="90">
            <template #default="{ row }">
              <el-tag :type="statusType(row.status)" size="small" effect="dark">
                {{ statusLabel(row.status) }}
              </el-tag>
            </template>
          </el-table-column>
        </el-table>
      </el-tab-pane>

      <!-- Tab 3: 机体结构寿命监控 -->
      <el-tab-pane label="机体结构寿命监控" name="struct">
        <div class="card-dark" style="display: flex; align-items: center; gap: 12px; padding: 8px 12px; margin-bottom: 16px">
          <PlaneSelector />
        </div>
        <el-table :data="currentStructure" size="small" style="margin-bottom: 16px">
          <el-table-column prop="part" label="结构部位" width="140" />
          <el-table-column label="寿命进度" min-width="160">
            <template #default="{ row }">
              <el-progress
                :percentage="Math.min(Math.round(row.usedLife / row.totalLife * 100), 100)"
                :color="structColor(row)"
                :stroke-width="6"
              />
            </template>
          </el-table-column>
          <el-table-column label="已使用/总寿命" width="160">
            <template #default="{ row }">{{ row.usedLife }}/{{ row.totalLife }} {{ row.unit }}</template>
          </el-table-column>
          <el-table-column label="消耗率" width="90">
            <template #default="{ row }">
              <span :style="{ color: row.consumeRate > 0.95 ? '#ff4d4f' : row.consumeRate > 0.9 ? '#faad14' : '#52c41a' }">
                {{ (row.consumeRate * 100).toFixed(1) }}%
              </span>
            </template>
          </el-table-column>
        </el-table>
      </el-tab-pane>

      <!-- Tab 4: 设备故障预测 -->
      <el-tab-pane label="设备故障预测" name="device">
        <div class="card-dark" style="display: flex; align-items: center; gap: 12px; padding: 8px 12px; margin-bottom: 16px">
          <PlaneSelector />
        </div>
        <el-empty v-if="currentPredictions.length === 0" description="该飞机当前无故障预测结果" :image-size="80" />
        <el-row :gutter="16">
          <el-col :span="12" v-for="pred in currentPredictions" :key="pred.id">
            <div class="pred-card" :class="pred.riskLevel">
              <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px">
                <span class="pred-device">{{ pred.device }}</span>
                <el-tag :type="riskTagType(pred.riskLevel)" effect="dark" size="default">
                  {{ riskLabel(pred.riskLevel) }}
                </el-tag>
              </div>
              <div class="pred-system">系统：{{ pred.system }}</div>
              <div class="pred-row">
                <span class="pred-label">当前健康度</span>
                <el-progress
                  :percentage="pred.currentHealth"
                  :color="healthColor(pred.currentHealth)"
                  :stroke-width="8"
                  style="flex: 1; margin: 0 10px"
                />
                <span class="pred-val">{{ pred.currentHealth }}%</span>
              </div>
              <div class="pred-row">
                <span class="pred-label">预测故障架次</span>
                <span class="pred-sortie" :style="{ color: pred.riskLevel === 'high' ? '#ff4d4f' : '#faad14' }">
                  约 {{ pred.predictedFaultSortie }} 架次后
                </span>
              </div>
              <div class="pred-row">
                <span class="pred-label">预测置信度</span>
                <span style="color: #40a9ff; font-family: monospace">{{ pred.confidence }}%</span>
              </div>
              <el-divider style="margin: 8px 0; border-color: #1a3a5c" />
              <div class="pred-basis">{{ pred.basis }}</div>
            </div>
          </el-col>
        </el-row>
      </el-tab-pane>
    </el-tabs>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'
import { use } from 'echarts/core'
import { PieChart as EchartsPieChart, BarChart } from 'echarts/charts'
import { GridComponent, TooltipComponent, LegendComponent } from 'echarts/components'
import { CanvasRenderer } from 'echarts/renderers'
import VChart from 'vue-echarts'
import { PieChart, DataAnalysis } from '@element-plus/icons-vue'
import { useAppStore } from '../../stores/appStore'
import PlaneSelector from '../../components/common/PlaneSelector.vue'
import {
  lifeLimitedPartsData, structureLifeData, deviceFaultPrediction, lifeConsumeStats
} from '../../mock/prediction'

use([EchartsPieChart, BarChart, GridComponent, TooltipComponent, LegendComponent, CanvasRenderer])

const store = useAppStore()
const activeTab = ref('life')

const currentStats = computed(() => lifeConsumeStats[store.selectedPlaneId] || { systems: [], consumePercent: [] })
const currentLLPs = computed(() => lifeLimitedPartsData[store.selectedPlaneId] || [])
const currentStructure = computed(() => structureLifeData[store.selectedPlaneId] || [])
const currentPredictions = computed(() => deviceFaultPrediction[store.selectedPlaneId] || [])

const pieOption = computed(() => ({
  backgroundColor: 'transparent',
  tooltip: { trigger: 'item', formatter: '{b}: {c}% ({d}%)', backgroundColor: '#1a3a5c', borderColor: '#2a5a8a', textStyle: { color: '#e0f0ff' } },
  legend: { orient: 'vertical', right: '5%', top: 'center', textStyle: { color: '#a0b4c8' } },
  series: [{
    type: 'pie',
    radius: ['40%', '70%'],
    center: ['38%', '50%'],
    data: currentStats.value.systems.map((s, i) => ({
      name: s,
      value: currentStats.value.consumePercent[i],
    })),
    label: { show: false },
    emphasis: { label: { show: true, fontSize: 14, color: '#e8f4fd' } },
  }],
}))

const barOption = computed(() => ({
  backgroundColor: 'transparent',
  tooltip: { trigger: 'axis', backgroundColor: '#1a3a5c', borderColor: '#2a5a8a', textStyle: { color: '#e0f0ff' } },
  grid: { left: 60, right: 20, top: 20, bottom: 30 },
  xAxis: { type: 'value', max: 100, axisLabel: { color: '#7aadcc', formatter: '{value}%' }, axisLine: { lineStyle: { color: '#2a4a6a' } }, splitLine: { lineStyle: { color: '#1a3a5c' } } },
  yAxis: { type: 'category', data: currentStats.value.systems, axisLabel: { color: '#a0b4c8' }, axisLine: { lineStyle: { color: '#2a4a6a' } } },
  series: [{
    type: 'bar',
    data: currentStats.value.consumePercent.map(v => ({
      value: v,
      itemStyle: { color: v >= 90 ? '#ff4d4f' : v >= 70 ? '#faad14' : '#40a9ff' },
    })),
    label: { show: true, position: 'right', color: '#a0b4c8', formatter: '{c}%' },
  }],
}))

function statusType(s) { return s === 'normal' ? 'success' : s === 'warning' ? 'warning' : 'danger' }
function statusLabel(s) { return s === 'normal' ? '正常' : s === 'warning' ? '预警' : '超限' }
function llpColor(row) {
  const p = row.usedLife / row.totalLife
  return p >= 0.9 ? '#ff4d4f' : p >= 0.7 ? '#faad14' : '#40a9ff'
}
function structColor(row) {
  const p = row.usedLife / row.totalLife
  return p >= 0.9 ? '#ff4d4f' : p >= 0.7 ? '#faad14' : '#52c41a'
}
function riskTagType(r) { return r === 'high' ? 'danger' : r === 'medium' ? 'warning' : 'success' }
function riskLabel(r) { return r === 'high' ? '高风险' : r === 'medium' ? '中风险' : '低风险' }
function healthColor(v) { return v >= 80 ? '#52c41a' : v >= 60 ? '#faad14' : '#ff4d4f' }
</script>

<style scoped>
.pred-tabs { background: #112240 !important; border-color: #1a3a5c !important; }
:deep(.el-tabs__content) { background: #112240; padding: 16px; }
:deep(.el-tabs--border-card > .el-tabs__header) { background: #0d1b2e; border-color: #1a3a5c; }
:deep(.el-tabs--border-card > .el-tabs__header .el-tabs__item.is-active) { background: #112240; color: #40a9ff; }
:deep(.el-tabs--border-card > .el-tabs__header .el-tabs__item) { color: #7aadcc; }

.pred-card {
  padding: 16px;
  border-radius: 8px;
  border: 1px solid #1a3a5c;
  margin-bottom: 16px;
}
.pred-card.high { border-color: rgba(255,77,79,0.4); background: rgba(255,77,79,0.05); }
.pred-card.medium { border-color: rgba(250,173,20,0.4); background: rgba(250,173,20,0.05); }
.pred-card.low { border-color: rgba(82,196,26,0.4); background: rgba(82,196,26,0.05); }

.pred-device { font-size: 16px; font-weight: 700; color: #e8f4fd; }
.pred-system { font-size: 12px; color: #7aadcc; margin-bottom: 10px; }
.pred-row {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 6px;
}
.pred-label { font-size: 12px; color: #7aadcc; min-width: 80px; }
.pred-val { font-family: monospace; font-size: 14px; color: #c8ddef; min-width: 40px; }
.pred-sortie { font-size: 14px; font-weight: 700; font-family: monospace; }
.pred-basis { font-size: 12px; color: #7aadcc; line-height: 1.5; }
</style>
