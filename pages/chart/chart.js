// chart.js
Page({
  data: {
    chartData: [],
    maxWeight: 0,
    minWeight: 0,
    avgWeight: 0,
    scale: 1,
    translateX: 0,
    chartWidth: 0,
    isDragging: false,
    lastTouchX: 0
  },
  
  onLoad() {
    this.prepareChartData()
  },
  
  onReady() {
    this.drawChart()
  },
  
  onShow() {
    this.prepareChartData()
    this.drawChart()
  },
  
  prepareChartData() {
    const records = wx.getStorageSync('weightRecords') || []
    
    if (records.length === 0) {
      this.setData({
        chartData: [],
        maxWeight: 0,
        minWeight: 0,
        avgWeight: 0
      })
      return
    }
    
    // 按日期正序排序（最早的排前面，最新的排后面）- 用于图表绘制
    const chartSortedRecords = [...records].sort((a, b) => new Date(a.date) - new Date(b.date))
    
    // 按日期倒序排序（最新的排前面）- 用于详细记录显示
    const listSortedRecords = [...records].sort((a, b) => new Date(b.date) - new Date(a.date))
    
    // 计算统计信息
    const weights = chartSortedRecords.map(record => record.weight)
    const maxWeight = Math.max(...weights)
    const minWeight = Math.min(...weights)
    const avgWeight = weights.reduce((sum, weight) => sum + weight, 0) / weights.length
    
    this.setData({
      chartData: chartSortedRecords, // 图表使用正序数据
      listData: listSortedRecords,   // 详细记录使用倒序数据
      maxWeight: maxWeight.toFixed(1),
      minWeight: minWeight.toFixed(1),
      avgWeight: avgWeight.toFixed(1)
    })
  },
  
  drawChart() {
    const { chartData } = this.data
    
    if (chartData.length === 0) {
      return
    }
    
    const query = wx.createSelectorQuery()
    query.select('#chartCanvas').fields({ node: true, size: true })
    query.exec((res) => {
      const canvas = res[0].node
      const ctx = canvas.getContext('2d')
      const dpr = wx.getSystemInfoSync().pixelRatio
      
      canvas.width = res[0].width * dpr
      canvas.height = res[0].height * dpr
      ctx.scale(dpr, dpr)
      
      // 保存图表宽度用于缩放计算
      this.setData({
        chartWidth: res[0].width
      })
      
      this.drawWeightChart(ctx, canvas.width / dpr, canvas.height / dpr)
    })
  },
  
  drawWeightChart(ctx, width, height) {
    const { chartData, scale, translateX } = this.data
    
    // 清空画布
    ctx.clearRect(0, 0, width, height)
    
    // 设置边距
    const margin = { top: 40, right: 40, bottom: 60, left: 60 }
    const chartWidth = width - margin.left - margin.right
    const chartHeight = height - margin.top - margin.bottom
    
    // 计算Y轴范围（体重范围）
    const weights = chartData.map(d => d.weight)
    const maxWeight = Math.max(...weights)
    const minWeight = Math.min(...weights)
    const weightRange = maxWeight - minWeight
    const padding = weightRange * 0.1 // 10%的边距
    
    const yMin = minWeight - padding
    const yMax = maxWeight + padding
    
    // 计算X轴范围（日期范围）
    const dates = chartData.map(d => new Date(d.date))
    const minDate = new Date(Math.min(...dates))
    const maxDate = new Date(Math.max(...dates))
    const dateRange = maxDate - minDate
    
    // 绘制坐标轴
    ctx.strokeStyle = '#e0e0e0'
    ctx.lineWidth = 1
    
    // Y轴
    ctx.beginPath()
    ctx.moveTo(margin.left, margin.top)
    ctx.lineTo(margin.left, margin.top + chartHeight)
    ctx.stroke()
    
    // X轴
    ctx.beginPath()
    ctx.moveTo(margin.left, margin.top + chartHeight)
    ctx.lineTo(margin.left + chartWidth, margin.top + chartHeight)
    ctx.stroke()
    
    // 绘制网格线
    ctx.strokeStyle = '#f0f0f0'
    ctx.lineWidth = 0.5
    
    // Y轴网格
    for (let i = 0; i <= 5; i++) {
      const y = margin.top + (i / 5) * chartHeight
      ctx.beginPath()
      ctx.moveTo(margin.left, y)
      ctx.lineTo(margin.left + chartWidth, y)
      ctx.stroke()
      
      // Y轴标签
      const weight = yMax - (i / 5) * (yMax - yMin)
      ctx.fillStyle = '#666'
      ctx.font = '12px sans-serif'
      ctx.textAlign = 'right'
      ctx.fillText(weight.toFixed(1) + 'kg', margin.left - 10, y + 4)
    }
    
    // X轴标签 - 支持缩放，竖着显示避免拥挤
    const visibleDataCount = Math.min(chartData.length, Math.ceil(chartData.length / scale))
    const step = Math.max(1, Math.floor(chartData.length / visibleDataCount))
    
    for (let i = 0; i < chartData.length; i += step) {
      const x = margin.left + (i / (chartData.length - 1)) * chartWidth * scale + translateX
      
      // 只显示在可见范围内的标签
      if (x >= margin.left && x <= margin.left + chartWidth) {
        const date = new Date(chartData[i].date)
        const label = `${date.getMonth() + 1}/${date.getDate()}`
        
        ctx.save()
        ctx.fillStyle = '#666'
        ctx.font = '10px sans-serif'
        ctx.textAlign = 'center'
        ctx.translate(x, margin.top + chartHeight + 25)
        ctx.rotate(-Math.PI / 4) // 斜着显示标签
        ctx.fillText(label, 0, 0)
        ctx.restore()
        
        // X轴网格
        ctx.strokeStyle = '#f0f0f0'
        ctx.beginPath()
        ctx.moveTo(x, margin.top)
        ctx.lineTo(x, margin.top + chartHeight)
        ctx.stroke()
      }
    }
    
    // 绘制曲线 - 支持缩放
    ctx.strokeStyle = '#3cc51f'
    ctx.lineWidth = 3
    ctx.beginPath()
    
    let firstPointVisible = false
    
    for (let i = 0; i < chartData.length; i++) {
      const x = margin.left + (i / (chartData.length - 1)) * chartWidth * scale + translateX
      const y = margin.top + ((yMax - chartData[i].weight) / (yMax - yMin)) * chartHeight
      
      // 只绘制可见范围内的点
      if (x >= margin.left && x <= margin.left + chartWidth) {
        if (!firstPointVisible) {
          ctx.moveTo(x, y)
          firstPointVisible = true
        } else {
          ctx.lineTo(x, y)
        }
      }
    }
    
    ctx.stroke()
    
    // 绘制数据点 - 支持缩放
    ctx.fillStyle = '#3cc51f'
    for (let i = 0; i < chartData.length; i++) {
      const x = margin.left + (i / (chartData.length - 1)) * chartWidth * scale + translateX
      const y = margin.top + ((yMax - chartData[i].weight) / (yMax - yMin)) * chartHeight
      
      // 只绘制可见范围内的点
      if (x >= margin.left && x <= margin.left + chartWidth) {
        ctx.beginPath()
        ctx.arc(x, y, 4, 0, 2 * Math.PI)
        ctx.fill()
        
        // 显示体重值（稀疏显示）
        if (i % Math.ceil(chartData.length / (3 * scale)) === 0) {
          ctx.fillStyle = '#333'
          ctx.font = '10px sans-serif'
          ctx.textAlign = 'center'
          ctx.fillText(chartData[i].weight.toFixed(1) + 'kg', x, y - 10)
          ctx.fillStyle = '#3cc51f'
        }
      }
    }
  },
  
  // 格式化日期显示
  formatDate(dateStr) {
    const date = new Date(dateStr)
    const month = (date.getMonth() + 1).toString().padStart(2, '0')
    const day = date.getDate().toString().padStart(2, '0')
    return `${month}月${day}日`
  },
  
  // 格式化详细日期显示
  formatDetailDate(dateStr) {
    const date = new Date(dateStr)
    const year = date.getFullYear()
    const month = (date.getMonth() + 1).toString().padStart(2, '0')
    const day = date.getDate().toString().padStart(2, '0')
    const hours = date.getHours().toString().padStart(2, '0')
    const minutes = date.getMinutes().toString().padStart(2, '0')
    return `${year}年${month}月${day}日 ${hours}:${minutes}`
  },
  
  // 触摸开始
  onTouchStart(e) {
    this.setData({
      isDragging: true,
      lastTouchX: e.touches[0].clientX
    })
  },
  
  // 触摸移动
  onTouchMove(e) {
    if (!this.data.isDragging) return
    
    const currentTouchX = e.touches[0].clientX
    const deltaX = currentTouchX - this.data.lastTouchX
    
    // 计算新的平移位置
    const newTranslateX = this.data.translateX + deltaX
    const maxTranslateX = 0
    const minTranslateX = -(this.data.chartWidth * (this.data.scale - 1))
    
    // 限制平移范围
    const clampedTranslateX = Math.max(minTranslateX, Math.min(maxTranslateX, newTranslateX))
    
    this.setData({
      translateX: clampedTranslateX,
      lastTouchX: currentTouchX
    })
    
    // 重绘图表
    this.drawChart()
  },
  
  // 触摸结束
  onTouchEnd() {
    this.setData({
      isDragging: false
    })
  },
  
  // 缩放图表
  onScale(e) {
    const newScale = Math.max(0.5, Math.min(3, this.data.scale * e.detail.scale))
    
    this.setData({
      scale: newScale,
      translateX: 0 // 缩放时重置平移
    })
    
    // 重绘图表
    this.drawChart()
  },
  
  // 重置缩放
  resetZoom() {
    this.setData({
      scale: 1,
      translateX: 0
    })
    
    // 重绘图表
    this.drawChart()
  }
})