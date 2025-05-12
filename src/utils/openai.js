import axios from 'axios'
import { getApiKeyFromStorage, getSettings, cacheResponse, getCachedResponse } from './storage'

/**
 * Send a query to OpenAI API
 * @param {string} query - The user's query
 * @param {Object} data - The DHIS2 data to analyze
 * @param {Object} context - Additional context information
 * @param {Array} conversation - The conversation history
 * @returns {Object} The AI response
 */
export const sendToOpenAI = async (query, data, context, conversation = []) => {
  // Check for cached response first
  const cachedResponse = getCachedResponse(query, data)
  if (cachedResponse) {
    return cachedResponse
  }
  
  const apiKey = getApiKeyFromStorage()
  if (!apiKey) {
    throw new Error('OpenAI API key not configured')
  }
  
  // Get settings
  const settings = getSettings() || {}
  const model = settings.model || 'gpt-4'
  const maxTokens = settings.maxTokens || 2000
  const temperature = settings.temperature || 0.7
  
  // Prepare prompt with context and data
  const systemPrompt = createSystemPrompt(data, context)
  
  // Prepare conversation history
  const messages = [
    { role: 'system', content: systemPrompt }
  ]
  
  // Add conversation history (limited to last 10 messages to save tokens)
  const recentConversation = conversation.slice(-10)
  messages.push(...recentConversation)
  
  // Add the current query
  messages.push({ role: 'user', content: query })
  
  try {
    const response = await axios.post(
      'https://api.openai.com/v1/chat/completions',
      {
        model,
        messages,
        max_tokens: maxTokens,
        temperature,
        n: 1,
      },
      {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`
        }
      }
    )
    
    // Extract the AI's message
    const aiMessage = response.data.choices[0].message.content
    
    // Process for recommendations (optional)
    const recommendations = extractRecommendations(aiMessage)
    
    // Create final response object
    const result = {
      message: aiMessage,
      recommendations: recommendations.length > 0 ? recommendations : null,
      usage: response.data.usage
    }
    
    // Cache the response
    cacheResponse(query, data, result)
    
    return result
  } catch (error) {
    console.error('OpenAI API Error:', error.response?.data || error.message)
    throw new Error(
      error.response?.data?.error?.message || 
      'Failed to communicate with OpenAI API. Please check your API key and try again.'
    )
  }
}

/**
 * Test the OpenAI API connection
 * @param {string} apiKey - The API key to test
 * @returns {Object} Test result with available models
 */
export const testOpenAIConnection = async (apiKey) => {
  try {
    const response = await axios.get(
      'https://api.openai.com/v1/models',
      {
        headers: {
          'Authorization': `Bearer ${apiKey}`
        }
      }
    )
    
    // Extract available models
    const models = response.data.data
      .filter(model => model.id.includes('gpt'))
      .map(model => model.id)
    
    return {
      success: true,
      models
    }
  } catch (error) {
    console.error('OpenAI API Connection Test Error:', error.response?.data || error.message)
    throw new Error(
      error.response?.data?.error?.message || 
      'Failed to connect to OpenAI API. Please check your API key and try again.'
    )
  }
}

/**
 * Create system prompt with context and data
 * @param {Object} data - The DHIS2 data
 * @param {Object} context - Additional context
 * @returns {string} The system prompt
 */
const createSystemPrompt = (data, context) => {
  // Format data for the prompt
  let dataString = ''
  
  if (data && data.headers) {
    const headers = data.headers
    const rows = data.rows || []
    const hasData = data.hasData || rows.length > 0
    
    if (hasData) {
      // Create a sample of the data (first 10 rows)
      const sample = rows.slice(0, 10)
      
      // Format as a table
      dataString = 'Data Sample:\n'
      
      // Map the data element IDs to names if available
      const mapDataElementName = (id) => {
        if (data.metaData && data.metaData.items && data.metaData.items[id]) {
          return data.metaData.items[id].name || id;
        }
        return id;
      };
      
      // Get the dx index (data element) from the headers
      const dxIndex = headers.findIndex(h => h.name === 'dx');
      
      // Create a header row with readable names
      const headerRow = headers.map((h, i) => {
        if (i === dxIndex && dxIndex !== -1) {
          return 'Data Element';
        }
        return h.column;
      }).join(',');
      
      dataString += headerRow + '\n';
      
      // Format each row with readable data element names
      sample.forEach(row => {
        const formattedRow = row.map((cell, i) => {
          if (i === dxIndex && dxIndex !== -1) {
            return mapDataElementName(cell);
          }
          return cell;
        }).join(',');
        dataString += formattedRow + '\n';
      })
      
      if (rows.length > 10) {
        dataString += `... (and ${rows.length - 10} more rows)\n`
      }
      
      // Add summary statistics if available
      if (data.summary) {
        dataString += '\nSummary Statistics:\n'
        Object.entries(data.summary).forEach(([key, value]) => {
          dataString += `${key}: ${value}\n`
        })
      }
    } else {
      dataString = 'No data available for the selected data elements in the specified period and location.\n\n' +
                   'Selected data elements: ' + 
                   (data.dataElements && data.metaData && data.metaData.items 
                     ? data.dataElements.map(id => data.metaData.items[id]?.name || 'Unknown Element').join(', ')
                     : 'Unknown') + '\n' +
                   'Period: ' + context.period + '\n' + 
                   'Organization Unit: ' + (context.orgUnit.displayName || context.orgUnit.name || context.orgUnit.id) + '\n\n' +
                   'Note: This is likely because:\n' +
                   '- This is a development/test system without complete data\n' +
                   '- The specific combination of elements, period, and location has no records\n' +
                   '- The data elements may be new or not yet populated\n'
    }
  }
  
  return `
You are an AI assistant specialized in analyzing DHIS2 health data for healthcare professionals and decision-makers in resource-constrained settings. Your goal is to provide clear, actionable insights that can help save lives and improve health outcomes.

IMPORTANT: Never display technical identifiers (UIDs like "UsSUX0cpKsH") in your response. Always refer to data elements and organization units by their proper names.

## Context:
- User: ${context.user.name} (${context.user.username})
- Organization Units: ${context.user.orgUnits}
- Data Elements: ${Array.isArray(context.dataElements) ? context.dataElements.join(', ') : 'None selected'}
- Period: ${context.period}
- Organization Unit: ${context.orgUnit.displayName || context.orgUnit.name || "Selected organization unit"}

## Your Task:
- Analyze the provided health data carefully and objectively
- Present clear, factual insights about trends, patterns, and anomalies
- Provide specific, actionable recommendations when appropriate
- Consider the context of low-resource settings, emergency situations, and limited time
- Format your response in a clear, readable way using markdown
- Be concise but comprehensive

## Data:
${dataString}

When formulating your response:
1. First analyze the data briefly to understand what it represents
2. If there is data available:
   - Provide key observations and trends in the data
   - Highlight any notable patterns, anomalies, or concerning indicators
   - Conclude with 2-5 specific, actionable recommendations
3. If there is NO data available:
   - Acknowledge the lack of data without being repetitive
   - Provide 2-3 BRIEF suggestions specific to the selected data elements about possible next steps
   - Avoid lengthy explanations about data collection in general
   - Do NOT assume problems with data collection - this is a development system and may simply not have data
4. Always use a professional, direct tone appropriate for healthcare contexts

Focus on delivering practical insights that can inform immediate decision-making in healthcare contexts, particularly in low-resource or emergency settings.

Remember:
1. Avoid showing technical details like UIDs (e.g., "UsSUX0cpKsH") in your analysis
2. If data element names aren't clear, refer to them by their position or general type (e.g., "the first disease," "disease type A")
3. Focus on the patterns and insights rather than the raw data representation
4. ALWAYS use the organization unit's display name (${context.orgUnit.displayName || context.orgUnit.name || "organization unit"}) in your responses, not the ID
`
}

/**
 * Extract recommendations from AI message
 * @param {string} message - The AI response message
 * @returns {Array} List of recommendations
 */
const extractRecommendations = (message) => {
  const recommendations = []
  
  // Look for sections that might contain recommendations
  const recommendationSections = [
    /## Recommendations\s+([\s\S]+?)(?=##|$)/i,
    /Recommendations:\s+([\s\S]+?)(?=##|$)/i,
    /I recommend\s+([\s\S]+?)(?=##|$)/i,
    /Actions to consider:\s+([\s\S]+?)(?=##|$)/i,
  ]
  
  for (const pattern of recommendationSections) {
    const match = message.match(pattern)
    if (match && match[1]) {
      // Extract recommendations as bullet points or numbered list
      const section = match[1].trim()
      
      // Try to match bullet points
      const bulletPoints = section.match(/[•\-\*]\s+([^\n]+)/g)
      if (bulletPoints) {
        bulletPoints.forEach(point => {
          recommendations.push(point.replace(/[•\-\*]\s+/, '').trim())
        })
        continue
      }
      
      // Try to match numbered list
      const numberedPoints = section.match(/\d+\.\s+([^\n]+)/g)
      if (numberedPoints) {
        numberedPoints.forEach(point => {
          recommendations.push(point.replace(/\d+\.\s+/, '').trim())
        })
        continue
      }
      
      // If no bullet points found, just use entire section
      if (recommendations.length === 0) {
        // Split by lines and filter empty lines
        const lines = section.split('\n').filter(line => line.trim())
        lines.forEach(line => {
          recommendations.push(line.trim())
        })
      }
    }
  }
  
  return recommendations
}