<template>
  <FullCalendar :options="calendarOpts" class="w-full h-full"/>
</template>

<script setup>
import { ref, reactive, getCurrentInstance } from 'vue'
import FullCalendar from '@fullcalendar/vue3'
import dayGridPlugin from '@fullcalendar/daygrid'
import interactionPlugin from '@fullcalendar/interaction'
import { listTask } from '@/api/system/task.js'

/* 取状态字典并兼容数组 / 对象两种返回值 */
const { proxy } = getCurrentInstance()
const rawDict   = proxy.useDict('task_status')
const statusArr = Array.isArray(rawDict) ? rawDict : Object.values(rawDict)
const emit = defineEmits(['open-detail'])

/* 颜色函数 */
function colorOf(v){
  const hit = statusArr.find(d => d.value === v)
  return hit?.listClass || '#409eff'
}

/* FullCalendar 配置 —— 用 ref 保证 options 在挂载前就存在 */
const calendarOpts = ref({
  plugins: [dayGridPlugin, interactionPlugin],
  initialView: 'dayGridMonth',
  headerToolbar: { left: 'prev,next today', center: 'title', right: 'dayGridMonth,dayGridWeek' },
  locale: 'zh-cn',
  buttonText:{ today:'今天', month:'月', week:'周' },

  /* 动态加载事件 */
  events: async(info, ok, fail)=>{
    try{
      const { rows } = await listTask({
        pageNum:1, pageSize:1000,
        plannedStartTime: info.startStr,
        plannedEndTime:   info.endStr
      })
      ok(rows.map(t=>({
        id:t.id,
        title:t.taskName,
        start:t.plannedStartTime.split(' ')[0],
        backgroundColor: colorOf(t.status),
        borderColor:     colorOf(t.status),
        extendedProps:   { task:t }
      })))
    }catch(e){ fail(e) }
  },

  eventClick: ({ event }) => emit('open-detail', event.extendedProps.task)
})
</script>
