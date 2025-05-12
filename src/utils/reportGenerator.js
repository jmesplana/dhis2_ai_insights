/**
 * Utility functions for generating reports from AI responses
 */
import { saveAs } from 'file-saver';

/**
 * Generate a report as HTML and download it
 * @param {Object} message - The message object containing content and other metadata
 * @param {Object} context - Context information (data elements, org unit, etc.)
 * @returns {Promise} Promise that resolves when document is saved
 */
export const generateWordReport = async (message, context = {}) => {
  try {
    // Ensure we have a valid message object with content
    if (!message || typeof message !== 'object') {
      throw new Error('Invalid message object');
    }
    
    // Set default content if missing
    const content = message.content || 'No content available';
    
    const now = new Date();
    const formattedDate = now.toLocaleDateString();
    const formattedTime = now.toLocaleTimeString();
    
    // Create HTML report content
    const htmlContent = `
      <!DOCTYPE html>
      <html lang="en">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>DHIS2 AI Insights Report</title>
        <style>
          body {
            font-family: Arial, sans-serif;
            line-height: 1.6;
            color: #333;
            max-width: 800px;
            margin: 0 auto;
            padding: 20px;
          }
          header {
            text-align: center;
            margin-bottom: 30px;
            padding-bottom: 10px;
            border-bottom: 1px solid #ddd;
          }
          h1 {
            color: #2c6693;
            margin-top: 0;
          }
          h2 {
            color: #2c6693;
            margin-top: 30px;
            padding-bottom: 5px;
            border-bottom: 1px solid #eee;
          }
          h3 {
            color: #2c6693;
            margin-top: 20px;
          }
          table {
            width: 100%;
            border-collapse: collapse;
            margin: 20px 0;
          }
          th, td {
            padding: 10px;
            border: 1px solid #ddd;
            text-align: left;
          }
          th {
            background-color: #f2f2f2;
            font-weight: bold;
          }
          .timestamp {
            text-align: right;
            font-style: italic;
            color: #666;
            margin-top: 40px;
          }
          pre {
            background-color: #f5f5f5;
            padding: 10px;
            border-radius: 5px;
            overflow-x: auto;
          }
          code {
            font-family: monospace;
            background-color: #f5f5f5;
            padding: 2px 4px;
            border-radius: 3px;
          }
          pre code {
            padding: 0;
            background-color: transparent;
          }
          ul, ol {
            margin-left: 20px;
            padding-left: 20px;
          }
          ul li, ol li {
            margin-bottom: 5px;
          }
          .content {
            margin: 20px 0;
          }
          strong {
            font-weight: bold;
          }
          em {
            font-style: italic;
          }
          hr {
            border: 0;
            height: 1px;
            background: #ddd;
            margin: 20px 0;
          }
          a {
            color: #2c6693;
            text-decoration: none;
          }
          a:hover {
            text-decoration: underline;
          }
          .print-button {
            display: block;
            margin: 30px auto;
            padding: 10px 20px;
            background-color: #2c6693;
            color: white;
            border: none;
            border-radius: 4px;
            cursor: pointer;
            font-size: 16px;
          }
          .print-button:hover {
            background-color: #1e4b6d;
          }
          @media print {
            body {
              padding: 0;
              margin: 0;
            }
            .no-print {
              display: none;
            }
          }
        </style>
      </head>
      <body>
        <header>
          <h1>DHIS2 AI Insights Report</h1>
        </header>
        
        <section>
          <h2>Report Context</h2>
          <table>
            <tr>
              <th>Property</th>
              <th>Value</th>
            </tr>
            ${context.orgUnit ? `
            <tr>
              <td>Organization Unit</td>
              <td>${context.orgUnit.displayName || 'Not specified'}</td>
            </tr>` : ''}
            ${context.period ? `
            <tr>
              <td>Period</td>
              <td>${formatPeriod(context.period) || context.period || 'Not specified'}</td>
            </tr>` : ''}
            ${context.dataElements ? `
            <tr>
              <td>Data Elements</td>
              <td>${Array.isArray(context.dataElements) ? context.dataElements.length : 0} element(s) selected</td>
            </tr>` : ''}
            ${context.user ? `
            <tr>
              <td>Generated By</td>
              <td>${context.user.name || context.user.username || 'Unknown user'}</td>
            </tr>` : ''}
            <tr>
              <td>Generation Date</td>
              <td>${formattedDate} at ${formattedTime}</td>
            </tr>
          </table>
        </section>
        
        <section>
          <h2>Analysis Results</h2>
          <div class="content">
            ${formatMarkdownForHtml(content)}
          </div>
        </section>
        
        <div class="timestamp">
          Generated on: ${formattedDate} at ${formattedTime}
        </div>
        
        <div class="no-print">
          <button class="print-button" onclick="window.print()">Print or Save as PDF</button>
        </div>
      </body>
      </html>
    `;
    
    // Create a Blob with the HTML content
    const blob = new Blob([htmlContent], { type: 'text/html' });
    
    // Save file
    saveAs(blob, `DHIS2_AI_Insights_Report_${formatDateForFilename(now)}.html`);

    return true;
  } catch (err) {
    console.error("Error generating report:", err);
    throw new Error("Failed to generate report: " + err.message);
  }
};

/**
 * Format markdown content to HTML
 * @param {string} markdown - The markdown text to format
 * @returns {string} HTML formatted content
 */
const formatMarkdownForHtml = (markdown) => {
  try {
    if (!markdown) return "No content available";
    
    // Process inline formatting first
    let processedMarkdown = markdown
      // Handle inline code
      .replace(/`([^`]+)`/g, '<code>$1</code>')
      
      // Handle bold
      .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
      .replace(/__([^_]+)__/g, '<strong>$1</strong>')
      
      // Handle italic
      .replace(/\*([^*]+)\*/g, '<em>$1</em>')
      .replace(/_([^_]+)_/g, '<em>$1</em>')
      
      // Handle links
      .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank">$1</a>');
    
    // Basic markdown to HTML conversion
    let html = processedMarkdown
      // Handle code blocks (multiline)
      .replace(/```([\s\S]*?)```/g, '<pre><code>$1</code></pre>')
      
      // Handle headers
      .replace(/^# (.*$)/gm, '<h1>$1</h1>')
      .replace(/^## (.*$)/gm, '<h2>$1</h2>')
      .replace(/^### (.*$)/gm, '<h3>$1</h3>')
      
      // Handle lists (unordered)
      .replace(/^\* (.*$)/gm, '<li>$1</li>')
      .replace(/^- (.*$)/gm, '<li>$1</li>')
      
      // Handle lists (ordered)
      .replace(/^(\d+)\. (.*$)/gm, '<li>$2</li>')
      
      // Handle horizontal rule
      .replace(/^---+$/gm, '<hr/>')
      
      // Handle paragraphs
      .replace(/\n\n/g, '</p><p>')
      
      // Handle line breaks
      .replace(/\n/g, '<br>');
    
    // Wrap in paragraphs if not already wrapped
    if (!html.startsWith('<h') && !html.startsWith('<p>')) {
      html = '<p>' + html + '</p>';
    }
    
    // Replace consecutive list items with proper list tags
    html = html
      // Unordered lists
      .replace(/(<li>.*?<\/li>)(\s*<li>.*?<\/li>)+/g, match => {
        return '<ul>' + match + '</ul>';
      })
      // Ordered lists
      .replace(/(<li>.*?<\/li>)(\s*<li>.*?<\/li>)+/g, match => {
        if (match.includes('<ol>')) return match; // Skip if already wrapped
        return '<ol>' + match + '</ol>';
      });
    
    return html;
  } catch (error) {
    console.error("Error formatting markdown:", error);
    return `<p>Error formatting content: ${error.message}</p>`;
  }
};

/**
 * Format a date for filename (YYYY-MM-DD_HH-MM-SS)
 * @param {Date} date - Date to format
 * @returns {string} Formatted date string
 */
const formatDateForFilename = (date) => {
  const pad = (num) => (num < 10 ? "0" + num : num);
  
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}_${pad(date.getHours())}-${pad(date.getMinutes())}-${pad(date.getSeconds())}`;
};

/**
 * Format a period identifier for display
 * @param {string} period - Period identifier (e.g., 'THIS_MONTH')
 * @returns {string} Human-readable period
 */
const formatPeriod = (period) => {
  const periodMap = {
    'THIS_MONTH': 'This Month',
    'LAST_MONTH': 'Last Month', 
    'THIS_QUARTER': 'This Quarter',
    'LAST_QUARTER': 'Last Quarter',
    'THIS_YEAR': 'This Year',
    'LAST_YEAR': 'Last Year',
    'LAST_12_MONTHS': 'Last 12 Months'
  };
  
  return periodMap[period] || period;
};