import React from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';
import App from  './App.js';
import reportWebVitals from './reportWebVitals.js';
import { LanguageProvider } from './context/LanguageContext';
import { registerSW } from './serviceWorkerRegistration';

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  <React.StrictMode>
    <LanguageProvider>
      <App />
    </LanguageProvider>
  </React.StrictMode>
);

// Register service worker for PWA (production only)
registerSW();

// If you want to start measuring performance in your app, pass a function
// to log results (for example: reportWebVitals(console.log))
// or send to an analytics endpoint. Learn more: https://bit.ly/CRA-vitals
reportWebVitals();
