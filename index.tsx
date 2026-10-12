import React from 'react';
import './index.css';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import App from './App';
import { TooltipProvider } from '@/components/ui/tooltip';
import { ThemeProvider } from '@/components/theme-provider';

console.log("Gesit ERP: index.tsx loaded. Attempting to mount...");

const rootElement = document.getElementById('root');
if (!rootElement) {
  console.error("Gesit ERP: root element not found in DOM!");
  throw new Error("Could not find root element to mount to");
}

console.log("Gesit ERP: Root found, creating React root...");
const root = ReactDOM.createRoot(rootElement);

root.render(
  <React.StrictMode>
    <BrowserRouter>
      <ThemeProvider attribute="class" defaultTheme="system" enableSystem disableTransitionOnChange>
        <TooltipProvider>
          <App />
        </TooltipProvider>
      </ThemeProvider>
    </BrowserRouter>
  </React.StrictMode>
);

console.log("Gesit ERP: Initial render triggered.");