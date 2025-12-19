import React, { useState, useEffect, useRef } from 'react';
import './CornellNote.css';

const CornellNote = ({ note = null, onSave = () => {}, onClose = () => {} }) => {
  const [title, setTitle] = useState('');
  const [cues, setCues] = useState('');
  const [saving, setSaving] = useState(false);
  const [savedMessage, setSavedMessage] = useState('');
  const [drawingOpen, setDrawingOpen] = useState(false);
  const [penColor, setPenColor] = useState('#000000');
  const [penWidth, setPenWidth] = useState(3);

  const notesRef = useRef(null);
  const summaryRef = useRef(null);
  const imgInputRef = useRef(null);
  const canvasRef = useRef(null);
  const drawingContextRef = useRef(null);
  const drawingDataUrlRef = useRef(null);

  useEffect(() => {
    if (note) {
      setTitle(note.title || '');
      setCues(note.cues || '');
      if (notesRef.current) notesRef.current.innerHTML = note.notes || '';
      if (summaryRef.current) summaryRef.current.innerHTML = note.summary || '';
    } else {
      const savedTitle = localStorage.getItem('title');
      const savedCues = localStorage.getItem('cues');
      const savedNotes = localStorage.getItem('notes_html');
      const savedSummary = localStorage.getItem('summary_html');

      if (savedTitle) setTitle(savedTitle);
      if (savedCues) setCues(savedCues);
      if (notesRef.current && savedNotes) notesRef.current.innerHTML = savedNotes;
      if (summaryRef.current && savedSummary) summaryRef.current.innerHTML = savedSummary;
    }
  }, [note]);

  const handleTitleChange = (e) => {
    setTitle(e.target.value);
    localStorage.setItem('title', e.target.value);
  };

  const handleCuesChange = (e) => {
    setCues(e.target.value);
    localStorage.setItem('cues', e.target.value);
  };

  const onNotesInput = () => {
    if (notesRef.current) {
      localStorage.setItem('notes_html', notesRef.current.innerHTML);
    }
  };

  const onSummaryInput = () => {
    if (summaryRef.current) {
      localStorage.setItem('summary_html', summaryRef.current.innerHTML);
    }
  };

  // Utility: wrap selection with styled span
  const applyInlineStyle = (styleObj) => {
    const sel = window.getSelection();
    if (!sel || sel.rangeCount === 0) return;
    const range = sel.getRangeAt(0);
    if (range.collapsed) return; // nothing selected

    const span = document.createElement('span');
    Object.entries(styleObj).forEach(([k, v]) => {
      span.style[k] = v;
    });

    span.appendChild(range.extractContents());
    range.insertNode(span);
    sel.removeAllRanges();
  };

  const toggleBold = () => applyInlineStyle({ fontWeight: '700' });
  const setFontSize = (size) => applyInlineStyle({ fontSize: `${size}px` });
  const setTextColor = (color) => applyInlineStyle({ color });
  const setHighlight = (color) => applyInlineStyle({ backgroundColor: color });

  const insertImageFromFile = (file) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const dataUrl = e.target.result;
      insertImageAtCursor(dataUrl);
    };
    reader.readAsDataURL(file);
  };

  const insertImageAtCursor = (src) => {
    const sel = window.getSelection();
    if (!sel || sel.rangeCount === 0) return;
    const range = sel.getRangeAt(0);
    const img = document.createElement('img');
    img.src = src;
    img.style.maxWidth = '100%';
    img.style.borderRadius = '6px';
    range.collapse(false);
    range.insertNode(img);
  };

  const handleImageButton = () => {
    if (imgInputRef.current) imgInputRef.current.click();
  };

  const handleImageInput = (e) => {
    const file = e.target.files && e.target.files[0];
    if (file) insertImageFromFile(file);
    e.target.value = '';
  };

  // Drawing canvas methods
  const openDrawing = () => {
    setDrawingOpen(true);
    requestAnimationFrame(setupCanvas);
  };

  const setupCanvas = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const dpr = window.devicePixelRatio || 1;
    canvas.width = canvas.clientWidth * dpr;
    canvas.height = canvas.clientHeight * dpr;
    const ctx = canvas.getContext('2d');
    ctx.scale(dpr, dpr);
    ctx.lineCap = 'round';
    ctx.strokeStyle = penColor;
    ctx.lineWidth = penWidth;
    drawingContextRef.current = ctx;
  };

  const clearCanvas = () => {
    const canvas = canvasRef.current;
    const ctx = drawingContextRef.current;
    if (ctx && canvas) {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
    }
  };

  const saveDrawing = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    // convert to data URL at the displayed resolution
    const dataUrl = canvas.toDataURL('image/png');
    drawingDataUrlRef.current = dataUrl;
    insertImageAtCursor(dataUrl);
    setDrawingOpen(false);
  };

  const handleSave = async () => {
    setSaving(true);
    const payload = {
      title,
      cues,
      notes: notesRef.current ? notesRef.current.innerHTML : '',
      summary: summaryRef.current ? summaryRef.current.innerHTML : '',
      updatedAt: Date.now(),
    };

    try {
      let res, data;
      if (note && note.id) {
        res = await fetch(`/api/notes/${note.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
        data = await res.json();
      } else {
        res = await fetch('/api/notes', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
        data = await res.json();
      }

      setSavedMessage('Saved');
      setTimeout(() => setSavedMessage(''), 2000);
      // clear temporary local storage on successful save
      localStorage.removeItem('title');
      localStorage.removeItem('cues');
      localStorage.removeItem('notes_html');
      localStorage.removeItem('summary_html');

      onSave(data);
    } catch (err) {
      console.error('Save failed', err);
      setSavedMessage('Save failed');
      setTimeout(() => setSavedMessage(''), 2000);
    } finally {
      setSaving(false);
    }
  };

  // update drawing context when color/width change
  useEffect(() => {
    const ctx = drawingContextRef.current;
    if (ctx) {
      ctx.strokeStyle = penColor;
      ctx.lineWidth = penWidth;
    }
  }, [penColor, penWidth]);

  const handleSaveToDrive = () => {
    // Placeholder for Google Drive integration — needs OAuth client setup and server-side token exchange.
    alert('Save to Google Drive is not configured. See README for integration steps.');
  };

  // Drawing event handlers using pointer events (persist drawing state in a ref)
  const drawingRef = useRef(false);
  const startDrawRef = (e) => {
    drawingRef.current = true;
    const ctx = drawingContextRef.current;
    if (!ctx || !canvasRef.current) return;
    const rect = canvasRef.current.getBoundingClientRect();
    const x = (e.touches ? e.touches[0].clientX : e.clientX) - rect.left;
    const y = (e.touches ? e.touches[0].clientY : e.clientY) - rect.top;
    ctx.beginPath();
    ctx.moveTo(x, y);
  };
  const drawMoveRef = (e) => {
    if (!drawingRef.current) return;
    const ctx = drawingContextRef.current;
    if (!ctx || !canvasRef.current) return;
    const rect = canvasRef.current.getBoundingClientRect();
    const x = (e.touches ? e.touches[0].clientX : e.clientX) - rect.left;
    const y = (e.touches ? e.touches[0].clientY : e.clientY) - rect.top;
    ctx.lineTo(x, y);
    ctx.stroke();
  };
  const endDrawRef = () => {
    drawingRef.current = false;
  };

  return (
    <div className="cornell-note-container">
      <div className="editor-header">
        <div className="title-section">
          <input
            type="text"
            placeholder="Title..."
            value={title}
            onChange={handleTitleChange}
          />
        </div>

        <div className="editor-controls">
          <button className="small-btn" onClick={handleSave} disabled={saving} title="Save">
            💾
          </button>
          <button className="small-btn" onClick={handleSaveToDrive} title="Save to Google Drive">
            ☁️
          </button>
          <button className="small-btn ghost" onClick={onClose} title="Close">
            ✖️
          </button>
          <div className="save-status">{savedMessage}</div>
        </div>
      </div>

      <div className="cues-section">
        <textarea
          placeholder="Cues..."
          value={cues}
          onChange={handleCuesChange}
        />
      </div>

      <div className="notes-section">
        <div className="editor-toolbar">
          <button className="toolbar-btn" onClick={toggleBold} title="Bold">
            <b>B</b>
          </button>

          <select className="toolbar-select" onChange={(e) => setFontSize(e.target.value)} defaultValue="16">
            <option value="12">12px</option>
            <option value="14">14px</option>
            <option value="16">16px</option>
            <option value="18">18px</option>
            <option value="20">20px</option>
            <option value="24">24px</option>
            <option value="28">28px</option>
            <option value="32">32px</option>
          </select>

          <input className="toolbar-color" type="color" title="Text color" onChange={(e) => setTextColor(e.target.value)} />
          <input className="toolbar-color" type="color" title="Highlight color" onChange={(e) => setHighlight(e.target.value)} />

          <button className="toolbar-btn" onClick={handleImageButton} title="Insert image">🖼️</button>
          <input ref={imgInputRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={handleImageInput} />

          <button className="toolbar-btn" onClick={openDrawing} title="Pen / Draw">✍️</button>
        </div>

        <div
          className="notes-editable"
          contentEditable
          data-placeholder="Notes..."
          ref={notesRef}
          onInput={onNotesInput}
          suppressContentEditableWarning={true}
        />

        <div className="summary-section">
          <div className="summary-editable" data-placeholder="Summary..." contentEditable ref={summaryRef} onInput={onSummaryInput} suppressContentEditableWarning={true} />
        </div>
      </div>

      {drawingOpen && (
        <div className="drawing-modal" role="dialog" aria-label="Drawing canvas">
          <div className="drawing-canvas-wrapper">
            <div className="drawing-toolbar">
              <input type="color" value={penColor} onChange={(e) => setPenColor(e.target.value)} />
              <select value={penWidth} onChange={(e) => setPenWidth(Number(e.target.value))}>
                <option value={1}>1</option>
                <option value={2}>2</option>
                <option value={3}>3</option>
                <option value={4}>4</option>
                <option value={6}>6</option>
                <option value={8}>8</option>
                <option value={12}>12</option>
              </select>
              <button className="toolbar-btn" onClick={clearCanvas}>Clear</button>
              <button className="toolbar-btn" onClick={saveDrawing}>Save</button>
              <button className="toolbar-btn" onClick={() => setDrawingOpen(false)}>Close</button>
            </div>

            <canvas
              ref={canvasRef}
              className="drawing-canvas"
              onMouseDown={startDrawRef}
              onMouseMove={drawMoveRef}
              onMouseUp={endDrawRef}
              onMouseLeave={endDrawRef}
              onTouchStart={startDrawRef}
              onTouchMove={drawMoveRef}
              onTouchEnd={endDrawRef}
            />
          </div>
        </div>
      )}
    </div>
  );
};

export default CornellNote;
