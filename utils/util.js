const formatTime = date => {
  const year = date.getFullYear()
  const month = date.getMonth() + 1
  const day = date.getDate()
  const hour = date.getHours()
  const minute = date.getMinutes()
  const second = date.getSeconds()

  return `${[year, month, day].map(formatNumber).join('/')} ${[hour, minute, second].map(formatNumber).join(':')}`
}

const formatNumber = n => {
  n = n.toString()
  return n[1] ? n : `0${n}`
}

// 以本地时区格式化为 YYYY-MM-DD
const formatDateYMDLocal = (date = new Date()) => {
  const year = date.getFullYear()
  const month = formatNumber(date.getMonth() + 1)
  const day = formatNumber(date.getDate())
  return `${year}-${month}-${day}`
}

// 以本地时区解析 YYYY-MM-DD 为 Date（避免 new Date('YYYY-MM-DD') 的 UTC 解析偏差）
const parseDateYMDLocal = (dateStr) => {
  if (!dateStr || typeof dateStr !== 'string') return new Date()
  const parts = dateStr.split('-')
  if (parts.length !== 3) return new Date(dateStr)
  const year = parseInt(parts[0], 10)
  const month = parseInt(parts[1], 10)
  const day = parseInt(parts[2], 10)
  return new Date(year, month - 1, day)
}

module.exports = {
  formatTime,
  formatDateYMDLocal,
  parseDateYMDLocal
}
