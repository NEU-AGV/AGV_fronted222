<template>
  <div class="dashboard-container">
    <header class="dashboard-header">
      <h1 class="main-title">地铁隧道巡线大数据仿真和分析平台</h1>
    </header>

    <el-row :gutter="20" class="stats-row">
      <!-- 左侧 -->
      <el-col :span="8">
        <div class="stat-card">
          <div class="stat-title">巡视数据统计</div>
          <div class="stat-content">
            <div class="stat-item">
              <div class="stat-number">{{ dashboardData.inspectionStats.todayCount }}</div>
              <div class="stat-label">今日巡视数</div>
            </div>
            <div class="stat-item">
              <div class="stat-number">{{ dashboardData.inspectionStats.yesterdayCount }}</div>
              <div class="stat-label">昨日巡视数</div>
            </div>
            <div class="stat-item">
              <div class="stat-number" :class="getGrowthClass(dashboardData.inspectionStats.countGrowth)">
                {{ dashboardData.inspectionStats.countGrowth }}%
              </div>
              <div class="stat-label">环比增长</div>
            </div>
          </div>
        </div>
      </el-col>

      <!-- 中间 -->
      <el-col :span="8">
        <div class="stat-card core-kpi">
          <div class="kpi-item">
            <div class="kpi-label">巡视总距离 (km)</div>
            <div class="kpi-number">{{ dashboardData.kpi.totalDistance }}</div>
          </div>
          <div class="kpi-item">
            <div class="kpi-label">巡视总次数</div>
            <div class="kpi-number">{{ dashboardData.kpi.totalCount }}</div>
          </div>
        </div>
      </el-col>

      <!-- 右侧 -->
      <el-col :span="8">
        <div class="stat-card">
          <div class="stat-title">缺陷数据统计</div>
          <div class="stat-content">
            <div class="stat-item">
              <div class="stat-number">{{ dashboardData.defectStats.total }}</div>
              <div class="stat-label">累计缺陷数</div>
            </div>
            <div class="stat-item">
              <div class="stat-number">{{ dashboardData.defectStats.confirmed }}</div>
              <div class="stat-label">已确认</div>
            </div>
            <div class="stat-item">
              <div class="stat-number">{{ dashboardData.defectStats.resolved }}</div>
              <div class="stat-label">已处理</div>
            </div>
          </div>
        </div>
      </el-col>
    </el-row>

    <el-row :gutter="20" class="chart-row">
      <el-col :span="7" class="chart-column">
        <div class="chart-card">
          <div class="chart-title">缺陷类型统计</div>
          <div ref="defectTypePieChart" class="chart-instance"></div>
        </div>
        <div class="chart-card">
          <div class="chart-title">人员数据统计</div>
          <div ref="personnelBarChart" class="chart-instance"></div>
        </div>
      </el-col>

      <el-col :span="10" class="chart-column">
        <div class="chart-card map-card">
          <TunnelScene />
        </div>
      </el-col>

      <el-col :span="7" class="chart-column">
        <div class="chart-card">
          <div class="chart-title">每月巡检次数</div>
          <div ref="monthlyInspectionBarChart" class="chart-instance"></div>
        </div>
        <div class="chart-card">
          <div class="chart-title">缺陷数据变化</div>
          <div ref="defectTrendLineChart" class="chart-instance"></div>
        </div>
      </el-col>
    </el-row>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted, onUnmounted, nextTick } from 'vue';
import { useRouter } from 'vue-router';
import * as echarts from 'echarts';
import TunnelScene from '@/components/dashboard/TunnelScene.vue';

const USE_REAL_API = false;
const router = useRouter();

const dashboardData = reactive({
  inspectionStats: {},
  defectStats: {},
  kpi: {},
  defectTypeDistribution: [],
  personnelData: { names: [], tasks: [] },
  monthlyInspections: { months: [], counts: [] },
  defectTrend: { dates: [], newCount: [], resolvedCount: [] }
});

const defectTypePieChart = ref(null);
const personnelBarChart = ref(null);
const monthlyInspectionBarChart = ref(null);
const defectTrendLineChart = ref(null);
let allCharts = [];

const fetchDashboardData = async () => {
  if (USE_REAL_API) {
    try {
      const realData = {};
      Object.assign(dashboardData, realData);
    } catch (error) {
      console.error("获取大屏数据失败:", error);
    }
  } else {
    const mockData = {
      inspectionStats: { todayCount: 123, yesterdayCount: 98, countGrowth: 25.5 },
      defectStats: { total: 456, confirmed: 321, resolved: 280 },
      kpi: { totalDistance: '1,234.5', totalCount: '5,678' },
      defectTypeDistribution: [ { value: 102, name: '结构裂缝' }, { value: 88, name: '渗水' }, { value: 65, name: '设备故障' }, { value: 43, name: '照明问题' }, { value: 21, name: '其他' } ],
      personnelData: { names: ['张三', '李四', '王五', '赵六', '陈七'], tasks: [18, 25, 15, 30, 22] },
      monthlyInspections: { months: ['1月', '2月', '3月', '4月', '5月', '6月'], counts: [110, 132, 101, 134, 90, 150] },
      defectTrend: { dates: ['06-01', '06-02', '06-03', '06-04', '06-05', '06-06', '06-07'], newCount: [5, 8, 3, 6, 4, 9, 5], resolvedCount: [2, 4, 5, 3, 6, 7, 5] }
    };
    Object.assign(dashboardData, mockData);
  }
};

onMounted(async () => {
  await fetchDashboardData();
  await nextTick();
  initCharts();
  window.addEventListener('resize', handleResize);
});

onUnmounted(() => {
  window.removeEventListener('resize', handleResize);
});

const initCharts = () => {
  allCharts.forEach(chart => chart.dispose());
  allCharts = [];

  const domList = [defectTypePieChart, personnelBarChart, monthlyInspectionBarChart, defectTrendLineChart];
  for (const refDom of domList) {
    if (!refDom.value || refDom.value.clientWidth === 0 || refDom.value.clientHeight === 0) {
      console.warn('⚠️ 图表容器未就绪:', refDom);
      return;
    }
  }

  const pieChart = echarts.init(defectTypePieChart.value);
  pieChart.setOption({
    tooltip: { trigger: 'item' },
    legend: { show: false },
    series: [{
      name: '缺陷类型', type: 'pie', radius: ['50%', '80%'], center: ['50%', '50%'],
      itemStyle: { borderRadius: 5, borderColor: '#0f1419', borderWidth: 2 },
      label: { show: true, formatter: '{b}\n{d}%', color: '#ccc' },
      labelLine: { length: 10, length2: 15 },
      data: dashboardData.defectTypeDistribution,
    }]
  });
  allCharts.push(pieChart);

  const barChart1 = echarts.init(personnelBarChart.value);
  barChart1.setOption({
    tooltip: { trigger: 'axis' },
    grid: { left: '3%', right: '4%', bottom: '3%', containLabel: true },
    xAxis: { type: 'category', data: dashboardData.personnelData.names, axisLabel: { color: '#ccc' } },
    yAxis: { type: 'value', axisLabel: { color: '#ccc' } },
    series: [{ name: '任务数', type: 'bar', data: dashboardData.personnelData.tasks }]
  });
  allCharts.push(barChart1);

  const barChart2 = echarts.init(monthlyInspectionBarChart.value);
  barChart2.setOption({
    tooltip: { trigger: 'axis' },
    grid: { left: '3%', right: '4%', bottom: '3%', containLabel: true },
    xAxis: { type: 'category', data: dashboardData.monthlyInspections.months, axisLabel: { color: '#ccc' } },
    yAxis: { type: 'value', axisLabel: { color: '#ccc' } },
    series: [{ name: '巡检次数', type: 'bar', data: dashboardData.monthlyInspections.counts, itemStyle: { color: '#00d4ff' } }]
  });
  allCharts.push(barChart2);

  const lineChart = echarts.init(defectTrendLineChart.value);
  lineChart.setOption({
    tooltip: { trigger: 'axis' },
    legend: { data: ['新增缺陷', '处理缺陷'], textStyle: { color: '#ccc' }, top: 5 },
    grid: { left: '3%', right: '4%', bottom: '3%', containLabel: true },
    xAxis: { type: 'category', boundaryGap: false, data: dashboardData.defectTrend.dates, axisLabel: { color: '#ccc' } },
    yAxis: { type: 'value', axisLabel: { color: '#ccc' } },
    series: [
      { name: '新增缺陷', type: 'line', data: dashboardData.defectTrend.newCount, smooth: true },
      { name: '处理缺陷', type: 'line', data: dashboardData.defectTrend.resolvedCount, smooth: true, color: '#67c23a' }
    ]
  });
  allCharts.push(lineChart);
};

const handleResize = () => { allCharts.forEach(chart => chart.resize()); };
const getGrowthClass = (growth) => growth >= 0 ? 'positive' : 'negative';
const goToSystem = () => { router.push('/tasks'); };
</script>

<style scoped>
.dashboard-container {
  background-color: #0f1419;
  color: #fff;
  padding: 20px;
  height: 94vh;
  display: flex;
  flex-direction: column;
  gap: 20px;
}
.dashboard-header {
  display: flex;
  justify-content: center; /* 改为居中 */
  align-items: center;
  text-align: center; /* 可选，影响子元素的文本对齐 */
  flex-shrink: 0;
  padding-bottom: 10px;
  border-bottom: 1px solid rgba(0, 212, 255, 0.3);
}
.main-title {
  font-size: 24px;
  font-weight: bold;
  margin: 0;
  color: #00d4ff;
}
.enter-system-btn {
  height: 40px;
  font-size: 16px;
  background: #00d4ff;
  border-color: #00d4ff;
  color: #0f1419;
}
.enter-system-btn:hover {
  background: #33e0ff;
  border-color: #33e0ff;
}
.stats-row { flex-shrink: 0; }
.stat-card {
  background: rgba(0, 212, 255, 0.1);
  border: 1px solid rgba(0, 212, 255, 0.3);
  padding: 15px;
  border-radius: 4px;
}
.stat-title {
  font-size: 16px;
  margin-bottom: 15px;
  color: #00d4ff;
}
.stat-content {
  display: flex;
  justify-content: space-around;
  text-align: center;
}
.stat-number {
  font-size: 24px;
  font-weight: bold;
}
.stat-label {
  font-size: 14px;
  color: #ccc;
  margin-top: 5px;
}
.positive { color: #67c23a; }
.negative { color: #f56c6c; }
.core-kpi {
  display: flex;
  justify-content: space-around;
  align-items: center;
  text-align: center;
  padding: 24px 0;
}
.kpi-number { font-size: 32px; color: #00d4ff; font-weight: bold; }
.kpi-label { font-size: 16px; color: #ccc; margin-bottom: 10px;}
.chart-row {
  flex-grow: 1;
  min-height: 0;
}
.chart-column {
  display: flex;
  flex-direction: column;
  gap: 20px;
  height: 100%;
}
.chart-card {
  background: rgba(0, 212, 255, 0.1);
  border: 1px solid rgba(0, 212, 255, 0.3);
  padding: 15px;
  border-radius: 4px;
  display: flex;
  flex-direction: column;
  flex-grow: 1;
  min-height: 0;
}
.map-card {
  flex-grow: 1;
}
.chart-title {
  font-size: 16px;
  margin-bottom: 15px;
  color: #00d4ff;
  text-align: center;
  flex-shrink: 0;
}
.chart-instance {
  width: 100%;
  height: 300px; /* ✅ 确保初始化有尺寸 */
  flex-grow: 1;
}
</style>
