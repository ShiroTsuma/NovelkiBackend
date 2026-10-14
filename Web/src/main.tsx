import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import '@fontsource-variable/ibm-plex-sans/index.css'
import '@fontsource-variable/source-serif-4/index.css'
import '@fontsource/ibm-plex-mono/400.css'
import '@fontsource/ibm-plex-mono/500.css'
import './index.css'
import { App } from './app/App'
import { getProductionHttpsRedirectUrl } from './httpsRedirect'

const httpsRedirectUrl = getProductionHttpsRedirectUrl(
  window.location,
  import.meta.env.PROD,
  import.meta.env.VITE_PUBLIC_ORIGIN,
)

if (httpsRedirectUrl) {
  window.location.replace(httpsRedirectUrl)
} else {
  const rootElement = document.getElementById('root')
  if (!rootElement) throw new Error('Missing #root element in index.html.')
  createRoot(rootElement).render(
    <StrictMode>
      <App />
    </StrictMode>,
  )
}
