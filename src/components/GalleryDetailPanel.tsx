import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import SessionViewer from './SessionViewer';
import { toSentenceCase } from '../lib/utils';

interface GalleryDetailPanelProps {
  hovered?: { image: any; session?: any } | null;
  selected?: { image: any; session?: any } | null;
}

const panelStyle: React.CSSProperties = {
  flex: '1 1 50%',
  maxWidth: '1032px',
  minWidth: '400px',
  padding: 36,
  background: '#FBFAF8',
  height: '100%',
  overflowY: 'auto',
};

function formatDuration(ms: number): string {
  const seconds = Math.floor(ms / 1000);
  const minutes = Math.floor(seconds / 60);
  const rem = seconds % 60;
  if (minutes > 0) return `${minutes}m ${rem}s`;
  return `${seconds}s`;
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

const PrepareSessionPanel: React.FC<{ image: any; onStart: () => void }> = ({ image, onStart }) => (
  <div>
    <div className="gallery-title-section">
      Prepare for Seeing Session
    </div>
    <div style={{ marginBottom: 24 }}>
      <p className="gallery-text-body" style={{ marginBottom: 16 }}>
        You are about to start a seeing session for:
      </p>
      <div className="gallery-title-sub">
        {toSentenceCase(image.title)}
      </div>
      <div
        className="gallery-image-container"
        style={{ margin: '16px 0' }}
      >
        <img
          src={image.thumbnail}
          alt={image.title}
        />
      </div>
      <p className="gallery-text-secondary" style={{ marginBottom: 0 }}>
        You will start a sort of "seeing meditation" of this image. All you need to do is to see the image, imagine engaging your hand with it, touch the corners, hover, trace, like seeing with your hand(s).<br /><br />
        Would love for you to share your narration as well, as well as the ambient sound of your environment. If that is fine with you, click the record audio button. At the end, you'll be prompted to share some context about your session.
      </p>
    </div>
    <button
      className="gallery-button gallery-button-large gallery-button-text-large"
      style={{ marginTop: 8 }}
      onClick={onStart}
    >
      Start Seeing Session
    </button>
  </div>
);

const GalleryDetailPanel: React.FC<GalleryDetailPanelProps> = ({ hovered, selected }) => {
  const [showPrepare, setShowPrepare] = useState(false);
  const navigate = useNavigate();

  const display = selected || hovered;

  const selectedImageId = selected?.image?.id;
  const selectedSessionId = selected?.session?.id;
  useEffect(() => {
    setShowPrepare(false);
  }, [selectedImageId, selectedSessionId]);

  if (!display || !display.image) {
    return (
      <div style={panelStyle}>
        <div className="gallery-text-placeholder">
          Hover over an image or session to see details here.
        </div>
      </div>
    );
  }

  if (showPrepare) {
    const handleStart = () => {
      const sessionId = `sess${Math.floor(Math.random() * 100000)}`;
      navigate(`/session/${display.image.id}/${sessionId}`);
    };
    return (
      <div style={panelStyle}>
        <PrepareSessionPanel image={display.image} onStart={handleStart} />
      </div>
    );
  }

  const session = display.session;

  if (session) {
    return (
      <div style={panelStyle}>
        <SessionViewer
          key={session.id}
          session={session}
          imageUrl={display.image.thumbnail}
          imageTitle={toSentenceCase(display.image.title)}
        />
      </div>
    );
  }

  return (
    <div style={panelStyle}>
      <div className="gallery-title-main">
        {toSentenceCase(display.image.title)}
      </div>
      <div
        className="gallery-image-container"
        style={{ marginBottom: 24 }}
      >
        <img
          src={display.image.thumbnail}
          alt={display.image.title}
        />
      </div>
      <div>
        {display.image.caption && (
          <div className="gallery-text-secondary" style={{ marginBottom: 16 }}>
            {display.image.caption}
          </div>
        )}
        <button
          className="gallery-button gallery-button-text"
          onClick={() => setShowPrepare(true)}
        >
          start seeing session
        </button>
      </div>
    </div>
  );
};

export default GalleryDetailPanel;
