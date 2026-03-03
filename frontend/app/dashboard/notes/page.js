'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { FileText, Search, Trash2, Download, Eye, Youtube } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';

export default function NotesPage() {
  const [notes, setNotes] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loadingNotes, setLoadingNotes] = useState(false);

  const [youtubeUrl, setYoutubeUrl] = useState('');
  const [generating, setGenerating] = useState(false);

  const LOCAL_NOTES_KEY = 'letsstud_notes';

  useEffect(() => {
    fetchNotes();
  }, []);

  const fetchNotes = (search = '') => {
    try {
      setLoadingNotes(true);
      const raw = localStorage.getItem(LOCAL_NOTES_KEY);
      const allNotes = raw ? JSON.parse(raw) : [];
      const query = search.trim().toLowerCase();
      const filtered = !query
        ? allNotes
        : allNotes.filter((note) =>
            `${note.title || ''} ${note.transcript || ''}`
              .toLowerCase()
              .includes(query)
          );
      setNotes(Array.isArray(filtered) ? filtered : []);
    } catch {
      toast.error('Failed to fetch notes');
    } finally {
      setLoadingNotes(false);
    }
  };

  // 🔥 NEW: Generate Notes from Backend
  const generateNotesFromYoutube = async () => {
    if (!youtubeUrl) {
      toast.error('Please enter a YouTube URL');
      return;
    }

    try {
      setGenerating(true);

      const response = await fetch(
        `${process.env.NEXT_PUBLIC_BACKEND_URL}/generate-notes`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            youtube_url: youtubeUrl,
          }),
        }
      );

      if (!response.ok) {
        throw new Error('Backend failed');
      }

      const data = await response.json();

      const raw = localStorage.getItem(LOCAL_NOTES_KEY);
      const existing = raw ? JSON.parse(raw) : [];

      const newNote = {
        id: Date.now(),
        title: 'YouTube Generated Notes',
        transcript: data.notes,
        sourceType: 'youtube',
        createdAt: new Date().toISOString(),
      };

      localStorage.setItem(
        LOCAL_NOTES_KEY,
        JSON.stringify([newNote, ...existing])
      );

      toast.success('Notes generated successfully!');
      setYoutubeUrl('');
      fetchNotes(searchQuery);

    } catch (err) {
      console.error(err);
      toast.error('Failed to generate notes');
    } finally {
      setGenerating(false);
    }
  };

  const deleteNote = (noteId) => {
    const raw = localStorage.getItem(LOCAL_NOTES_KEY);
    const allNotes = raw ? JSON.parse(raw) : [];
    const remaining = (Array.isArray(allNotes) ? allNotes : []).filter(
      (note) => note.firestoreId !== noteId && note.id !== noteId
    );
    localStorage.setItem(LOCAL_NOTES_KEY, JSON.stringify(remaining));
    toast.success('Note deleted');
    fetchNotes(searchQuery);
  };

  const viewNoteDetails = (note) => {
    const html = `<html><body style="font-family:sans-serif;padding:20px;">
      <h1>${note.title || 'Note'}</h1>
      <pre style="white-space:pre-wrap;">${note.transcript || ''}</pre>
    </body></html>`;
    const w = window.open('', '_blank', 'width=1000,height=700');
    if (w) {
      w.document.write(html);
      w.document.close();
    }
  };

  const downloadNote = (note) => {
    const blob = new Blob([note.transcript || ''], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${(note.title || 'letsstud_notes').replace(/\s+/g, '_')}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <section className="container mx-auto px-4 pt-24 pb-20">
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="max-w-6xl mx-auto space-y-8">

        <h1 className="text-4xl font-bold text-white">My Notes</h1>

        {/* 🔥 NEW GENERATE SECTION */}
        <Card className="bg-gradient-to-br from-purple-950/50 to-black border-purple-500/30">
          <CardHeader>
            <CardTitle className="text-white flex items-center gap-2">
              <Youtube className="w-5 h-5" />
              Generate from YouTube
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <Input
              placeholder="Paste YouTube link..."
              value={youtubeUrl}
              onChange={(e) => setYoutubeUrl(e.target.value)}
              className="bg-purple-950/50 border-purple-500/30 text-white"
            />
            <Button onClick={generateNotesFromYoutube} disabled={generating}>
              {generating
                ? 'Generating... (1-2 minutes)'
                : 'Generate Notes'}
            </Button>
          </CardContent>
        </Card>

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
          <Input
            className="pl-10 bg-purple-950/50 border-purple-500/30 text-white"
            placeholder="Search notes..."
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              fetchNotes(e.target.value);
            }}
          />
        </div>

        {/* Notes Grid */}
        {loadingNotes ? (
          <p className="text-gray-400">Loading...</p>
        ) : (
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {notes.length === 0 ? (
              <Card className="col-span-full bg-black/40 border-purple-500/30">
                <CardContent className="p-8 text-center text-gray-400">
                  No notes yet.
                </CardContent>
              </Card>
            ) : (
              notes.map((note) => (
                <Card
                  key={note.firestoreId || note.id}
                  className="bg-gradient-to-br from-purple-950/50 to-black border-purple-500/30"
                >
                  <CardHeader>
                    <CardTitle className="text-white">
                      {note.title || 'Untitled Note'}
                    </CardTitle>
                    <CardDescription>
                      {note.createdAt
                        ? new Date(note.createdAt).toLocaleDateString()
                        : 'No date'}
                    </CardDescription>
                    <Badge variant="outline" className="w-fit">
                      {note.sourceType || 'text'}
                    </Badge>
                  </CardHeader>
                  <CardContent>
                    <ScrollArea className="h-28 mb-3">
                      <p className="text-sm text-gray-300">
                        {(note.transcript || '').slice(0, 200)}...
                      </p>
                    </ScrollArea>
                    <div className="flex gap-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => viewNoteDetails(note)}
                      >
                        <Eye className="w-4 h-4 mr-1" />
                        View
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => downloadNote(note)}
                      >
                        <Download className="w-4 h-4 mr-1" />
                        Download
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() =>
                          deleteNote(note.firestoreId || note.id)
                        }
                      >
                        <Trash2 className="w-4 h-4 mr-1" />
                        Delete
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        )}
      </motion.div>
    </section>
  );
}