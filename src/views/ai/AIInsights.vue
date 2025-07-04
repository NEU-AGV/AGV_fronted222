<template>
  <div class="ai-insights-container">
    <!-- ========== 布局骨架：左右两列 ========== -->
    <div class="main-layout">
      <!-- ===== 左侧：侧边栏 ===== -->
      <div class="conversation-list">
        <!-- 顶部操作 -->
        <div class="conversation-actions">
          <el-button
              class="submit-button convo-item"
              :class="{ 'active-convo': activeConversationId === null }"
              @click="handleNewConversation"
          >
            <el-icon><Plus /></el-icon> 新建聊天
          </el-button>
        </div>

        <!-- 滚动列表 -->
        <div class="conversation-items">
          <el-button
              v-for="convo in conversations"
              :key="convo.id"
              class="submit-button convo-item"
              :class="{ 'active-convo': activeConversationId === convo.id }"
              @click="openConversation(convo.id)"
          >
            {{ convo.title }}
          </el-button>
        </div>
      </div>
      <!-- ===== /侧边栏 ===== -->

      <!-- ===== 右侧：主内容区 ===== -->
      <div class="main-content">
        <!-- ---- 顶部知识库卡片 ---- -->
        <div class="top-cards">
          <div class="cards-list">
            <el-card
                v-for="kb in knowledgeBases"
                :key="kb.id"
                class="template-card"
                :class="{ 'is-configured': kb.isSelected }"
                shadow="hover"
                @click="toggleKB(kb.id)"
            >
              <div class="card-content">
                <div class="card-header">
                  <div class="card-title">{{ kb.title }}</div>
                  <el-icon
                      v-if="kb.isSelected"
                      class="clear-icon"
                      @click.stop="toggleKB(kb.id)"
                  ><Close /></el-icon>
                </div>
                <div class="card-description">{{ kb.description }}</div>
              </div>
              <el-checkbox
                  v-model="kb.isSelected"
                  class="card-selector-checkbox"
                  @click.stop
              />
            </el-card>
          </div>

          <!-- 添加新知识库按钮 -->
          <el-button
              :icon="Plus"
              circle
              title="添加知识库"
              class="add-card-btn"
              @click="openKBDialog"
          />
        </div>
        <!-- ---- /顶部知识库卡片 ---- -->

        <!-- ---- 聊天窗口 ---- -->
        <div class="chat-window">
          <div class="chat-history-container">
            <div
                v-for="(msg, idx) in activeConversation?.messages || []"
                :key="idx"
                :class="['chat-message', msg.role]"
            >
              <el-avatar
                  :icon="msg.role === 'user' ? User : 'Avatar'"
                  class="chat-avatar"
              />

              <!-- 图片 -->
              <template v-if="msg.type === 'image'">
                <img :src="msg.url" style="max-width:180px;max-height:180px" />
              </template>

              <!-- 图表 -->
              <template v-else-if="msg.type === 'chart'">
                <v-chart
                    :option="msg.content"
                    autoresize
                    class="chart-bubble"
                    style="width:280px;height:280px"
                />
              </template>

              <!-- 纯文本 -->
              <template v-else>
                <div class="chat-bubble">
                  <pre>{{ msg.content }}</pre>
                </div>
              </template>
            </div>
          </div>

          <div class="chat-input-area">
            <div class="input-actions">
              <div class="input-wrapper">
                <el-input
                    v-model="userInput"
                    type="textarea"
                    :rows="1"
                    autosize
                    resize="none"
                    placeholder="可在此继续追问..."
                    @keydown.enter.prevent="handleSendMessage"
                />
              </div>
              <el-button
                  type="primary"
                  :icon="Promotion"
                  class="send-button"
                  @click="handleSendMessage"
              >
                发送
              </el-button>
            </div>
          </div>
        </div>
        <!-- ---- /聊天窗口 ---- -->
      </div>
      <!-- ===== /主内容区 ===== -->
    </div>

    <!-- ==== 新知识库弹窗 ==== -->
    <el-dialog v-model="kbDialog.visible" title="添加知识库" width="520px">
      <el-form label-position="top" :model="kbDialog.form">
        <el-form-item label="标题" required>
          <el-input v-model="kbDialog.form.title" placeholder="如：隧道裂缝资料库" />
        </el-form-item>
        <el-form-item label="描述">
          <el-input
              v-model="kbDialog.form.description"
              type="textarea"
              placeholder="一句话说明知识库内容"
          />
        </el-form-item>
        <el-form-item label="上传文件 (必选)" required>
          <el-upload
              ref="uploadRef"
              :auto-upload="false"
              :limit="1"
              :on-change="handleKBFileChange"
          >
            <el-button type="primary" plain>选择文件</el-button>
          </el-upload>
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="kbDialog.visible = false">取 消</el-button>
        <el-button type="primary" @click="saveKnowledgeBase">保 存</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
/* ============================================================================
 * 完整 <script setup>：统一解析并渲染  ```echarts … ``` 代码块
 *  - 历史消息、流式增量统一调用 extractEchartsOption()
 *  - 其余逻辑与之前版本保持一致
 * ==========================================================================*/

import { ref, computed, nextTick, onMounted, getCurrentInstance } from 'vue'
import { ElMessage } from 'element-plus'
import { Plus, Promotion, User } from '@element-plus/icons-vue'

/* ---------- ECharts (vue-echarts) 按需注册 ---------- */
import VChart from 'vue-echarts'
import { use as echartsUse } from 'echarts/core'

// 渲染器
import { CanvasRenderer } from 'echarts/renderers'

// 图表类型
import {
  BarChart,
  LineChart,
  PieChart,
  ScatterChart,
  RadarChart,
  MapChart,
  GaugeChart
} from 'echarts/charts'

// 组件
import {
  GridComponent,
  PolarComponent,
  RadarComponent,
  TitleComponent,
  TooltipComponent,
  LegendComponent,
  ToolboxComponent,
  DataZoomComponent,
  VisualMapComponent,
  GeoComponent,
  TimelineComponent,
  MarkPointComponent,
  MarkLineComponent,
  MarkAreaComponent,
  DatasetComponent
} from 'echarts/components'

// 注册所有用到的
echartsUse([
  /* 渲染器 */
  CanvasRenderer,

  /* 图表类型 */
  BarChart,
  LineChart,
  PieChart,
  ScatterChart,
  RadarChart,
  MapChart,
  GaugeChart,

  /* 常用组件 */
  GridComponent,
  PolarComponent,
  RadarComponent,
  TitleComponent,
  TooltipComponent,
  LegendComponent,
  ToolboxComponent,
  DataZoomComponent,
  VisualMapComponent,
  GeoComponent,
  TimelineComponent,
  MarkPointComponent,
  MarkLineComponent,
  MarkAreaComponent,
  DatasetComponent
])

/* ---------- 当前登录人 ---------- */
const { proxy } = getCurrentInstance()
proxy.useDict('agv_defect_type', 'agv_defect_severity')
const currentUser =
    proxy.$store?.state?.user?.nickName ||
    proxy.$store?.state?.user?.userName ||
    'admin'

/* ---------- 常量 ---------- */
const DIFY = '/dify'
const USE_REAL_API = ref(true)

/* ============================================================================
 *  0️⃣ 通用：把 ```echarts … ``` 代码块解析成 option
 * ==========================================================================*/
function extractEchartsOption (text) {
  if (typeof text !== 'string') return null
  const m = text.match(/```echarts\s*([\s\S]*?)```/)
  if (!m) return null
  try { return JSON.parse(m[1]) } catch { return null }
}

/* ============================================================================
 *  1️⃣ 会话 & 历史
 * ==========================================================================*/
const conversations = ref([])      /* {id,title,messages,loaded,difyConvId} */
const activeConversationId = ref(null)
const activeConversation = computed(() =>
    conversations.value.find(c => c.id === activeConversationId.value)
)

/* 拉取会话列表 + 历史 */
async function loadAllConversations () {
  const tk = localStorage.getItem('difyToken')
  if (!tk) { ElMessage.error('缺少 difyToken'); return }

  /* 会话列表 */
  const listRes = await fetch(
      `${DIFY}/v1/conversations?user=${encodeURIComponent(currentUser)}`,
      { headers:{ Authorization:`Bearer ${tk}` } }
  )
  if (!listRes.ok) { ElMessage.error('会话列表失败'); return }
  const list = (await listRes.json()).data

  /* 并行拉每个会话历史 */
  const convs = await Promise.all(list.map(async ({ id, name }) => {
    const msgRes = await fetch(
        `${DIFY}/v1/messages?user=${encodeURIComponent(currentUser)}&conversation_id=${id}&limit=100`,
        { headers:{ Authorization:`Bearer ${tk}` } }
    )
    const msgs = msgRes.ok ? (await msgRes.json()).data : []
    const parsed = []

    msgs.forEach(m => {
      /* 用户提问 */
      if (m.query) {
        const opt = extractEchartsOption(m.query)
        parsed.push(
            opt
                ? { role:'user',  type:'chart', content:opt }
                : { role:'user',  content:m.query }
        )
      }
      /* 模型回答 */
      if (m.answer) {
        const opt = extractEchartsOption(m.answer)
        parsed.push(
            opt
                ? { role:'model', type:'chart', content:opt }
                : { role:'model', content:m.answer }
        )
      }
      /* 附件（图片等） */
      if (Array.isArray(m.message_files) && m.message_files.length) {
        m.message_files.forEach(f => {
          parsed.push({
            role   : f.belongs_to === 'assistant' ? 'model' : 'user',
            type   : f.type,  // 目前 Dify 只返回 image
            url    : f.url,
            content: ''
          })
        })
      }
    })

    return {
      id,
      title : name || '未命名会话',
      messages: parsed,
      loaded : true,
      difyConvId: id
    }
  }))

  conversations.value = convs
  if (convs.length) activeConversationId.value = convs[0].id
}

/* 新建本地会话 */
function handleNewConversation () {
  const tmp = `local-${Date.now()}`
  conversations.value.unshift({
    id: tmp,
    title: `聊天 ${conversations.value.length + 1}`,
    messages: [{ role:'model', content:'您好！有什么可以帮您？' }],
    loaded : true
  })
  activeConversationId.value = tmp
}

/* 切换会话 */
function openConversation (id) { activeConversationId.value = id }

/* ============================================================================
 *  2️⃣ 知识库 DataSet
 * ==========================================================================*/
const knowledgeBases = ref([])
const kbDialog = ref({ visible:false, form:{ title:'', description:'', file:null } })

function openKBDialog () {
  kbDialog.value.form = { title:'', description:'', file:null }
  kbDialog.value.visible = true
}
const handleKBFileChange = f => (kbDialog.value.form.file = f.raw)
const toggleKB = id => {
  const kb = knowledgeBases.value.find(k => k.id === id)
  if (kb) kb.isSelected = !kb.isSelected
}

/* 新建并上传 DataSet */
async function saveKnowledgeBase () {
  const { title, description, file } = kbDialog.value.form
  if (!title.trim()) return ElMessage.error('标题必填')
  if (!file)         return ElMessage.error('请选择文件')

  const tk = localStorage.getItem('difyToken')
  if (!tk) return ElMessage.error('缺少 difyToken')

  try {
    /* 1. 新建数据集 */
    const ds = await fetch(`${DIFY}/v1/datasets`, {
      method : 'POST',
      headers: {
        Authorization : `Bearer dataset-ZT75C4yxT0jTeyzUajCC686e`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ name:title, description })
    })
    if (!ds.ok) throw new Error(await ds.text())
    const { id } = await ds.json()

    /* 2. 上传文件 */
    const form = new FormData()
    form.append('file', file)
    form.append('data', JSON.stringify({
      indexing_technique:'high_quality',
      process_rule:{ mode:'automatic' }
    }))
    const up = await fetch(
        `${DIFY}/v1/datasets/${id}/document/create-by-file`,
        {
          method : 'POST',
          headers: { Authorization:`Bearer dataset-ZT75C4yxT0jTeyzUajCC686e` },
          body   : form
        }
    )
    if (!up.ok) throw new Error(await up.text())

    knowledgeBases.value.unshift({ id, title, description, isSelected:false })
    ElMessage.success('上传成功')
  } catch (e) { ElMessage.error(e.message) }
  finally { kbDialog.value.visible = false }
}

/* 拉取 DataSet 列表 */
async function loadDatasets () {
  const tk = localStorage.getItem('difyToken')
  if (!tk) return
  const res = await fetch(`${DIFY}/v1/datasets?page=1&page_size=100`, {
    headers:{ Authorization:`Bearer dataset-ZT75C4yxT0jTeyzUajCC686e` }
  })
  if (!res.ok) return
  const json = await res.json()
  knowledgeBases.value = json.data.map(ds => ({
    id:ds.id, title:ds.name, description:ds.description, isSelected:false
  }))
}

/* ============================================================================
 *  3️⃣ 聊天发送 & 流式回答
 * ==========================================================================*/
const userInput = ref('')

function scrollBottom () {
  nextTick(() => {
    const box = document.querySelector('.chat-history-container')
    box && (box.scrollTop = box.scrollHeight)
  })
}

async function streamCompletion (convo) {
  const tk = localStorage.getItem('difyToken')
  if (!tk) return ElMessage.error('缺少 difyToken')

  const body = {
    query          : convo.messages.at(-1).content,
    response_mode  : 'streaming',
    conversation_id: convo.difyConvId || '',
    user           : currentUser,
    inputs         : {},
    knowledge_config:{
      mode:'datasets',
      dataset_ids: knowledgeBases.value.filter(k => k.isSelected).map(k => k.id)
    }
  }
  const headers = { Authorization:`Bearer ${tk}`, 'Content-Type':'application/json' }
  if (tk.startsWith('user-')) headers['X-API-APP-ID'] = '<YOUR_APP_ID>'

  const resp = await fetch(`${DIFY}/v1/chat-messages`, {
    method : 'POST',
    headers,
    body   : JSON.stringify(body)
  })
  if (!resp.ok) { ElMessage.error(`Dify ${resp.status}`); return }

  /* 把临时 ID 换成真实 ID */
  if (!convo.difyConvId) {
    const real = resp.headers.get('x-conversation-id')
    if (real) { convo.difyConvId = real; convo.id = real }
  }

  /* 先放一个占位回答 */
  convo.messages.push({ role:'model', content:'' })
  const last   = convo.messages.at(-1)
  const reader = resp.body.getReader()
  const dec    = new TextDecoder()

  while (true) {
    const { value, done } = await reader.read()
    if (done) break

    dec.decode(value).split('\n').filter(Boolean).forEach(line => {
      if (!line.startsWith('data:')) return
      const payload = line.slice(5).trim()
      if (payload === '[DONE]') { reader.cancel(); return }

      try {
        const obj = JSON.parse(payload)

        /* 1. 增量文本 */
        if (typeof obj.answer === 'string') {
          /* 看看这段文本里有没有完整的 ```echarts``` 代码块 */
          const opt = extractEchartsOption(obj.answer)
          if (opt) {
            last.type    = 'chart'
            last.content = opt
          } else {
            last.content += obj.answer
          }
        }

        /* 2. Dify 直接推送 JSON（无 ```echarts``` 包裹） */
        if (obj.series) {
          last.type    = 'chart'
          last.content = obj
        }

      } catch { /* 非 JSON 直接忽略 */ }
      scrollBottom()
    })
  }
}

function handleSendMessage () {
  if (!userInput.value.trim() || !activeConversation.value) return
  activeConversation.value.messages.push({ role:'user', content:userInput.value })
  userInput.value = ''
  streamCompletion(activeConversation.value)
}

/* ============================================================================
 *  4️⃣ 生命周期
 * ==========================================================================*/
onMounted(async () => {
  if (USE_REAL_API.value) {
    await loadDatasets()
    await loadAllConversations()
  }
})
</script>


<style scoped>
/* ===== 1. 整体布局与背景 ===== */
.ai-insights-container {
  background-color: #f5f7fa;
  color: #303133;
  padding: 20px;
  height: 100vh;
  box-sizing: border-box;
}
.main-layout {
  display: flex;
  height: calc(100% - 40px);
  gap: 20px;
  align-items: stretch;
}

/* ===== 2. 主要区块 ===== */
.conversation-list,
.main-content .top-cards,
.chat-window {
  background: #ffffff;
  border: 1px solid #e4e7ed;
  padding: 15px;
  border-radius: 8px;
}
.conversation-list {
  width: 240px;
  display: flex;
  flex-direction: column;
  flex-shrink: 0;
  height: 100%;
  gap: 10px;
}
.conversation-actions { flex: 0 0 auto; }
.conversation-items {
  flex: 1 1 auto;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  gap: 10px;
}
.main-content {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 20px;
  min-width: 0;
}
.top-cards {
  display: flex;
  align-items: flex-start;
  gap: 20px;
  flex-shrink: 0;
}
.chat-window {
  flex: 1;
  display: flex;
  flex-direction: column;
  min-height: 0;
}

/* ===== 3. 卡片与按钮 ===== */
.cards-list {
  flex: 1;
  display: flex;
  gap: 20px;
  overflow-x: auto;
  padding-bottom: 5px;
}
.template-card {
  cursor: pointer;
  transition: all 0.2s ease-in-out;
  min-width: 220px;
  border: 1px solid #e4e7ed;
  border-radius: 8px;
  position: relative;
  padding-bottom: 15px;
}
.template-card:hover {
  transform: translateY(-5px);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.08);
}
.template-card.is-configured {
  border-color: var(--el-color-primary);
  box-shadow: 0 0 10px rgba(64, 158, 255, 0.2);
}
.card-title { font-weight: bold; color: #303133; }
.card-description,
.card-selection-details { font-size: 13px; color: #606266; }
.clear-icon { color: #909399; }
.clear-icon:hover { color: #f56c6c; }
.card-selector-checkbox {
  position: absolute;
  top: 5px;
  right: 5px;
}

/* 按钮统一蓝白配色 */
.submit-button,
.send-button,
.close-button,
.batch-analysis-btn {
  background-color: var(--el-color-primary);
  border-color: var(--el-color-primary);
  color: #fff;
  border-radius: 4px;
  transition: all 0.3s;
}
.submit-button:hover,
.send-button:hover,
.close-button:hover,
.batch-analysis-btn:hover {
  background-color: #79bbff;
  border-color: #79bbff;
}

/* 左侧会话条目 */
.submit-button.convo-item {
  background-color: #fff;
  color: #303336;
  border: 1px solid #dcdfe6;
  justify-content: flex-start;
}
.submit-button.convo-item:hover {
  background-color: #ecf5ff;
  color: var(--el-color-primary);
  border-color: #c6e2ff;
}
.active-convo {
  background-color: var(--el-color-primary-light-9) !important;
  color: var(--el-color-primary) !important;
  border-color: var(--el-color-primary-light-7) !important;
}

/* ===== 4. 聊天窗口 ===== */
.chat-history-container {
  flex: 1;
  overflow-y: auto;
  padding: 15px;
  border-radius: 4px;
  background-color: #fff;
}
.chat-message.user .chat-bubble {
  background-color: var(--el-color-primary);
  color: #fff;
}
.chat-message.model .chat-bubble {
  background-color: #e9e9eb;
  color: #303133;
}
.chat-bubble {
  padding: 10px 15px;
  border-radius: 10px;
  max-width: 80%;
  line-height: 1.6;
  white-space: pre-wrap;
  word-wrap: break-word;
  overflow-wrap: anywhere;
  word-break: break-all;
}
pre {
  margin: 0;
  font-family: inherit;
}
.chat-input-area {
  display: flex;
  flex-direction: column;
  gap: 10px;
  align-items: flex-start;
  flex-shrink: 0;
  padding-top: 15px;
  border-top: 1px solid #e4e7ed;
  margin-top: 15px;
}
.input-actions {
  display: flex;
  gap: 10px;
  align-items: flex-end;
  width: 100%;
}
.input-wrapper {
  flex-grow: 1;
  min-width: 0;
}

/* ===== 5. 弹窗 ===== */
:deep(.el-textarea__inner) {
  background-color: #f5f7fa !important;
  color: #303133 !important;
  border-color: #dcdfe6 !important;
  box-shadow: none !important;
  caret-color: var(--el-color-primary) !important;
}
:deep(.back-task .el-form-item__label) { color: #303133; }
.back-task,
.task {
  background: #fff;
  border-color: #e4e7ed;
  color: #303133;
}

/* 聊天条目布局 */
.chat-message {
  display: flex;
  gap: 12px;
  margin-bottom: 20px;
}
.chat-message.model { justify-content: flex-start; }
.chat-message.user { justify-content: flex-end; }
.chat-message.user .chat-avatar { order: 2; }
.chat-message { max-width: 100%; }

/* 图表气泡 */
.chart-bubble {
  max-width: 80%;
  border-radius: 10px;
  overflow: hidden;
  background: #fff;
  border: 1px solid #e4e7ed;
}

/* ② 预格式文本也要跟随折行规则 */
.chat-bubble pre {
  white-space: pre-wrap;
  word-break: break-all;
  overflow-wrap: anywhere;
}
</style>