import React, { useEffect, useState } from 'react';
import './NoteList.css';

const NoteList = ({ onCreate, onEdit, refreshKey }) => {
  const [notes, setNotes] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchNotes = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/notes');
      const data = await res.json();
      setNotes(data.sort((a, b) => (b.updatedAt || b.id) - (a.updatedAt || a.id)));
    } catch (err) {
      console.error('Failed to fetch notes', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchNotes();
  }, [refreshKey]);

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this note?')) return;
    await fetch(`/api/notes/${id}`, { method: 'DELETE' });
    fetchNotes();
  };

  const handleDownload = async (note) => {
    // Generate a PDF of the full note (structured) and prompt download
    try {
      const [{ default: html2canvas }, { jsPDF }] = await Promise.all([
        import('html2canvas'),
        import('jspdf')
      ]);

      // Build a hidden container with structured note HTML
      const container = document.createElement('div');
      container.style.width = '800px';
      container.style.padding = '24px';
      container.style.background = '#ffffff';
      container.style.color = '#000';
      container.style.fontFamily = 'Arial, Helvetica, sans-serif';
      container.style.boxSizing = 'border-box';

      const titleEl = document.createElement('h1');
      titleEl.textContent = note.title || 'Untitled';
      titleEl.style.fontSize = '22px';
      titleEl.style.marginBottom = '12px';
      container.appendChild(titleEl);

      if (note.cues) {
        const cuesEl = document.createElement('div');
        cuesEl.innerHTML = `<strong>Cues:</strong> ${note.cues}`;
        cuesEl.style.marginBottom = '10px';
        container.appendChild(cuesEl);
      }

      const notesEl = document.createElement('div');
      notesEl.innerHTML = note.notes || '';
      notesEl.style.marginBottom = '12px';
      container.appendChild(notesEl);

      if (note.summary) {
        const summaryEl = document.createElement('div');
        summaryEl.innerHTML = `<strong>Summary:</strong> ${note.summary}`;
        container.appendChild(summaryEl);
      }

      // Append off-screen so it can be rendered
      container.style.position = 'fixed';
      container.style.left = '-9999px';
      container.setAttribute('id', 'pdf-export');
      document.body.appendChild(container);

      // Use a slightly wider container for better layout and sharper text
      container.style.width = '800px';

      // Render at up to 2x device pixel ratio for sharp text but keep file size reasonable
      const renderScale = Math.min(2, window.devicePixelRatio || 2);
      const JPG_QUALITY = 0.85;
      const MAX_IMG_WIDTH = 1400; // px - cap large images to keep PDF size reasonable

      // Compress and downscale any inline images inside the container before rendering
      const compressImageElement = async (imgEl) => {
        try {
          const naturalW = imgEl.naturalWidth || imgEl.width;
          const naturalH = imgEl.naturalHeight || imgEl.height;
          const ratio = Math.min(1, MAX_IMG_WIDTH / naturalW);
          const tmpCanvas = document.createElement('canvas');
          const ctx = tmpCanvas.getContext('2d');

          tmpCanvas.width = Math.round(naturalW * ratio);
          tmpCanvas.height = Math.round(naturalH * ratio);
          ctx.drawImage(imgEl, 0, 0, tmpCanvas.width, tmpCanvas.height);
          // Convert to JPEG with decent quality
          imgEl.src = tmpCanvas.toDataURL('image/jpeg', JPG_QUALITY);
        } catch (e) {
          // ignore errors and continue
          console.warn('Image compression failed', e);
        }
      };

      const imgs = container.querySelectorAll('img');
      await Promise.all(Array.from(imgs).map(img => new Promise((res) => {
        if (img.complete) {
          compressImageElement(img).then(res);
        } else {
          img.onload = () => compressImageElement(img).then(res);
          img.onerror = () => res();
        }
      })));

      // Render with html2canvas at higher scale for better clarity
      const canvas = await html2canvas(container, { scale: renderScale, useCORS: true, backgroundColor: '#ffffff' });
      // Export as JPEG with higher quality to improve sharpness
      const imgData = canvas.toDataURL('image/jpeg', JPG_QUALITY);

      // A4 in points: 595.28 x 841.89 (pt) for jsPDF's 'pt' unit
      const pdf = new jsPDF('p', 'pt', 'a4');
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = pdf.internal.pageSize.getHeight();

      // Calculate image dimensions to fit A4 width
      const imgWidth = pdfWidth;
      const imgHeight = (canvas.height * pdfWidth) / canvas.width;

      const pageHeight = pdfHeight;

      // Add image and split into multiple pages if needed (use JPEG slices)
      if (imgHeight <= pageHeight) {
        pdf.addImage(imgData, 'JPEG', 0, 0, imgWidth, imgHeight, undefined, 'FAST');
      } else {
        // Slice using canvas to fit multiple pages
        let pageCanvas = document.createElement('canvas');
        const scale = canvas.width / imgWidth;
        pageCanvas.width = canvas.width;
        pageCanvas.height = Math.min(canvas.height, Math.round(pageHeight * scale));
        const pageCtx = pageCanvas.getContext('2d');

        let sourceY = 0;
        while (sourceY < canvas.height) {
          const currentHeight = Math.min(pageCanvas.height, canvas.height - sourceY);
          pageCanvas.height = currentHeight; // adjust for last slice
          pageCtx.clearRect(0, 0, pageCanvas.width, pageCanvas.height);
          pageCtx.drawImage(canvas, 0, sourceY, canvas.width, currentHeight, 0, 0, pageCanvas.width, pageCanvas.height);
          const pageData = pageCanvas.toDataURL('image/jpeg', JPG_QUALITY);
          if (sourceY > 0) pdf.addPage();
          pdf.addImage(pageData, 'JPEG', 0, 0, imgWidth, (pageCanvas.height / scale), undefined, 'FAST');
          sourceY += currentHeight;
        }
      }

      const fileName = (note.title || 'note').replace(/[^a-z0-9-_.]/gi, '_') + '.pdf';
      pdf.save(fileName);

      // Remove temporary container
      const tmp = document.getElementById('pdf-export');
      if (tmp) tmp.remove();
    } catch (err) {
      console.error('PDF generation failed', err);
      alert('Failed to generate PDF. See console for details.');
    }
  };

  return (
    <div className="note-list-container">
      <div className="note-list-header">
        <h2>Your Notes</h2>
        <button className="btn create" onClick={onCreate}>+ Create New Note</button>
      </div>

      {loading ? (
        <p>Loading notes...</p>
      ) : notes.length === 0 ? (
        <p>No notes yet — create one!</p>
      ) : (
        <div className="notes-list">
          {notes.map((n) => (
            <div className="note-row" key={n.id}>
              <div className="note-row-content" onClick={() => onEdit(n)}>
                <div className="note-title">{n.title || 'Untitled'}</div>
              </div>

              <div className="note-actions">
                <button title="Download" aria-label="Download" onClick={() => handleDownload(n)} className="icon-btn download-btn">⬇️</button>
                <button title="Delete" onClick={() => handleDelete(n.id)} className="icon-btn danger">🗑️</button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default NoteList;
