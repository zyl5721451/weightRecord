// record.js
const util = require('../../utils/util.js')
Page({
  data: {
    weight: '',
    selectedDate: '',
    showDatePicker: false,
    isCustomDate: false,
    pregnancyWeek: 0,
    pregnancyDay: 0,
    height: '160',
    prePregnancyWeight: '51'
  },
  
  onLoad() {
    this.initData()
  },
  
  initData() {
    const app = getApp()
    const today = util.formatDateYMDLocal(new Date())
    const weekInfo = app.calculatePregnancyWeek()
    
    // 获取身高和孕前体重
    const height = app.getHeight()
    const prePregnancyWeight = app.getPrePregnancyWeight()
    
    this.setData({
      selectedDate: today,
      pregnancyWeek: weekInfo.weeks,
      pregnancyDay: weekInfo.days,
      height: height || '160',
      prePregnancyWeight: prePregnancyWeight || '51'
    })
  },
  
  // 输入体重
  onWeightInput(e) {
    this.setData({
      weight: e.detail.value
    })
  },
  
  // 输入身高
  onHeightInput(e) {
    this.setData({
      height: e.detail.value
    })
  },
  
  // 输入孕前体重
  onPrePregnancyWeightInput(e) {
    this.setData({
      prePregnancyWeight: e.detail.value
    })
  },
  
  // 切换日期选择
  toggleDatePicker() {
    this.setData({
      showDatePicker: !this.data.showDatePicker,
      isCustomDate: !this.data.showDatePicker
    })
  },
  
  // 日期改变
  onDateChange(e) {
    const app = getApp()
    const selectedDate = e.detail.value
    const weekInfo = app.calculatePregnancyWeek(selectedDate)
    
    this.setData({
      selectedDate: selectedDate,
      pregnancyWeek: weekInfo.weeks,
      pregnancyDay: weekInfo.days
    })
  },
  
  // 保存记录
  saveRecord() {
    const app = getApp()
    const { weight, selectedDate, isCustomDate, height, prePregnancyWeight } = this.data
    
    if (!weight) {
      wx.showToast({
        title: '请输入体重',
        icon: 'none'
      })
      return
    }
    
    if (isNaN(weight) || parseFloat(weight) <= 0) {
      wx.showToast({
        title: '请输入有效的体重',
        icon: 'none'
      })
      return
    }
    
    // 验证并保存身高
    if (height && !isNaN(height) && parseFloat(height) > 0) {
      app.setHeight(height)
    }
    
    // 验证并保存孕前体重
    if (prePregnancyWeight && !isNaN(prePregnancyWeight) && parseFloat(prePregnancyWeight) > 0) {
      app.setPrePregnancyWeight(prePregnancyWeight)
    }
    
    // 添加记录
    const newRecord = app.addWeightRecord(weight, isCustomDate ? selectedDate : null)
    
    wx.showToast({
      title: '记录成功',
      icon: 'success'
    })
    
    // 重置表单
    this.setData({
      weight: '',
      showDatePicker: false,
      isCustomDate: false
    })
    
    // 重新计算孕周
    this.initData()
    
    // 延迟跳转回首页
    setTimeout(() => {
      wx.switchTab({
        url: '/pages/index/index'
      })
    }, 1500)
  },
  
  // 设置孕周起始日期
  setPregnancyStartDate() {
    const app = getApp()
    wx.showModal({
      title: '设置孕周起始日期',
      content: '请输入您的末次月经日期（格式：YYYY-MM-DD）',
      editable: true,
      placeholderText: '例如：2024-01-01',
      success: (res) => {
        if (res.confirm && res.content) {
          // 验证日期格式
          const dateRegex = /^\d{4}-\d{2}-\d{2}$/
          if (!dateRegex.test(res.content)) {
            wx.showToast({
              title: '日期格式不正确',
              icon: 'none'
            })
            return
          }
          
          // 设置起始日期
          app.setPregnancyStartDate(res.content)
          
          wx.showToast({
            title: '设置成功',
            icon: 'success'
          })
          
          // 重新计算孕周
          this.initData()
        }
      }
    })
  }
})