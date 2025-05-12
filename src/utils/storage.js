// Constants for storage keys
const API_KEY_STORAGE_KEY = 'dhis2-ai-insights-api-key'
const SETTINGS_STORAGE_KEY = 'dhis2-ai-insights-settings'
const CACHE_STORAGE_KEY = 'dhis2-ai-insights-cache'

/**
 * Save OpenAI API key to local storage
 * @param {string} apiKey - The OpenAI API key to store
 */
export const saveApiKey = (apiKey) => {
  try {
    // Encrypt the API key before storing (simple obfuscation, not truly secure)
    const encoded = btoa(apiKey)
    localStorage.setItem(API_KEY_STORAGE_KEY, encoded)
    return true
  } catch (error) {
    console.error('Error saving API key:', error)
    return false
  }
}

/**
 * Get API key from storage
 * @returns {string|null} The stored API key or null if not found
 */
export const getApiKeyFromStorage = () => {
  try {
    const encoded = localStorage.getItem(API_KEY_STORAGE_KEY)
    if (!encoded) return null
    
    // Decode the API key
    return atob(encoded)
  } catch (error) {
    console.error('Error retrieving API key:', error)
    return null
  }
}

/**
 * Check if API key is set
 * @returns {boolean} True if API key is set
 */
export const isApiKeySet = () => {
  const apiKey = getApiKeyFromStorage()
  return Boolean(apiKey && apiKey.trim())
}

/**
 * Clear the stored API key
 */
export const clearApiKey = () => {
  try {
    localStorage.removeItem(API_KEY_STORAGE_KEY)
    return true
  } catch (error) {
    console.error('Error clearing API key:', error)
    return false
  }
}

/**
 * Save application settings
 * @param {Object} settings - Object containing app settings
 */
export const saveSettings = (settings) => {
  try {
    localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(settings))
    return true
  } catch (error) {
    console.error('Error saving settings:', error)
    return false
  }
}

/**
 * Get application settings
 * @returns {Object|null} Stored settings or null if not found
 */
export const getSettings = () => {
  try {
    const settings = localStorage.getItem(SETTINGS_STORAGE_KEY)
    return settings ? JSON.parse(settings) : null
  } catch (error) {
    console.error('Error retrieving settings:', error)
    return null
  }
}

/**
 * Save response to cache
 * @param {string} query - The query used
 * @param {Object} data - The data context
 * @param {Object} response - The response to cache
 */
export const cacheResponse = (query, data, response) => {
  try {
    // Check if caching is enabled in settings
    const settings = getSettings()
    if (settings && settings.cachingEnabled === false) {
      return false
    }
    
    const cache = getCachedResponses() || {}
    
    // Create a cache key based on query and data
    const cacheKey = createCacheKey(query, data)
    
    // Store response with timestamp
    cache[cacheKey] = {
      response,
      timestamp: Date.now()
    }
    
    // Limit cache size (store max 50 responses)
    const cacheKeys = Object.keys(cache)
    if (cacheKeys.length > 50) {
      // Remove oldest entries
      const sortedKeys = cacheKeys.sort((a, b) => cache[a].timestamp - cache[b].timestamp)
      const keysToRemove = sortedKeys.slice(0, cacheKeys.length - 50)
      keysToRemove.forEach(key => delete cache[key])
    }
    
    localStorage.setItem(CACHE_STORAGE_KEY, JSON.stringify(cache))
    return true
  } catch (error) {
    console.error('Error caching response:', error)
    return false
  }
}

/**
 * Get cached response for query and data
 * @param {string} query - The query to look up
 * @param {Object} data - The data context
 * @returns {Object|null} Cached response or null if not found
 */
export const getCachedResponse = (query, data) => {
  try {
    // Check if caching is enabled in settings
    const settings = getSettings()
    if (settings && settings.cachingEnabled === false) {
      return null
    }
    
    const cache = getCachedResponses()
    if (!cache) return null
    
    const cacheKey = createCacheKey(query, data)
    const cachedItem = cache[cacheKey]
    
    if (!cachedItem) return null
    
    // Check cache expiry (24 hours)
    const cacheAge = Date.now() - cachedItem.timestamp
    if (cacheAge > 24 * 60 * 60 * 1000) {
      // Cache expired
      return null
    }
    
    return cachedItem.response
  } catch (error) {
    console.error('Error retrieving cached response:', error)
    return null
  }
}

/**
 * Get all cached responses
 * @returns {Object|null} All cached responses or null if not found
 */
export const getCachedResponses = () => {
  try {
    const cache = localStorage.getItem(CACHE_STORAGE_KEY)
    return cache ? JSON.parse(cache) : null
  } catch (error) {
    console.error('Error retrieving cache:', error)
    return null
  }
}

/**
 * Clear all cached responses
 */
export const clearCache = () => {
  try {
    localStorage.removeItem(CACHE_STORAGE_KEY)
    return true
  } catch (error) {
    console.error('Error clearing cache:', error)
    return false
  }
}

/**
 * Create a cache key from query and data
 * @param {string} query - The query text
 * @param {Object} data - The data context
 * @returns {string} A string hash to use as cache key
 */
const createCacheKey = (query, data) => {
  // Create a simplified representation of the data
  const dataKey = JSON.stringify({
    elements: (data.dataElements || []).map(de => de.id),
    period: data.period,
    orgUnit: data.orgUnit ? data.orgUnit.id : null
  })
  
  // Combine query and data for a unique key
  const combined = `${query.trim().toLowerCase()}:${dataKey}`
  
  // Create a simple hash
  return btoa(combined).replace(/[^a-zA-Z0-9]/g, '')
}