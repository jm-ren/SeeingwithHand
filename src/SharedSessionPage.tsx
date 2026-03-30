import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { SessionData, getSessionBySlug } from './lib/supabase';
import { ImageInfo, getImages, getImageThumbnail } from './lib/images';
import SessionViewer from './components/SessionViewer';
import ErrorBoundary from './components/ErrorBoundary';

const SharedSessionPage: React.FC = () => {
  const { shareSlug } = useParams<{ shareSlug: string }>();
  const [session, setSession] = useState<SessionData | null | undefined>(undefined);
  const [image, setImage] = useState<ImageInfo | null>(null);

  useEffect(() => {
    if (!shareSlug) {
      setSession(null);
      return;
    }

    let cancelled = false;

    async function load() {
      const [found, images] = await Promise.all([
        getSessionBySlug(shareSlug!),
        getImages(),
      ]);

      if (cancelled) return;

      setSession(found);
      if (found) {
        const match = images.find(img => img.id === found.image_id) || null;
        setImage(match);
      }
    }

    load();
    return () => { cancelled = true; };
  }, [shareSlug]);

  return (
    <div style={{
      minHeight: '100vh',
      backgroundColor: '#FBFAF8',
      display: 'flex',
      flexDirection: 'column',
    }}>
      {/* Header — matches the main app Header component */}
      <header style={{
        background: '#FBFAF8',
        borderBottom: '1px solid #CCCCCC',
        padding: 'clamp(16px, 2.5vw, 20px) 32px',
        fontFamily: 'Azeret Mono, monospace',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
      }}>
        <Link to="/gallery" style={{ display: 'flex', alignItems: 'center', textDecoration: 'none' }}>
          <img
            src="/co-see-horizontal logo.svg"
            alt="Co-see"
            style={{
              height: 'clamp(16px, 2.5vw, 20px)',
              objectFit: 'contain',
            }}
          />
        </Link>
        <Link
          to="/gallery"
          style={{
            fontFamily: 'Azeret Mono, monospace',
            fontSize: '11px',
            color: '#666666',
            textDecoration: 'none',
            letterSpacing: '0.5px',
          }}
        >
          ← Back to gallery
        </Link>
      </header>

      {/* Content */}
      <div style={{
        flex: 1,
        display: 'flex',
        justifyContent: 'center',
        padding: '40px 24px',
      }}>
        <div style={{ width: '100%', maxWidth: '720px' }}>
          {session === undefined && (
            <div style={{
              fontFamily: 'Azeret Mono, monospace',
              fontSize: '12px',
              color: '#666666',
              textAlign: 'center',
              paddingTop: 80,
            }}>
              Loading…
            </div>
          )}

          {session === null && (
            <div style={{
              fontFamily: 'Azeret Mono, monospace',
              fontSize: '13px',
              color: '#333333',
              textAlign: 'center',
              paddingTop: 80,
            }}>
              <div style={{ marginBottom: 12 }}>Session not found.</div>
              <Link
                to="/gallery"
                style={{
                  fontSize: '11px',
                  color: '#666666',
                  textDecoration: 'underline',
                  letterSpacing: '0.5px',
                }}
              >
                Browse the gallery
              </Link>
            </div>
          )}

          {session && (
            <ErrorBoundary context="Shared Session Viewer">
              <SessionViewer
                session={session}
                imageUrl={image ? getImageThumbnail(image) : ''}
                imageTitle={image?.title || session.session_name}
                showComments={false}
              />
            </ErrorBoundary>
          )}
        </div>
      </div>
    </div>
  );
};

export default SharedSessionPage;
