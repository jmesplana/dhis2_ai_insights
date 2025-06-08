import axios from 'axios'
import { getSettings } from './storage'
import { ollamaGetRequest, ollamaPostRequest } from './ollamaProxy'

/**
 * Send a query to Ollama API
 * @param {string} query - The user's query
 * @param {Object} data - The DHIS2 data to analyze
 * @param {Object} context - Additional context information
 * @param {Array} conversation - The conversation history
 * @param {Function} onStreamChunk - Optional callback for streaming response chunks
 * @returns {Object} The AI response
 */
export const sendToOllama = async (query, data, context, conversation = [], onStreamChunk = null) => {
  // Get Ollama settings
  const settings = getSettings() || {}
  const ollamaServerUrl = settings.ollamaServerUrl || 'http://localhost:11434'
  const ollamaModel = settings.ollamaModel || 'llama3'
  const maxTokens = settings.maxTokens || 2000

  // Log data information for debugging
  console.log("Ollama received data:",
    data ? {
      hasData: data.hasData,
      rowsLength: data.rows ? data.rows.length : 0,
      headersLength: data.headers ? data.headers.length : 0
    } : "No data"
  )

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
    // Use the proxy-aware request function
    const response = await ollamaPostRequest(
      ollamaServerUrl,
      'api/chat',
      {
        model: ollamaModel,
        messages,
        options: {
          num_predict: maxTokens,
        }
      }
    )

    // Debug the response structure
    console.log("Ollama raw response:", response.substring ? response.substring(0, 500) + "..." : response);
    console.log("Response type:", typeof response);

    // For Ollama API in different versions, the response structure can vary
    // Extract the AI's message with better fallbacks
    let aiMessage = '';

    // Special handling for streaming responses
    if (typeof response === 'string') {
      console.log("Found streaming response format");

      try {
        // The response looks like a string with multiple JSON objects
        // Extract the message content from each JSON object and combine them

        // Split by newlines and parse each JSON object
        const lines = response.split('\n').filter(line => line.trim());

        if (lines.length > 0) {
          // Process all JSON objects in the stream
          const messageParts = [];

          for (const line of lines) {
            try {
              const jsonObj = JSON.parse(line);
              if (jsonObj.message && jsonObj.message.content) {
                messageParts.push(jsonObj.message.content);
              }
            } catch (e) {
              // Skip invalid JSON - expected for incomplete lines
              console.log("Skipping invalid JSON in stream:", line.substring(0, 30) + "...");
            }
          }

          // Combine all message parts into one complete message
          aiMessage = messageParts.join('');
          console.log("Reconstructed message from stream parts:", aiMessage.substring(0, 100) + "...");
        } else {
          // If we can't parse the stream, use the whole response
          aiMessage = response;
        }
      } catch (e) {
        console.warn("Error processing streaming response:", e);
        // Use a reasonable fallback if the stream parsing fails
        aiMessage = response;
      }
    }
    // Handle standard response object formats
    else if (response.message && response.message.content) {
      console.log("Found message.content format");
      aiMessage = response.message.content;
    } else if (response.content) {
      console.log("Found content format");
      aiMessage = response.content;
    } else if (response.response) {
      console.log("Found response format");
      aiMessage = response.response;
    } else if (response.data && response.data.message && response.data.message.content) {
      console.log("Found data.message.content format");
      aiMessage = response.data.message.content;
    } else if (response.data && response.data.content) {
      console.log("Found data.content format");
      aiMessage = response.data.content;
    } else if (response.data && response.data.response) {
      console.log("Found data.response format");
      aiMessage = response.data.response;
    } else {
      console.warn("Could not find message in Ollama response:", response);
      aiMessage = "Unable to extract response from Ollama. Please check the console logs for details.";
    }

    // Process for recommendations (optional)
    const recommendations = extractRecommendations(aiMessage)

    // Create final response object
    const result = {
      message: aiMessage,
      recommendations: recommendations.length > 0 ? recommendations : null,
      model: ollamaModel
    }

    return result
  } catch (error) {
    console.error('Ollama API Error:', error.response?.data || error.message)
    const errorMessage = error.response?.data?.error || error.message
    throw new Error(
      `Failed to communicate with Ollama API at ${ollamaServerUrl}: ${errorMessage}`
    )
  }
}

/**
 * Test the Ollama API connection and get available models
 * @param {string} serverUrl - The Ollama server URL to test
 * @returns {Object} Test result with available models
 */
export const testOllamaConnection = async (serverUrl) => {
  try {
    // Use the proxy-aware request function
    const tagsData = await ollamaGetRequest(serverUrl, 'api/tags')

    // Extract available models
    const models = tagsData.models
      ? tagsData.models.map(model => model.name)
      : []

    return {
      success: true,
      models: models,
      message: `Successfully connected to Ollama server at ${serverUrl}. ${models.length} models available.`
    }
  } catch (error) {
    console.error('Ollama API Connection Test Error:', error)
    throw new Error(
      `Failed to connect to Ollama at ${serverUrl}. ${error.message}`
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

  console.log("Creating system prompt with data:",
    data ? {
      hasHeaders: !!data.headers,
      hasRows: !!(data.rows && data.rows.length),
      hasDataFlag: !!data.hasData,
      rowCount: data.rows ? data.rows.length : 0,
      headerCount: data.headers ? data.headers.length : 0,
      hasMetaData: !!(data.metaData && data.metaData.items),
      hasDataElements: !!(data.dataElements && data.dataElements.length)
    } : "No data"
  )
  console.log("Context received:", {
    period: context.period,
    orgUnit: context.orgUnit ? {
      id: context.orgUnit.id,
      displayName: context.orgUnit.displayName,
      name: context.orgUnit.name
    } : "No org unit",
    dataElements: context.dataElements ? (Array.isArray(context.dataElements) ? context.dataElements.length : "Not an array") : "No data elements",
    user: context.user ? context.user.name : "No user"
  })

  if (data && data.headers) {
    const headers = data.headers
    const rows = data.rows || []
    const hasData = data.hasData || rows.length > 0

    if (hasData) {
      // Create a sample of the data (first 10 rows)
      const sample = rows.slice(0, 10)

      // Format as a table
      dataString = 'Data Sample:\n'

      // Map IDs to names if available
      const mapIdToName = (id) => {
        if (data.metaData && data.metaData.items && data.metaData.items[id]) {
          return data.metaData.items[id].name || id;
        }
        return id;
      };

      // Get the indices from the headers
      const dxIndex = headers.findIndex(h => h.name === 'dx');
      const ouIndex = headers.findIndex(h => h.name === 'ou');
      const peIndex = headers.findIndex(h => h.name === 'pe');

      // Create a header row with readable names
      const headerRow = headers.map((h, i) => {
        if (i === dxIndex && dxIndex !== -1) {
          return 'Data Element';
        } else if (i === ouIndex && ouIndex !== -1) {
          return 'Organization Unit';
        } else if (i === peIndex && peIndex !== -1) {
          return 'Period';
        }
        return h.column;
      }).join(',');

      dataString += headerRow + '\n';

      // Format each row with readable names
      sample.forEach(row => {
        const formattedRow = row.map((cell, i) => {
          if ((i === dxIndex && dxIndex !== -1) || 
              (i === ouIndex && ouIndex !== -1) || 
              (i === peIndex && peIndex !== -1)) {
            return mapIdToName(cell);
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
      // When no data is available, provide more detailed explanation
      dataString = 'No data available for the selected data elements in the specified period and location.\n\n'

      // Try to get the selected data elements names from either data or context
      let dataElementNames = 'Unknown';

      if (data.dataElements && Array.isArray(data.dataElements)) {
        if (data.metaData && data.metaData.items) {
          // Try to map IDs to names using metaData
          dataElementNames = data.dataElements
            .map(id => {
              if (typeof id === 'string') {
                return data.metaData.items[id]?.name || id;
              } else if (id && id.id) {
                return data.metaData.items[id.id]?.name || id.id;
              } else {
                return 'Unknown Element';
              }
            })
            .join(', ');
        } else {
          // If metaData is not available, just use the IDs
          dataElementNames = data.dataElements
            .map(id => typeof id === 'string' ? id : (id && id.id ? id.id : 'Unknown'))
            .join(', ');
        }
      } else if (context.dataElements && Array.isArray(context.dataElements)) {
        // Alternatively, use context.dataElements if available
        dataElementNames = context.dataElements.join(', ');
      }

      dataString += 'Selected data elements: ' + dataElementNames + '\n' +
                   'Period: ' + context.period + '\n' +
                   'Organization Unit: ' + (context.orgUnit.displayName || context.orgUnit.name || context.orgUnit.id) + '\n\n' +
                   'Note: This is likely because:\n' +
                   '- This is a development/test system without complete data\n' +
                   '- The specific combination of elements, period, and location has no records\n' +
                   '- The data elements may be new or not yet populated\n'
    }
  } else {
    // No headers available at all - provide a minimal response
    dataString = 'No data structure is available to analyze. The system might be experiencing issues retrieving data.\n' +
                 'You can try selecting different data elements, a different time period, or a different organization unit.\n'
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