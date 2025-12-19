import React, { useState, useEffect } from 'react';
import './App.css';
import CornellNote from './components/CornellNote';
import NoteList from './components/NoteList';

function App() {
  const [page, setPage] = useState('list'); // 'list' | 'editor'
  const [editingNote, setEditingNote] = useState(null);
  const [theme, setTheme] = useState('dark');

  useEffect(() => {
    const saved = localStorage.getItem('theme');
    if (saved) setTheme(saved);
  }, []);

  useEffect(() => {
    localStorage.setItem('theme', theme);
  }, [theme]);

  const toggleTheme = () => setTheme((t) => (t === 'dark' ? 'light' : 'dark'));

  const openCreate = () => {
    // Create a fresh blank note and clear any draft stored in localStorage
    const blank = { title: '', cues: '', notes: '', summary: '' };
    // remove draft saved in localStorage to avoid re-populating the editor
    localStorage.removeItem('title');
    localStorage.removeItem('cues');
    localStorage.removeItem('notes_html');
    localStorage.removeItem('summary_html');
    setEditingNote(blank);
    setPage('editor');
  };

  const openEdit = (note) => {
    setEditingNote(note);
    setPage('editor');
  };

  const [refreshKey, setRefreshKey] = useState(0);

  const handleSave = (savedNote) => {
    // After save, go back to list and refresh list
    setPage('list');
    setRefreshKey((k) => k + 1);
  };

  const handleCloseEditor = () => setPage('list');

  return (
    <div className={`App ${theme === 'light' ? 'light' : ''}`}>
      <header className="app-topbar">
        <div className="brand">Cornell Notes</div>
        <div className="top-actions">
          <button className="theme-toggle" onClick={toggleTheme} aria-label="Toggle theme">
            {theme === 'dark' ? '☀️' : '🌙'}
          </button>
        </div>
      </header>

      <main className="app-main">
        {page === 'list' && <NoteList onCreate={openCreate} onEdit={openEdit} refreshKey={refreshKey} />}
        {page === 'editor' && (
          <CornellNote note={editingNote} onSave={handleSave} onClose={handleCloseEditor} />
        )}
      </main>
    </div>
  );
}

export default App;