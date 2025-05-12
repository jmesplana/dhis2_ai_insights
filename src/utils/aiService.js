import { sendToOpenAI } from './openai'
import { sendToOllama } from './ollama'
import { getSettings } from './storage'

/**
 * Sends a query to the configured AI provider (OpenAI or Ollama)
 * @param {string} query - The user's query
 * @param {Object} data - The DHIS2 data to analyze
 * @param {Object} context - Additional context information
 * @param {Array} conversation - The conversation history
 * @returns {Object} The AI response
 */
export const sendToAI = async (query, data, context, conversation = []) => {
  const settings = getSettings() || {}
  const aiProvider = settings.aiProvider || 'openai'
  
  // Based on the configured provider, send to appropriate service
  if (aiProvider === 'ollama') {
    return sendToOllama(query, data, context, conversation)
  } else {
    // Default to OpenAI
    return sendToOpenAI(query, data, context, conversation)
  }
}

/**
 * Tests connection to the configured AI provider
 * @param {Object} options - Connection options (apiKey for OpenAI or serverUrl for Ollama)
 * @param {string} provider - The provider to test ('openai' or 'ollama')
 * @returns {Object} Test result with available models
 */
export const testAIConnection = async (options, provider) => {
  if (!provider) {
    const settings = getSettings() || {}
    provider = settings.aiProvider || 'openai'
  }
  
  if (provider === 'openai') {
    // Import dynamically to avoid circular dependencies
    const { testOpenAIConnection } = await import('./openai')
    return testOpenAIConnection(options.apiKey)
  } else if (provider === 'ollama') {
    // Import dynamically to avoid circular dependencies
    const { testOllamaConnection } = await import('./ollama')
    return testOllamaConnection(options.serverUrl)
  } else {
    throw new Error(`Unknown AI provider: ${provider}`)
  }
}

/**
 * Gets information about the current AI configuration
 * @returns {Object} Information about the configured AI provider
 */
export const getAIInfo = () => {
  const settings = getSettings() || {}
  const aiProvider = settings.aiProvider || 'openai'
  
  if (aiProvider === 'openai') {
    return {
      provider: 'openai',
      model: settings.model || 'gpt-4',
      temperature: settings.temperature || 0.7,
      maxTokens: settings.maxTokens || 2000
    }
  } else if (aiProvider === 'ollama') {
    return {
      provider: 'ollama',
      model: settings.ollamaModel || 'llama3',
      serverUrl: settings.ollamaServerUrl || 'http://localhost:11434',
      maxTokens: settings.maxTokens || 2000
    }
  }
  
  return {
    provider: 'unknown'
  }
}