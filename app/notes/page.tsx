"use client";

import { useState, useEffect } from "react";
import { Plus, FileText, Trash2, Edit, Calendar } from "lucide-react";
import { Button } from "@/app/components/ui/button";
import { Card } from "@/app/components/ui/card";
import { NoteDialog } from "@/app/components/notes/NoteDialog";
import { LoadingSpinner } from "@/app/components/ui/loading-spinner";
import { toast } from "sonner";
import { format } from "date-fns";

interface Note {
  id: string;
  title: string;
  content: string;
  category?: string;
  linkedEventId?: string;
  createdAt: string;
  updatedAt: string;
}

export default function NotesPage() {
  const [notes, setNotes] = useState<Note[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedNote, setSelectedNote] = useState<Note | null>(null);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [filter, setFilter] = useState<string>("all");

  const fetchNotes = async () => {
    try {
      setLoading(true);
      const response = await fetch("/api/notes?limit=100");

      if (!response.ok) {
        if (response.status === 401) {
          window.location.href = "/auth/login";
          return;
        }
        throw new Error("Failed to fetch notes");
      }

      const data = await response.json();
      setNotes(data.data.notes || []);
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to load notes"
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchNotes();
  }, []);

  const handleDelete = async (noteId: string) => {
    if (!confirm("Are you sure you want to delete this note?")) {
      return;
    }

    try {
      const response = await fetch(`/api/notes/${noteId}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        throw new Error("Failed to delete note");
      }

      toast.success("Note deleted successfully");
      fetchNotes();
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to delete note"
      );
    }
  };

  const handleEdit = (note: Note) => {
    setSelectedNote(note);
    setEditDialogOpen(true);
  };

  const handleSuccess = () => {
    fetchNotes();
    setCreateDialogOpen(false);
    setEditDialogOpen(false);
    setSelectedNote(null);
  };

  // Group notes by category
  const notesByCategory = notes
    .filter((note) => filter === "all" || note.category === filter)
    .reduce(
      (acc, note) => {
        const category = note.category || "Uncategorized";
        if (!acc[category]) {
          acc[category] = [];
        }
        acc[category].push(note);
        return acc;
      },
      {} as Record<string, Note[]>
    );

  const categories = [
    "all",
    ...new Set(notes.map((n) => n.category).filter(Boolean)),
  ];

  // Strip HTML tags for preview
  const getTextPreview = (html: string, maxLength = 150) => {
    const text = html.replace(/<[^>]*>/g, "");
    return text.length > maxLength ? text.slice(0, maxLength) + "..." : text;
  };

  return (
    <div className="container mx-auto px-4 py-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <FileText className="h-8 w-8" />
            Notes
          </h1>
          <p className="text-muted-foreground mt-1">
            Organize your thoughts and ideas
          </p>
        </div>
        <Button onClick={() => setCreateDialogOpen(true)}>
          <Plus className="h-4 w-4 mr-2" />
          New Note
        </Button>
      </div>

      {/* Category Filter */}
      <div className="flex gap-2 mb-6 flex-wrap">
        {categories.map((category) => (
          <Button
            key={category || "all"}
            variant={filter === category ? "default" : "outline"}
            size="sm"
            onClick={() => setFilter(category || "all")}
          >
            {category === "all" ? "All Notes" : category}
            <span className="ml-2 text-xs opacity-70">
              (
              {category === "all"
                ? notes.length
                : notes.filter(
                    (n) => (n.category || "Uncategorized") === category
                  ).length}
              )
            </span>
          </Button>
        ))}
      </div>

      {/* Notes Grid */}
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <LoadingSpinner size="lg" />
        </div>
      ) : notes.length === 0 ? (
        <Card className="p-12 text-center">
          <FileText className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
          <h3 className="text-lg font-semibold mb-2">No notes yet</h3>
          <p className="text-muted-foreground mb-4">
            Create your first note to get started
          </p>
          <Button onClick={() => setCreateDialogOpen(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Create Note
          </Button>
        </Card>
      ) : (
        <div className="space-y-8">
          {Object.entries(notesByCategory).map(([category, categoryNotes]) => (
            <div key={category}>
              <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
                {category}
                <span className="text-sm font-normal text-muted-foreground">
                  ({categoryNotes.length})
                </span>
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {categoryNotes.map((note) => (
                  <Card
                    key={note.id}
                    className="p-4 hover:shadow-lg transition-shadow cursor-pointer"
                  >
                    <div className="flex items-start justify-between mb-2">
                      <h3 className="font-semibold text-lg line-clamp-1">
                        {note.title}
                      </h3>
                      <div className="flex gap-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-8 w-8 p-0"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleEdit(note);
                          }}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-8 w-8 p-0 text-destructive hover:text-destructive"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDelete(note.id);
                          }}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>

                    <p className="text-sm text-muted-foreground line-clamp-3 mb-3">
                      {getTextPreview(note.content)}
                    </p>

                    <div className="flex items-center justify-between text-xs text-muted-foreground">
                      <span>
                        {format(new Date(note.createdAt), "MMM d, yyyy")}
                      </span>
                      {note.linkedEventId && (
                        <div className="flex items-center gap-1">
                          <Calendar className="h-3 w-3" />
                          <span>Linked</span>
                        </div>
                      )}
                    </div>
                  </Card>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Dialogs */}
      <NoteDialog
        open={createDialogOpen}
        onOpenChange={setCreateDialogOpen}
        onSuccess={handleSuccess}
      />

      <NoteDialog
        open={editDialogOpen}
        onOpenChange={setEditDialogOpen}
        note={selectedNote || undefined}
        onSuccess={handleSuccess}
      />
    </div>
  );
}
