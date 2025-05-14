import { useRef, useState } from 'react';
import Card from './components/Card';
import PrimaryButton from './components/PrimaryButton';
import './App.css';

function makePreview(file) {
  return {
    id: crypto.randomUUID(),
    name: file.name,
    thumb: file.type.startsWith('image/') ? URL.createObjectURL(file) : null,
    file,
    mass: '',
    status: 'Pending',
    progress: 0
  };
}

export default function App() {
  /* shared fields */
  const [participantId, setParticipantId] = useState('');
  const [sessionDate, setSessionDate]   = useState('');

  /* per-file */
  const [uploads, setUploads] = useState([]);

  /* hidden input ref */
  const fileInputRef = useRef(null);

  /* pick files (via click or drop) */
  function addFiles(fileList) {
    const files = Array.from(fileList);
    setUploads((prev) => [...prev, ...files.map(makePreview)]);
  }
  function handleChooseClick() {
    fileInputRef.current?.click();
  }

  /* mass change */
  const handleMassChange = (id, v) =>
    setUploads((p) => p.map((u) => (u.id === id ? { ...u, mass: v } : u)));

  /* validation */
  const ready =
    participantId.trim() &&
    sessionDate &&
    uploads.length &&
    uploads.every((u) => u.mass && !isNaN(u.mass));

  /* per-file upload with progress */
  function uploadFile(u) {
    return new Promise((resolve, reject) => {
      const xhr = new XMLHttpRequest();
      xhr.open('POST', '/api/upload');

      xhr.upload.onprogress = (e) => {
        if (e.lengthComputable) {
          const pct = Math.round((e.loaded / e.total) * 100);
          setUploads((prev) =>
            prev.map((x) => (x.id === u.id ? { ...x, progress: pct } : x))
          );
        }
      };
      xhr.onload = () =>
        xhr.status >= 200 && xhr.status < 300
          ? resolve()
          : reject(new Error(`HTTP ${xhr.status}`));
      xhr.onerror = () => reject(new Error('Network error'));

      const fd = new FormData();
      fd.append('participantId', participantId);
      fd.append('sessionDate', sessionDate);
      fd.append('mass', u.mass);
      fd.append('upload', u.file, u.name);
      xhr.send(fd);
    });
  }

  async function handleUpload() {
    for (const u of uploads) {
      setUploads((p) =>
        p.map((x) => (x.id === u.id ? { ...x, status: 'Uploading…' } : x))
      );
      try {
        await uploadFile(u);
        setUploads((p) =>
          p.map((x) =>
            x.id === u.id ? { ...x, status: 'Done', progress: 100 } : x
          )
        );
      } catch (err) {
        setUploads((p) =>
          p.map((x) =>
            x.id === u.id
              ? { ...x, status: `Error (${err.message})` }
              : x
          )
        );
      }
    }
  }

  /* drag-n-drop handlers */
  const prevent = (e) => e.preventDefault();

  return (
    <div className="container">
      <h1>Heavy Menstrual Bleeding Data Submission</h1>

      {/* participant + picker */}
      <Card className="intro-card">
        <p>
          Enter your participant information and upload photos here.
          Click the <strong>Upload</strong> button when you&rsquo;re finished.
        </p>

        <div className="form-grid">
          <label>
            User&nbsp;ID
            <input
              value={participantId}
              onChange={(e) => setParticipantId(e.target.value)}
              placeholder="e.g. P-001"
              required
            />
          </label>
          <label>
            Date
            <input
              type="date"
              value={sessionDate}
              onChange={(e) => setSessionDate(e.target.value)}
              required
            />
          </label>
        </div>

        {/* drag-drop zone */}
        {!uploads.length && (
          <div
            className="dropzone"
            onClick={handleChooseClick}
            onDragOver={prevent}
            onDragEnter={prevent}
            onDrop={(e) => {
              prevent(e);
              addFiles(e.dataTransfer.files);
            }}
          >
            Drag photos here <br />or click to select
          </div>
        )}

        <input
          ref={fileInputRef}
          type="file"
          accept=".jpg,.jpeg,.png"
          multiple
          hidden
          onChange={(e) => addFiles(e.target.files)}
        />

  {/* centered upload button (appears once files are chosen) */}
  {uploads.length > 0 && (
    <div className="upload-btn-wrap">
      <PrimaryButton
        className="btn--lg"
        disabled={!ready}
        onClick={handleUpload}
   >
     Upload&nbsp;({uploads.length})
   </PrimaryButton>
  </div>
 )}

      </Card>

      {/* gallery */}
      {uploads.length > 0 && (
        <section className="gallery">
          {uploads.map((u) => (
            <Card key={u.id}>
              {u.thumb ? (
                <img src={u.thumb} alt="" loading="lazy" />
              ) : (
                <div
                  style={{
                    height: 180,
                    display: 'grid',
                    placeItems: 'center',
                    background: '#f3f4f6'
                  }}
                >
                  📄
                </div>
              )}

              <label className="mass-label">
                Mass&nbsp;(g)
                <input
                  type="number"
                  min="0"
                  step="any"
                  value={u.mass}
                  onChange={(e) => handleMassChange(u.id, e.target.value)}
                />
              </label>

              <div className="progress-wrapper">
                <div
                  className="progress-bar"
                  style={{ width: `${u.progress}%` }}
                />
              </div>
              <p className="status">{u.status}</p>
            </Card>
          ))}
        </section>
      )}
    </div>
  );
}
