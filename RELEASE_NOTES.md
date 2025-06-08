# DHIS2 AI Insights v1.1.0 Release Notes

We're excited to announce the release of DHIS2 AI Insights v1.1.0, which brings major UI/UX improvements and enhanced user experience for analyzing DHIS2 data with AI.

## 🚀 What's New in v1.1.0

### ✨ Major UI/UX Improvements
- **Fixed ReactMarkdown Crash**: Resolved the crash issue when rendering AI responses (addresses App Hub feedback)
- **Improved Chat Layout**: Multi-organization unit prompts no longer cover the chat window
- **Real-time Streaming**: AI responses now stream in real-time for better user experience
- **Persistent Chat History**: Conversation history now persists when navigating between tabs
- **Enhanced Visual Design**: Better spacing, typography, and DHIS2-compliant styling

### 🎨 User Experience Enhancements
- **Responsive Layout**: Chat window maintains optimal size and suggested prompts are properly organized
- **Visual Feedback**: Message counters and streaming indicators provide clear user feedback
- **Tab Navigation**: Seamless navigation between AI Insights, Data Dashboard, and Data Selection
- **Compact Prompts**: Suggested questions use a clean grid layout for better space utilization

### 🔧 Technical Improvements
- **State Management**: Lifted chat state to app level for better persistence
- **Streaming Support**: Added real-time text streaming for both OpenAI and Ollama
- **Error Handling**: Improved error recovery during streaming operations
- **Performance**: Better memory management and component lifecycle handling

---

# Previous Release: DHIS2 AI Insights v1.0.9

We're excited to announce the release of DHIS2 AI Insights v1.0.9, which brings significant improvements to how health professionals can analyze and derive insights from DHIS2 data.

## Release Highlights

### 🌐 Multi-LLM Support
This release introduces support for both cloud-based and local LLM providers:

- **OpenAI Integration**: Connect to OpenAI's powerful models using your API key
- **Ollama Support**: Run models locally for privacy, offline use, and lower costs
- **Proxy Solution**: For network-restricted environments, use our included proxy server

### ⏱️ Enhanced Performance & Reliability
- **Extended Timeouts**: Increased from 15s to 120s for complex analyses
- **Streaming Response Handling**: Better processing of AI responses
- **Fixed Period Handling**: Improved conversion of DHIS2 relative periods
- **Better Error Recovery**: More robust error handling throughout the application

### 📊 Data Analysis Improvements
- **Improved Data Fetching**: More reliable analytics API integration
- **Better Data Formatting**: Enhanced handling of different data structures
- **Visualization Enhancements**: Improved chart and table experiences

## Detailed Changes

### Backend & Data Integration

- **Analytics Integration**: Fixed the way relative periods (THIS_MONTH, LAST_MONTH, etc.) are converted to DHIS2 format
- **Error Handling**: Added comprehensive logging and better error recovery mechanisms
- **Proxy Development**: Created a dedicated proxy for Ollama in restricted network environments
- **Timeout Management**: Increased timeouts for complex AI operations

### User Interface & Experience

- **Chat Response Handling**: Improved parsing of streaming responses from Ollama
- **Data Visualization**: Enhanced charts and tables with better formatting
- **Settings Panel**: Added configuration options for multiple AI providers
- **Suggested Prompts**: Updated with more relevant suggestions for health data analysis

### Documentation & Deployment

- **Updated README**: Improved documentation with clearer use cases and setup instructions
- **Added CHANGELOG**: Tracking of changes between versions
- **Better Project Structure**: Reorganized for easier maintenance
- **License Addition**: Added BSD 3-Clause License

## Installation

1. Download the AI-Insights-v1.1.0-release.zip file
2. Log in to your DHIS2 instance as an administrator
3. Navigate to App Management
4. Click "Upload App" and select the downloaded ZIP file
5. The app will be available in the apps menu after installation

## Configuration

### For OpenAI

1. Go to Settings in the app
2. Select "OpenAI" as the AI provider
3. Enter your OpenAI API key
4. Choose preferred model (e.g., gpt-4, gpt-3.5-turbo)
5. Adjust max tokens and temperature as needed

### For Local LLM with Ollama

1. Install Ollama on your local machine following instructions at [ollama.ai](https://ollama.ai)
2. Pull your preferred model (e.g., `ollama pull llama3`)
3. Go to Settings in the app
4. Select "Ollama" as the AI provider
5. Enter the Ollama server URL (default: http://localhost:11434)
6. Choose your installed model

### For Network-Restricted Environments

If your DHIS2 instance can't directly connect to Ollama, use the included proxy:

1. Navigate to the `ollama-proxy` folder in the app directory
2. Run `npm install` (first time only)
3. Run `npm start` to start the proxy
4. Configure the app to use http://localhost:3000 as the Ollama server URL

## Feedback & Support

We welcome your feedback and suggestions for future improvements. Please report any issues on our [GitHub repository](https://github.com/jmesplana/dhis2_ai_insights/issues).

Thank you for using DHIS2 AI Insights!

*v1.1.0 Released: June 8, 2025*
*v1.0.9 Released: May 12, 2025*