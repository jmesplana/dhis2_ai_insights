/**
 * Format a value based on its type
 * @param {any} value - The value to format
 * @param {string} valueType - DHIS2 value type
 * @returns {string} Formatted value
 */
export const formatValue = (value, valueType) => {
    if (value === null || value === undefined || value === '') {
      return '-'
    }
    
    switch (valueType) {
      case 'NUMBER':
      case 'INTEGER':
      case 'INTEGER_POSITIVE':
      case 'INTEGER_NEGATIVE':
      case 'INTEGER_ZERO_OR_POSITIVE':
        return formatNumber(value)
      
      case 'PERCENTAGE':
        return formatPercentage(value)
      
      case 'UNIT_INTERVAL':
        return formatDecimal(value * 100) + '%'
      
      case 'DATE':
        return formatDate(value)
      
      case 'DATETIME':
        return formatDateTime(value)
      
      case 'BOOLEAN':
        return value === 'true' || value === true ? 'Yes' : 'No'
      
      case 'TRUE_ONLY':
        return value === 'true' || value === true ? 'Yes' : ''
      
      default:
        return value.toString()
    }
  }
  
  /**
   * Format a number with thousand separators
   * @param {number|string} value - Number to format
   * @returns {string} Formatted number
   */
  export const formatNumber = (value) => {
    const num = parseFloat(value)
    if (isNaN(num)) return value.toString()
    
    return num.toLocaleString(undefined, {
      maximumFractionDigits: 2
    })
  }
  
  /**
   * Format a decimal number
   * @param {number|string} value - Number to format
   * @param {number} decimals - Number of decimal places
   * @returns {string} Formatted decimal
   */
  export const formatDecimal = (value, decimals = 2) => {
    const num = parseFloat(value)
    if (isNaN(num)) return value.toString()
    
    return num.toLocaleString(undefined, {
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals
    })
  }
  
  /**
   * Format a percentage value
   * @param {number|string} value - Percentage to format
   * @returns {string} Formatted percentage
   */
  export const formatPercentage = (value) => {
    const num = parseFloat(value)
    if (isNaN(num)) return value.toString()
    
    return num.toLocaleString(undefined, {
      minimumFractionDigits: 1,
      maximumFractionDigits: 1
    }) + '%'
  }
  
  /**
   * Format a date string
   * @param {string} dateString - Date string to format
   * @returns {string} Formatted date
   */
  export const formatDate = (dateString) => {
    if (!dateString) return '-'
    
    try {
      const date = new Date(dateString)
      return date.toLocaleDateString()
    } catch (e) {
      return dateString
    }
  }
  
  /**
   * Format a datetime string
   * @param {string} dateTimeString - DateTime string to format
   * @returns {string} Formatted date and time
   */
  export const formatDateTime = (dateTimeString) => {
    if (!dateTimeString) return '-'
    
    try {
      const date = new Date(dateTimeString)
      return date.toLocaleString()
    } catch (e) {
      return dateTimeString
    }
  }
  
  /**
   * Format a relative time period for display
   * @param {string} period - Period identifier (e.g., 'THIS_MONTH')
   * @returns {string} Human-readable period
   */
  export const formatPeriod = (period) => {
    const periodMap = {
      'THIS_MONTH': 'This Month',
      'LAST_MONTH': 'Last Month',
      'THIS_QUARTER': 'This Quarter',
      'LAST_QUARTER': 'Last Quarter',
      'THIS_YEAR': 'This Year',
      'LAST_YEAR': 'Last Year',
      'LAST_12_MONTHS': 'Last 12 Months'
    }
    
    return periodMap[period] || period
  }
  
  /**
   * Format a file size
   * @param {number} bytes - Size in bytes
   * @returns {string} Formatted file size
   */
  export const formatFileSize = (bytes) => {
    if (bytes === 0) return '0 Bytes'
    
    const k = 1024
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
  }
  
  /**
   * Truncate text to a specific length
   * @param {string} text - Text to truncate
   * @param {number} maxLength - Maximum length
   * @returns {string} Truncated text
   */
  export const truncateText = (text, maxLength = 100) => {
    if (!text || text.length <= maxLength) return text
    
    return text.substring(0, maxLength) + '...'
  }