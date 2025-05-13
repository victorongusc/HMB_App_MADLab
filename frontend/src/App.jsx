import { useState, useRef } from 'react';
import './App.css';

function App() {
  const [userId, setUserId] = useState('');
  const [dateOfSample, setDateOfSample] = useState('');
  const [samples, setSamples] = useState(
    Array(5).fill().map(() => ({ file: null, weight: '', preview: null }))
  );
  const [status, setStatus] = useState('');
  const [formLocked, setFormLocked] = useState(false);

  const fileInputs = useRef([]);

  const handleDrop = (index, event) => {
    event.preventDefault();
    const file = event.dataTransfer.files[0];
    if (file && file.type.startsWith('image/')) {
      updateSample(index, file);
    }
  };

  const updateSample = (index, file) => {
    const updated = [...samples];
    updated[index].file = file;
    updated[index].preview = URL.createObjectURL(file);
    setSamples(updated);
  };

  const handleFileChange = (index, file) => {
    if (file && file.type.startsWith('image/')) {
      updateSample(index, file);
    }
  };

  const handleWeightChange = (index, weight) => {
    const updated = [...samples];
    updated[index].weight = weight;
    setSamples(updated);
  };

  const API_BASE = import.meta.env.VITE_API_BASE_URL || '';

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!userId || !dateOfSample) {
      setStatus('Please fill out User ID and Date.');
      return;
    }

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
  method: "POST",
  body: formData,
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

  const handleReset = () => {
    setSamples(Array(5).fill().map(() => ({ file: null, weight: '', preview: null })));
    setStatus('');
    setFormLocked(false);
  };

  return (
    <div className="app">
      <form onSubmit={handleSubmit} className="form">
        <h1>Image Intake Form</h1>

        <div className="form-group">
          <label>User ID:</label>
          <input
            type="text"
            value={userId}
            onChange={(e) => setUserId(e.target.value)}
            required
            disabled={formLocked}
          />
        </div>

        <div className="form-group">
          <label>Date of Sample:</label>
          <input
            type="date"
            value={dateOfSample}
            onChange={(e) => setDateOfSample(e.target.value)}
            required
            disabled={formLocked}
          />
        </div>

        <div className="samples-row">
          {samples.map((sample, index) => (
            <div
              className="sample-box"
              key={index}
              onDrop={(e) => !formLocked && handleDrop(index, e)}
              onDragOver={(e) => e.preventDefault()}
            >
              <div
                className="drop-zone"
                onClick={() => !formLocked && fileInputs.current[index].click()}
              >
                {sample.preview ? (
                  <img src={sample.preview} alt="Preview" />
                ) : (
                  <span>Drag & drop or click</span>
                )}
              </div>
              <input
                type="file"
                accept="image/*"
                style={{ display: 'none' }}
                ref={(el) => (fileInputs.current[index] = el)}
                onChange={(e) => handleFileChange(index, e.target.files[0])}
                disabled={formLocked}
              />
              <input
                type="number"
                placeholder="Weight (g)"
                value={sample.weight}
                onChange={(e) => handleWeightChange(index, e.target.value)}
                disabled={formLocked}
              />
            </div>
          ))}
        </div>

        <button type="submit" disabled={formLocked}>Upload</button>

        {formLocked && <div className="overlay" />}
      </form>

      {formLocked && (
        <div className="success-message">
          <p>✅ Upload successful!</p>
          <button className="submit-more-button" onClick={handleReset}>
            Submit More Data
          </button>
        </div>
      )}

      <p className="status-text">{status}</p>
    </div>
  );
}

export default App;
