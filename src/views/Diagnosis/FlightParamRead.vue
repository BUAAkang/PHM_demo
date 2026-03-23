<template>
  <div class="fp-read">
    <!-- 步骤提示 -->
    <el-steps :active="step" finish-status="success" size="small" style="margin-bottom: 20px">
      <el-step title="选择飞机" />
      <el-step title="选择架次" />
      <el-step title="查看事件" />
      <el-step title="参数时序" />
    </el-steps>

    <el-row :gutter="16">
      <!-- 左侧：架次列表 -->
      <el-col :span="8">
        <el-card class="left-panel">
          <template #header>
            <div class="section-header">
              <span class="section-title"><el-icon><List /></el-icon> 判读结果列表</span>
              <PlaneSelector />
            </div>
          </template>
          <el-empty v-if="currentSorties.length === 0" description="无飞参数据" :image-size="60" />
          <div
            v-for="s in currentSorties"
            :key="s.id"
            class="sortie-item"
            :class="{ active: selectedSortie?.id === s.id }"
            @click="selectSortie(s)"
          >
            <div class="sortie-name">{{ s.planeNo || s.sortieName }}</div>
            <div class="sortie-meta">
              <span>{{ s.date }}</span>
              <span>发动机：{{ s.engineModel }}</span>
            </div>
            <div class="sortie-meta">
              <span>{{ s.sortieName }}</span>
              <span>飞行时长：{{ s.flightHours }}h</span>
            </div>
          </div>
        </el-card>
      </el-col>

      <!-- 中间：事件列表 -->
      <el-col :span="7">
        <el-card class="mid-panel">
          <template #header>
            <span class="section-title"><el-icon><CircleCheck /></el-icon>
              事件列表
              <el-tag v-if="selectedSortie" type="info" size="small" style="margin-left: 6px">
                {{ selectedSortie.sortieName }}
              </el-tag>
            </span>
          </template>
          <el-empty v-if="!selectedSortie" description="请先选择架次" :image-size="50" />
          <el-empty v-else-if="currentEvents.length === 0" description="本架次无事件记录" :image-size="50" />
          <div
            v-for="ev in currentEvents"
            :key="ev.id"
            class="event-item"
            :class="{ active: selectedEvent?.id === ev.id, [ev.type]: true }"
            @click="selectEvent(ev)"
          >
            <div style="display: flex; align-items: center; justify-content: space-between">
              <span class="event-name">{{ ev.name }}</span>
              <el-tag :type="eventTagType(ev.type)" size="small" effect="dark">{{ ev.type }}</el-tag>
            </div>
            <div class="event-meta">
              <span>{{ ev.system }}</span>
              <span>触发：{{ ev.time }}</span>
              <span>持续：{{ ev.duration }}s</span>
            </div>
            <div class="event-code">{{ ev.code }}</div>
          </div>
        </el-card>
      </el-col>

      <!-- 右侧：参数时序图 -->
      <el-col :span="9">
        <el-card class="right-panel">
          <template #header>
            <div class="section-header">
              <span class="section-title"><el-icon><DataLine /></el-icon> 参数时序图</span>
              <div v-if="selectedEvent" style="display: flex; gap: 8px; flex-wrap: wrap">
                <el-checkbox
                  v-for="p in availableParams"
                  :key="p"
                  v-model="selectedParams"
                  :label="p"
                  size="small"
                >{{ p }}</el-checkbox>
              </div>
            </div>
            <div v-if="selectedEvent" style="margin-top: 8px; display: flex; gap: 8px; align-items: center; flex-wrap: wrap">
              <span style="font-size: 12px; color: #7aadcc">采样率：</span>
              <el-select v-model="sampleRate" size="small" style="width: 80px">
                <el-option :value="1" label="1Hz" />
                <el-option :value="5" label="5Hz" />
                <el-option :value="10" label="10Hz" />
              </el-select>
              <el-radio-group v-model="displayMode" size="small">
                <el-radio-button value="single">单图</el-radio-button>
                <el-radio-button value="multi">多图</el-radio-button>
              </el-radio-group>
            </div>
          </template>

          <el-empty v-if="!selectedEvent" description="请选择事件查看参数时序" :image-size="60" />

          <template v-else>
            <!-- 单图模式 -->
            <div v-if="displayMode === 'single'">
              <TimeSeriesChart
                :series-data="activeSeries"
                :limits="activeLimits"
                x-label="时间(s)"
                height="280px"
              />
            </div>
            <!-- 多图模式 -->
            <div v-else>
              <div v-for="p in selectedParams" :key="p" style="margin-bottom: 12px">
                <div style="font-size: 12px; color: #7aadcc; margin-bottom: 4px">{{ p }}</div>
                <TimeSeriesChart
                  :series-data="{ [p]: (currentSeriesData?.series?.[p] || []) }"
                  :limits="currentSeriesData?.limit || {}"
                  x-label="时间(s)"
                  height="160px"
                />
              </div>
            </div>

            <!-- 判据详情按钮 -->
            <el-button
              type="primary" text size="small"
              style="margin-top: 8px"
              @click="showCriteria = true"
            >
              查看判据内容
            </el-button>
          </template>
        </el-card>
      </el-col>
    </el-row>

    <!-- 判据详情弹窗 -->
    <el-dialog v-model="showCriteria" title="判据详情" width="480px" class="dark-dialog">
      <template v-if="currentCriteria">
        <el-descriptions :column="1" border>
          <el-descriptions-item label="事件序号">{{ currentCriteria.index }}</el-descriptions-item>
          <el-descriptions-item label="事件名称">{{ currentCriteria.name }}</el-descriptions-item>
          <el-descriptions-item label="事件类型">{{ currentCriteria.type }}</el-descriptions-item>
          <el-descriptions-item label="事件描述">{{ currentCriteria.description }}</el-descriptions-item>
          <el-descriptions-item label="判据内容">{{ currentCriteria.criteria }}</el-descriptions-item>
        </el-descriptions>
      </template>
      <el-empty v-else description="暂无判据信息" />
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, computed, watch } from 'vue'
import { useAppStore } from '../../stores/appStore'
import PlaneSelector from '../../components/common/PlaneSelector.vue'
import TimeSeriesChart from '../../components/common/TimeSeriesChart.vue'
import { sortieList, flightParamEvents, eventTimeSeriesData, faultCriteria } from '../../mock/diagnosis'

const store = useAppStore()
const step = ref(0)
const selectedSortie = ref(null)
const selectedEvent = ref(null)
const selectedParams = ref([])
const sampleRate = ref(1)
const displayMode = ref('single')
const showCriteria = ref(false)

const currentSorties = computed(() =>
  sortieList.filter(s => s.planeId === store.selectedPlaneId)
    .map(s => ({ ...s, planeNo: store.getPlaneById(s.planeId)?.planeNo }))
)

const currentEvents = computed(() =>
  selectedSortie.value ? (flightParamEvents[selectedSortie.value.id] || []) : []
)

const currentSeriesData = computed(() =>
  selectedEvent.value ? (eventTimeSeriesData[selectedEvent.value.id] || null) : null
)

const availableParams = computed(() => currentSeriesData.value?.params || [])

const activeSeries = computed(() => {
  const sd = currentSeriesData.value
  if (!sd) return {}
  return Object.fromEntries(
    selectedParams.value.map(p => [p, sd.series[p] || []])
  )
})

const activeLimits = computed(() => currentSeriesData.value?.limit || {})

const currentCriteria = computed(() =>
  selectedEvent.value ? (faultCriteria[selectedEvent.value.code] || null) : null
)

function selectSortie(s) {
  selectedSortie.value = s
  selectedEvent.value = null
  step.value = 1
}

function selectEvent(ev) {
  selectedEvent.value = ev
  const sd = eventTimeSeriesData[ev.id]
  selectedParams.value = sd?.params?.slice(0, 2) || []
  step.value = 2
}

function eventTagType(type) {
  return type === '设备故障' ? 'danger' : type === '告警' ? 'warning' : type === '使用限制' ? 'warning' : 'info'
}

watch(() => store.selectedPlaneId, () => {
  selectedSortie.value = null
  selectedEvent.value = null
  step.value = 0
})
</script>

<style scoped>

.left-panel, .mid-panel, .right-panel {
  height: calc(100vh - 260px);
  overflow-y: auto;
}

.sortie-item {
  padding: 10px 12px;
  border-radius: 6px;
  cursor: pointer;
  margin-bottom: 6px;
  border: 1px solid #1a3a5c;
  transition: all 0.2s;
}

.sortie-item:hover, .sortie-item.active {
  background: rgba(64, 169, 255, 0.1);
  border-color: #40a9ff;
}

.sortie-name {
  font-size: 13px;
  font-weight: 600;
  color: #e0f0ff;
  margin-bottom: 4px;
}

.sortie-meta {
  display: flex;
  justify-content: space-between;
  font-size: 11px;
  color: #7aadcc;
}

.event-item {
  padding: 8px 10px;
  border-radius: 6px;
  cursor: pointer;
  margin-bottom: 6px;
  border-left: 3px solid #1a3a5c;
  background: rgba(255,255,255,0.03);
  transition: all 0.2s;
}

.event-item:hover, .event-item.active {
  background: rgba(64, 169, 255, 0.08);
  border-left-color: #40a9ff;
}

.event-item.设备故障 { border-left-color: #ff4d4f; }
.event-item.告警 { border-left-color: #faad14; }
.event-item.使用限制 { border-left-color: #faad14; }

.event-name {
  font-size: 13px;
  color: #c8ddef;
  font-weight: 500;
}

.event-meta {
  display: flex;
  gap: 10px;
  font-size: 11px;
  color: #7aadcc;
  margin-top: 4px;
}

.event-code {
  font-size: 10px;
  color: #5a8db5;
  margin-top: 2px;
}

:deep(.dark-dialog .el-dialog) {
  background: #112240;
  border: 1px solid #1a3a5c;
}

:deep(.dark-dialog .el-dialog__title) {
  color: #e8f4fd;
}
</style>
