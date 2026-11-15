import './buffer-polyfill'
import React from 'react'
import { createRoot } from 'react-dom/client'
import 'misans/lib/Normal/MiSans-Regular.min.css'
import 'misans/lib/Normal/MiSans-Medium.min.css'
import 'misans/lib/Normal/MiSans-Bold.min.css'
import App from './App'
import './style.css'

createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
)
