import React, { useState, useEffect } from 'react'
import { 
  Card, 
  CircularLoader, 
  NoticeBox,
  Box,
  Divider,
  SingleSelectField,
  SingleSelectOption,
  TabBar,
  Tab
} from '@dhis2/ui'
import { Chart as ChartJS, registerables } from 'chart.js'
import { Bar, Line, Pie } from 'react-chartjs-2'
import { fetchDataForElements } from '../utils/dhis2Data'
import { formatValue, formatPeriod } from '../utils/formatters'

// Register ChartJS components
ChartJS.register(...registerables)

// Chart type options
const chartTypes = [
  { id: 'bar', name: 'Bar Chart' },
  { id: 'line', name: 'Line Chart' },
  { id: 'pie', name: 'Pie Chart' },
  { id: 'horizontalBar', name: 'Horizontal Bar' },
]

export const DataDashboard = ({ 
  engine, 
  selectedDataElements,
  selectedPeriod,
  selectedOrgUnit,
  selectedDataType = 'aggregate' 
}) => {
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState(null)
  const [chartData, setChartData] = useState(null)
  const [chartType, setChartType] = useState('bar')
  const [activeTab, setActiveTab] = useState('chart')
  const [tableData, setTableData] = useState([])
  const [sortConfig, setSortConfig] = useState({ key: null, direction: 'ascending' })

  useEffect(() => {
    const loadData = async () => {
      if (!selectedDataElements || selectedDataElements.length === 0 || !selectedOrgUnit) {
        return
      }

      try {
        setIsLoading(true)
        setError(null)

        console.log("DataDashboard - Loading data with:", {
          dataElements: selectedDataElements,
          dataElementsType: typeof selectedDataElements[0],
          dataElementsSample: selectedDataElements[0],
          period: selectedPeriod,
          orgUnit: selectedOrgUnit,
          dataType: selectedDataType
        });

        // Extract IDs if we received objects instead of string IDs
        let dataElementIds = selectedDataElements;

        // Check if we have objects with IDs and extract just the IDs for the API call
        if (typeof selectedDataElements[0] === 'object' && selectedDataElements[0] !== null) {
          if (selectedDataElements[0].id) {
            dataElementIds = selectedDataElements.map(de => de.id);
            console.log("Extracted IDs from objects:", dataElementIds);
          } else if (selectedDataElements[0].value) {
            dataElementIds = selectedDataElements.map(de => de.value);
            console.log("Extracted values from objects:", dataElementIds);
          }
        }

        // Fetch data from DHIS2
        const data = await fetchDataForElements(
          engine,
          dataElementIds, // Use the extracted IDs
          selectedPeriod,
          selectedOrgUnit,
          selectedDataType
        )

        console.log("Data fetched successfully, now processing for visualization");

        // Process the data for charts
        processDataForVisualization(data)
      } catch (err) {
        console.error("Error loading data in DataDashboard:", err);
        setError(`Error loading data: ${err.message}`)
      } finally {
        setIsLoading(false)
      }
    }

    loadData()
  }, [engine, selectedDataElements, selectedPeriod, selectedOrgUnit, selectedDataType])

  const processDataForVisualization = (data) => {
    console.log("Processing data for visualization:", data);

    if (!data) {
      setError('No data received from DHIS2');
      return;
    }

    if (!data.headers) {
      setError('Data is missing headers structure');
      return;
    }

    if (!data.rows || data.rows.length === 0) {
      setError('No data rows available for the selected criteria. Try selecting different data elements or a different time period.');
      return;
    }

    // Extract periods, data elements, and values
    const headers = data.headers
    const rows = data.rows
    const metaData = data.metaData || {}

    console.log("Data headers:", headers)
    console.log("Data metadata:", metaData)
    console.log("Selected data elements:", selectedDataElements)
    console.log("Selected period:", selectedPeriod)

    // Find the correct indices for data extraction
    const periodIndex = headers.findIndex(h => h.name === 'pe')
    const deIndex = headers.findIndex(h => h.name === 'dx')
    const ouIndex = headers.findIndex(h => h.name === 'ou')
    const valueIndex = headers.findIndex(h => h.name === 'value')

    console.log("Column indices:", {
      periodIndex,
      deIndex,
      ouIndex,
      valueIndex,
      headerNames: headers.map(h => h.name)
    });

    if (periodIndex === -1 || deIndex === -1 || ouIndex === -1 || valueIndex === -1) {
      console.error("Required data columns not found in analytics response", {
        periodIndex, deIndex, ouIndex, valueIndex,
        availableColumns: headers.map(h => h.name)
      })
      setError('Data structure from DHIS2 is not in the expected format. Missing required columns.');
      return;
    }
    
    // Create labels for chart (periods)
    let uniquePeriods = Array.from(new Set(rows.map(row => row[periodIndex])))
    
    // Sort periods chronologically if this is a "Last 12 Months" view
    if (selectedPeriod === 'LAST_12_MONTHS') {
      // Get one year ago as YYYYMM for filtering if needed
      const getOneYearAgoAsYYYYMM = () => {
        const now = new Date();
        now.setFullYear(now.getFullYear() - 1);
        return parseInt(`${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}`);
      };

      // Handle different period formats
      if (uniquePeriods.length > 0) {
        // Check if periods are date strings (e.g., "2023-07-01")
        if (uniquePeriods[0].includes('-')) {
          // Filter periods within the last 12 months
          const oneYearAgo = new Date();
          oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);

          // First filter to only include periods in the last 12 months
          uniquePeriods = uniquePeriods.filter(period => {
            const date = new Date(period);
            return !isNaN(date) && date >= oneYearAgo;
          });

          // Then sort chronologically
          uniquePeriods.sort((a, b) => new Date(a) - new Date(b));
        }
        // Handle YYYYMM format (e.g., "202308")
        else if (uniquePeriods[0].length === 6 && !isNaN(parseInt(uniquePeriods[0]))) {
          // One year ago in YYYYMM format for filtering
          const oneYearAgoYYYYMM = getOneYearAgoAsYYYYMM();

          // Filter periods within the last 12 months
          uniquePeriods = uniquePeriods.filter(period =>
            parseInt(period) >= oneYearAgoYYYYMM
          );

          // Sort chronologically
          uniquePeriods.sort((a, b) => parseInt(a) - parseInt(b));
        }
        // Fallback for other formats
        else {
          uniquePeriods.sort((a, b) => a.localeCompare(b));
        }
      }
    }
    
    const labels = uniquePeriods.map(periodId => {
      // Try to get period name from metadata
      return metaData.items && metaData.items[periodId] 
        ? metaData.items[periodId].name 
        : formatPeriodId(periodId)
    })
    
    // Helper function to format period IDs if metadata is not available
    const formatPeriodId = (periodId) => {
      // Simple formatter for common period formats
      if (periodId.length === 6) {
        // Format YYYYMM to YYYY-MM
        const year = periodId.substring(0, 4)
        const month = periodId.substring(4, 6)
        return `${year}-${month}`
      }
      return periodId
    }
    
    // Get unique data element IDs from rows
    const uniqueDataElements = Array.from(new Set(rows.map(row => row[deIndex])))
    
    // Process data for each data element
    const datasets = uniqueDataElements.map(deId => {
      // Get data element name from metadata or selected elements
      let deDisplayName = deId
      
      // Try to get from metadata first
      if (metaData.items && metaData.items[deId]) {
        deDisplayName = metaData.items[deId].name
      } 
      // Otherwise try to find in selected elements
      else {
        const dataElement = Array.isArray(selectedDataElements) && selectedDataElements.length > 0 && 
                            typeof selectedDataElements[0] === 'object'
          ? selectedDataElements.find(de => de.id === deId || de.value === deId)
          : null
          
        if (dataElement) {
          deDisplayName = dataElement.displayName || dataElement.label || deId
        }
      }
      
      // Create dataset for this data element
      const deRows = rows.filter(row => row[deIndex] === deId)
      
      // Map values to periods, filling with zeroes for missing periods
      const values = uniquePeriods.map(periodId => {
        const periodRow = deRows.find(row => row[periodIndex] === periodId)
        return periodRow ? parseFloat(periodRow[valueIndex]) || 0 : 0
      })
      
      return {
        label: deDisplayName,
        data: values,
        backgroundColor: getRandomColor(0.7),
        borderColor: getRandomColor(1),
        borderWidth: 1,
        fill: false,
      }
    })
    
    const chartConfig = {
      labels,
      datasets,
    }
    
    setChartData(chartConfig)
    
    // Process data for table view with proper metadata
    const tableRows = rows.map(row => {
      // Get display names from metadata
      const periodId = row[periodIndex]
      const deId = row[deIndex]
      const ouId = row[ouIndex]

      // Extract names from metadata
      let periodName = periodId
      let dataElementName = deId
      let orgUnitName = ouId

      // Period name from metadata
      if (metaData.items && metaData.items[periodId]) {
        periodName = metaData.items[periodId].name
      } else {
        periodName = formatPeriodId(periodId)
      }

      // Store original period ID for sorting purposes
      const originalPeriodId = periodId;

      // Data element name from metadata
      if (metaData.items && metaData.items[deId]) {
        dataElementName = metaData.items[deId].name
      } else {
        // Try to find in selected elements
        const dataElement = Array.isArray(selectedDataElements) && selectedDataElements.length > 0 &&
                            typeof selectedDataElements[0] === 'object'
          ? selectedDataElements.find(de => de.id === deId || de.value === deId)
          : null

        if (dataElement) {
          dataElementName = dataElement.displayName || dataElement.label || deId
        }
      }

      // Org unit name from metadata
      if (metaData.items && metaData.items[ouId]) {
        orgUnitName = metaData.items[ouId].name
      } else if (selectedOrgUnit) {
        orgUnitName = selectedOrgUnit.displayName || ouId
      }

      // Get value type for formatting if available
      let valueType = null
      const dataElement = Array.isArray(selectedDataElements) &&
                          selectedDataElements.length > 0 &&
                          typeof selectedDataElements[0] === 'object'
        ? selectedDataElements.find(de => de.id === deId || de.value === deId)
        : null

      if (dataElement && dataElement.valueType) {
        valueType = dataElement.valueType
      }

      return {
        period: periodName,
        originalPeriodId: originalPeriodId,  // Store original for sorting
        dataElement: dataElementName,
        orgUnit: orgUnitName,
        value: formatValue(row[valueIndex], valueType)
      }
    })

    // If this is Last 12 Months data, default to chronological sort
    let sortedTableRows = tableRows;
    if (selectedPeriod === 'LAST_12_MONTHS') {
      // First try to sort by the original period IDs (most reliable)
      sortedTableRows = tableRows.sort((a, b) => {
        // For YYYYMM format
        if (a.originalPeriodId.length === 6 && !isNaN(parseInt(a.originalPeriodId)) &&
            b.originalPeriodId.length === 6 && !isNaN(parseInt(b.originalPeriodId))) {
          return parseInt(a.originalPeriodId) - parseInt(b.originalPeriodId);
        }
        // For date strings
        else if (a.originalPeriodId.includes('-') && b.originalPeriodId.includes('-')) {
          const dateA = new Date(a.originalPeriodId);
          const dateB = new Date(b.originalPeriodId);
          if (!isNaN(dateA) && !isNaN(dateB)) {
            return dateA - dateB;
          }
        }

        // Fallback to string comparison of display names
        return a.period.localeCompare(b.period);
      });

      // Set default sort configuration to show we've sorted by period
      setSortConfig({ key: 'period', direction: 'ascending' });
    }

    setTableData(sortedTableRows)
  }

  const handleChartTypeChange = ({ selected }) => {
    setChartType(selected)
  }

  const getRandomColor = (opacity) => {
    const r = Math.floor(Math.random() * 255)
    const g = Math.floor(Math.random() * 255)
    const b = Math.floor(Math.random() * 255)
    return `rgba(${r}, ${g}, ${b}, ${opacity})`
  }
  
  // Sort data for table
  const getSortedData = () => {
    if (!sortConfig.key) {
      // If no explicit sort is set but we're in LAST_12_MONTHS view,
      // apply a default chronological sort by period
      if (selectedPeriod === 'LAST_12_MONTHS') {
        return [...tableData].sort((a, b) => {
          // Use the stored original period IDs for more reliable sorting
          if (a.originalPeriodId && b.originalPeriodId) {
            // For YYYYMM format
            if (a.originalPeriodId.length === 6 && !isNaN(parseInt(a.originalPeriodId)) &&
                b.originalPeriodId.length === 6 && !isNaN(parseInt(b.originalPeriodId))) {
              return parseInt(a.originalPeriodId) - parseInt(b.originalPeriodId);
            }
            // For date strings
            else if (a.originalPeriodId.includes('-') && b.originalPeriodId.includes('-')) {
              const dateA = new Date(a.originalPeriodId);
              const dateB = new Date(b.originalPeriodId);
              if (!isNaN(dateA) && !isNaN(dateB)) {
                return dateA - dateB;
              }
            }
          }

          // Fallback: Try to extract dates from display period strings
          const periodA = a.period;
          const periodB = b.period;

          // Check for YYYY-MM format
          if (periodA.includes('-') && periodB.includes('-')) {
            const dateA = new Date(periodA + "-01"); // Add day for full date
            const dateB = new Date(periodB + "-01");

            if (!isNaN(dateA) && !isNaN(dateB)) {
              return dateA - dateB;
            }
          }

          // Fall back to string comparison
          return periodA.localeCompare(periodB);
        });
      }

      return tableData;
    }

    return [...tableData].sort((a, b) => {
      // Special case for period sorting in LAST_12_MONTHS view
      if (sortConfig.key === 'period' && selectedPeriod === 'LAST_12_MONTHS') {
        // Use the stored original period IDs for more reliable sorting
        if (a.originalPeriodId && b.originalPeriodId) {
          // For YYYYMM format
          if (a.originalPeriodId.length === 6 && !isNaN(parseInt(a.originalPeriodId)) &&
              b.originalPeriodId.length === 6 && !isNaN(parseInt(b.originalPeriodId))) {
            const result = parseInt(a.originalPeriodId) - parseInt(b.originalPeriodId);
            return sortConfig.direction === 'ascending' ? result : -result;
          }
          // For date strings
          else if (a.originalPeriodId.includes('-') && b.originalPeriodId.includes('-')) {
            const dateA = new Date(a.originalPeriodId);
            const dateB = new Date(b.originalPeriodId);
            if (!isNaN(dateA) && !isNaN(dateB)) {
              return sortConfig.direction === 'ascending' ? dateA - dateB : dateB - dateA;
            }
          }
        }

        // Fallback: Try to extract dates from display period strings
        const periodA = a[sortConfig.key];
        const periodB = b[sortConfig.key];

        // Check for YYYY-MM format
        if (periodA.includes('-') && periodB.includes('-')) {
          const dateA = new Date(periodA + "-01"); // Add day for full date
          const dateB = new Date(periodB + "-01");

          if (!isNaN(dateA) && !isNaN(dateB)) {
            return sortConfig.direction === 'ascending' ? dateA - dateB : dateB - dateA;
          }
        }
      }

      // Handle numeric comparison for values
      if (sortConfig.key === 'value') {
        // Try to convert to numbers for comparison
        const valA = parseFloat(a[sortConfig.key].replace(/,/g, ''))
        const valB = parseFloat(b[sortConfig.key].replace(/,/g, ''))

        // If both are valid numbers, compare numerically
        if (!isNaN(valA) && !isNaN(valB)) {
          return sortConfig.direction === 'ascending' ? valA - valB : valB - valA
        }
      }

      // Default string comparison for non-numeric or fallback
      if (a[sortConfig.key] < b[sortConfig.key]) {
        return sortConfig.direction === 'ascending' ? -1 : 1
      }
      if (a[sortConfig.key] > b[sortConfig.key]) {
        return sortConfig.direction === 'ascending' ? 1 : -1
      }
      return 0
    })
  }
  
  // Handle table header click for sorting
  const handleSort = (key) => {
    let direction = 'ascending'
    if (sortConfig.key === key && sortConfig.direction === 'ascending') {
      direction = 'descending'
    }
    setSortConfig({ key, direction })
  }

  const renderChart = () => {
    if (!chartData) return null
    
    const options = {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          position: 'top',
        },
        title: {
          display: true,
          text: 'Data Visualization',
        },
      },
    }
    
    switch (chartType) {
      case 'bar':
        return <Bar data={chartData} options={options} />
      case 'line':
        return <Line data={chartData} options={options} />
      case 'pie':
        // Adapt data for pie chart (use only first data element)
        const pieData = {
          ...chartData,
          datasets: [{
            ...chartData.datasets[0],
            backgroundColor: chartData.labels.map(() => getRandomColor(0.7)),
          }]
        }
        return <Pie data={pieData} options={options} />
      case 'horizontalBar':
        const horizontalOptions = {
          ...options,
          indexAxis: 'y',
        }
        return <Bar data={chartData} options={horizontalOptions} />
      default:
        return <Bar data={chartData} options={options} />
    }
  }

  const renderTable = () => {
    if (tableData.length === 0) return null
    
    // Get the sorted data
    const sortedData = getSortedData()
    
    // Define sort indicator styles
    const getSortIndicator = (key) => {
      if (sortConfig.key !== key) return "↕️"
      return sortConfig.direction === 'ascending' ? "↑" : "↓" 
    }
    
    // Make the table header style clickable
    const sortableHeaderStyle = {
      ...tableHeaderStyle,
      cursor: 'pointer',
      userSelect: 'none',
      position: 'relative',
    }
    
    return (
      <table style={{ width: '100%', borderCollapse: 'collapse' }}>
        <thead>
          <tr>
            <th 
              style={sortableHeaderStyle} 
              onClick={() => handleSort('period')}
            >
              Period {getSortIndicator('period')}
            </th>
            <th 
              style={sortableHeaderStyle}
              onClick={() => handleSort('dataElement')}
            >
              Data Element {getSortIndicator('dataElement')}
            </th>
            <th 
              style={sortableHeaderStyle}
              onClick={() => handleSort('orgUnit')}
            >
              Organization Unit {getSortIndicator('orgUnit')}
            </th>
            <th 
              style={sortableHeaderStyle}
              onClick={() => handleSort('value')}
            >
              Value {getSortIndicator('value')}
            </th>
          </tr>
        </thead>
        <tbody>
          {sortedData.map((row, index) => (
            <tr key={index} style={{ backgroundColor: index % 2 === 0 ? '#f8f8f8' : 'white' }}>
              <td style={tableCellStyle}>{row.period}</td>
              <td style={tableCellStyle}>{row.dataElement}</td>
              <td style={tableCellStyle}>{row.orgUnit}</td>
              <td style={tableCellStyle}>{row.value}</td>
            </tr>
          ))}
        </tbody>
      </table>
    )
  }

  const tableHeaderStyle = {
    padding: '12px 8px',
    borderBottom: '2px solid #ddd',
    textAlign: 'left',
  }
  
  const tableCellStyle = {
    padding: '8px',
    borderBottom: '1px solid #ddd',
  }

  return (
    <div className="visualization-container">
      <Card>
        <Box padding="16px">
          <h3>Data Dashboard</h3>
          
          {selectedDataElements.length === 0 || !selectedOrgUnit ? (
            <NoticeBox title="No data selected">
              Please select data elements and an organization unit to view the dashboard
            </NoticeBox>
          ) : isLoading ? (
            <Box margin="24px 0" display="flex" justifyContent="center">
              <CircularLoader />
              <p style={{ marginLeft: '8px' }}>Loading data...</p>
            </Box>
          ) : error ? (
            <NoticeBox error title="Error">
              {error}
            </NoticeBox>
          ) : (
            <>
              <Box margin="0 0 16px 0">
                <TabBar>
                  <Tab 
                    selected={activeTab === 'chart'} 
                    onClick={() => setActiveTab('chart')}
                  >
                    Chart View
                  </Tab>
                  <Tab 
                    selected={activeTab === 'table'} 
                    onClick={() => setActiveTab('table')}
                  >
                    Table View
                  </Tab>
                </TabBar>
              </Box>
              
              {activeTab === 'chart' ? (
                <>
                  <Box margin="0 0 16px 0">
                    <SingleSelectField
                      label="Chart Type"
                      selected={chartType}
                      onChange={handleChartTypeChange}
                    >
                      {chartTypes.map(type => (
                        <SingleSelectOption
                          key={type.id}
                          value={type.id}
                          label={type.name}
                        />
                      ))}
                    </SingleSelectField>
                  </Box>
                  
                  <div className="chart-container">
                    {renderChart()}
                  </div>
                </>
              ) : (
                <Box margin="16px 0">
                  {renderTable()}
                </Box>
              )}
            </>
          )}
        </Box>
      </Card>
    </div>
  )
}