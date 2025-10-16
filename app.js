// app.js
App({
  onLaunch() {
    // 初始化体重记录数据
    this.initWeightData()
    
    // 初始化身高数据
    this.initHeightData()
    
    // 初始化孕前体重数据
    this.initPrePregnancyWeightData()
    
    // 检查是否需要导入历史数据
    this.checkAndImportHistoricalData()
  },
  
  // 初始化体重记录数据
  initWeightData() {
    let weightRecords = wx.getStorageSync('weightRecords')
    if (!weightRecords) {
      weightRecords = []
      wx.setStorageSync('weightRecords', weightRecords)
    }
    
    // 初始化孕周起始日期
    let pregnancyStartDate = wx.getStorageSync('pregnancyStartDate')
    if (!pregnancyStartDate) {
      // 默认设置为当前日期往前推12周（约3个月）
      const defaultStartDate = new Date()
      defaultStartDate.setDate(defaultStartDate.getDate() - 84) // 12周 * 7天
      wx.setStorageSync('pregnancyStartDate', defaultStartDate.toISOString().split('T')[0])
    }
  },
  
  // 初始化身高数据
  initHeightData() {
    let height = wx.getStorageSync('userHeight')
    if (!height) {
      // 默认身高160cm
      wx.setStorageSync('userHeight', 160)
    }
  },
  
  // 初始化孕前体重数据
  initPrePregnancyWeightData() {
    let prePregnancyWeight = wx.getStorageSync('prePregnancyWeight')
    if (!prePregnancyWeight) {
      // 默认孕前体重51kg
      wx.setStorageSync('prePregnancyWeight', 51)
    }
  },
  
  // 计算孕周和天数
  calculatePregnancyWeek(dateStr = null) {
    const startDateStr = wx.getStorageSync('pregnancyStartDate')
    const startDate = new Date(startDateStr)
    const currentDate = dateStr ? new Date(dateStr) : new Date()
    
    // 计算天数差
    const timeDiff = currentDate.getTime() - startDate.getTime()
    const daysDiff = Math.floor(timeDiff / (1000 * 3600 * 24))
    
    // 计算孕周和天数
    const weeks = Math.floor(daysDiff / 7)
    const days = daysDiff % 7
    
    return { weeks, days }
  },
  
  // 添加体重记录
  addWeightRecord(weight, dateStr = null, pregnancyWeek = null) {
    const records = wx.getStorageSync('weightRecords') || []
    const currentDate = dateStr ? new Date(dateStr) : new Date()
    const formattedDate = currentDate.toISOString().split('T')[0]
    
    // 如果未提供孕周，自动计算
    let weekInfo = pregnancyWeek
    if (!weekInfo) {
      weekInfo = this.calculatePregnancyWeek(formattedDate)
    }
    
    const newRecord = {
      id: Date.now(),
      date: formattedDate,
      weight: parseFloat(weight),
      pregnancyWeek: weekInfo.weeks,
      pregnancyDay: weekInfo.days,
      timestamp: currentDate.getTime()
    }
    
    // 检查是否已存在当天的记录
    const existingIndex = records.findIndex(record => record.date === formattedDate)
    if (existingIndex !== -1) {
      records[existingIndex] = newRecord
    } else {
      records.push(newRecord)
    }
    
    // 按日期排序
    records.sort((a, b) => new Date(b.date) - new Date(a.date))
    
    wx.setStorageSync('weightRecords', records)
    return newRecord
  },
  
  // 获取体重记录
  getWeightRecords(page = 1, pageSize = 10) {
    const records = wx.getStorageSync('weightRecords') || []
    const startIndex = (page - 1) * pageSize
    const endIndex = startIndex + pageSize
    return {
      records: records.slice(startIndex, endIndex),
      total: records.length,
      page,
      pageSize
    }
  },
  
  // 删除体重记录
  deleteWeightRecord(id) {
    const records = wx.getStorageSync('weightRecords') || []
    const filteredRecords = records.filter(record => record.id !== id)
    wx.setStorageSync('weightRecords', filteredRecords)
    return filteredRecords
  },
  
  // 设置孕周起始日期
  setPregnancyStartDate(dateStr) {
    wx.setStorageSync('pregnancyStartDate', dateStr)
    return dateStr
  },
  
  // 设置身高
  setHeight(height) {
    wx.setStorageSync('userHeight', parseFloat(height))
    return parseFloat(height)
  },
  
  // 设置孕前体重
  setPrePregnancyWeight(weight) {
    wx.setStorageSync('prePregnancyWeight', parseFloat(weight))
    return parseFloat(weight)
  },
  
  // 获取身高
  getHeight() {
    return wx.getStorageSync('userHeight') || 160
  },
  
  // 获取孕前体重
  getPrePregnancyWeight() {
    return wx.getStorageSync('prePregnancyWeight') || 51
  },
  
  // 计算BMI
  calculateBMI(weight = null) {
    const height = this.getHeight() / 100 // 转换为米
    const currentWeight = weight || this.getLatestWeight()
    
    if (!currentWeight) return null
    
    const bmi = currentWeight / (height * height)
    return bmi.toFixed(1)
  },
  
  // 获取最新体重
  getLatestWeight() {
    const records = wx.getStorageSync('weightRecords') || []
    if (records.length === 0) return null
    
    // 按日期倒序排序，取最新的记录
    const sortedRecords = [...records].sort((a, b) => new Date(b.date) - new Date(a.date))
    return parseFloat(sortedRecords[0].weight)
  },
  
  // 计算孕期体重增加值
  calculateWeightGain() {
    const prePregnancyWeight = this.getPrePregnancyWeight()
    const latestWeight = this.getLatestWeight()
    
    if (!latestWeight) return null
    
    const weightGain = latestWeight - prePregnancyWeight
    return weightGain.toFixed(1)
  },
  
  // 获取BMI状态
  getBMIStatus(bmi) {
    if (!bmi) return null
    
    const bmiValue = parseFloat(bmi)
    if (bmiValue < 18.5) return 'underweight'
    if (bmiValue < 24) return 'normal'
    if (bmiValue < 28) return 'overweight'
    return 'obese'
  },
  
  // 获取孕期阶段
  getPregnancyStage(pregnancyWeek) {
    if (pregnancyWeek < 14) return '孕早期'
    if (pregnancyWeek < 28) return '孕中期'
    return '孕晚期'
  },
  
  // 获取推荐体重增加范围
  getRecommendedWeightGain(bmiStatus, pregnancyStage) {
    if (bmiStatus === '正常') {
      if (pregnancyStage === '孕早期') return '1-2kg'
      if (pregnancyStage === '孕中期') return '0.37kg/周'
      if (pregnancyStage === '孕晚期') return '0.37kg/周'
      return '8-14kg'
    }
    
    if (bmiStatus === '偏瘦') {
      return '12.5-18kg'
    }
    
    if (bmiStatus === '超重') {
      return '7-11.5kg'
    }
    
    if (bmiStatus === '肥胖') {
      return '5-9kg'
    }
    
    return '8-14kg'
  },
  
  // 检查并导入历史数据
  checkAndImportHistoricalData() {
    const existingRecords = wx.getStorageSync('weightRecords') || []
    const hasImportedData = existingRecords.some(record => 
      record.date === '2025-08-17'
    )
    
    // 如果没有导入过历史数据，且当前没有记录，则自动导入
    if (!hasImportedData && existingRecords.length === 0) {
      console.log('检测到新用户，自动导入历史数据')
      this.importHistoricalData()
    }
  },
  
  // 导入历史数据
  importHistoricalData() {
    // 根据最早记录日期计算孕周起始日期
    // 最早记录是2025-08-17，孕10周+4天
    // 计算起始日期：2025-08-17往前推10周4天 = 2025-06-03
    const startDate = '2025-06-03'
    wx.setStorageSync('pregnancyStartDate', startDate)
    
    const historicalData = [
      {date: '2025-08-17', weight: 51.20, pregnancyWeek: 10, pregnancyDay: 4},
      {date: '2025-08-19', weight: 51.30, pregnancyWeek: 10, pregnancyDay: 6},
      {date: '2025-08-20', weight: 51.70, pregnancyWeek: 11, pregnancyDay: 0},
      {date: '2025-08-21', weight: 51.40, pregnancyWeek: 11, pregnancyDay: 1},
      {date: '2025-08-22', weight: 51.20, pregnancyWeek: 11, pregnancyDay: 2},
      {date: '2025-08-25', weight: 51.20, pregnancyWeek: 11, pregnancyDay: 5},
      {date: '2025-08-26', weight: 51.20, pregnancyWeek: 11, pregnancyDay: 6},
      {date: '2025-08-27', weight: 51.20, pregnancyWeek: 12, pregnancyDay: 0},
      {date: '2025-08-28', weight: 51.90, pregnancyWeek: 12, pregnancyDay: 1},
      {date: '2025-08-29', weight: 51.50, pregnancyWeek: 12, pregnancyDay: 2},
      {date: '2025-08-30', weight: 51.10, pregnancyWeek: 12, pregnancyDay: 3},
      {date: '2025-09-01', weight: 51.10, pregnancyWeek: 12, pregnancyDay: 5},
      {date: '2025-09-02', weight: 51.50, pregnancyWeek: 12, pregnancyDay: 6},
      {date: '2025-09-03', weight: 52.00, pregnancyWeek: 13, pregnancyDay: 0},
      {date: '2025-09-04', weight: 52.00, pregnancyWeek: 13, pregnancyDay: 1},
      {date: '2025-09-05', weight: 52.00, pregnancyWeek: 13, pregnancyDay: 2},
      {date: '2025-09-06', weight: 51.60, pregnancyWeek: 13, pregnancyDay: 3},
      {date: '2025-09-07', weight: 52.10, pregnancyWeek: 13, pregnancyDay: 4},
      {date: '2025-09-08', weight: 51.60, pregnancyWeek: 13, pregnancyDay: 5},
      {date: '2025-09-10', weight: 51.60, pregnancyWeek: 14, pregnancyDay: 0},
      {date: '2025-09-11', weight: 51.40, pregnancyWeek: 14, pregnancyDay: 1},
      {date: '2025-09-12', weight: 51.30, pregnancyWeek: 14, pregnancyDay: 2},
      {date: '2025-09-14', weight: 51.30, pregnancyWeek: 14, pregnancyDay: 4},
      {date: '2025-09-15', weight: 51.60, pregnancyWeek: 14, pregnancyDay: 5},
      {date: '2025-09-16', weight: 51.80, pregnancyWeek: 14, pregnancyDay: 6},
      {date: '2025-09-17', weight: 52.30, pregnancyWeek: 15, pregnancyDay: 0},
      {date: '2025-09-18', weight: 52.30, pregnancyWeek: 15, pregnancyDay: 1},
      {date: '2025-09-19', weight: 52.60, pregnancyWeek: 15, pregnancyDay: 2},
      {date: '2025-09-20', weight: 52.30, pregnancyWeek: 15, pregnancyDay: 3},
      {date: '2025-09-21', weight: 52.70, pregnancyWeek: 15, pregnancyDay: 4},
      {date: '2025-09-23', weight: 53.10, pregnancyWeek: 15, pregnancyDay: 6},
      {date: '2025-09-24', weight: 53.50, pregnancyWeek: 16, pregnancyDay: 0},
      {date: '2025-09-25', weight: 53.40, pregnancyWeek: 16, pregnancyDay: 1},
      {date: '2025-09-27', weight: 54.40, pregnancyWeek: 16, pregnancyDay: 3},
      {date: '2025-09-28', weight: 53.40, pregnancyWeek: 16, pregnancyDay: 4},
      {date: '2025-09-29', weight: 53.00, pregnancyWeek: 16, pregnancyDay: 5},
      {date: '2025-09-30', weight: 53.50, pregnancyWeek: 16, pregnancyDay: 6},
      {date: '2025-10-01', weight: 53.50, pregnancyWeek: 17, pregnancyDay: 0},
      {date: '2025-10-02', weight: 53.40, pregnancyWeek: 17, pregnancyDay: 1},
      {date: '2025-10-03', weight: 53.40, pregnancyWeek: 17, pregnancyDay: 2},
      {date: '2025-10-04', weight: 53.00, pregnancyWeek: 17, pregnancyDay: 3},
      {date: '2025-10-05', weight: 53.10, pregnancyWeek: 17, pregnancyDay: 4},
      {date: '2025-10-06', weight: 53.00, pregnancyWeek: 17, pregnancyDay: 5},
      {date: '2025-10-07', weight: 53.00, pregnancyWeek: 17, pregnancyDay: 6},
      {date: '2025-10-08', weight: 53.00, pregnancyWeek: 18, pregnancyDay: 0},
      {date: '2025-10-10', weight: 54.20, pregnancyWeek: 18, pregnancyDay: 2},
      {date: '2025-10-11', weight: 54.40, pregnancyWeek: 18, pregnancyDay: 3},
      {date: '2025-10-13', weight: 54.80, pregnancyWeek: 18, pregnancyDay: 5},
      {date: '2025-10-15', weight: 55.20, pregnancyWeek: 19, pregnancyDay: 0},
      {date: '2025-10-16', weight: 55.60, pregnancyWeek: 19, pregnancyDay: 1}
    ]
    
    // 检查是否已经导入过数据
    const existingRecords = wx.getStorageSync('weightRecords') || []
    const hasImportedData = existingRecords.some(record => 
      record.date === '2025-08-17'
    )
    
    if (!hasImportedData) {
      // 转换数据格式
      const formattedRecords = historicalData.map((item, index) => ({
        id: Date.now() + index,
        date: item.date,
        weight: item.weight,
        pregnancyWeek: item.pregnancyWeek,
        pregnancyDay: item.pregnancyDay,
        timestamp: new Date(item.date).getTime()
      }))
      
      // 按日期排序
      formattedRecords.sort((a, b) => new Date(b.date) - new Date(a.date))
      
      wx.setStorageSync('weightRecords', formattedRecords)
      console.log('历史数据导入成功，共导入', formattedRecords.length, '条记录')
    }
    
    return startDate
  },
  
  globalData: {
    userInfo: null
  }
})
