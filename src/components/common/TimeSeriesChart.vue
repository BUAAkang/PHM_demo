<template>
  <div class="chart-wrap" :style="{ height: height }">
    <v-chart :option="chartOption" autoresize />
  </div>
</template>

<script setup>
import { computed } from 'vue'
import VChart from 'vue-echarts'
import { use } from 'echarts/core'
import { LineChart } from 'echarts/charts'
import {
  GridComponent, TooltipComponent, LegendComponent,
  MarkLineComponent, DataZoomComponent
} from 'echarts/components'
import { CanvasRenderer } from 'echarts/renderers'

use([LineChart, GridComponent, TooltipComponent, LegendComponent, MarkLineComponent, DataZoomComponent, CanvasRenderer])

const props = defineProps({
  seriesData: { type: Object, default: () => ({}) }, // { paramName: [{t, v}] }
  limits: { type: Object, default: () => ({}) },     // { paramName: limitVal }
  xLabel: { type: String, default: '时间(s)' },
  height: { type: String, default: '300px' },
  multiMode: { type: Boolean, default: false },
})

const COLORS = ['#40a9ff', '#52c41a', '#faad14', '#ff7875', '#b37feb', '#36cfc9']

const chartOption = computed(() => {
  const names = Object.keys(props.seriesData)
  const series = names.map((name, idx) => {
    const data = props.seriesData[name] || []
    const limit = props.limits[name]
    return {
      name,
      type: 'line',
      smooth: true,
      symbol: 'none',
      lineStyle: { width: 2, color: COLORS[idx % COLORS.length] },
      data: data.map(d => d.v ?? d.value),
      markLine: limit != null ? {
        silent: true,
        data: [{ yAxis: limit, name: '限制值', lineStyle: { color: '#ff4d4f', type: 'dashed', width: 1 } }],
        label: { formatter: `限制 ${limit}`, color: '#ff4d4f', fontSize: 11 },
      } : undefined,
    }
  })

  const xData = names.length > 0
    ? (props.seriesData[names[0]] || []).map((d, i) => d.t ?? d.sortie ?? i)
    : []

  return {
    backgroundColor: 'transparent',
    tooltip: { trigger: 'axis', backgroundColor: '#1a3a5c', borderColor: '#2a5a8a', textStyle: { color: '#e0f0ff' } },
    legend: {
      data: names,
      textStyle: { color: '#a0b4c8' },
      top: 4,
    },
    grid: { left: 50, right: 20, top: 36, bottom: 40 },
    xAxis: {
      type: 'category',
      data: xData,
      name: props.xLabel,
      nameTextStyle: { color: '#7aadcc' },
      axisLine: { lineStyle: { color: '#2a4a6a' } },
      axisLabel: { color: '#7aadcc', fontSize: 11 },
    },
    yAxis: {
      type: 'value',
      axisLine: { lineStyle: { color: '#2a4a6a' } },
      splitLine: { lineStyle: { color: '#1a3a5c' } },
      axisLabel: { color: '#7aadcc', fontSize: 11 },
    },
    dataZoom: [
      { type: 'inside', start: 0, end: 100 },
      { type: 'slider', height: 20, bottom: 0, handleStyle: { color: '#40a9ff' }, textStyle: { color: '#7aadcc' } },
    ],
    series,
  }
})
</script>

<style scoped>
.chart-wrap {
  width: 100%;
}
</style>
