<template>
  <div class="ai-insights-container">
    <div class="template-cards-header">
      <div class="cards-list">
        <el-card v-for="card in analysisTemplates" :key="card.id" class="template-card" shadow="hover" @click="handleCardClick(card)">
          <div class="card-title">{{ card.title }}</div>
        </el-card>
      </div>
      <el-button :icon="Plus" circle @click="handleAddCard" title="自定义添加卡片" />
    </div>

    <div class="main-content">
      <div class="conversation-list">
        <el-button type="primary" plain class="new-chat-btn" @click="handleNewConversation">新建聊天</el-button>
        <div
            v-for="convo in conversations"
            :key="convo.id"
            class="convo-item"
            :class="{ active: activeConversationId === convo.id }"
            @click="activeConversationId = convo.id"
        >
          {{ convo.title }}
        </div>
      </div>

      <div class="chat-window">
        <div class="chat-history-container">
          <div v-for="(message, index) in activeConversation.messages" :key="index" :class="['chat-message', message.role]">
            <el-avatar :icon="message.role === 'user' ? User : 'Avatar'" class="chat-avatar" />
            <div class="chat-bubble">
              <div v-if="message.attachment" class="attachment-display">
                <el-icon><Document /></el-icon>
                <span>{{ message.attachment.name }}</span>
              </div>
              <pre>{{ message.content }}</pre>
            </div>
          </div>
        </div>
        <div class="chat-input-area">
          <div v-if="attachedFile" class="file-attachment-preview">
            <el-icon><FolderChecked /></el-icon>
            <span>{{ attachedFile.name }}</span>
            <el-icon class="remove-icon" @click="removeAttachment"><Close /></el-icon>
          </div>
          <div class="input-actions">
            <el-upload
                action="#"
                :show-file-list="false"
                :before-upload="handleFileSelect"
                class="upload-btn"
            >
              <el-icon title="上传文件"><FolderOpened /></el-icon>
            </el-upload>
            <div class="input-wrapper">
              <el-input
                  v-model="userInput"
                  type="textarea"
                  :rows="1"
                  autosize
                  resize="none"
                  placeholder="请输入您的问题..."
                  @keydown.enter.prevent="handleSendMessage"
              />
            </div>
            <el-button type="primary" :icon="Promotion" @click="handleSendMessage">发送</el-button>
          </div>
        </div>
      </div>
    </div>

    <el-dialog v-model="parameterDialog.visible" :title="parameterDialog.title" width="500px">
      <el-form label-position="top">
        <el-form-item v-if="parameterDialog.params.includes('task_ids')" label="选择分析的任务">
          <el-select v-model="parameterDialog.form.taskIds" multiple placeholder="可多选" style="width: 100%;">
            <el-option v-for="task in mockTasks" :key="task.taskId" :label="task.taskName" :value="task.taskId" />
          </el-select>
        </el-form-item>
        <el-form-item v-if="parameterDialog.params.includes('date_range')" label="选择时间范围">
          <el-date-picker v-model="parameterDialog.form.dateRange" type="daterange" style="width: 100%;" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="parameterDialog.visible = false">取 消</el-button>
        <el-button type="primary" @click="handleAnalysisSubmit">开始分析</el-button>
      </template>
    </el-dialog>

    <el-dialog v-model="cardDialog.visible" title="添加自定义分析卡片" width="500px">
      <el-form :model="cardDialog.form" label-position="top">
        <el-form-item label="卡片标题">
          <el-input v-model="cardDialog.form.title" placeholder="例如：指定线路缺陷统计" />
        </el-form-item>
        <el-form-item label="描述或指令">
          <el-input v-model="cardDialog.form.description" type="textarea" placeholder="描述这个卡片的功能或预设的指令" />
        </el-form-item>
      </el-form>
      <template #footer>
        <span class="dialog-footer">
          <el-button @click="cardDialog.visible = false">取 消</el-button>
          <el-button type="primary" @click="handleSaveCard">
            保 存
          </el-button>
        </span>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, reactive, computed, onMounted, onUnmounted, nextTick } from 'vue';
import { ElMessage } from 'element-plus';
import { User, Plus, FolderOpened, Promotion, Loading, Document, FolderChecked, Close } from '@element-plus/icons-vue';
// import { getTasks } from '@/api/tasks.js';
// import { getAnalysisTemplates, startStreamAnalysis } from '@/api/ai.js';

const USE_REAL_API = false;

const isLoading = ref(false);
const userInput = ref('');
const attachedFile = ref(null);
const analysisTemplates = ref([]);
const conversations = ref([ { id: 'convo-1', title: '默认会话', messages: [ { role: 'model', content: '您好！我是您的AI数据洞察助手。' } ] } ]);
const activeConversationId = ref('convo-1');
const activeConversation = computed(() => conversations.value.find(c => c.id === activeConversationId.value));
const cardDialog = reactive({ visible: false, form: { title: '', description: '' } });
const mockTasks = ref([]);
const parameterDialog = reactive({ visible: false, title: '', params: [], form: { taskIds: [], dateRange: [] }, analysisType: '' });
let eventSource = null;

const fetchInitialData = async () => {
  if (USE_REAL_API) {
    try {
      analysisTemplates.value = await getAnalysisTemplates();
      const taskRes = await getTasks({ page: 1, pageSize: 100 });
      mockTasks.value = taskRes.list;
    } catch(e) { console.error(e); }
  } else {
    analysisTemplates.value = [
      { id: 'defect_summary', title: '缺陷记录分析', description: '分析指定任务或时间范围内的缺陷...', required_params: ['task_ids', 'date_range'] },
      { id: 'personnel_efficiency', title: '人员效率分析', description: '分析指定人员的任务完成频率...', required_params: ['user_ids', 'date_range'] }
    ];
    mockTasks.value = [ { taskId: 'TASK-20250626-001', taskName: '1号线隧道巡检' }, { taskId: 'TASK-20250627-001', taskName: '2号线设备检查' } ];
  }
};

onMounted(() => { fetchInitialData(); });
onUnmounted(() => { if (eventSource) eventSource.close(); });

const handleNewConversation = () => {
  const newConvo = {
    id: `convo-${Date.now()}`,
    title: `新的聊天 ${conversations.value.length}`,
    messages: [ { role: 'model', content: '您好！有什么可以帮助您的吗？' } ]
  };
  conversations.value.unshift(newConvo);
  activeConversationId.value = newConvo.id;
};

const handleFileSelect = (rawFile) => {
  attachedFile.value = rawFile;
  return false;
};

const removeAttachment = () => {
  attachedFile.value = null;
};

const handleCardClick = (card) => {
  parameterDialog.title = `配置分析 - ${card.title}`;
  parameterDialog.params = card.required_params;
  parameterDialog.analysisType = card.id;
  parameterDialog.form.taskIds = [];
  parameterDialog.form.dateRange = [];
  parameterDialog.visible = true;
};

const handleSendMessage = () => {
  if (!userInput.value.trim() && !attachedFile.value) {
    return;
  }

  const userMessage = {
    role: 'user',
    content: userInput.value,
    attachment: attachedFile.value ? {
      name: attachedFile.value.name,
      size: attachedFile.value.size,
      type: attachedFile.value.type,
      file: attachedFile.value
    } : null
  };
  activeConversation.value.messages.push(userMessage);
  userInput.value = '';
  attachedFile.value = null;

  simulateStreamingResponse(activeConversationId.value);
};

const handleAnalysisSubmit = () => {
  const cardTitle = analysisTemplates.value.find(c => c.id === parameterDialog.analysisType)?.title || '自定义分析';
  const newConvo = { id: `convo-${Date.now()}`, title: cardTitle, messages: [] };
  const userRequestContent = `请为我执行: "${cardTitle}"\n任务范围: ${parameterDialog.form.taskIds.join(', ') || '全部'}\n时间范围: ${parameterDialog.form.dateRange?.map(d => new Date(d).toLocaleDateString()).join(' 至 ') || '全部'}`;
  newConvo.messages.push({ role: 'user', content: userRequestContent });
  conversations.value.unshift(newConvo);
  activeConversationId.value = newConvo.id;
  parameterDialog.visible = false;

  if (USE_REAL_API) {
    const requestData = {
      analysisType: parameterDialog.analysisType,
      parameters: { ...parameterDialog.form }
    };
    streamResponseFromAPI(requestData, newConvo.id);
  } else {
    simulateStreamingResponse(newConvo.id);
  }
};

const streamResponseFromAPI = (requestData, convoId) => {
  isLoading.value = true;
  const currentConvo = conversations.value.find(c => c.id === convoId);
  if (!currentConvo) return;
  currentConvo.messages.push({ role: 'model', content: '' });

  eventSource = startStreamAnalysis(requestData);
  eventSource.onmessage = (event) => {
    if (index === 0) isLoading.value = false;
    if (event.data === '[DONE]') {
      eventSource.close();
      return;
    }
    const lastMessage = currentConvo.messages[currentConvo.messages.length - 1];
    lastMessage.content += event.data;
  };
  eventSource.onerror = (err) => {
    console.error("EventSource failed:", err);
    ElMessage.error("与AI服务器连接失败");
    isLoading.value = false;
    eventSource.close();
  };
};

const simulateStreamingResponse = (convoId) => {
  isLoading.value = true;
  const currentConvo = conversations.value.find(c => c.id === convoId);
  if (!currentConvo) return;
  currentConvo.messages.push({ role: 'model', content: '' });

  const mockResponse = "根据您的要求，对任务 [TASK-20250626-001] 的分析结果如下：\n\n1.  **主要缺陷类型**: \n    * 裂缝 (45%)\n    * 渗水 (30%)\n\n2.  **根本原因分析**: \n    * 结构性裂缝多与沉降有关。\n    * 渗水问题集中在接口处，建议加强防水工艺。\n\n3.  **改进建议**: \n    * 对K10-K15段进行重点沉降观测。";
  let index = 0;

  const intervalId = setInterval(() => {
    if (index === 0) isLoading.value = false;
    if (index < mockResponse.length) {
      const lastMessage = currentConvo.messages[currentConvo.messages.length - 1];
      lastMessage.content += mockResponse[index];
      index++;
      nextTick(() => { /* scroll to bottom */ });
    } else {
      clearInterval(intervalId);
    }
  }, 50);
};

const handleAddCard = () => {
  cardDialog.form.title = '';
  cardDialog.form.description = '';
  cardDialog.visible = true;
};

const handleSaveCard = () => {
  analysisTemplates.value.push({
    id: `custom-${Date.now()}`,
    title: cardDialog.form.title,
    description: cardDialog.form.description,
  });
  cardDialog.visible = false;
};
</script>

<style scoped>
.ai-insights-container { padding: 20px; display: flex; flex-direction: column; height: calc(100vh - 140px); gap: 20px; }
.template-cards-header { display: flex; align-items: center; gap: 20px; flex-shrink: 0; }
.cards-list { display: flex; gap: 20px; overflow-x: auto; }
.template-card { cursor: pointer; transition: all 0.2s ease-in-out; min-width: 200px; }
.template-card:hover { transform: translateY(-5px); box-shadow: var(--el-box-shadow-light); }
.card-title { font-weight: bold; margin-bottom: 8px; }

.main-content { flex-grow: 1; display: flex; gap: 20px; min-height: 0; }
.conversation-list { width: 240px; background-color: #fcfcfc; border-radius: 4px; border: 1px solid var(--el-border-color-light); padding: 10px; display: flex; flex-direction: column; gap: 5px; flex-shrink: 0; }
.new-chat-btn { width: 100%; margin-bottom: 10px; }
.convo-item { padding: 10px; border-radius: 4px; cursor: pointer; font-size: 14px; }
.convo-item:hover { background-color: #f5f7fa; }
.convo-item.active { background-color: var(--el-color-primary-light-9); color: var(--el-color-primary); }

.chat-window { flex-grow: 1; display: flex; flex-direction: column; min-width: 0; }
.chat-history-container { flex-grow: 1; overflow-y: auto; background-color: #f5f7fa; padding: 20px; border-radius: 4px; }

/* ****** 修改开始 ****** */
.chat-input-area {
  display: flex;
  flex-direction: column; /* 1. 改为垂直布局 */
  gap: 10px; /* 增加元素间距 */
  align-items: flex-start; /* 左对齐 */
  padding-top: 15px;
  flex-shrink: 0;
}

.input-actions {
  display: flex;
  gap: 10px;
  align-items: flex-end; /* 让按钮和输入框底部对齐 */
  width: 100%; /* 占满父容器宽度 */
}

.input-wrapper {
  flex-grow: 1; /* 2. 关键：让输入框包裹层占据所有剩余空间 */
  min-width: 0; /* 在flex布局中防止子元素溢出 */
}

.file-attachment-preview {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 5px 10px;
  background-color: #ecf5ff;
  border: 1px solid #d9ecff;
  border-radius: 4px;
  font-size: 13px;
  /* `align-self: flex-start` 已被父元素的 `align-items` 替代 */
}
/* ****** 修改结束 ****** */

.upload-btn .el-icon { font-size: 20px; color: #666; cursor: pointer; }
.remove-icon { cursor: pointer; color: #999; }
.remove-icon:hover { color: var(--el-color-primary); }

/* 聊天气泡样式 */
.chat-message { display: flex; gap: 12px; margin-bottom: 20px; }
.chat-message.model { justify-content: flex-start; }
.chat-message.user { justify-content: flex-end; }
.chat-message.user .chat-bubble { background-color: #409eff; color: #fff; }
.chat-message.user .chat-avatar { order: 2; }
.chat-bubble { padding: 10px 15px; border-radius: 10px; background-color: #fff; max-width: 80%; line-height: 1.6; white-space: pre-wrap; word-wrap: break-word; }
pre { margin: 0; font-family: inherit; }

.attachment-display { display: flex; align-items: center; gap: 5px; background-color: rgba(0,0,0,0.05); padding: 5px 8px; border-radius: 4px; margin-bottom: 5px; }

</style>