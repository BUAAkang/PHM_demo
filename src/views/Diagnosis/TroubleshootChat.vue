<template>
  <div class="chat-container">
    <div class="chat-messages" ref="messagesContainer">
      <div 
        v-for="(msg, index) in messages" 
        :key="index" 
        class="message-wrapper" 
        :class="msg.role"
      >
        <div class="message-content">
          {{ msg.content }}
        </div>
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

// ==========================================
// 需要在此处填写您实际的 LLM 接口信息
// ==========================================
// 根据您的 Python 示例，使用的是 OpenAI 标准基础路径
const API_URL = '/api/v3/chat/completions' 
const API_KEY = '76a878dc-4905-44c3-858c-8ef33006250f' // 您的 API Key
const MODEL = 'ep-20260203175529-xdfpz' // 您的接入点 ID (EP)
// ==========================================

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
    const apiMessages = messages.value.map(m => ({ role: m.role, content: m.content }))

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
</style>
