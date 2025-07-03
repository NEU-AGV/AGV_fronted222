<template>
  <div class="analysis-container">
    <el-row :gutter="20" style="height:100%">
      <!-- ========= 左：视频 + AI 抓图 ========= -->
      <el-col :span="12" class="left-panel">
        <el-card class="box-card video-card">
          <template #header>视频流展示</template>
          <img :src="videoUrl" class="video-player" alt="MJPEG Stream"/>
        </el-card>

        <el-card class="box-card gallery-card">
          <template #header>CV 模型截取缺陷图片 (点击选择)</template>
          <div class="image-gallery">
            <div v-for="d in detectedDefects" :key="d.imageId"
                 class="gallery-item" :class="{active:selectedImage?.imageId===d.imageId}"
                 @click="selectImage(d)">
              <el-image :src="d.imageUrl" fit="cover"/>
              <div class="item-overlay">
                {{ d.preliminary.type }} {{ (d.preliminary.confidence*100).toFixed(0) }}%
              </div>
            </div>
          </div>
        </el-card>
      </el-col>

      <!-- ========= 右：录入表单 ========= -->
      <el-col :span="12" class="right-panel">
        <el-card class="box-card form-card">
          <template #header>缺陷信息录入与提交</template>

          <!-- 缩略预览 -->
          <div class="selected-image-preview">
            <el-image v-if="selectedImage" :src="selectedImage.imageUrl" fit="contain"/>
            <div v-else class="image-placeholder">
              <el-icon><Picture/></el-icon><span>请从左侧选一张图片</span>
            </div>
          </div>

          <!-- 表单 -->
          <el-form ref="formRef" :model="form" :rules="rules" label-width="90px" label-position="top">
            <el-row :gutter="12">
              <el-col :span="12">
                <el-form-item label="关联任务" prop="taskId">
                  <el-select v-model="form.taskId" filterable placeholder="搜索任务">
                    <el-option v-for="t in taskOptions" :key="t.taskId" :label="t.taskName" :value="t.taskId"/>
                  </el-select>
                </el-form-item>
              </el-col>
              <el-col :span="12">
                <el-form-item label="发现人员" prop="discoverer">
                  <el-input v-model="form.discoverer"/>
                </el-form-item>
              </el-col>
            </el-row>

            <el-row :gutter="12">
              <el-col :span="12">
                <el-form-item label="缺陷类型" prop="defectType">
                  <el-select v-model="form.defectType" placeholder="选择类型">
                    <el-option v-for="d in defect_type" :key="d.value" :label="d.label" :value="d.value"/>
                  </el-select>
                </el-form-item>
              </el-col>
              <el-col :span="12">
                <el-form-item label="严重程度" prop="severity">
                  <el-select v-model="form.severity" placeholder="选择严重度">
                    <el-option v-for="d in defect_severity" :key="d.value" :label="d.label" :value="d.value"/>
                  </el-select>
                </el-form-item>
              </el-col>
            </el-row>

            <el-form-item label="缺陷位置" prop="location">
              <el-input v-model="form.location" placeholder="如 K12+300"/>
            </el-form-item>

            <el-form-item label="缺陷描述" prop="description">
              <el-input type="textarea" v-model="form.description" :rows="3"/>
            </el-form-item>

            <el-form-item>
              <el-button type="primary" :disabled="!selectedImage" @click="submit"
                         v-hasPermi="['agv:defect:add']">提 交</el-button>
            </el-form-item>
          </el-form>
        </el-card>
      </el-col>
    </el-row>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted, onUnmounted, getCurrentInstance } from 'vue'
import { Picture } from '@element-plus/icons-vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import dayjs from 'dayjs'

/* ========== 开关：真 / 假数据 ========== */
const USE_REAL_API = true

/* ========== API ========== */
import { listTask }   from '@/api/system/task'
import { addDefect }  from '@/api/system/defect'
// import { getVideoSource } from '@/api/analysis'  // 若无可删

/* ========== 字典 & 当前用户 ========== */
const { proxy } = getCurrentInstance()
const { agv_defect_type:defect_type, agv_defect_severity:defect_severity } =
    proxy.useDict('agv_defect_type','agv_defect_severity')
const currentUser = proxy.$store?.state?.user?.nickName || proxy.$store?.state?.user?.userName || 'admin'

/* ========== 状态 ========== */
const videoUrl        = ref('')
const taskOptions     = ref([])
const detectedDefects = ref([])
const selectedImage   = ref(null)

const form = reactive({
  taskId:'', defectType:'', severity:'', location:'', description:'', discoverer:currentUser
})
const rules = {
  taskId:      [{required:true,message:'请选择任务',trigger:'change'}],
  defectType:  [{required:true,message:'请选择类型',trigger:'change'}],
  severity:    [{required:true,message:'请选择严重度',trigger:'change'}],
  location:    [{required:true,message:'请输入位置',trigger:'blur'}],
  discoverer:  [{required:true,message:'请输入发现人员',trigger:'blur'}],
}
const formRef = ref(null)

/* ========== 模拟数据 (仅假模式) ========== */
const samplePics = ['https://picsum.photos/300/200?1','https://picsum.photos/300/200?2','https://picsum.photos/300/200?3']
const sampleTypes=['crack','leak','spalling']
let   mockTimer = null, mockIdx=0

/* ========== 初始化 ========== */
let ws = null
onMounted(async ()=>{
  if(USE_REAL_API){
    /* -- 视频流 -- */
    videoUrl.value = "http://localhost:7999/stream/mjpeg"

    /* -- 任务下拉 -- */
    const { rows } = await listTask({ pageNum:1,pageSize:100 })
    taskOptions.value = rows

    /* -- WebSocket -- */
    ws = new WebSocket('ws://localhost:8765/ws/cv-analysis')
    ws.onmessage = e=>{
      const msg = JSON.parse(e.data)
      if(msg.type==='NEW_DEFECT_DETECTED') detectedDefects.value.unshift(msg.payload)
    }
  }else{
    videoUrl.value = 'https://www.w3schools.com/html/mov_bbb.mp4'
    taskOptions.value = [
      {taskId:'TASK-20250703-001',taskName:'1号线巡检'},
      {taskId:'TASK-20250703-002',taskName:'2号线设备检查'}
    ]
    mockTimer = setInterval(()=>{
      if(detectedDefects.value.length>15) return
      detectedDefects.value.unshift({
        imageId:`img-${Date.now()}`,
        imageUrl:samplePics[mockIdx%samplePics.length],
        preliminary:{
          type:sampleTypes[mockIdx%sampleTypes.length],
          confidence: +(0.85+Math.random()*0.1).toFixed(2),
          location:`K${12+mockIdx}+${100+mockIdx}`
        }
      })
      mockIdx++
    },4000)
  }
})
onUnmounted(()=>{ ws?.close(); mockTimer&&clearInterval(mockTimer) })

/* ========== 选择图片时预填表单 ========== */
function selectImage(d){
  selectedImage.value=d
  form.defectType = d.preliminary.type
  form.location   = d.preliminary.location
}

/* ========== 提交 ========== */
async function submit(){
  await formRef.value.validate()

  const payload = {
    defectId:        `DF-${dayjs().format('YYYYMMDD')}-${Date.now().toString().slice(-4)}`,
    taskId:          form.taskId,
    defectType:      form.defectType,
    severity:        form.severity,
    location:        form.location,
    description:     form.description,
    imageUrl:        selectedImage.value.imageUrl,
    discoverer:      form.discoverer,
    discoveryTime:   dayjs().format('YYYY-MM-DD HH:mm:ss'),
    discoveryMethod: 'AI识别',
    isVerified:      0,
    currentStatus:   'pending_confirm'
  }

  if(USE_REAL_API){
    await addDefect(payload)
    ElMessage.success('缺陷已提交')
  }else{
    console.log('假模式 payload',payload)
    ElMessage.success('模拟提交成功，可在控制台查看对象')
  }

  /* 清理表单 */
  Object.assign(form,{ taskId:'', defectType:'', severity:'', location:'', description:'' })
  selectedImage.value=null
  formRef.value.resetFields()
}
</script>

<style scoped>
.analysis-container{padding:20px;height:calc(100vh - 100px)}
.left-panel,.right-panel{display:flex;flex-direction:column;height:100%;gap:20px}
.video-card{flex-shrink:0}
.gallery-card{flex-grow:1;display:flex;flex-direction:column}
.form-card{height:100%;overflow-y:auto}

.video-player{width:100%;display:block;background:#000}
:deep(.gallery-card .el-card__body){flex-grow:1;overflow-y:auto}
.image-gallery{display:grid;grid-template-columns:repeat(auto-fill,minmax(150px,1fr));gap:15px}
.gallery-item{position:relative;cursor:pointer;border:2px solid transparent;transition:border-color .3s}
.gallery-item.active{border-color:var(--el-color-primary)}
.gallery-item .el-image{width:100%;height:120px}
.item-overlay{position:absolute;bottom:0;left:0;right:0;background:rgba(0,0,0,.6);color:#fff;font-size:12px;padding:4px;text-align:center}

.selected-image-preview{width:100%;height:250px;background:#f5f7fa;border:1px dashed var(--el-border-color);
  display:flex;justify-content:center;align-items:center;border-radius:4px;margin-bottom:20px}
.image-placeholder{color:#909399;display:flex;flex-direction:column;align-items:center;gap:10px}
.image-placeholder .el-icon{font-size:40px}
</style>
