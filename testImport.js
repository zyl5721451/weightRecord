// 测试数据导入功能的脚本（仅 JSON）
// 这个脚本模拟小程序环境，测试从 data/weightRecords.json 导入和解析

// 模拟wx对象
const fs = require('fs')
const wx = {
  setStorageSync: function(key, value) {
    console.log(`存储 ${key}:`, value);
    this.storage = this.storage || {};
    this.storage[key] = value;
  },
  getStorageSync: function(key) {
    this.storage = this.storage || {};
    return this.storage[key] || null;
  },
  getFileSystemManager: function() {
    return {
      readFileSync: (path, encoding) => fs.readFileSync(path, encoding)
    }
  },
  storage: {}
};

// 模拟App对象
const App = function(config) {
  const appInstance = {
    // 模拟生命周期方法
    onLaunch: config.onLaunch,
    // 复制所有方法
    ...config
  };
  
  // 替换wx调用
  for (let key in appInstance) {
    if (typeof appInstance[key] === 'function') {
      const originalMethod = appInstance[key];
      appInstance[key] = function() {
        return originalMethod.apply(appInstance, arguments);
      };
    }
  }
  
  // 调用onLaunch
  if (typeof appInstance.onLaunch === 'function') {
    appInstance.onLaunch();
  }
  
  return appInstance;
};

// 导入并执行我们的app.js逻辑
const app = App({
  onLaunch() {
    console.log('应用启动');
    // 直接测试 JSON 数据导入
    this.importDataFromFiles();
  },
  
  // 计算孕周和天数
  calculatePregnancyWeek(dateStr = null) {
    const startDateStr = wx.getStorageSync('pregnancyStartDate');
    const startDate = new Date(startDateStr);
    const currentDate = dateStr ? new Date(dateStr) : new Date();
    
    // 计算天数差（不包含起始日）
    const timeDiff = currentDate.getTime() - startDate.getTime();
    const daysDiff = Math.floor(timeDiff / (1000 * 3600 * 24));
    
    // 计算孕周和天数
    const weeks = Math.floor(daysDiff / 7);
    const days = daysDiff % 7;
    
    return { weeks, days };
  },
  
  // 重新计算所有记录的孕周
  recalculateAllPregnancyWeeks() {
    const records = wx.getStorageSync('weightRecords') || [];
    
    if (records.length === 0) {
      console.log('没有记录需要重新计算');
      return;
    }
    
    // 为每条记录重新计算孕周
    const updatedRecords = records.map(record => {
      const weekInfo = this.calculatePregnancyWeek(record.date);
      
      return {
        ...record,
        pregnancyWeek: weekInfo.weeks,
        pregnancyDay: weekInfo.days
      };
    });
    
    // 保存更新后的记录
    wx.setStorageSync('weightRecords', updatedRecords);
    
    console.log('已重新计算', updatedRecords.length, '条记录的孕周信息');
  },
  
  // 从 JSON 文件导入最新数据
  importDataFromFiles() {
    console.log('开始从 JSON 导入数据...')
    const fsMgr = wx.getFileSystemManager()
    try {
      const jsonStr = fsMgr.readFileSync('data/weightRecords.json', 'utf-8')
      const json = JSON.parse(jsonStr)
      const list = Array.isArray(json) ? json : (json.records || [])
      const startDate = json.pregnancyStartDate || json.startDate || null

      const records = (list || []).map((item, index) => ({
        id: Date.now() + index,
        date: item.date,
        weight: parseFloat(item.weight),
        pregnancyWeek: typeof item.pregnancyWeek === 'number' ? item.pregnancyWeek : undefined,
        pregnancyDay: typeof item.pregnancyDay === 'number' ? item.pregnancyDay : undefined,
        timestamp: new Date(item.date).getTime()
      }))

      records.sort((a, b) => new Date(b.date) - new Date(a.date))
      wx.setStorageSync('weightRecords', records)

      if (startDate) {
        wx.setStorageSync('pregnancyStartDate', startDate)
      }

      this.recalculateAllPregnancyWeeks()
      console.log('从 JSON 导入数据成功，共导入', records.length, '条记录')

      const storedRecords = wx.getStorageSync('weightRecords');
      console.log('存储的记录数量:', storedRecords.length);
      if (storedRecords.length > 0) {
        console.log('前5条记录:');
        storedRecords.slice(0, 5).forEach(record => {
          console.log(`${record.date}: 体重=${record.weight}, 孕周=${record.pregnancyWeek}周${record.pregnancyDay > 0 ? '+' + record.pregnancyDay + '天' : ''}`);
        });
      }
      return records.length
    } catch (e) {
      console.error('读取或解析 JSON 失败:', e.message)
      return 0
    }
  }
});

console.log('测试完成!');