import React from 'react'
import ReactDOM from 'react-dom'
import { DataProvider } from '@dhis2/app-runtime'
import App from './App.jsx'

import './index.css'

const appConfig = {
  baseUrl: process.env.REACT_APP_DHIS2_BASE_URL || '../../../',
  apiVersion: process.env.REACT_APP_DHIS2_API_VERSION || '38',
}

ReactDOM.render(
  <React.StrictMode>
    <DataProvider config={appConfig}>
      <App />
    </DataProvider>
  </React.StrictMode>,
  document.getElementById('root')
)