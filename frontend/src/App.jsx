import { useState, useRef } from 'react';
import './App.css';

function App() {
  // … your existing state/hooks …

  // Pull in the Vite env var; empty string in prod → same origin
  const API_BASE = import.meta.env.VITE_API_BASE_URL || '';

  const handleSubmit = async (e) => {
    e.preventDefault();
    // … your existing validation …

    const formData = new FormData();
    formData.append('userId', userId);
    formData.append('dateOfSample', dateOfSample);
    samples.forEach((sample) => {
      if (sample.file) {
        formData.append('files', sample.file);
        formData.append('weights', sample.weight);
      }
    });

    try {
      setStatus('Uploading...');
      const response = await fetch(`${API_BASE}/api/upload`, {
        method: 'POST',
        body: formData
      });

      if (response.ok) {
        setStatus('Upload successful!');
        setFormLocked(true);
      } else {
        setStatus('Upload failed.');
      }
    } catch (error) {
      console.error(error);
      setStatus('An error occurred.');
    }
  };

  // … the rest of your component stays the same …
}

export default App;
