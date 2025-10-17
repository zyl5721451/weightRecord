// index.js
Page({
  data: {
    pregnancyWeek: 0,
    pregnancyDay: 0,
    latestWeight: null,
    hasRecordToday: false,
    todayDate: '',
    bmi: null,
    bmiStatus: null,
    pregnancyStage: null,
    weightGain: null,
    recommendedGain: null,
    isOverweight: false
  },
  
  onLoad() {
    this.loadData()
  },
  
  onShow() {
    this.loadData()
  },
  
  loadData() {
    const app = getApp()
    
    // 获取最新体重记录
    const records = wx.getStorageSync('weightRecords') || []
    
    // 按日期排序，获取最新的一条记录
    const sortedRecords = [...records].sort((a, b) => new Date(b.date) - new Date(a.date))
    const latestRecord = sortedRecords.length > 0 ? sortedRecords[0] : null
    
    // 计算当前日期的孕周（首页应该显示基于当前日期的孕周）
    const weekInfo = app.calculatePregnancyWeek()
    
    // 计算BMI和体重增加值
    const bmi = app.calculateBMI(latestRecord ? latestRecord.weight : null, latestRecord ? latestRecord.date : null)
    const bmiStatus = app.getBMIStatus(bmi)
    const pregnancyStage = app.getPregnancyStage(weekInfo.weeks)
    const weightGain = app.calculateWeightGain(latestRecord ? latestRecord.date : null)
    const recommendedGain = app.getRecommendedWeightGain(bmiStatus, pregnancyStage)
    const isOverweight = weightGain && parseFloat(weightGain) > 20
    
    this.setData({
      pregnancyWeek: weekInfo.weeks,
      pregnancyDay: weekInfo.days,
      latestWeight: latestRecord ? latestRecord.weight : null,
      hasRecordToday: latestRecord ? latestRecord.date === new Date().toISOString().split('T')[0] : false,
      todayDate: latestRecord ? latestRecord.date : new Date().toISOString().split('T')[0],
      bmi: bmi,
      bmiStatus: bmiStatus,
      pregnancyStage: pregnancyStage,
      weightGain: weightGain,
      recommendedGain: recommendedGain,
      isOverweight: isOverweight
    })
  },
  
  // 跳转到记录页面
  goToRecord() {
    wx.switchTab({
      url: '/pages/record/record'
    })
  },
  
  // 跳转到列表页面
  goToList() {
    wx.switchTab({
      url: '/pages/list/list'
    })
  },
  
  // 跳转到图表页面
  goToChart() {
    wx.switchTab({
      url: '/pages/chart/chart'
    })
  },
  
  // 导入历史数据
  importHistoricalData() {
    const app = getApp()
    
    wx.showModal({
      title: '导入历史数据',
      content: '这将导入从2025-08-17到2025-10-16的体重记录数据，是否继续？',
      success: (res) => {
        if (res.confirm) {
          const startDate = app.importHistoricalData()
          wx.showToast({
            title: '数据导入成功',
            icon: 'success',
            duration: 2000
          })
          
          // 重新加载数据
          this.loadData()
        }
      }
    })
  }
})
