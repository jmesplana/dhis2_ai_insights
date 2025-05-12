/**
 * Utility functions for handling DHIS2 data
 */

/**
 * Fetch data for selected data elements, indicators, or program indicators
 * @param {Object} engine - DHIS2 data engine
 * @param {Array} dataElements - Selected data elements, indicators, or program indicators
 * @param {string} period - Selected period
 * @param {Object} orgUnit - Selected organization unit
 * @param {string} dataType - Type of data (aggregate, indicator, programIndicator, event, tracker)
 * @returns {Object} Fetched data with headers and rows
 */
export const fetchDataForElements = async (engine, dataElements, period, orgUnit, dataType = 'aggregate') => {
    console.log("fetchDataForElements received:", {
      dataElements: JSON.stringify(dataElements),
      period,
      orgUnit: JSON.stringify(orgUnit),
      dataType,
      dataElementsType: Array.isArray(dataElements) ? 'array' : typeof dataElements,
      periodType: typeof period,
      orgUnitType: typeof orgUnit
    });

    // More detailed validation
    if (!dataElements) {
      throw new Error('Missing required parameter: dataElements');
    }

    if (!Array.isArray(dataElements)) {
      throw new Error('dataElements must be an array');
    }

    if (dataElements.length === 0) {
      throw new Error('At least one data element is required');
    }

    if (!period) {
      throw new Error('Missing required parameter: period');
    }

    if (!orgUnit) {
      throw new Error('Missing required parameter: orgUnit');
    }

    if (!orgUnit.id) {
      throw new Error('orgUnit must have an id property');
    }

    try {
      // Convert relative period to actual period if needed
      const periodValue = getActualPeriod(period)

      // Get data element IDs, handling different formats of the dataElements parameter
      let deIds;

      if (Array.isArray(dataElements) && dataElements.length > 0) {
        // Enhanced logging to help debug data element formats
        console.log("Data elements format check:", {
          isObject: typeof dataElements[0] === 'object',
          hasId: dataElements[0] && dataElements[0].id ? true : false,
          hasValue: dataElements[0] && dataElements[0].value ? true : false,
          firstElement: dataElements[0],
        });

        // If it's just an array of IDs (strings)
        if (typeof dataElements[0] === 'string') {
          deIds = dataElements.join(';');
          console.log("Using string array format:", deIds);
        }
        // If it's an array of objects with an id property
        else if (dataElements[0] && dataElements[0].id) {
          deIds = dataElements.map(de => de.id).join(';');
          console.log("Using objects with id property format:", deIds);
        }
        // If it's an array of objects with a value property (from the Transfer component)
        else if (dataElements[0] && dataElements[0].value) {
          deIds = dataElements.map(de => de.value).join(';');
          console.log("Using objects with value property format:", deIds);
        }
        else {
          console.error("Unexpected dataElements format:", dataElements);

          // Last resort attempt - if the object has any property that could be an ID
          const possibleIds = dataElements.map(de => {
            // Look for common ID properties
            return de.id || de.value || de.dataElementId || de;
          }).filter(id => id);

          if (possibleIds.length > 0) {
            deIds = possibleIds.join(';');
            console.log("Using extracted possible IDs as fallback:", deIds);
          } else {
            throw new Error('Invalid data elements format');
          }
        }

        // Additional validation to make sure we have valid dimension values
        if (!deIds || deIds.trim() === '' || deIds === ';') {
          throw new Error('Empty data element IDs. Please select at least one valid item.');
        }
      } else {
        throw new Error('Data elements must be a non-empty array');
      }
      
      // The analytics endpoint works for all types: data elements, indicators, and program indicators
      // Handle special organization units
      let ouDimension;
      if (orgUnit.isSpecial) {
        ouDimension = orgUnit.id; // USER_ORGUNIT, USER_ORGUNIT_CHILDREN, or USER_ORGUNIT_GRANDCHILDREN
      } else {
        ouDimension = orgUnit.id;
      }
      
      const query = {
        results: {
          resource: 'analytics',
          params: {
            dimension: [
              `dx:${deIds}`,
              `pe:${periodValue}`,
              `ou:${ouDimension}`
            ],
            skipMeta: false,
            includeNumDen: true  // Include numerator and denominator for indicators
          }
        }
      }
      
      // Log the query details for debugging
      console.log("Executing DHIS2 Analytics query:", JSON.stringify(query, null, 2));

      // Execute the query
      const response = await engine.query(query)

      // Process the response
      const { headers, metaData, rows } = response.results

      // More detailed logging of the response
      console.log("DHIS2 Analytics response:", {
        hasHeaders: !!headers,
        headerCount: headers ? headers.length : 0,
        hasMetaData: !!metaData,
        hasRows: !!rows,
        rowCount: rows ? rows.length : 0
      });

      if (headers) {
        console.log("Data headers:", headers.map(h => h.name));
      }

      if (rows && rows.length > 0) {
        console.log("First row sample:", rows[0]);
      }

      // Check if there's actual data
      const hasData = rows && rows.length > 0

      // Log data information
      console.log(`Data received from DHIS2: ${hasData ? rows.length + ' rows' : 'No data'}`)
      
      // Transform data for easier consumption
      const processedData = {
        headers: headers.map(h => ({
          name: h.name,
          column: h.column,
          valueType: h.valueType
        })),
        metaData,
        rows: rows || [],
        hasData: hasData,
        dataElements: dataElements,
        dataType: dataType,
        summary: calculateSummary(headers, rows || [], metaData)
      }
      
      return processedData
    } catch (error) {
      console.error('Error fetching data from DHIS2:', error)
      throw new Error(`Failed to fetch data: ${error.message || 'Unknown error'}`)
    }
  }
  
  /**
   * Fetch tracker data for a program
   * @param {Object} engine - DHIS2 data engine
   * @param {string} programId - Program ID
   * @param {string} period - Period
   * @param {Object} orgUnit - Organization unit
   * @returns {Object} Tracker data
   */
  export const fetchTrackerData = async (engine, programId, period, orgUnit) => {
    if (!programId || !period || !orgUnit) {
      throw new Error('Missing required parameters')
    }
    
    try {
      // Get date range for period
      const { startDate, endDate } = getPeriodDateRange(period)
      
      // Handle special organization units for tracker data
      let ouParam;
      if (orgUnit.isSpecial) {
        ouParam = `${orgUnit.id}`; // USER_ORGUNIT, USER_ORGUNIT_CHILDREN, or USER_ORGUNIT_GRANDCHILDREN
      } else {
        ouParam = orgUnit.id;
      }
      
      // Create query for tracker data
      const query = {
        trackedEntityInstances: {
          resource: 'trackedEntityInstances',
          params: {
            program: programId,
            ou: ouParam,
            programStartDate: startDate,
            programEndDate: endDate,
            fields: '*',
            pageSize: 1000
          }
        }
      }
      
      // Execute the query
      const response = await engine.query(query)
      
      return response.trackedEntityInstances
    } catch (error) {
      console.error('Error fetching tracker data:', error)
      throw new Error(`Failed to fetch tracker data: ${error.message || 'Unknown error'}`)
    }
  }
  
  /**
   * Fetch event data for a program
   * @param {Object} engine - DHIS2 data engine
   * @param {string} programId - Program ID
   * @param {string} period - Period
   * @param {Object} orgUnit - Organization unit
   * @returns {Object} Event data
   */
  export const fetchEventData = async (engine, programId, period, orgUnit) => {
    if (!programId || !period || !orgUnit) {
      throw new Error('Missing required parameters')
    }
    
    try {
      // Get date range for period
      const { startDate, endDate } = getPeriodDateRange(period)
      
      // Handle special organization units for event data
      let ouParam;
      if (orgUnit.isSpecial) {
        ouParam = `${orgUnit.id}`; // USER_ORGUNIT, USER_ORGUNIT_CHILDREN, or USER_ORGUNIT_GRANDCHILDREN
      } else {
        ouParam = orgUnit.id;
      }
      
      // Create query for events
      const query = {
        events: {
          resource: 'events',
          params: {
            program: programId,
            orgUnit: ouParam,
            startDate,
            endDate,
            fields: '*',
            pageSize: 1000
          }
        }
      }
      
      // Execute the query
      const response = await engine.query(query)
      
      return response.events
    } catch (error) {
      console.error('Error fetching event data:', error)
      throw new Error(`Failed to fetch event data: ${error.message || 'Unknown error'}`)
    }
  }
  
  /**
   * Get actual period value from relative period
   * @param {string} relativePeriod - Relative period (e.g., 'THIS_MONTH')
   * @returns {string} Actual period value (e.g., '202405')
   */
  const getActualPeriod = (relativePeriod) => {
    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth() + 1; // JavaScript months are 0-based
    const lastYear = currentYear - 1;

    console.log("Converting relative period", relativePeriod);

    // Function to format period properly
    const formatYearMonth = (year, month) => {
      return `${year}${String(month).padStart(2, '0')}`;
    };

    // Convert relative periods to actual DHIS2 period values
    switch(relativePeriod) {
      case 'THIS_MONTH':
        return formatYearMonth(currentYear, currentMonth);

      case 'LAST_MONTH':
        // Handle December of last year
        if (currentMonth === 1) {
          return formatYearMonth(lastYear, 12);
        }
        return formatYearMonth(currentYear, currentMonth - 1);

      case 'THIS_YEAR':
        return `${currentYear}`;

      case 'LAST_YEAR':
        return `${lastYear}`;

      case 'LAST_12_MONTHS':
        // For LAST_12_MONTHS, we need to return multiple periods
        const periods = [];
        let year = currentYear;
        let month = currentMonth;

        // Generate 12 months of periods
        for (let i = 0; i < 12; i++) {
          periods.push(formatYearMonth(year, month));

          // Move back one month
          month--;
          if (month === 0) {
            month = 12;
            year--;
          }
        }

        return periods.join(';');

      case 'THIS_QUARTER':
        const thisQuarter = Math.floor((currentMonth - 1) / 3) + 1;
        return `${currentYear}Q${thisQuarter}`;

      case 'LAST_QUARTER':
        let lastQuarterYear = currentYear;
        let lastQuarter = Math.floor((currentMonth - 1) / 3);

        if (lastQuarter === 0) {
          lastQuarter = 4;
          lastQuarterYear = lastYear;
        }

        return `${lastQuarterYear}Q${lastQuarter}`;

      default:
        console.warn(`Unknown relative period: ${relativePeriod}, using as-is`);
        return relativePeriod;
    }
  }
  
  /**
   * Get date range for a period
   * @param {string} period - Period identifier
   * @returns {Object} Object with startDate and endDate
   */
  const getPeriodDateRange = (period) => {
    const now = new Date()
    let startDate, endDate
    
    switch (period) {
      case 'THIS_MONTH':
        startDate = new Date(now.getFullYear(), now.getMonth(), 1)
        endDate = new Date(now.getFullYear(), now.getMonth() + 1, 0)
        break
      case 'LAST_MONTH':
        startDate = new Date(now.getFullYear(), now.getMonth() - 1, 1)
        endDate = new Date(now.getFullYear(), now.getMonth(), 0)
        break
      case 'THIS_QUARTER':
        const quarterMonth = Math.floor(now.getMonth() / 3) * 3
        startDate = new Date(now.getFullYear(), quarterMonth, 1)
        endDate = new Date(now.getFullYear(), quarterMonth + 3, 0)
        break
      case 'LAST_QUARTER':
        const lastQuarterMonth = Math.floor((now.getMonth() - 3) / 3) * 3
        startDate = new Date(now.getFullYear(), lastQuarterMonth, 1)
        endDate = new Date(now.getFullYear(), lastQuarterMonth + 3, 0)
        break
      case 'THIS_YEAR':
        startDate = new Date(now.getFullYear(), 0, 1)
        endDate = new Date(now.getFullYear(), 11, 31)
        break
      case 'LAST_YEAR':
        startDate = new Date(now.getFullYear() - 1, 0, 1)
        endDate = new Date(now.getFullYear() - 1, 11, 31)
        break
      case 'LAST_12_MONTHS':
        startDate = new Date(now.getFullYear(), now.getMonth() - 11, 1)
        endDate = new Date(now.getFullYear(), now.getMonth() + 1, 0)
        break
      default:
        // Default to current month
        startDate = new Date(now.getFullYear(), now.getMonth(), 1)
        endDate = new Date(now.getFullYear(), now.getMonth() + 1, 0)
    }
    
    // Format dates as YYYY-MM-DD
    const formatDate = (date) => {
      return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
    }
    
    return {
      startDate: formatDate(startDate),
      endDate: formatDate(endDate)
    }
  }
  
  /**
   * Calculate summary statistics for data
   * @param {Array} headers - Data headers
   * @param {Array} rows - Data rows
   * @param {Object} metaData - Metadata from response
   * @returns {Object} Summary statistics
   */
  const calculateSummary = (headers, rows, metaData) => {
    if (!rows || rows.length === 0) {
      return {}
    }
    
    // Find the value column index
    const valueIndex = headers.findIndex(h => h.name === 'value')
    const deIndex = headers.findIndex(h => h.name === 'dx')
    
    if (valueIndex === -1) {
      return {}
    }
    
    // Group by data element
    const dataByElement = {}
    
    rows.forEach(row => {
      const deId = row[deIndex]
      if (!dataByElement[deId]) {
        dataByElement[deId] = []
      }
      
      // Convert to number
      const value = parseFloat(row[valueIndex])
      if (!isNaN(value)) {
        dataByElement[deId].push(value)
      }
    })
    
    // Calculate statistics for each data element
    const summary = {}
    
    Object.entries(dataByElement).forEach(([deId, values]) => {
      if (values.length === 0) return
      
      // Get a readable name for the data element
      let deName = deId;
      if (metaData && metaData.items && metaData.items[deId]) {
        deName = metaData.items[deId].name || deId;
      }
      
      // Calculate mean
      const sum = values.reduce((acc, val) => acc + val, 0)
      const mean = sum / values.length
      
      // Calculate min and max
      const min = Math.min(...values)
      const max = Math.max(...values)
      
      // Calculate median
      const sortedValues = [...values].sort((a, b) => a - b)
      const middle = Math.floor(sortedValues.length / 2)
      const median = sortedValues.length % 2 === 0
        ? (sortedValues[middle - 1] + sortedValues[middle]) / 2
        : sortedValues[middle]
      
      summary[deName] = {
        count: values.length,
        min,
        max,
        mean: mean.toFixed(2),
        median: median.toFixed(2),
        sum: sum.toFixed(2)
      }
    })
    
    return summary
  }