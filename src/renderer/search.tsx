import React from 'react';
import { createRoot } from 'react-dom/client';
import './styles/globals.css';
const container = document.getElementById('root');
if (container) createRoot(container).render(<div>Search Disabled</div>);
