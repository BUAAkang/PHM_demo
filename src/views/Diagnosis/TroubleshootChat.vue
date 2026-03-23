<template>
  <div class="chat-container">
    <div class="chat-messages" ref="messagesContainer">
      <div
        v-for="(msg, index) in messages"
        :key="index"
        class="message-wrapper"
        :class="msg.role"
      >
        <div class="message-content" v-if="msg.role === 'user'">
          {{ msg.content }}
        </div>
        <div 
          class="message-content markdown-body" 
          v-else 
          v-html="renderMarkdown(msg.content)"
        ></div>
      </div>
      <div v-if="isLoading" class="message-wrapper assistant">
        <div class="message-content loading">正在思考...</div>
      </div>
    </div>
    
    <div class="chat-input-area">
      <el-input
        v-model="inputMessage"
        type="textarea"
        :rows="3"
        resize="none"
        placeholder="请描述您遇到的故障现象或提问..."
        @keydown.enter.prevent="sendMessage"
        :disabled="isLoading"
      />
      <el-button 
        type="primary" 
        class="send-btn" 
        :loading="isLoading" 
        @click="sendMessage"
        :disabled="!inputMessage.trim() || isLoading"
      >
        发送
      </el-button>
    </div>
  </div>
</template>

<script setup>
import { ref, nextTick } from 'vue'
import { ElMessage } from 'element-plus'
import { marked } from 'marked'
import DOMPurify from 'dompurify'

// 配置 marked 防止一些奇怪的换行问题，开启类似 Github 的换行
marked.setOptions({
  breaks: true,
  gfm: true
})

const renderMarkdown = (text) => {
  if (!text) return ''
  const rawHtml = marked.parse(text)
  return DOMPurify.sanitize(rawHtml)
}

// ==========================================
// 需要在此处填写您实际的 LLM 接口信息
// ==========================================
// 根据您的 Python 示例，使用的是 OpenAI 标准基础路径
const API_URL = '/api/v3/chat/completions' 
const API_KEY = '76a878dc-4905-44c3-858c-8ef33006250f' // 您的 API Key
const MODEL = 'ep-20260203175529-xdfpz' // 您的接入点 ID (EP)
// ==========================================
// 隐藏的系统背景信息（不显示在界面上，但会发送给大模型）
// 您可以在这里修改大模型的背景设定和知识库前提
const SYSTEM_PROMPT = `你是一个专业的航空维修智能排故助手。
你的任务是根据用户提供的飞机故障现象，结合航空维修手册（AMM）和排故手册（TSM）的逻辑，给出专业、准确、有条理**且简练**的排故建议，并且语气要严谨、专业。
在本轮对话中，用户主要聚焦的故障信息如下：
飞行架次信息： { id: 'S20260308001', planeId: 'P001', date: '2026-03-08', engineModel: 'WS-XX', sortieName: '第312架次', startTime: '08:15:00', endTime: '10:42:00', flightHours: 2.45 },
飞参判读结果： { id: 'E002', code: 'FP-HYD-002', name: '液压压力低告警', type: '告警', system: '液压系统', time: '09:10:05', duration: 12 },
故障事件：'E002': {
    params: ['1号液压压力(MPa)', '2号液压压力(MPa)'],
    series: {
      '1号液压压力(MPa)': genTimeSeries(20.5, 0.5),
      '2号液压压力(MPa)': genTimeSeries(17.8, 1.2),
    },
    limit: { '1号液压压力(MPa)': 20, '2号液压压力(MPa)': 20 },
  }, （注：该故障内容为二号液压压力低于阈值，且用户不知道数据为模拟生成）
在后续用户提问中，如果没有明确指示，则”该架次”，“该事件”，“该故障”等默认指代上述故障相关内容。`// ==========================================

const messages = ref([
  { role: 'assistant', content: '您好！我是智能排故助手。请描述您遇到的故障问题，我将为您提供诊断和排故建议。' }
])
const inputMessage = ref('')
const isLoading = ref(false)
const messagesContainer = ref(null)

const scrollToBottom = async () => {
  await nextTick()
  if (messagesContainer.value) {
    messagesContainer.value.scrollTop = messagesContainer.value.scrollHeight
  }
}

const sendMessage = async () => {
  const text = inputMessage.value.trim()
  if (!text) return

  // 添加用户消息
  messages.value.push({ role: 'user', content: text })
  inputMessage.value = ''
  scrollToBottom()

  // 检查是否配置了API
  if (API_URL === 'YOUR_API_URL_HERE' || API_KEY === 'YOUR_API_KEY_HERE') {
    ElMessage.error('请先在 TroubleshootChat.vue 中配置 API_URL 和 API_KEY')
    messages.value.push({ role: 'assistant', content: '[开发提示] 您还没有配置 API 地址和 API Key，请在代码中填写相关配置后重试。' })
    scrollToBottom()
    return
  }

  isLoading.value = true

  try {
    // 构造发给大模型的消息历史
    // 隐藏的系统级背景信息（始终放在队列开头）
    const apiMessages = [
      { role: 'system', content: SYSTEM_PROMPT },
      ...messages.value.map(m => ({ role: m.role, content: m.content }))
    ]

    const response = await fetch(API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${API_KEY}`
      },
      body: JSON.stringify({
        model: MODEL,
        stream: true,
        messages: apiMessages,
        temperature: 0.7
      }),
    })

    if (!response.ok) {
      const errorText = await response.text()
      throw new Error(`API 请求失败: ${response.status} - ${errorText}`)
    }

    const reader = response.body.getReader()
    const decoder = new TextDecoder('utf-8')
    
    // 在消息列表末尾增加一条助理的空消息，用来流式拼接
    messages.value.push({ role: 'assistant', content: '' })
    const assistantMessageIndex = messages.value.length - 1

    while (true) {
      const { done, value } = await reader.read()
      if (done) break
      
      const chunk = decoder.decode(value)
      const lines = chunk.split('\n').filter(line => line.trim().startsWith("data:"))

      for (const line of lines) {
        const message = line.replace(/^data:\s*/, '')
        if (message === "[DONE]") {
          break
        }
        try {
          const parsed = JSON.parse(message)
          const content = parsed.choices[0]?.delta?.content
          if (content) {
            messages.value[assistantMessageIndex].content += content
            scrollToBottom()
          }
        } catch (e) {

        }
      }
    }
  } catch (error) {
    console.error('LLM Request Error:', error)
    ElMessage.error(`请求失败: ${error.message}`)
    messages.value.push({ role: 'assistant', content: `[服务错误] 回答获取失败，请检查网络和 API 配置。错误详情: ${error.message}` })
  } finally {
    isLoading.value = false
    scrollToBottom()
  }
}
</script>

<style scoped>
.chat-container {
  display: flex;
  flex-direction: column;
  height: 500px;
  background: #0d1b2e;
  border: 1px solid #1a3a5c;
  border-radius: 4px;
}

.chat-messages {
  flex: 1;
  overflow-y: auto;
  padding: 20px;
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.message-wrapper {
  display: flex;
  width: 100%;
}

.message-wrapper.user {
  justify-content: flex-end;
}

.message-wrapper.assistant {
  justify-content: flex-start;
}

.message-content {
  max-width: 75%;
  padding: 10px 14px;
  border-radius: 8px;
  line-height: 1.5;
  word-wrap: break-word;
  white-space: pre-wrap;
}

.message-wrapper.user .message-content {
  background-color: #40a9ff;
  color: #fff;
  border-bottom-right-radius: 2px;
}

.message-wrapper.assistant .message-content {
  background-color: #1a3a5c;
  color: #c0d1e3;
  border-bottom-left-radius: 2px;
}

.message-content.loading {
  color: #7aadcc;
  font-style: italic;
}

.chat-input-area {
  display: flex;
  padding: 15px;
  background: #112240;
  border-top: 1px solid #1a3a5c;
  gap: 12px;
  align-items: flex-end;
}

.send-btn {
  height: auto;
  padding: 10px 24px;
}

/* 覆盖 input 样式适应暗色主题 */
:deep(.el-textarea__inner) {
  background-color: #0d1b2e;
  border-color: #1a3a5c;
  color: #fff;
}

:deep(.el-textarea__inner:focus) {
  border-color: #40a9ff;
}

/* Markdown 样式 */
:deep(.markdown-body) {
  font-size: 14px;
  line-height: 1.6;
}
:deep(.markdown-body p) {
  margin-bottom: 0.5em;
}
:deep(.markdown-body p:last-child) {
  margin-bottom: 0;
}
:deep(.markdown-body code) {
  background-color: rgba(255, 255, 255, 0.1);
  padding: 2px 4px;
  border-radius: 4px;
  font-family: monospace;
}
:deep(.markdown-body pre) {
  background-color: rgba(0, 0, 0, 0.3);
  padding: 10px;
  border-radius: 4px;
  overflow-x: auto;
  margin-top: 8px;
  margin-bottom: 8px;
}
:deep(.markdown-body pre code) {
  background-color: transparent;
  padding: 0;
}
:deep(.markdown-body ul), :deep(.markdown-body ol) {
  padding-left: 20px;
  margin-top: 4px;
  margin-bottom: 8px;
}
:deep(.markdown-body strong) {
  font-weight: bold;
  color: #40a9ff;
}
</style>
