// app.js
const util = require('./utils/util.js')
App({
  onLaunch() {
    // 初始化体重记录数据
    this.initWeightData()
    
    // 初始化身高数据
    this.initHeightData()
    
    // 初始化孕前体重数据
    this.initPrePregnancyWeightData()
    
    // 优先尝试导入 JSON 数据（不再自动导入内置历史数据）
    
    // 导入 JSON 数据文件
    this.checkAndImportDataTxt()
  },
  
  // 初始化体重记录数据
  initWeightData() {
    let weightRecords = wx.getStorageSync('weightRecords')
    if (!weightRecords) {
      weightRecords = []
      wx.setStorageSync('weightRecords', weightRecords)
    }
    
    // 初始化或校正孕周起始日期（优先基于现有记录推导）
    let pregnancyStartDate = wx.getStorageSync('pregnancyStartDate')
    const derivedStartDate = this.derivePregnancyStartDateFromRecords()
    if (!pregnancyStartDate) {
      if (derivedStartDate) {
        wx.setStorageSync('pregnancyStartDate', derivedStartDate)
        this.recalculateAllPregnancyWeeks()
      } else {
        const defaultStartDate = new Date('2025-06-04')
        wx.setStorageSync('pregnancyStartDate', util.formatDateYMDLocal(defaultStartDate))
      }
    } else {
      if (derivedStartDate && pregnancyStartDate !== derivedStartDate) {
        wx.setStorageSync('pregnancyStartDate', derivedStartDate)
        this.recalculateAllPregnancyWeeks()
      } else if (pregnancyStartDate === '2025-06-03') {
        const correctStartDate = new Date('2025-06-04')
        wx.setStorageSync('pregnancyStartDate', util.formatDateYMDLocal(correctStartDate))
        this.recalculateAllPregnancyWeeks()
      }
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
    const startDate = util.parseDateYMDLocal(startDateStr)
    const currentDate = dateStr ? util.parseDateYMDLocal(dateStr) : new Date()
    
    // 计算天数差（不包含起始日）
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
    const currentDate = dateStr ? util.parseDateYMDLocal(dateStr) : new Date()
    const formattedDate = util.formatDateYMDLocal(currentDate)
    
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
    
    // 重新计算所有记录的孕周
    this.recalculateAllPregnancyWeeks()
    
    return dateStr
  },
  
  // 重新计算所有记录的孕周
  recalculateAllPregnancyWeeks() {
    const records = wx.getStorageSync('weightRecords') || []
    
    if (records.length === 0) return
    
    // 为每条记录重新计算孕周
    const updatedRecords = records.map(record => {
      const weekInfo = this.calculatePregnancyWeek(record.date)
      
      return {
        ...record,
        pregnancyWeek: weekInfo.weeks,
        pregnancyDay: weekInfo.days
      }
    })
    
    // 保存更新后的记录
    wx.setStorageSync('weightRecords', updatedRecords)
    
    console.log('已重新计算', updatedRecords.length, '条记录的孕周信息')
  },

  // 基于最早记录推导孕周起始日期（末次月经）
  derivePregnancyStartDateFromRecords() {
    const records = wx.getStorageSync('weightRecords') || []
    if (!records || records.length === 0) return null
    const earliest = [...records].sort((a, b) => util.parseDateYMDLocal(a.date) - util.parseDateYMDLocal(b.date))[0]
    if (!earliest || typeof earliest.pregnancyWeek !== 'number' || typeof earliest.pregnancyDay !== 'number') {
      return null
    }
    const daysFromStart = earliest.pregnancyWeek * 7 + earliest.pregnancyDay
    const earliestDate = util.parseDateYMDLocal(earliest.date)
    const startDate = new Date(earliestDate.getTime() - daysFromStart * 24 * 3600 * 1000)
    return util.formatDateYMDLocal(startDate)
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
  calculateBMI(weight = null, dateStr = null) {
    const height = this.getHeight() / 100 // 转换为米
    
    // 获取指定日期或最新记录的体重
    let currentWeight = weight
    if (!currentWeight) {
      if (dateStr) {
        // 查找指定日期的记录
        const records = wx.getStorageSync('weightRecords') || []
        const recordForDate = records.find(record => record.date === dateStr)
        currentWeight = recordForDate ? parseFloat(recordForDate.weight) : null
      } else {
        // 获取最新体重
        currentWeight = this.getLatestWeight()
      }
    }
    
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
  calculateWeightGain(dateStr = null) {
    const prePregnancyWeight = this.getPrePregnancyWeight()
    
    // 获取指定日期或最新记录的体重
    let currentWeight = null
    if (dateStr) {
      // 查找指定日期的记录
      const records = wx.getStorageSync('weightRecords') || []
      const recordForDate = records.find(record => record.date === dateStr)
      currentWeight = recordForDate ? parseFloat(recordForDate.weight) : null
    } else {
      // 获取最新体重
      currentWeight = this.getLatestWeight()
    }
    
    if (!currentWeight) return null
    
    const weightGain = currentWeight - prePregnancyWeight
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
  
  // 从data.txt导入最新数据（已废弃，仅保留调用以兼容旧脚本）
  importDataFromTxt() {
    console.warn('importDataFromTxt 已废弃，已改为仅支持 JSON。改为调用 importDataFromFiles()')
    return this.importDataFromFiles()
  },
  
  // 在小程序启动时检查并导入 JSON 数据
  checkAndImportDataTxt() {
    try {
      const localRecords = wx.getStorageSync('weightRecords') || []
      let jsonData = null
      let jsonRecords = []

      // 仅通过 require 读取打包内的数据模块，避免触发文件系统权限问题
      try {
        jsonData = require('./data/weightRecords.js')
        console.log('[JSON] require js ok: ./data/weightRecords.js')
      } catch (e1) {}
      if (!jsonData) {
        try {
          jsonData = require('data/weightRecords.js')
          console.log('[JSON] require js ok: data/weightRecords.js')
        } catch (e2) {}
      }
      if (!jsonData) {
        try {
          jsonData = require('./data/weightRecords.json')
          console.log('[JSON] require json ok: ./data/weightRecords.json')
        } catch (e3) {}
      }
      if (!jsonData) {
        try {
          jsonData = require('data/weightRecords.json')
          console.log('[JSON] require json ok: data/weightRecords.json')
        } catch (e4) {}
      }

      if (!jsonData) {
        if (localRecords.length === 0) {
          console.warn('[JSON] 未能通过 require 读取数据模块，且本地为空，跳过导入')
        } else {
          console.warn('[JSON] 未能通过 require 读取数据模块，保留本地数据')
        }
        return false
      }

      jsonRecords = Array.isArray(jsonData) ? jsonData : (jsonData.records || [])

      // 策略：
      // - 本地为空：导入 JSON
      // - 本地不为空：比较本地最新日期与 JSON 最新日期，JSON 更新更晚则导入，否则跳过
      const localLatest = this.getLatestRecordDate(localRecords)
      const jsonLatest = this.getLatestRecordDate(jsonRecords)

      if (localRecords.length === 0) {
        console.log('本地记录为空，导入 JSON 数据')
        this.importDataFromFiles()
        return true
      }

      if (jsonLatest && (!localLatest || new Date(jsonLatest) > new Date(localLatest))) {
        console.log('检测到 JSON 最新日期更晚，导入 JSON 覆盖本地数据')
        this.importDataFromFiles()
        return true
      } else {
        console.log('本地数据最新或与 JSON 相同，保留本地数据，跳过导入')
        return false
      }
    } catch (error) {
      console.error('导入 JSON 数据时出现异常:', error)
      return false
    }
  },

  // 获取记录中的最新日期（YYYY-MM-DD），若无返回null
  getLatestRecordDate(records) {
    if (!Array.isArray(records) || records.length === 0) return null
    let latest = null
    for (const r of records) {
      const d = r && r.date
      if (!d) continue
      const t = new Date(d).getTime()
      if (!isNaN(t)) {
        if (latest === null || t > new Date(latest).getTime()) {
          latest = d
        }
      }
    }
    return latest
  },

  // 导入数据文件（仅 JSON）
  importDataFromFiles() {
    const fs = wx.getFileSystemManager()
    let importedRecords = []
    let pregnancyStartDateFromFile = null

    // 1) 优先使用 require 加载 JS 数据模块，其次 JSON，最后兜底 FS
    let jsonData = null
    try {
      jsonData = require('./data/weightRecords.js')
      console.log('[Import] require js ok: ./data/weightRecords.js')
    } catch (e1) {}
    if (!jsonData) {
      try {
        jsonData = require('data/weightRecords.js')
        console.log('[Import] require js ok: data/weightRecords.js')
      } catch (e2) {}
    }
    if (!jsonData) {
      try {
        jsonData = require('./data/weightRecords.json')
        console.log('[Import] require json ok: ./data/weightRecords.json')
      } catch (e3) {}
    }
    if (!jsonData) {
      try {
        jsonData = require('data/weightRecords.json')
        console.log('[Import] require json ok: data/weightRecords.json')
      } catch (e4) {}
    }
    if (!jsonData) {
      const candidates = ['data/weightRecords.json', './data/weightRecords.json', '/data/weightRecords.json']
      for (const p of candidates) {
        try {
          try {
            fs.accessSync(p)
            console.log('[Import] access ok:', p)
          } catch (accessErr) {
            console.warn('[Import] access failed:', p, accessErr && accessErr.errMsg ? accessErr.errMsg : accessErr)
          }
          const s = fs.readFileSync(p, 'utf8')
          console.log('[Import] read ok:', p, 'len=', (s || '').length)
          jsonData = JSON.parse(s)
          console.log('[Import] parse ok from fs:', p)
          break
        } catch (readErr) {
          console.error('[Import] fs read/parse failed:', p, readErr && readErr.errMsg ? readErr.errMsg : readErr)
        }
      }
    }

    if (!jsonData) {
      console.warn('未找到 data/weightRecords.json，跳过导入')
      return 0
    }

    const list = Array.isArray(jsonData) ? jsonData : (jsonData.records || [])
    pregnancyStartDateFromFile = jsonData.pregnancyStartDate || jsonData.startDate || null
    importedRecords = (list || []).map((item, index) => ({
      id: Date.now() + index,
      date: item.date,
      weight: parseFloat(item.weight),
      pregnancyWeek: typeof item.pregnancyWeek === 'number' ? item.pregnancyWeek : undefined,
      pregnancyDay: typeof item.pregnancyDay === 'number' ? item.pregnancyDay : undefined,
      timestamp: new Date(item.date).getTime()
    }))

    // 2) 如果没有读取到 JSON，则跳过导入（仅支持 JSON）
    if (importedRecords.length === 0) {
      console.warn('未找到 data/weightRecords.json，跳过导入')
      return 0
    }

    // 3) 排序并保存
    importedRecords = importedRecords.filter(r => !!r.date)
    importedRecords.sort((a, b) => new Date(b.date) - new Date(a.date))
    wx.setStorageSync('weightRecords', importedRecords)

    // 4) 设置或推导孕周起始日期
    if (pregnancyStartDateFromFile) {
      wx.setStorageSync('pregnancyStartDate', pregnancyStartDateFromFile)
    } else {
      const derivedStartDate = this.derivePregnancyStartDateFromRecords()
      if (derivedStartDate) {
        wx.setStorageSync('pregnancyStartDate', derivedStartDate)
      }
    }

    // 5) 重新计算所有记录的孕周
    this.recalculateAllPregnancyWeeks()
    console.log('从文件导入数据成功，共导入', importedRecords.length, '条记录')
    return importedRecords.length
  },
  
  globalData: {
    userInfo: null
  }
})
