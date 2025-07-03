<template>
  <div class="app-container">
    <!-- ===== 查询表单 ===== -->
    <el-form ref="queryRef" :model="query" inline class="query-form">
      <el-form-item label="缺陷编号">
        <el-input v-model="query.defectId" placeholder="缺陷编号" clearable @keyup.enter="search" />
      </el-form-item>

      <el-form-item label="缺陷类型">
        <el-select v-model="query.defectType" placeholder="类型" clearable style="width:140px">
          <el-option v-for="d in defect_type" :key="d.value" :label="d.label" :value="d.value" />
        </el-select>
      </el-form-item>

      <el-form-item label="严重程度">
        <el-select v-model="query.severity" placeholder="严重度" clearable style="width:140px">
          <el-option v-for="d in defect_severity" :key="d.value" :label="d.label" :value="d.value" />
        </el-select>
      </el-form-item>

      <el-form-item label="状态">
        <el-select v-model="query.currentStatus" placeholder="状态" clearable style="width:140px">
          <el-option v-for="d in defect_status" :key="d.value" :label="d.label" :value="d.value" />
        </el-select>
      </el-form-item>

      <el-form-item>
        <el-button type="primary" icon="Search" @click="search" />
        <el-button icon="Refresh" @click="reset" />
      </el-form-item>
    </el-form>

    <!-- ===== 工具栏 ===== -->
    <div class="toolbar">
      <el-button type="info" plain icon="Refresh" @click="load">刷新</el-button>
      <el-button type="danger" plain icon="Delete" :disabled="!ids.length" @click="batchDelete"
                 v-hasPermi="['agv:defect:remove']">批量删除</el-button>
      <el-button type="warning" plain icon="Download" @click="exportExcel"
                 v-hasPermi="['agv:defect:export']">导出</el-button>
    </div>

    <!-- ===== 数据表 ===== -->
    <el-table v-loading="loading" :data="rows" row-key="id" @selection-change="onSelect">
      <el-table-column type="selection" width="55" />
      <el-table-column prop="defectId" label="编号" width="160" />
      <el-table-column label="类型" width="120" align="center">
        <template #default="{ row }"><dict-tag :options="defect_type" :value="row.defectType" /></template>
      </el-table-column>
      <el-table-column prop="description" label="描述" min-width="200" show-overflow-tooltip />
      <el-table-column label="严重度" width="110" align="center">
        <template #default="{ row }"><dict-tag :options="defect_severity" :value="row.severity" /></template>
      </el-table-column>
      <el-table-column label="状态" width="120" align="center">
        <template #default="{ row }"><dict-tag :options="defect_status" :value="row.currentStatus" /></template>
      </el-table-column>
      <el-table-column prop="discoverer" label="发现人" width="100" align="center" />
      <el-table-column label="发现时间" width="160" align="center">
        <template #default="{ row }">{{ parseTime(row.discoveryTime, '{y}-{m}-{d}') }}</template>
      </el-table-column>

      <!-- 操作 -->
      <el-table-column label="操作" fixed="right" width="260" align="center">
        <template #default="{ row }">
          <!-- 待确认 -->
          <template v-if="row.currentStatus === 'pending_confirm'">
            <el-button link type="success" icon="Select" @click="flow(row,'pending')"
                       v-hasPermi="['agv:defect:confirm']">确认</el-button>
            <el-button link type="danger" icon="Close" @click="flow(row,'cancle')"
                       v-hasPermi="['agv:defect:cancel']">取消</el-button>
          </template>
          <!-- 待处理 -->
          <template v-else-if="row.currentStatus === 'pending'">
            <el-button link type="primary" icon="Check" @click="flow(row,'done')"
                       v-hasPermi="['agv:defect:finish']">完成</el-button>
            <el-button link type="danger" icon="Close" @click="flow(row,'cancle')"
                       v-hasPermi="['agv:defect:cancel']">取消</el-button>
          </template>
          <!-- 查看 -->
          <el-button link type="info" icon="View" @click="openDetail(row)">查看</el-button>
        </template>
      </el-table-column>
    </el-table>

    <!-- ===== 分页 ===== -->
    <pagination v-show="pager.total" v-model:page="pager.pageNum" v-model:limit="pager.pageSize" :total="pager.total"
                @pagination="load" />

    <!-- ===== 详情抽屉 ===== -->
    <el-drawer v-model="detail.show" :title="'缺陷详情 - ' + detail.data.defectId" direction="rtl" size="50%">
      <div v-if="detail.data.defectId" class="detail-content">
        <!-- 基础信息 -->
        <el-descriptions :column="2" border title="基础信息">
          <el-descriptions-item label="缺陷编号">{{ detail.data.defectId }}</el-descriptions-item>
          <el-descriptions-item label="缺陷类型">
            {{ dictLabel(defect_type, detail.data.defectType) }}
          </el-descriptions-item>
          <el-descriptions-item label="严重程度">
            <el-tag :type="severityTag(detail.data.severity)">
              {{ dictLabel(defect_severity, detail.data.severity) }}
            </el-tag>
          </el-descriptions-item>
          <el-descriptions-item label="是否属实">
            <el-tag :type="detail.data.isVerified ? 'success' : 'danger'">
              {{ detail.data.isVerified ? '是' : '否' }}
            </el-tag>
          </el-descriptions-item>
          <el-descriptions-item label="缺陷描述" :span="2">{{ detail.data.description }}</el-descriptions-item>
          <el-descriptions-item label="缺陷图片" :span="2">
            <el-image :src="detail.data.imageUrl" fit="contain" style="width:100%;max-height:400px" />
          </el-descriptions-item>
        </el-descriptions>

        <!-- 发现与处理 -->
        <el-descriptions :column="2" border title="发现与处理信息" style="margin-top:20px">
          <el-descriptions-item label="当前状态">
            <el-tag :type="statusTag(detail.data.currentStatus)">
              {{ dictLabel(defect_status, detail.data.currentStatus) }}
            </el-tag>
          </el-descriptions-item>
          <el-descriptions-item label="关联任务">{{ detail.data.taskId }}</el-descriptions-item>
          <el-descriptions-item label="发现人员">{{ detail.data.discoverer }}</el-descriptions-item>
          <el-descriptions-item label="发现时间">{{ detail.data.discoveryTime }}</el-descriptions-item>
          <el-descriptions-item label="确认人员">{{ detail.data.confirmer }}</el-descriptions-item>
          <el-descriptions-item label="确认时间">{{ detail.data.confirmationTime }}</el-descriptions-item>
          <el-descriptions-item label="处理人员">{{ detail.data.handler }}</el-descriptions-item>
          <el-descriptions-item label="处理完成时间">{{ detail.data.handlingCompletionTime }}</el-descriptions-item>
          <el-descriptions-item label="处理结果" :span="2">{{ detail.data.handlingResult }}</el-descriptions-item>
        </el-descriptions>
      </div>
      <el-empty v-else description="暂无数据" />
    </el-drawer>
  </div>
</template>

<script setup name="DefectManagement">
import { ref, reactive, onMounted, getCurrentInstance } from 'vue'
import { ElMessageBox, ElMessage, ElNotification } from 'element-plus'
import { listDefect, updateDefect, delDefect, getDefect } from '@/api/system/defect'
import { parseTime } from '@/utils/ruoyi'
import dayjs from 'dayjs'

/* ===== 字典 ===== */
const { proxy } = getCurrentInstance()
const {
  agv_defect_type: defect_type,
  agv_defect_severity: defect_severity,
  agv_defect_status: defect_status
} = proxy.useDict('agv_defect_type', 'agv_defect_severity', 'agv_defect_status')

/* ===== 当前登录名 ===== */
const currentUser = proxy.$store?.state?.user?.nickName || proxy.$store?.state?.user?.userName || '当前用户'

/* ===== 查询 & 列表状态 ===== */
const query = reactive({ defectId: '', defectType: null, severity: null, currentStatus: null })
const pager = reactive({ pageNum: 1, pageSize: 10, total: 0 })
const rows = ref([])
const loading = ref(false)

/* ===== 工具函数 ===== */
const s2c = s => s.replace(/_([a-z])/g, (_, c) => c.toUpperCase())
const normalize = o => Object.fromEntries(Object.entries(o).map(([k, v]) => [s2c(k), v]))
const filterEmpty = o => Object.fromEntries(Object.entries(o).filter(([_, v]) => v !== '' && v !== null && v !== undefined))
const dictLabel = (opts, val) => opts.find(d => d.value === val)?.label || val
const severityTag = v => ['critical', 'severe'].includes(v) ? 'danger' : v === 'moderate' ? 'warning' : 'success'
const statusTag = v => ({ pending_confirm: 'warning', pending: 'primary', done: 'success', cancle: 'info' }[v] || 'default')

/* ===== 加载列表 ===== */
async function load() {
  loading.value = true
  try {
    const res = await listDefect({ ...filterEmpty(query), pageNum: pager.pageNum, pageSize: pager.pageSize })
    rows.value = res.rows.map(normalize)
    pager.total = res.total
  } finally { loading.value = false }
}
onMounted(load)

/* ===== 查询 / 重置 ===== */
const search = () => { pager.pageNum = 1; load() }
const reset = () => {
  Object.assign(query, { defectId: '', defectType: null, severity: null, currentStatus: null })
  proxy.resetForm('queryRef')
  search()
}

/* ===== 多选 ===== */
const ids = ref([])
const onSelect = sel => { ids.value = sel.map(i => i.id) }
import  useUserStore  from '@/store/modules/user'
const userStore = useUserStore()

async function flow(row, to) {
  await ElMessageBox.confirm('确认变更状态？', '提示', { type: 'warning' })

  const now = dayjs().format('YYYY-MM-DD HH:mm:ss')
  const payload = { id: row.id, currentStatus: to }

  if (to === 'pending') {
    Object.assign(payload, {
      confirmer: userStore.nickName || userStore.userName,
      confirmationTime: now,
      isVerified: 1
    })
  } else if (to === 'done') {
    const { value, action } = await proxy.$prompt('请输入处理结果', '处理结果')
    if (action === 'cancel') return
    Object.assign(payload, {
      handler: userStore.nickName || userStore.userName,
      handlingCompletionTime: now,
      handlingResult: value
    })
  }

  await updateDefect(payload)        // 这里的字段已是驼峰
  ElMessage.success('状态已更新')
  load()
}


/* ===== 批量删除 ===== */
async function batchDelete() {
  await ElMessageBox.confirm(`确认删除选中 ${ids.value.length} 条记录？`, '提示', { type: 'warning' })
  await delDefect(ids.value.join(','))
  ids.value = []
  ElMessage.success('删除成功')
  load()
}

/* ===== 详情抽屉 ===== */
const detail = reactive({ show: false, data: {} })
async function openDetail(row) {
  const { data } = await getDefect(row.id)
  detail.data = normalize(data)
  detail.show = true
}

/* ===== 导出 ===== */
const exportExcel = () => proxy.download('/system/defect/export', filterEmpty({ ...query, pageNum: 1, pageSize: 9999 }), `defect_${Date.now()}.xlsx`)
</script>

<style scoped>
.query-form {
  background: #f5f7fa;
  padding: 24px 24px 0;
  border-radius: 4px;
  margin-bottom: 24px;
  box-shadow: 0 1px 4px rgba(0, 0, 0, .06);
}

.toolbar {
  margin-bottom: 16px;
  display: flex;
  gap: 12px;
  flex-wrap: wrap;
  align-items: center;
}

:deep(.el-table td.el-table__cell .cell) {
  padding: 14px 12px !important;
}
</style>
