import { render } from 'preact';
import App from './App.tsx';
import './index.css';

// Ensure user ID exists for local database operations
if (!localStorage.getItem('myUserId')) {
  localStorage.setItem('myUserId', 'me');
}

render(<App />, document.getElementById('root')!);

if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').then(registration => {
      console.log('SW registered: ', registration);
    }).catch(registrationError => {
      console.log('SW registration failed: ', registrationError);
    });
  });
}
