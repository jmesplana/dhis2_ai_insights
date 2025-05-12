const config = {
    type: 'app',
    title: 'DHIS2 AI Insights',
    name: 'DHIS2 AI Insights',
    description: 'DHIS2 AI Insights is an advanced analytics tool that uses artificial intelligence to transform your health data into actionable insights. The application features a natural language interface allowing users to ask questions about their data in plain language, identify trends over time, detect anomalies, generate visualizations, and create shareable reports. With a WhatsApp-style chat interface, users can have flowing conversations with the AI about their data, asking follow-up questions and generating email-ready reports. The tool connects directly to your DHIS2 instance, allowing real-time analysis of aggregate data, event data, and tracker data across any time period and organization unit. Designed for healthcare professionals, program managers, data analysts, and decision-makers who need rapid, data-driven insights without specialized data science skills or complex statistical analysis.',
    entryPoints: {
        app: './src/App.jsx',
    },
    minDhisVersion: '2.35',
    authorities: [
        'PUBLIC_ADD',
        'PUBLIC_ACCESS',
        'DATA_READ',
        'DATA_WRITE',
        'METADATA_READ'
    ]
}

module.exports = config
