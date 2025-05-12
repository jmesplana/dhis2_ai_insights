# DHIS2 AI Insights

DHIS2 AI Insights transforms how health professionals interact with DHIS2 data by leveraging artificial intelligence to provide meaningful analysis, identify patterns, and generate actionable insights — all through a simple, intuitive interface.

## Overview

This application connects directly to your DHIS2 instance and uses AI to help you understand your health data better. Instead of spending hours analyzing spreadsheets or creating complex visualizations, you can simply ask questions in plain language and get data-driven responses based on your selected indicators.

## Key Features

### 🤖 AI-Powered Analysis
- Ask questions about your data in natural language
- Receive insights based on the selected data elements and indicators
- Get contextual recommendations for health interventions

### 📊 Interactive Data Visualization
- View your data in customizable charts and graphs
- Toggle between different visualization types (bar, line, pie charts)
- Compare data across different periods with tabular views

### 📝 Report Generation
- Export AI responses as HTML reports
- Create summaries for stakeholders and team members
- Document insights for presentations or meetings

### 🌐 Flexible AI Providers
- Use OpenAI's models with your API key
- Deploy locally with Ollama for offline use and data privacy
- Configure models to suit your needs and infrastructure

## Use Cases

### Health Program Monitoring
- "What's the vaccination coverage trend for the selected period?"
- "Analyze these maternal health indicators and suggest focus areas"
- "Summarize the key observations from this nutrition data"

### Data Interpretation
- "Explain the patterns in this indicator data"
- "What insights can you provide about these health metrics?"
- "Generate a summary of the selected data elements"

### Report Preparation
- "Create a summary of these findings for my stakeholders"
- "Help me interpret these numbers for a quarterly report"
- "What are the key points I should highlight from this data?"

## Getting Started

This project was bootstrapped with [DHIS2 Application Platform](https://github.com/dhis2/app-platform).

### Prerequisites
- A running DHIS2 instance (v2.35 or later)
- For OpenAI: An internet connection and OpenAI API key
- For local models: Ollama installed with your preferred models

## Installation Options

### From Built Package:
1. Download the `.zip` file from the build/bundle directory
2. Log in to your DHIS2 instance as an administrator
3. Go to App Management
4. Click "Upload App" and select the downloaded zip file

### Development Setup:
1. Clone the repository
2. Run `yarn install` to install dependencies
3. Configure your DHIS2 server in `.env.development`
4. Run `yarn start` for development mode

## Available Scripts

In the project directory, you can run:

### `yarn start`

Runs the app in the development mode.<br />
Open [http://localhost:3000](http://localhost:3000) to view it in the browser.

### `yarn test`

Launches the test runner and runs all available tests found in `/src`.<br />

### `yarn build`

Builds the app for production to the `build` folder.<br />
A deployable `.zip` file can be found in `build/bundle`!

### `yarn deploy`

Deploys the built app in the `build` folder to a running DHIS2 instance.<br />
You must run `yarn build` before running `yarn deploy`.

## How to Use DHIS2 AI Insights

### Initial Setup

1. After installation, open the app from your DHIS2 dashboard
2. Navigate to the Settings panel by clicking the "Settings" button
3. Choose your AI provider:
   - **OpenAI**: Enter your API key and select model
   - **Ollama**: Configure server URL and select installed model
4. Save your settings

### Data Selection

1. Go to the "Data Selection" tab
2. Follow the step-by-step process:
   - Select an organization unit (individual facility, user org unit, or hierarchy)
   - Choose a data type (aggregate, indicator, or program indicator)
   - Select specific data elements to analyze
3. Select a time period for analysis (e.g., last month, this quarter, etc.)
4. Click "Analyze Data with AI" to proceed to the insights

### Getting AI Insights

1. In the AI Insights tab, you'll see a chat interface
2. Type your question or select from suggested prompts
3. Click "Send" to submit your query
4. The AI will analyze your data and provide insights
5. You can ask follow-up questions to dig deeper

### Using the Dashboard

1. Switch to the "Data Dashboard" tab to view visualizations
2. Choose from different chart types (bar, line, pie, etc.)
3. Toggle between chart and table views
4. Visualizations automatically update based on your selected data

### Using Ollama (Local Models)

If you're using Ollama for local AI processing:

1. Install Ollama on your computer (from [ollama.ai](https://ollama.ai))
2. Pull a model (e.g., `ollama pull llama3`)
3. Run Ollama locally (`ollama serve`)
4. If running on the same machine as DHIS2, use http://localhost:11434 as server URL
5. For network-restricted environments, use the included proxy:
   ```
   cd ollama-proxy
   npm install
   npm start
   ```
   Then configure the app to use http://localhost:3000 as server URL

### Best Practices for AI Queries

- Be specific about what data aspects you want insights on
- Keep questions focused on the selected data elements
- Ask for specific recommendations when needed
- Try different questions to explore your data from multiple angles

### Example Queries

- "What are the main trends in this data?"
- "Compare the values between different periods"
- "Summarize this data for a management report"
- "What factors might explain the observed patterns?"
- "What actions should we consider based on these indicators?"

### Adjusting the Chat Window

- The chat window can be resized by dragging the bottom edge
- Drag up or down to resize the chat area to your preference
- The window will maintain your preferred size during your session

## Learn More

- [DHIS2 Application Platform Documentation](https://platform.dhis2.nu/)
- [DHIS2 Application Runtime Documentation](https://runtime.dhis2.nu/)
- [React documentation](https://reactjs.org/)

## Credits

Developed by John Mark Esplana