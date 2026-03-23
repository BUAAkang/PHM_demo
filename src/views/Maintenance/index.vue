<template>
  <div>
    <div class="page-title">维修建议</div>

    <el-row :gutter="16">
      <!-- 左：架次选择 + 故障信息表 -->
      <el-col :span="10">
        <el-card style="height: calc(100vh - 180px); overflow-y: auto">
          <template #header>
            <div class="section-header">
              <span class="section-title"><el-icon><Document /></el-icon> 故障信息表</span>
            </div>
          </template>

          <!-- 架次选择 -->
          <div style="margin-bottom: 12px">
            <PlaneSelector />
          </div>
          <div style="margin-bottom: 12px; display: flex; gap: 8px; align-items: center; flex-wrap: wrap">
            <span style="font-size: 12px; color: #7aadcc">选择架次：</span>
            <el-select v-model="selectedSortieId" size="small" style="width: 200px" placeholder="请选择架次">
              <el-option
                v-for="s in currentSorties"
                :key="s.id"
                :label="`${s.sortieName}（${s.date}）`"
                :value="s.id"
              />
            </el-select>
          </div>

          <el-empty v-if="currentFaults.length === 0" description="请选择架次或当前架次无故障记录" :image-size="60" />
          <div
            v-for="f in currentFaults"
            :key="f.id"
            class="fault-row"
            :class="{ active: selectedFault?.id === f.id }"
            @click="selectedFault = f"
          >
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 4px">
              <span class="fault-name">{{ f.faultName }}</span>
              <el-tag :type="faultStatusType(f.faultStatus)" size="small" effect="dark">
                {{ faultStatusLabel(f.faultStatus) }}
              </el-tag>
            </div>
            <div class="fault-meta-row">
              <el-tag size="small" type="info">{{ f.faultType }}</el-tag>
              <span>{{ f.faultCode }}</span>
              <span>{{ f.system }}</span>
            </div>
            <div style="font-size: 11px; color: #7aadcc">故障设备：{{ f.faultDevice }}</div>
          </div>
        </el-card>
      </el-col>

      <!-- 右：维修建议/IETM -->
      <el-col :span="14">
        <el-card style="height: calc(100vh - 180px); overflow-y: auto">
          <template #header>
            <span class="section-title"><el-icon><Wrench /></el-icon>
              维修建议
              <span v-if="selectedFault" style="margin-left: 8px; font-size: 12px; color: #7aadcc">
                — {{ selectedFault.faultName }}
              </span>
            </span>
          </template>

          <el-empty v-if="!selectedFault" description="请从左侧选择故障条目" :image-size="70" />
          <template v-else-if="!currentGuide">
            <el-alert type="info" :closable="false" title="暂无该故障的维修建议，请联系维修工程师" show-icon />
          </template>
          <template v-else>
            <!-- 基本信息 -->
            <el-descriptions :column="2" border size="small" style="margin-bottom: 16px">
              <el-descriptions-item label="故障名称">{{ currentGuide.faultName }}</el-descriptions-item>
              <el-descriptions-item label="预计维修时长">{{ currentGuide.estimatedTime }}</el-descriptions-item>
              <el-descriptions-item label="IETM参考">
                <el-tag type="primary" size="small">{{ currentGuide.ietmRef }}</el-tag>
              </el-descriptions-item>
              <el-descriptions-item label="故障码">{{ selectedFault.faultCode }}</el-descriptions-item>
            </el-descriptions>

            <!-- 排故步骤 -->
            <div style="font-size: 13px; font-weight: 600; color: #b0cadd; margin-bottom: 10px">
              <el-icon><List /></el-icon> 排故步骤
            </div>
            <el-timeline>
              <el-timeline-item
                v-for="s in currentGuide.steps"
                :key="s.step"
                :type="urgencyType(s.urgency)"
                :hollow="s.urgency === 'low'"
                size="normal"
              >
                <div class="step-content">
                  <el-tag :type="urgencyType(s.urgency)" size="small" style="margin-right: 8px">
                    {{ urgencyLabel(s.urgency) }}
                  </el-tag>
                  <span>{{ s.action }}</span>
                </div>
              </el-timeline-item>
            </el-timeline>

            <!-- IETM 库引用 -->
            <el-divider style="border-color: #1a3a5c" />
            <div style="font-size: 13px; font-weight: 600; color: #b0cadd; margin-bottom: 10px">
              <el-icon><Reading /></el-icon> IETM 参考文档
            </div>
            <div class="ietm-card" v-for="doc in matchedIETM" :key="doc.id">
              <div style="display: flex; justify-content: space-between; align-items: center">
                <span class="ietm-title">{{ doc.title }}</span>
                <el-tag type="primary" size="small" effect="plain">{{ doc.category }}</el-tag>
              </div>
              <div style="font-size: 11px; color: #7aadcc; margin-top: 4px">文档ID：{{ doc.id }} | 章节：{{ doc.chapter }}</div>
            </div>
          </template>
        </el-card>
      </el-col>
    </el-row>
  </div>
</template>

<script setup>
import { ref, computed, watch } from 'vue'
import { useAppStore } from '../../stores/appStore'
import PlaneSelector from '../../components/common/PlaneSelector.vue'
import { sortieList } from '../../mock/diagnosis'
import { maintenanceFaultList, maintenanceGuide, ietmLibrary } from '../../mock/maintenance'

const store = useAppStore()
const selectedSortieId = ref(null)
const selectedFault = ref(null)

const currentSorties = computed(() => sortieList.filter(s => s.planeId === store.selectedPlaneId))
const currentFaults = computed(() => {
  if (!selectedSortieId.value) return []
  return maintenanceFaultList[selectedSortieId.value] || []
})
const currentGuide = computed(() => {
  if (!selectedFault.value) return null
  return maintenanceGuide[selectedFault.value.faultCode] || null
})
const matchedIETM = computed(() => {
  if (!currentGuide.value) return []
  return ietmLibrary.filter(d => d.id === currentGuide.value.ietmRef)
})

function faultStatusType(s) {
  return s === 'confirmed' ? 'danger' : s === 'suspected' ? 'warning' : 'success'
}
function faultStatusLabel(s) {
  return s === 'confirmed' ? '已确认' : s === 'suspected' ? '疑似' : '已解决'
}
function urgencyType(u) {
  return u === 'immediate' ? 'danger' : u === 'high' ? 'warning' : u === 'medium' ? 'primary' : 'info'
}
function urgencyLabel(u) {
  return u === 'immediate' ? '立即' : u === 'high' ? '高优先' : u === 'medium' ? '中优先' : '低优先'
}

watch(() => store.selectedPlaneId, () => {
  selectedSortieId.value = null
  selectedFault.value = null
})
watch(selectedSortieId, () => { selectedFault.value = null })
</script>

<style scoped>
.fault-row {
  padding: 10px 12px;
  border-radius: 6px;
  cursor: pointer;
  margin-bottom: 8px;
  border: 1px solid #1a3a5c;
  border-left: 3px solid #1a3a5c;
  transition: all 0.2s;
}
.fault-row:hover, .fault-row.active {
  background: rgba(64,169,255,0.08);
  border-left-color: #40a9ff;
}
.fault-name { font-size: 13px; font-weight: 600; color: #e0f0ff; }
.fault-meta-row {
  display: flex;
  gap: 10px;
  align-items: center;
  font-size: 11px;
  color: #7aadcc;
  margin-bottom: 2px;
}

.step-content {
  font-size: 13px;
  color: #c8ddef;
  line-height: 1.5;
}

:deep(.el-timeline-item__tail) { border-color: #1a3a5c; }

.ietm-card {
  padding: 10px 12px;
  border-radius: 6px;
  border: 1px solid #1a3a5c;
  background: rgba(64,169,255,0.05);
  margin-bottom: 8px;
}
.ietm-title { font-size: 13px; color: #c8ddef; font-weight: 500; }
</style>
