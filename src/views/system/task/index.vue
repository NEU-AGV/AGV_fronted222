<template>
  <div class="task-management-container">
    <el-tabs v-model="activeTab" class="task-tabs">
      <el-tab-pane label="列表视图" name="list" />
      <el-tab-pane label="日历视图" name="calendar" />
    </el-tabs>

    <div class="tab-content">
      <ListView
          v-if="activeTab === 'list'"
          @open-detail="openDetailDialog"
      />
      <CalendarView
          v-if="activeTab === 'calendar'"
          @open-detail="openDetailDialog"
      />
    </div>

    <!-- 任务详情 -->
    <el-dialog v-model="detailDialogVisible" title="任务详情" width="60%">
      <el-descriptions
          v-if="selectedTask"
          :column="2"
          border
          class="mb-4"
      >
        <el-descriptions-item label="任务ID">{{ selectedTask.taskId }}</el-descriptions-item>
        <el-descriptions-item label="任务名称">{{ selectedTask.taskName }}</el-descriptions-item>
        <el-descriptions-item label="任务类型">
          <dict-tag :options="task_type" :value="selectedTask.taskType" />
        </el-descriptions-item>
        <el-descriptions-item label="优先级">
          <dict-tag :options="task_priority" :value="selectedTask.priority" />
        </el-descriptions-item>
        <el-descriptions-item label="描述" :span="2">{{ selectedTask.description }}</el-descriptions-item>
        <el-descriptions-item label="创建人">{{ selectedTask.creator }}</el-descriptions-item>
        <el-descriptions-item label="执行人">{{ selectedTask.executor }}</el-descriptions-item>
        <el-descriptions-item label="协助人">{{ selectedTask.helper }}</el-descriptions-item>
        <el-descriptions-item label="计划开始">{{ selectedTask.plannedStartTime }}</el-descriptions-item>
        <el-descriptions-item label="计划结束">{{ selectedTask.plannedEndTime }}</el-descriptions-item>
        <el-descriptions-item label="实际开始">{{ selectedTask.actualStartTime || '--' }}</el-descriptions-item>
        <el-descriptions-item label="实际结束">{{ selectedTask.actualEndTime || '--' }}</el-descriptions-item>
        <el-descriptions-item label="线路">{{ selectedTask.line }}</el-descriptions-item>
        <el-descriptions-item label="范围">{{ selectedTask.scope }}</el-descriptions-item>
        <el-descriptions-item label="起始">{{ selectedTask.startLocation }}</el-descriptions-item>
        <el-descriptions-item label="终点">{{ selectedTask.endLocation }}</el-descriptions-item>
        <el-descriptions-item label="状态">
          <dict-tag :options="task_status" :value="selectedTask.status" />
        </el-descriptions-item>
        <el-descriptions-item label="完成度">{{ selectedTask.progress }}%</el-descriptions-item>
        <el-descriptions-item label="发现问题">{{ selectedTask.problemsFound }}</el-descriptions-item>
        <el-descriptions-item label="执行结果" :span="2">{{ selectedTask.result }}</el-descriptions-item>
      </el-descriptions>
      <template #footer>
        <el-button @click="detailDialogVisible = false">关闭</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup name="TaskManagement">
import { ref, getCurrentInstance } from 'vue'
import ListView from './components/ListView.vue'
import CalendarView from './components/CalendarView.vue'

const activeTab = ref('list')
const detailDialogVisible = ref(false)
const selectedTask = ref(null)

const { proxy } = getCurrentInstance()
const { task_status, task_priority, task_type } = proxy.useDict(
    'task_status',
    'task_priority',
    'task_type'
)

function openDetailDialog(task) {
  selectedTask.value = task
  detailDialogVisible.value = true
}
</script>

<style scoped>
.task-management-container {
  display: flex;
  flex-direction: column;
  width: 100%;
  height: calc(100vh - 140px);
  padding: 16px;              /* ← 页面整体内边距 */
}

.task-tabs {
  flex-shrink: 0;             /* Tabs 高度不参与拉伸 */
}

.tab-content {
  flex-grow: 1;               /* 占剩余空间，撑满父级 */
  overflow: auto;
  padding-top: 10px;
  width: 100%;
}
</style>
