// list.js
Page({
  data: {
    records: [],
    currentPage: 1,
    pageSize: 10,
    total: 0,
    hasMore: true
  },
  
  onLoad() {
    this.loadRecords()
  },
  
  onShow() {
    this.loadRecords()
  },
  
  loadRecords() {
    const app = getApp()
    const result = app.getWeightRecords(this.data.currentPage, this.data.pageSize)
    
    this.setData({
      records: result.records,
      total: result.total,
      hasMore: result.records.length === this.data.pageSize && 
               this.data.currentPage * this.data.pageSize < result.total
    })
  },
  
  // 加载更多
  loadMore() {
    if (!this.data.hasMore) return
    
    const app = getApp()
    const nextPage = this.data.currentPage + 1
    const result = app.getWeightRecords(nextPage, this.data.pageSize)
    
    this.setData({
      records: [...this.data.records, ...result.records],
      currentPage: nextPage,
      hasMore: result.records.length === this.data.pageSize && 
               nextPage * this.data.pageSize < result.total
    })
  },
  
  // 删除记录
  deleteRecord(e) {
    const id = e.currentTarget.dataset.id
    
    wx.showModal({
      title: '确认删除',
      content: '确定要删除这条记录吗？',
      success: (res) => {
        if (res.confirm) {
          const app = getApp()
          app.deleteWeightRecord(id)
          
          wx.showToast({
            title: '删除成功',
            icon: 'success'
          })
          
          // 重新加载数据
          this.setData({
            currentPage: 1
          })
          this.loadRecords()
        }
      }
    })
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
  }
})