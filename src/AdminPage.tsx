import React, { useState, useEffect, useCallback, useRef } from 'react';
import { getAllSessions, deleteSession, SessionData } from './lib/supabase';
import { getImages, getImageThumbnail, clearImageCache, ImageInfo } from './lib/images';
import { uploadImage, deleteImage, reorderImages, ImageUploadInput } from './lib/images-api';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import {
  Table, TableHeader, TableBody, TableRow, TableHead, TableCell,
} from '@/components/ui/table';
import {
  AlertDialog, AlertDialogTrigger, AlertDialogContent,
  AlertDialogHeader, AlertDialogTitle, AlertDialogDescription,
  AlertDialogFooter, AlertDialogAction, AlertDialogCancel,
} from '@/components/ui/alert-dialog';
import { Label } from '@/components/ui/label';
import { Trash2, ChevronUp, ChevronDown, Upload } from 'lucide-react';

const ADMIN_SESSION_KEY = 'co-see-admin-auth';

function AdminGate({ children }: { children: React.ReactNode }) {
  const [authenticated, setAuthenticated] = useState(false);
  const [passphrase, setPassphrase] = useState('');
  const [error, setError] = useState(false);

  useEffect(() => {
    if (sessionStorage.getItem(ADMIN_SESSION_KEY) === 'true') {
      setAuthenticated(true);
    }
  }, []);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const secret = import.meta.env.VITE_ADMIN_SECRET;
    if (!secret) {
      setError(true);
      return;
    }
    if (passphrase === secret) {
      sessionStorage.setItem(ADMIN_SESSION_KEY, 'true');
      setAuthenticated(true);
      setError(false);
    } else {
      setError(true);
      setPassphrase('');
    }
  };

  if (authenticated) return <>{children}</>;

  return (
    <div className="admin-gate">
      <style>{`
        .admin-gate {
          min-height: 100vh;
          display: flex;
          align-items: center;
          justify-content: center;
          background: #FBFAF8;
          font-family: 'Azeret Mono', monospace;
        }
        .admin-gate-card {
          width: 100%;
          max-width: 360px;
          padding: 32px;
        }
        .admin-gate-card h2 {
          font-size: 14px;
          font-weight: 500;
          margin-bottom: 20px;
          color: #333;
          text-align: center;
        }
        .admin-gate-card form {
          display: flex;
          flex-direction: column;
          gap: 12px;
        }
        .admin-gate-error {
          font-size: 12px;
          color: #b91c1c;
          text-align: center;
        }
      `}</style>
      <div className="admin-gate-card">
        <h2>Admin Access</h2>
        <form onSubmit={handleSubmit}>
          <Input
            type="password"
            placeholder="Passphrase"
            value={passphrase}
            onChange={(e) => { setPassphrase(e.target.value); setError(false); }}
            autoFocus
          />
          <Button type="submit" size="sm" className="w-full">
            Enter
          </Button>
          {error && <p className="admin-gate-error">Incorrect passphrase</p>}
        </form>
      </div>
    </div>
  );
}

function StatsCards({ sessions, images }: { sessions: SessionData[]; images: ImageInfo[] }) {
  const sharedCount = sessions.filter(s => s.is_public && s.share_slug).length;

  return (
    <div className="admin-stats">
      <style>{`
        .admin-stats {
          display: flex;
          gap: 16px;
          margin-bottom: 24px;
        }
        .admin-stats .stat-card {
          flex: 1;
          min-width: 0;
        }
        .stat-label {
          font-size: 11px;
          text-transform: uppercase;
          letter-spacing: 0.05em;
          color: #888;
          margin-bottom: 4px;
        }
        .stat-value {
          font-size: 28px;
          font-weight: 600;
          color: #333;
        }
      `}</style>
      <Card className="stat-card">
        <CardContent className="pt-4 pb-4">
          <div className="stat-label">Images</div>
          <div className="stat-value">{images.length}</div>
        </CardContent>
      </Card>
      <Card className="stat-card">
        <CardContent className="pt-4 pb-4">
          <div className="stat-label">Sessions</div>
          <div className="stat-value">{sessions.length}</div>
        </CardContent>
      </Card>
      <Card className="stat-card">
        <CardContent className="pt-4 pb-4">
          <div className="stat-label">Shared</div>
          <div className="stat-value">{sharedCount}</div>
        </CardContent>
      </Card>
    </div>
  );
}

function SessionsTab({
  sessions,
  imageMap,
  onDelete,
}: {
  sessions: SessionData[];
  imageMap: Map<string, string>;
  onDelete: (sessionId: string) => void;
}) {
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const handleDelete = async (sessionId: string) => {
    setDeletingId(sessionId);
    await onDelete(sessionId);
    setDeletingId(null);
  };

  if (sessions.length === 0) {
    return <p className="text-sm text-muted-foreground py-8 text-center">No sessions yet.</p>;
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Image</TableHead>
          <TableHead>Session</TableHead>
          <TableHead>Nickname</TableHead>
          <TableHead>Created</TableHead>
          <TableHead>Share slug</TableHead>
          <TableHead className="w-[60px]" />
        </TableRow>
      </TableHeader>
      <TableBody>
        {sessions.map((s) => (
          <TableRow key={s.session_id}>
            <TableCell className="font-medium">
              {imageMap.get(s.image_id) ?? s.image_id}
            </TableCell>
            <TableCell>{s.session_name}</TableCell>
            <TableCell>{s.nickname || '—'}</TableCell>
            <TableCell className="whitespace-nowrap">
              {new Date(s.created_at).toLocaleDateString()}
            </TableCell>
            <TableCell>
              {s.share_slug ? (
                <code className="text-xs bg-muted px-1.5 py-0.5 rounded">{s.share_slug}</code>
              ) : '—'}
            </TableCell>
            <TableCell>
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    disabled={deletingId === s.session_id}
                  >
                    <Trash2 className="h-4 w-4 text-muted-foreground" />
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Delete session?</AlertDialogTitle>
                    <AlertDialogDescription>
                      This will permanently delete <strong>{s.session_name}</strong>
                      {s.nickname ? ` (${s.nickname})` : ''}. This action cannot be undone.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction
                      onClick={() => handleDelete(s.session_id)}
                      className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                    >
                      Delete
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}

function AddImageForm({ onAdded }: { onAdded: () => void }) {
  const [title, setTitle] = useState('');
  const [caption, setCaption] = useState('');
  const [sourceUrl, setSourceUrl] = useState('');
  const [uploadedBy, setUploadedBy] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const reset = () => {
    setTitle('');
    setCaption('');
    setSourceUrl('');
    setUploadedBy('');
    setFile(null);
    setError('');
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file) { setError('Please select an image file.'); return; }
    if (!title.trim()) { setError('Title is required.'); return; }

    setSubmitting(true);
    setError('');

    const input: ImageUploadInput = {
      file,
      title: title.trim(),
      caption: caption.trim(),
      source_url: sourceUrl.trim(),
      uploaded_by: uploadedBy.trim(),
    };

    const result = await uploadImage(input);
    setSubmitting(false);

    if (!result) {
      setError('Upload failed. Make sure Supabase is configured.');
      return;
    }

    reset();
    onAdded();
  };

  return (
    <Card className="mb-6">
      <CardContent className="pt-5 pb-5">
        <form onSubmit={handleSubmit} className="add-image-form">
          <style>{`
            .add-image-form {
              display: grid;
              grid-template-columns: 1fr 1fr;
              gap: 12px;
            }
            .add-image-form .full-width {
              grid-column: 1 / -1;
            }
            .add-image-field {
              display: flex;
              flex-direction: column;
              gap: 4px;
            }
            .add-image-actions {
              grid-column: 1 / -1;
              display: flex;
              align-items: center;
              gap: 12px;
              margin-top: 4px;
            }
            .add-image-error {
              font-size: 12px;
              color: #b91c1c;
            }
          `}</style>

          <div className="add-image-field full-width">
            <Label htmlFor="image-file" className="text-xs">Image file</Label>
            <Input
              id="image-file"
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={(e) => setFile(e.target.files?.[0] ?? null)}
            />
          </div>

          <div className="add-image-field">
            <Label htmlFor="image-title" className="text-xs">Title *</Label>
            <Input
              id="image-title"
              placeholder="e.g. agnes martin in new mexico"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
            />
          </div>

          <div className="add-image-field">
            <Label htmlFor="image-uploaded-by" className="text-xs">Uploaded by</Label>
            <Input
              id="image-uploaded-by"
              placeholder="e.g. jiamin"
              value={uploadedBy}
              onChange={(e) => setUploadedBy(e.target.value)}
            />
          </div>

          <div className="add-image-field full-width">
            <Label htmlFor="image-caption" className="text-xs">Caption</Label>
            <Input
              id="image-caption"
              placeholder="Description or attribution"
              value={caption}
              onChange={(e) => setCaption(e.target.value)}
            />
          </div>

          <div className="add-image-field full-width">
            <Label htmlFor="image-source" className="text-xs">Source URL</Label>
            <Input
              id="image-source"
              placeholder="https://…"
              value={sourceUrl}
              onChange={(e) => setSourceUrl(e.target.value)}
            />
          </div>

          <div className="add-image-actions">
            <Button type="submit" size="sm" disabled={submitting}>
              <Upload className="h-4 w-4 mr-1.5" />
              {submitting ? 'Uploading…' : 'Add image'}
            </Button>
            {error && <span className="add-image-error">{error}</span>}
          </div>
        </form>
      </CardContent>
    </Card>
  );
}

function ImagesTab({
  images,
  onRefresh,
}: {
  images: ImageInfo[];
  onRefresh: () => void;
}) {
  const [reordering, setReordering] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const handleMove = async (index: number, direction: 'up' | 'down') => {
    const swapIndex = direction === 'up' ? index - 1 : index + 1;
    if (swapIndex < 0 || swapIndex >= images.length) return;

    setReordering(true);
    const ids = images.map(img => img.id);
    [ids[index], ids[swapIndex]] = [ids[swapIndex], ids[index]];

    const success = await reorderImages(ids);
    if (success) {
      clearImageCache();
      onRefresh();
    }
    setReordering(false);
  };

  const handleDelete = async (image: ImageInfo) => {
    setDeletingId(image.id);
    const success = await deleteImage(image.id, image.storage_path ?? null);
    if (success) {
      clearImageCache();
      onRefresh();
    }
    setDeletingId(null);
  };

  return (
    <>
      <style>{`
        .images-tab-thumb {
          width: 48px;
          height: 48px;
          object-fit: cover;
          border-radius: 4px;
          background: #eee;
        }
        .images-tab-order-btns {
          display: flex;
          flex-direction: column;
          gap: 0;
        }
      `}</style>

      <AddImageForm onAdded={() => { clearImageCache(); onRefresh(); }} />

      {images.length === 0 ? (
        <p className="text-sm text-muted-foreground py-8 text-center">No images yet.</p>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[60px]" />
              <TableHead>Title</TableHead>
              <TableHead>Filename</TableHead>
              <TableHead className="w-[60px]">Order</TableHead>
              <TableHead className="w-[80px]" />
              <TableHead className="w-[60px]" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {images.map((img, idx) => (
              <TableRow key={img.id}>
                <TableCell>
                  <img
                    src={getImageThumbnail(img)}
                    alt={img.title}
                    className="images-tab-thumb"
                  />
                </TableCell>
                <TableCell className="font-medium">{img.title}</TableCell>
                <TableCell className="text-xs text-muted-foreground">{img.filename}</TableCell>
                <TableCell className="text-center">{img.display_order}</TableCell>
                <TableCell>
                  <div className="images-tab-order-btns">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6"
                      disabled={idx === 0 || reordering}
                      onClick={() => handleMove(idx, 'up')}
                    >
                      <ChevronUp className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6"
                      disabled={idx === images.length - 1 || reordering}
                      onClick={() => handleMove(idx, 'down')}
                    >
                      <ChevronDown className="h-4 w-4" />
                    </Button>
                  </div>
                </TableCell>
                <TableCell>
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button
                        variant="ghost"
                        size="icon"
                        disabled={deletingId === img.id}
                      >
                        <Trash2 className="h-4 w-4 text-muted-foreground" />
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Delete image?</AlertDialogTitle>
                        <AlertDialogDescription>
                          This will permanently remove <strong>{img.title || img.filename}</strong> from
                          the gallery and delete the stored file. Existing sessions that reference this
                          image will keep their data but won't show a thumbnail. This action cannot be undone.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction
                          onClick={() => handleDelete(img)}
                          className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                        >
                          Delete
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
    </>
  );
}

export default function AdminPage() {
  const [sessions, setSessions] = useState<SessionData[]>([]);
  const [images, setImages] = useState<ImageInfo[]>([]);
  const [imageMap, setImageMap] = useState<Map<string, string>>(new Map());
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('sessions');

  const fetchData = useCallback(async (opts?: { silent?: boolean }) => {
    if (!opts?.silent) setLoading(true);
    clearImageCache();
    const [sessionsData, imagesData] = await Promise.all([
      getAllSessions(),
      getImages(),
    ]);
    setSessions(sessionsData);
    setImages(imagesData);
    setImageMap(new Map(imagesData.map(img => [img.id, img.title])));
    setLoading(false);
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const handleDelete = async (sessionId: string) => {
    const success = await deleteSession(sessionId);
    if (success) {
      setSessions(prev => prev.filter(s => s.session_id !== sessionId));
    }
  };

  return (
    <AdminGate>
      <style>{`
        .admin-page {
          min-height: 100vh;
          background: #FBFAF8;
          font-family: 'Azeret Mono', monospace;
          padding: 40px;
        }
        .admin-container {
          max-width: 960px;
          margin: 0 auto;
        }
        .admin-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 32px;
        }
        .admin-header h1 {
          font-size: 18px;
          font-weight: 600;
          color: #333;
        }
        .admin-header a {
          font-size: 12px;
          color: #888;
          text-decoration: none;
        }
        .admin-header a:hover {
          color: #333;
        }
      `}</style>
      <div className="admin-page">
        <div className="admin-container">
          <div className="admin-header">
            <h1>Admin</h1>
            <a href="/">← Back to gallery</a>
          </div>

          {loading ? (
            <p className="text-sm text-muted-foreground">Loading…</p>
          ) : (
            <>
              <StatsCards sessions={sessions} images={images} />
              <Tabs value={activeTab} onValueChange={setActiveTab}>
                <TabsList>
                  <TabsTrigger value="sessions">Sessions</TabsTrigger>
                  <TabsTrigger value="images">Images</TabsTrigger>
                </TabsList>
                <TabsContent value="sessions">
                  <SessionsTab
                    sessions={sessions}
                    imageMap={imageMap}
                    onDelete={handleDelete}
                  />
                </TabsContent>
                <TabsContent value="images">
                  <ImagesTab
                    images={images}
                    onRefresh={() => fetchData({ silent: true })}
                  />
                </TabsContent>
              </Tabs>
            </>
          )}
        </div>
      </div>
    </AdminGate>
  );
}
