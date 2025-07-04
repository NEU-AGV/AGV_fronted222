<template>
  <!-- ================= 查询表单 ================= -->
  <el-form ref="queryRef" :model="query" inline class="query-form">
    <el-form-item label="任务编号"><el-input v-model="query.taskId" placeholder="任务编号" clearable /></el-form-item>
    <el-form-item label="任务名称"><el-input v-model="query.taskName" placeholder="任务名称" clearable /></el-form-item>
    <el-form-item label="状态">
      <el-select v-model="query.status" placeholder="状态" clearable style="width:120px">
        <el-option v-for="d in task_status" :key="d.value" :label="d.label" :value="d.value" />
      </el-select>
    </el-form-item>
    <el-form-item label="线路"><el-input v-model="query.line" placeholder="线路" clearable /></el-form-item>
    <el-form-item>
      <el-button type="primary" icon="Search"  @click="search" />
      <el-button                icon="Refresh" @click="reset"  />
    </el-form-item>
  </el-form>

  <!-- ================= 工具栏 ================= -->
  <div class="toolbar">
    <el-button type="primary"  icon="Plus"     @click="openAdd"        v-hasPermi="['agv:task:add']"   >新增</el-button>
    <el-button type="success"  icon="Edit"     :disabled="single" @click="openEdit"       v-hasPermi="['agv:task:edit']"  >修改</el-button>
    <el-button type="danger"   icon="Delete"   :disabled="multiple" @click="delBatch"     v-hasPermi="['agv:task:remove']">删除</el-button>
    <el-button type="warning"  icon="Download" @click="exportExcel"    v-hasPermi="['agv:task:export']">导出</el-button>
  </div>

  <!-- ================= 数据表格 ================= -->
  <el-table
      border stripe highlight-current-row
      v-loading="loading"
      :data="rows"
      @selection-change="onSelect"
      style="width:100%"
  >
    <el-table-column type="selection" width="55" align="center" />
    <el-table-column prop="taskId" label="编号" min-width="160">  <template #default="{row}">
      <el-link type="primary" @click="emitDetail(row)">{{ row.taskId }}</el-link>
    </template>
    </el-table-column>
    <el-table-column prop="taskName" label="名称" /> <el-table-column prop="line" label="线路" min-width="90" />       <el-table-column prop="scope" label="范围" min-width="90" />       <el-table-column prop="startLocation" label="起始" min-width="90" /> <el-table-column prop="endLocation" label="终点" min-width="90" /> <el-table-column label="类型" min-width="90" align="center">      <template #default="{row}"><dict-tag :options="task_type" :value="row.taskType" /></template>
  </el-table-column>
    <el-table-column label="优先级" min-width="90" align="center">   <template #default="{row}"><dict-tag :options="task_priority" :value="row.priority" /></template>
    </el-table-column>
    <el-table-column label="状态" min-width="90" align="center">      <template #default="{row}"><dict-tag :options="task_status" :value="row.status" /></template>
    </el-table-column>

    <el-table-column label="操作" fixed="right" width="260" align="center">
      <template #default="{row}">
        <el-button
            v-if="row.status === '0'"
            link type="primary"
            @click="changeStatus(row,'1')"
            v-hasPermi="['agv:task:start']"
        >执行</el-button>

        <template v-if="row.status === '1'">
          <el-button
              link type="success"
              @click="changeStatus(row,'2')"
              v-hasPermi="['agv:task:complete']"
          >完成</el-button>
          <el-button
              link type="danger"
              @click="changeStatus(row,'3')"
              v-hasPermi="['agv:task:cancel']"
          >取消</el-button>
        </template>

        <el-divider direction="vertical" />

        <el-button link type="success" @click="openEdit(row)" v-hasPermi="['agv:task:edit']"  >编辑</el-button>
        <el-button link type="danger"  @click="delSingle(row)" v-hasPermi="['agv:task:remove']">删除</el-button>
      </template>
    </el-table-column>
  </el-table>

  <pagination
      v-show="pager.total>0"
      v-model:page="pager.pageNum"
      v-model:limit="pager.pageSize"
      :total="pager.total"
      @pagination="load"
  />

  <!-- ================= 新增 / 编辑弹窗 ================= -->
  <el-dialog v-model="dlg.show" :title="dlg.title" width="600px" append-to-body>
    <el-form ref="formRef" :model="form" :rules="rules" label-width="110px">
      <!-- 基础字段 -->
      <el-form-item label="任务编号" prop="taskId">
        <el-input v-model="form.taskId" />
      </el-form-item>
      <el-form-item label="任务名称" prop="taskName">
        <el-input v-model="form.taskName" />
      </el-form-item>
      <el-form-item label="任务类型" prop="taskType">
        <el-select v-model="form.taskType">
          <el-option v-for="d in task_type" :key="d.value" :label="d.label" :value="d.value" />
        </el-select>
      </el-form-item>
      <el-form-item label="优先级" prop="priority">
        <el-select v-model="form.priority">
          <el-option v-for="d in task_priority" :key="d.value" :label="d.label" :value="d.value" />
        </el-select>
      </el-form-item>

      <!-- 计划时间 -->
      <el-row :gutter="10">
        <el-col :span="12">
          <el-form-item label="计划开始" prop="plannedStartTime">
            <el-date-picker v-model="form.plannedStartTime" type="datetime" value-format="YYYY-MM-DD HH:mm:ss" />
          </el-form-item>
        </el-col>
        <el-col :span="12">
          <el-form-item label="计划结束" prop="plannedEndTime">
            <el-date-picker v-model="form.plannedEndTime" type="datetime" value-format="YYYY-MM-DD HH:mm:ss" />
          </el-form-item>
        </el-col>
      </el-row>

      <!-- 线路范围 -->
      <el-form-item label="线路" prop="line"><el-input v-model="form.line" /></el-form-item>
      <el-form-item label="范围" prop="scope"><el-input v-model="form.scope" /></el-form-item>
      <el-row :gutter="10">
        <el-col :span="12">
          <el-form-item label="起始位置" prop="startLocation"><el-input v-model="form.startLocation" /></el-form-item>
        </el-col>
        <el-col :span="12">
          <el-form-item label="结束位置" prop="endLocation"><el-input v-model="form.endLocation" /></el-form-item>
        </el-col>
      </el-row>

      <el-form-item label="描述" prop="description">
        <el-input type="textarea" v-model="form.description" :rows="4" />
      </el-form-item>
    </el-form>
    <template #footer>
      <el-button type="primary" @click="submit">确 定</el-button>
      <el-button @click="dlg.show=false">取 消</el-button>
    </template>
  </el-dialog>

  <!-- ================= 状态流转补录弹窗 ================= -->
  <el-dialog v-model="flowDlg.show" :title="flowDlg.title" width="420px" append-to-body>
    <el-form ref="flowRef" :model="flowForm" :rules="flowRules" label-width="100px">
      <!-- 执行补录 -->
      <template v-if="needStartInfo">
        <el-form-item label="执行人" prop="executor">
          <el-input v-model="flowForm.executor" />
        </el-form-item>
        <el-form-item label="实际开始" prop="actualStartTime">
          <el-date-picker v-model="flowForm.actualStartTime" type="datetime" value-format="YYYY-MM-DD HH:mm:ss" />
        </el-form-item>
      </template>

      <!-- 完成补录 -->
      <template v-if="needEndInfo">
        <el-form-item label="实际结束" prop="actualEndTime">
          <el-date-picker v-model="flowForm.actualEndTime" type="datetime" value-format="YYYY-MM-DD HH:mm:ss" />
        </el-form-item>
        <el-form-item label="完成度" prop="progress">
          <el-input-number v-model="flowForm.progress" :min="0" :max="100" />
        </el-form-item>
        <el-form-item label="问题数" prop="problemsFound">
          <el-input-number v-model="flowForm.problemsFound" :min="0" />
        </el-form-item>
        <el-form-item label="结果" prop="result">
          <el-input type="textarea" v-model="flowForm.result" :rows="3" />
        </el-form-item>
      </template>
    </el-form>
    <template #footer>
      <el-button type="primary" @click="submitFlow">确 定</el-button>
      <el-button @click="flowDlg.show=false">取 消</el-button>
    </template>
  </el-dialog>
</template>

<script setup>
import { ref, reactive, onMounted, getCurrentInstance, computed } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import dayjs from 'dayjs'
import {
  listTask, getTask, addTask, updateTask, delTask
} from '@/api/system/task.js'
// import { download } from '@/utils/ruoyi'

/* ---------- 字典 ---------- */
const { proxy } = getCurrentInstance()
const { task_status, task_priority, task_type } = proxy.useDict('task_status','task_priority','task_type')

/* ---------- 列表 & 查询 ---------- */
const query = reactive({ taskId:'', taskName:'', status:'', line:'' })
const pager = reactive({ pageNum:1, pageSize:10, total:0 })
const rows  = ref([])
const loading = ref(false)

function load() {
  loading.value = true
  listTask({ ...query, pageNum:pager.pageNum, pageSize:pager.pageSize }).then(res=>{
    rows.value = res.rows
    pager.total = res.total
  }).finally(()=>loading.value=false)
}
onMounted(load)
function search(){ pager.pageNum = 1; load() }
function reset(){ proxy.resetForm('searchRef'); search() }

/* ---------- 选择框 ---------- */
const ids = ref([])
const single   = ref(true)
const multiple = ref(true)
function onSelect(sel){ ids.value = sel.map(i=>i.id); single.value = sel.length!==1; multiple.value = !sel.length }

/* ---------- 新增 / 编辑 ---------- */
const dlg  = reactive({ show:false, title:'' })
const form = reactive({})
const rules = {
  taskId:[{required:true,message:'必填',trigger:'blur'}],
  taskName:[{required:true,message:'必填',trigger:'blur'}],
  taskType:[{required:true,message:'必选',trigger:'change'}],
  priority:[{required:true,message:'必选',trigger:'change'}],
  plannedStartTime:[{required:true,message:'必选',trigger:'blur'}],
  plannedEndTime:[{required:true,message:'必选',trigger:'blur'}],
  line:[{required:true,message:'必填',trigger:'blur'}],
  scope:[{required:true,message:'必填',trigger:'blur'}],
  startLocation:[{required:true,message:'必填',trigger:'blur'}],
  endLocation:[{required:true,message:'必填',trigger:'blur'}]
}
function resetForm(){ Object.keys(form).forEach(k=>delete form[k]) }

function openAdd(){ resetForm(); dlg.title='新增任务'; dlg.show=true }
async function openEdit(row){
  resetForm()
  const {data}=await getTask(row?.id || ids.value[0])
  Object.assign(form,data)
  dlg.title='编辑任务'
  dlg.show=true
}
function submit(){
  proxy.$refs.formRef.validate(async v=>{
    if(!v)return
    if(!form.status) form.status='1'      // 默认未开始
    if(form.id){ await updateTask(form); ElMessage.success('修改成功') }
    else      { await addTask(form);    ElMessage.success('新增成功') }
    dlg.show=false; load()
  })
}

/* ---------- 删除 ---------- */
async function delSingle(row){
  await ElMessageBox.confirm('确认删除？','提示',{type:'warning'})
  await delTask(row.id)
  ElMessage.success('删除成功')
  load()
}
async function delBatch(){
  await ElMessageBox.confirm('确认删除选中？','提示',{type:'warning'})
  await delTask(ids.value.join(','))
  ElMessage.success('删除成功')
  load()
}

/* ---------- 导出 ---------- */
function exportExcel(){
  proxy.download('/system/task/export',{...query,pageNum:1,pageSize:9999},`task_${Date.now()}.xlsx`)
}

/* ---------- 状态流转 + 补录 ---------- */
const flowDlg  = reactive({ show:false, title:'', target:'', row:null })
const flowForm = reactive({})
const flowRules = {
  executor:[{required:true,message:'必填',trigger:'blur'}],
  actualStartTime:[{required:true,message:'必填',trigger:'blur'}],
  actualEndTime:[{required:true,message:'必填',trigger:'blur'}],
  progress:[{required:true,message:'必填',trigger:'blur'}],
  result:[{required:true,message:'必填',trigger:'blur'}]
}
const needStartInfo = computed(()=>flowDlg.target==='1')
const needEndInfo   = computed(()=>flowDlg.target==='2')

function initStartInfo(){
  Object.assign(flowForm,{
    executor: proxy.$store?.state?.user?.name || '',
    actualStartTime: dayjs().format('YYYY-MM-DD HH:mm:ss')
  })
}
function initEndInfo(){
  Object.assign(flowForm,{
    actualEndTime: dayjs().format('YYYY-MM-DD HH:mm:ss'),
    progress:100,
    problemsFound:0,
    result:''
  })
}

async function changeStatus(row,to){
  flowDlg.row = row
  flowDlg.target = to
  if(to==='1'){                                   // 执行
    flowDlg.title='开始执行 - 补录信息'
    initStartInfo()
    flowDlg.show=true
  }else if(to==='2'){                             // 完成
    flowDlg.title='完成任务 - 补录信息'
    initEndInfo()
    flowDlg.show=true
  }else{                                          // 取消
    await ElMessageBox.confirm(`确定取消任务「${row.taskName}」？`,'提示',{type:'warning'})
    await updateTask({id:row.id,status:to})
    ElMessage.success('已取消')
    load()
  }
}
function submitFlow(){
  proxy.$refs.flowRef.validate(async v=>{
    if(!v)return
    await updateTask({ id:flowDlg.row.id, status:flowDlg.target, ...flowForm })
    ElMessage.success('状态已更新')
    flowDlg.show=false
    load()
  })
}

/* ---------- 详情 ---------- */
const emit = defineEmits(['open-detail'])
function emitDetail(r){ emit('open-detail',r) }
</script>

<style scoped>
.query-form{
  background:#f5f7fa;
  padding:20px 20px 0;
  border-radius:4px;
  margin-bottom:20px;
}
.toolbar{
  margin-bottom:10px;
  display:flex;
  gap:8px;
  flex-wrap:wrap;
}

/* 统一增大单元格内边距 */
:deep(.el-table .cell){
  padding:12px 8px;
}
</style>
