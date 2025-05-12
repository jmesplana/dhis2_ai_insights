import React, { useState, useEffect, useRef } from 'react'
import { 
  Card, 
  TextAreaField, 
  Button, 
  CircularLoader,
  NoticeBox,
  Box,
  Chip,
  ButtonStrip,
  Divider,
  Tooltip
} from '@dhis2/ui'
import ReactMarkdown from 'react-markdown'
import { fetchDataForElements } from '../utils/dhis2Data'
import { sendToAI } from '../utils/aiService'
import { generateWordReport } from '../utils/reportGenerator'
import { getAIInfo } from '../utils/aiService'

// Suggested prompts for users
const suggestedPrompts = [
  "Analyze trends in the selected data over time",
  "Identify anomalies or outliers in this dataset",
  "Compare the current period with previous periods",
  "What insights can you provide about this data?",
  "Suggest actions based on this data",
  "Show me the key performance indicators",
  "Provide a summary of this health data for decision makers",
  "What emergent trends should I be aware of?",
  "How does this data compare to regional benchmarks?",
  "Create an email to share these findings with my team",
  "Generate a SITREP based on this data",
]

export const AIQuerySelection = ({
  engine,
  selectedDataElements,
  selectedPeriod,
  selectedOrgUnit,
  selectedDataType,
  user
}) => {
  const [query, setQuery] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [response, setResponse] = useState(null)
  const [error, setError] = useState(null)
  const [dataSnapshot, setDataSnapshot] = useState(null)
  const [conversation, setConversation] = useState([])
  const [isDragging, setIsDragging] = useState(false)
  const [startY, setStartY] = useState(0)
  const [chatHeight, setChatHeight] = useState(400) // Default height
  const [aiInfo, setAIInfo] = useState(null) // AI provider info
  const resizableChatRef = useRef(null)

  useEffect(() => {
    // Reset response when data selection changes
    setResponse(null)
    setDataSnapshot(null)
  }, [selectedDataElements, selectedPeriod, selectedOrgUnit])

  // Fetch AI provider info
  useEffect(() => {
    const info = getAIInfo()
    setAIInfo(info)
  }, [])

  // Auto-scroll to bottom when conversation updates
  useEffect(() => {
    if (conversation.length > 0) {
      const chatContainer = document.getElementById('chat-messages')
      if (chatContainer) {
        chatContainer.scrollTop = chatContainer.scrollHeight
      }
    }
  }, [conversation, isLoading, error])

  // Handle resize start - mouse
  const handleMouseDown = (e) => {
    e.preventDefault()
    setIsDragging(true)
    setStartY(e.clientY)
  }

  // Handle resize start - touch
  const handleTouchStart = (e) => {
    if (e.touches.length === 1) {
      setIsDragging(true)
      setStartY(e.touches[0].clientY)
    }
  }

  // Handle resize drag
  useEffect(() => {
    const handleMouseMove = (e) => {
      if (!isDragging) return
      
      const delta = e.clientY - startY
      if (resizableChatRef.current) {
        const newHeight = chatHeight + delta
        // Apply min/max constraints
        const constrainedHeight = Math.max(200, Math.min(newHeight, window.innerHeight * 0.8))
        resizableChatRef.current.style.height = `${constrainedHeight}px`
        setChatHeight(constrainedHeight)
        setStartY(e.clientY)
      }
    }

    const handleTouchMove = (e) => {
      if (!isDragging || e.touches.length !== 1) return
      
      const delta = e.touches[0].clientY - startY
      if (resizableChatRef.current) {
        const newHeight = chatHeight + delta
        // Apply min/max constraints
        const constrainedHeight = Math.max(200, Math.min(newHeight, window.innerHeight * 0.8))
        resizableChatRef.current.style.height = `${constrainedHeight}px`
        setChatHeight(constrainedHeight)
        setStartY(e.touches[0].clientY)
      }
    }

    const handleMouseUp = () => {
      setIsDragging(false)
    }

    const handleTouchEnd = () => {
      setIsDragging(false)
    }

    if (isDragging) {
      document.addEventListener('mousemove', handleMouseMove)
      document.addEventListener('mouseup', handleMouseUp)
      document.addEventListener('touchmove', handleTouchMove, { passive: false })
      document.addEventListener('touchend', handleTouchEnd)
      document.addEventListener('touchcancel', handleTouchEnd)
    }

    return () => {
      document.removeEventListener('mousemove', handleMouseMove)
      document.removeEventListener('mouseup', handleMouseUp)
      document.removeEventListener('touchmove', handleTouchMove)
      document.removeEventListener('touchend', handleTouchEnd)
      document.removeEventListener('touchcancel', handleTouchEnd)
    }
  }, [isDragging, startY, chatHeight])

  const handleQueryChange = ({ value }) => {
    setQuery(value)
  }

  const handleQuerySubmit = async () => {
    if (!query.trim()) return
    
    // Clear previous errors
    setError(null)
    
    // Convert selectedDataElements to array if it's not already
    const dataElementsArray = Array.isArray(selectedDataElements) ? selectedDataElements : [];
    
    if (!dataElementsArray || dataElementsArray.length === 0) {
      setError('Please select at least one data element')
      return
    }
    
    if (!selectedOrgUnit) {
      setError('Please select an organization unit')
      return
    }
    
    try {
      setIsLoading(true)
      setError(null)
      
      // Ensure we have the data elements as an array 
      // The selectedDataElements could be an array of IDs from the Transfer component
      const dataElementsArray = Array.isArray(selectedDataElements) ? selectedDataElements : [];
      
      console.log("Using data elements:", dataElementsArray);
      console.log("Selected Period:", selectedPeriod, "Type:", typeof selectedPeriod);
      console.log("Selected OrgUnit:", selectedOrgUnit, "Type:", typeof selectedOrgUnit);
      
      if (dataElementsArray.length === 0) {
        setError('Please select at least one data element');
        setIsLoading(false);
        return;
      }
      
      if (!selectedOrgUnit) {
        setError('Please select an organization unit');
        setIsLoading(false);
        return;
      }
      
      // Fetch data from DHIS2 if not already fetched
      let data = dataSnapshot
      if (!data) {
        try {
          // Use the data type passed from the parent component
          const dataType = selectedDataType || 'aggregate';
          
          // Log to diagnose the issue
          console.log("Fetching data with elements:", JSON.stringify(dataElementsArray));
          console.log("Using data type:", dataType);
          
          data = await fetchDataForElements(
            engine,
            dataElementsArray,
            selectedPeriod,
            selectedOrgUnit,
            dataType
          )
        } catch (err) {
          console.error("Error fetching data:", err);
          setError(`Error fetching data: ${err.message}`);
          setIsLoading(false);
          return;
        }
        setDataSnapshot(data)
      }
      
      // Add metadata about the query
      const context = {
        user: {
          name: user.name,
          username: user.username,
          orgUnits: user.organisationUnits.map(ou => ou.name).join(', ')
        },
        dataElements: dataElementsArray, // Just pass the data element IDs
        period: selectedPeriod,
        orgUnit: {
          id: selectedOrgUnit.id,
          name: selectedOrgUnit.displayName || selectedOrgUnit.name || selectedOrgUnit.id,
          displayName: selectedOrgUnit.displayName || selectedOrgUnit.name || selectedOrgUnit.id
        }
      }
      
      // Send to OpenAI
      const newMessage = {
        role: 'user',
        content: query,
        timestamp: new Date().toISOString()
      }
      
      const result = await sendToAI(query, data, context, conversation)
      
      // Add messages to conversation
      const aiMessage = {
        role: 'assistant',
        content: result.message,
        timestamp: new Date().toISOString()
      }
      
      setConversation([...conversation, newMessage, aiMessage])
      setResponse(result)
      setQuery('')
    } catch (err) {
      setError(`Error: ${err.message}`)
    } finally {
      setIsLoading(false)
    }
  }

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && e.ctrlKey) {
      handleQuerySubmit()
    }
  }

  const handleClearConversation = () => {
    setConversation([])
    setResponse(null)
  }

  const handleSuggestedPromptClick = (prompt) => {
    setQuery(prompt)
  }
  
  const handleDownloadReport = async (message) => {
    try {
      // Create context object for the report
      const context = {
        user: user,
        dataElements: selectedDataElements,
        period: selectedPeriod,
        orgUnit: selectedOrgUnit
      }
      
      // Show loading indicator
      setIsLoading(true)
      
      // Generate and download Word document
      await generateWordReport(message, context)
      
      // Hide loading indicator
      setIsLoading(false)
    } catch (error) {
      console.error("Error generating report:", error)
      setError(`Error generating report: ${error.message}`)
      setIsLoading(false)
    }
  }

  return (
    <div className="insights-container">
      <div className="chat-container">
        <div className="chat-header">
          <div style={{ display: 'flex', alignItems: 'center' }}>
            <span>AI Assistant</span>
            {aiInfo && (
              <span style={{
                fontSize: '12px',
                marginLeft: '8px',
                backgroundColor: aiInfo.provider === 'openai' ? '#10a37f' : '#ff6700',
                color: 'white',
                padding: '2px 6px',
                borderRadius: '10px',
                fontWeight: 'bold'
              }}>
                {aiInfo.provider === 'openai'
                  ? `OpenAI: ${aiInfo.model}`
                  : `Ollama: ${aiInfo.model}`}
              </span>
            )}
          </div>
          {conversation.length > 0 && (
            <Button small onClick={handleClearConversation}>
              Clear Chat
            </Button>
          )}
        </div>
        
        <div 
          className="resizable-chat-area" 
          ref={resizableChatRef}
          style={{ height: `${chatHeight}px` }}
        >
          <div className="chat-messages" id="chat-messages">
            {/* Welcome message when there's no conversation */}
            {conversation.length === 0 && !isLoading && (
              <div className="message-bubble message-ai">
                <p>Hello! I'm your AI assistant. Ask me anything about your selected data.</p>
                <div className="message-timestamp">
                  {new Date().toLocaleTimeString()}
                </div>
              </div>
            )}
            
            {/* Display conversation messages */}
            {conversation.map((message, index) => (
              <div 
                key={index} 
                className={`message-bubble ${message.role === 'user' ? 'message-user' : 'message-ai'}`}
              >
                {message.role === 'user' ? (
                  <p>{message.content}</p>
                ) : (
                  <div className="ai-message-container">
                    <ReactMarkdown className="ai-message">
                      {message.content}
                    </ReactMarkdown>
                    
                    {/* Actions for AI messages */}
                    <div className="message-actions">
                      <Tooltip content="Download as HTML report (can be printed or saved as PDF)">
                        <Button
                          small
                          icon={<span role="img" aria-label="document">📄</span>}
                          onClick={() => handleDownloadReport(message)}
                        >
                          Download HTML Report
                        </Button>
                      </Tooltip>
                    </div>
                  </div>
                )}
                
                {message.role === 'assistant' && message.recommendations && (
                  <Box margin="16px 0 0 0" className="recommendations-container">
                    <h4>Recommendations</h4>
                    {message.recommendations.map((rec, i) => (
                      <div key={i} className="recommendation-item">
                        {rec}
                      </div>
                    ))}
                  </Box>
                )}
                
                <div className="message-timestamp">
                  {new Date(message.timestamp).toLocaleTimeString()}
                </div>
              </div>
            ))}
            
            {/* Loading indicator */}
            {isLoading && (
              <div className="message-bubble message-ai" style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <CircularLoader small />
                <p>Analyzing your data...</p>
              </div>
            )}
            
            {/* Error message */}
            {error && (
              <div className="message-bubble message-ai" style={{ backgroundColor: '#ffeded', borderLeft: '3px solid #d32f2f' }}>
                <p><strong>Error:</strong> {error}</p>
                <div className="message-timestamp">
                  {new Date().toLocaleTimeString()}
                </div>
              </div>
            )}
          </div>
          {/* Resize handle */}
          <div 
            className="resize-handle" 
            onMouseDown={handleMouseDown}
            onTouchStart={handleTouchStart}
            title="Drag to resize chat area"
          ></div>
        </div>
        
        <div className="chat-input-area">
          <Card>
            <Box padding="16px">
              <div className="query-input">
                <TextAreaField
                  label="What would you like to know about this data?"
                  value={query}
                  onChange={handleQueryChange}
                  onKeyDown={handleKeyDown}
                  placeholder="Type your message here..."
                  rows={3}
                />
                
                <div className="query-button-container">
                  <Button
                    primary
                    onClick={handleQuerySubmit}
                    disabled={isLoading || !query.trim()}
                    icon={<span role="img" aria-label="send">📤</span>}
                  >
                    Send
                  </Button>
                </div>
              </div>
              
              <Box margin="16px 0 0 0">
                <p style={{ marginBottom: '8px', fontSize: '14px' }}>
                  Try one of these:
                </p>
                <div className="suggested-prompts">
                  {suggestedPrompts.map((prompt, index) => (
                    <div
                      key={index}
                      className="suggested-prompt"
                      onClick={() => handleSuggestedPromptClick(prompt)}
                    >
                      {prompt}
                    </div>
                  ))}
                </div>
              </Box>
            </Box>
          </Card>
        </div>
      </div>
    </div>
  )
}