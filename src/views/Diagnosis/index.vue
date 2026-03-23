<template>
  <div>
    <div class="page-head">
      <div class="page-title">增强诊断</div>
      <el-button type="primary" size="small" @click="openUploadDialog">上传飞参文件</el-button>
    </div>

    <el-tabs v-model="activeTab" type="border-card" class="diag-tabs">
      <!-- Tab 1: 飞参判读 -->
      <el-tab-pane label="飞参判读" name="fp">
        <FlightParamRead />
      </el-tab-pane>

      <!-- Tab 2: 地面综合诊断 -->
      <el-tab-pane label="地面综合诊断" name="gd">
        <GroundDiagnosis />
      </el-tab-pane>

      <!-- Tab 3: 排故引导 -->
      <el-tab-pane label="排故引导" name="guide" lazy>
        <TroubleshootChat />
      </el-tab-pane>
    </el-tabs>

    <el-dialog
      v-model="uploadDialogVisible"
      title="上传飞参文件"
      width="520px"
      destroy-on-close
    >
      <el-form :model="uploadForm" label-width="92px">
        <el-form-item label="任务名称">
          <el-input v-model="uploadForm.taskName" placeholder="例如：架次A12飞参上传" />
        </el-form-item>
        <el-form-item label="选择文件">
          <el-upload
            ref="uploadRef"
            :auto-upload="false"
            :show-file-list="true"
            :limit="1"
            :on-change="handleFileChange"
            :on-remove="handleFileRemove"
            :on-exceed="handleExceed"
          >
            <el-button type="primary" plain>选择文件</el-button>
            <template #tip>
              <div class="upload-tip">演示模式：支持任意飞参文件，仅反馈上传结果。</div>
            </template>
          </el-upload>
        </el-form-item>
      </el-form>

      <template #footer>
        <span class="dialog-footer">
          <el-button @click="uploadDialogVisible = false">取消</el-button>
          <el-button type="primary" :loading="uploading" @click="submitUpload">提交上传</el-button>
        </span>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref } from 'vue'
import { ElMessage } from 'element-plus'
import FlightParamRead from './FlightParamRead.vue'
import GroundDiagnosis from './GroundDiagnosis.vue'
import TroubleshootChat from './TroubleshootChat.vue'

const activeTab = ref('fp')
const uploadDialogVisible = ref(false)
const uploading = ref(false)
const selectedFile = ref(null)
const uploadRef = ref(null)
const uploadForm = ref({
  taskName: '',
})

function openUploadDialog() {
  uploadDialogVisible.value = true
}

function handleFileChange(file) {
  selectedFile.value = file
}

function handleFileRemove() {
  selectedFile.value = null
}

function handleExceed() {
  ElMessage.warning('一次仅可上传一个文件')
}

function resetUploadDialog() {
  selectedFile.value = null
  uploadForm.value.taskName = ''
  uploadRef.value?.clearFiles()
}

async function submitUpload() {
  if (!selectedFile.value) {
    ElMessage.error('请选择需要上传的飞参文件')
    return
  }

  uploading.value = true

  try {
    await new Promise((resolve) => setTimeout(resolve, 900))
    ElMessage.success(`文件 ${selectedFile.value.name} 上传成功`) 
    uploadDialogVisible.value = false
    resetUploadDialog()
  } catch (error) {
    ElMessage.error('上传失败，请稍后重试')
  } finally {
    uploading.value = false
  }
}
</script>

<style scoped>
.page-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.diag-tabs {
  background: #112240 !important;
  border-color: #1a3a5c !important;
}

.upload-tip {
  margin-top: 6px;
  color: #7aadcc;
  font-size: 12px;
}

:deep(.el-tabs__content) {
  background: #112240;
  padding: 16px;
}

:deep(.el-tabs--border-card > .el-tabs__header) {
  background: #0d1b2e;
  border-color: #1a3a5c;
}

:deep(.el-tabs--border-card > .el-tabs__header .el-tabs__item.is-active) {
  background: #112240;
  color: #40a9ff;
}

:deep(.el-tabs--border-card > .el-tabs__header .el-tabs__item) {
  color: #7aadcc;
}
</style>
