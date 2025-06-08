

Sent from Outlook for iOS

Public

From: Kai Vandivier <kai@dhis2.org>
Sent: Saturday, June 7, 2025 11:10:05 AM
To: John Mark Esplana <john.esplana@ifrc.org>
Cc: Austin McGee <austin@dhis2.org>; Mozafar Haider <mozafar@dhis2.org>
Subject: AI Insights App Hub review
 
You don't often get email from kai@dhis2.org. Learn why this is important
[EXTERNAL EMAIL] DO NOT CLICK links or attachments unless you expect it from the sender, you check it came from a known email address and you know the content is safe.

Hey John,

Thanks for submitting the AI Insights app to the App Hub! The app is very interesting, and we’re excited to see it!

We’ve given it a cursory review, and it’s nearly ready for approval.

The documentation, screenshots, and app features are all great — there are a few small things that should be addressed though, according to the App Hub Submission Guidelines:
There seems to be a bug that crashes the app: when rendering a response from the AI chat, React Markdown can crash with the error “Uncaught Assertion: unexpected `className` prop, remove it”
Conveniently, it seems that just this small fix is needed: https://github.com/remarkjs/react-markdown/blob/main/changelog.md#remove-classname. Applying this locally made things work
This occurred on app version 1.0.9, checked out from GitHub and run locally, using Ollama for the model
Take a close look at the guidelines for the description of the app. The description should be concise, and the tone should be objective
The app name should omit “DHIS2”; “AI Insights” is enough to describe a DHIS2 app
The app icon is good, but the favicon that appears in browser tabs shouldn’t be overwritten; it should still be the DHIS2 icon. You can remove these files from the `public` directory
The link to the source code should point to the app repository on GitHub
Once those items above are addressed, it’ll be ready to go! 🙂 I also recommended uploading the latest version of the app and adding a screenshot showing the Ollama support.

While reviewing, we also noted some suggestions that we think could level-up the app, too (but they're not necessary for App Hub approval):
Technical details
For connecting to external services like OpenAI’s API, check out the Route API for a secure way of connecting to them with authentication. You can set up a Route with the `api-headers` option for the authentication method, which can save an API key securely on the server
I see a `package-lock.json` file: maybe using NPM as a package manager has been working for you, but the DHIS2 platform libraries were made with Yarn classic and work most consistently with Yarn
Some custom authorities are defined in `d2.config.js` — they don’t seem to be used, so they could be removed. Their names are also quite generic; such authorities could conflict with other apps that might define similar authorities, so it’s recommended to make the authority names specific to the app
`manifest.webapp` isn’t needed in the `public` directory; `@dhis2/cli-app-scripts` will generate that automatically
Functionality
Charts in the Data Dashboard tab can look different than the same chart in the Data Visualizer app, given the same data selection. It might make sense to match the Data Visualizer output for recognizability to users
Example on a Play server: Data = “ANC 1 coverage” (an indicator), Org unit = “User sub-units”, and Period = “last 12 months”
(In Data Visualizer, Series = Data, and Categories = Period & Org Unit. This generates a similar request to the analytics API in both apps)
The column chart in Data Dashboard shows 1 column in each month, where Data Visualizer shows a column for every org unit in each month
The one column in the Data Dashboard reflects the just value of the first org unit in the selection, i.e. Bo in the Play server example
Relative periods can be “off by one” when broken down, for example today in June, “Last 12 months” gets broken down into July 2024 - July 2024 in the Data Dashboard of the AI Insights, but using ‘LAST_12_MONTHS' as the period in Data Visualizer returns June 2024 - June 2025.
Unless there’s a specific reason to break up relative periods, consider using the available relative period values for analytics requests
Usability/User experience
“Analytics dimension” selection components (Org unit, period, data) in the Data Selection tab: There are some reusable components for these selections in the `@dhis2/analytics` which could be useful, although they’re not really documented. They’re the selectors used in Data Visualizer, Maps, Dashboard, etc.
It would be nice to save state when moving back and forth between tabs, i.e. AI chat history and dimension selection
In the AI Insights and Data Dashboard tabs, it would be nice to see the currently selected dimensions
It looks like the “anonymous analytics” setting isn’t implemented; I’d recommend removing that for now, especially since it will attract scrutiny
Appearance
The app title isn’t needed inside the app itself; it is repeated in the header bar
Some small design changes could improve the look and feel and make the app resemble other DHIS2 apps more:
Adding spacing between elements and padding inside containers
Using DHIS2 colors for the Chat interface
Using icons instead of emojis for check marks and in buttons (some are included in `@dhis2/ui`)
