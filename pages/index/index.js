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
    // 计算当前孕周
    const weekInfo = app.calculatePregnancyWeek()
    
    // 获取最新体重记录
    const records = wx.getStorageSync('weightRecords') || []
    const today = new Date().toISOString().split('T')[0]
    const todayRecord = records.find(record => record.date === today)
    const latestWeight = todayRecord ? todayRecord.weight : (records.length > 0 ? records[0].weight : null)
    
    // 计算BMI和体重增加值
    const bmi = app.calculateBMI(latestWeight)
    const bmiStatus = app.getBMIStatus(bmi)
    const pregnancyStage = app.getPregnancyStage(weekInfo.weeks)
    const weightGain = app.calculateWeightGain()
    const recommendedGain = app.getRecommendedWeightGain(bmiStatus, pregnancyStage)
    const isOverweight = weightGain && parseFloat(weightGain) > 20
    
    this.setData({
      pregnancyWeek: weekInfo.weeks,
      pregnancyDay: weekInfo.days,
      latestWeight: latestWeight,
      hasRecordToday: !!todayRecord,
      todayDate: today,
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
    wx.navigateTo({
      url: '/pages/record/record'
    })
  },
  
  // 跳转到列表页面
  goToList() {
    wx.navigateTo({
      url: '/pages/list/list'
    })
  },
  
  // 跳转到图表页面
  goToChart() {
    wx.navigateTo({
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
