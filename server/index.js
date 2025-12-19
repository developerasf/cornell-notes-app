const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');

const app = express();
const PORT = 3001;
const NOTES_FILE = path.join(__dirname, 'notes.json');

app.use(cors());
app.use(express.json());

const readNotes = () => {
  if (!fs.existsSync(NOTES_FILE)) {
    return [];
  }
  const data = fs.readFileSync(NOTES_FILE);
  return JSON.parse(data);
};

const writeNotes = (notes) => {
  fs.writeFileSync(NOTES_FILE, JSON.stringify(notes, null, 2));
};

app.get('/api/notes', (req, res) => {
  const notes = readNotes();
  res.json(notes);
});

app.get('/api/notes/:id', (req, res) => {
  const notes = readNotes();
  const note = notes.find((n) => n.id === req.params.id);
  if (note) {
    res.json(note);
  } else {
    res.status(404).json({ message: 'Note not found' });
  }
});

app.post('/api/notes', (req, res) => {
  const notes = readNotes();
  const newNote = {
    id: Date.now().toString(),
    ...req.body,
  };
  notes.push(newNote);
  writeNotes(notes);
  res.status(201).json(newNote);
});

app.put('/api/notes/:id', (req, res) => {
  let notes = readNotes();
  const index = notes.findIndex((n) => n.id === req.params.id);
  if (index !== -1) {
    notes[index] = { ...notes[index], ...req.body };
    writeNotes(notes);
    res.json(notes[index]);
  } else {
    res.status(404).json({ message: 'Note not found' });
  }
});

app.delete('/api/notes/:id', (req, res) => {
  let notes = readNotes();
  const index = notes.findIndex((n) => n.id === req.params.id);
  if (index !== -1) {
    notes.splice(index, 1);
    writeNotes(notes);
    res.status(204).send();
  } else {
    res.status(404).json({ message: 'Note not found' });
  }
});

app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});
