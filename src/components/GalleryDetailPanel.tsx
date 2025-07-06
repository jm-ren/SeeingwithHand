import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';

interface GalleryDetailPanelProps {
  hovered?: { image: any; session?: any } | null;
  selected?: { image: any; session?: any } | null;
}

const PrepareSessionPanel: React.FC<{ image: any; onStart: () => void }> = ({ image, onStart }) => (
  <div>
    <div style={{ fontWeight: 600, fontSize: 22, marginBottom: 16 }}>Prepare for Seeing Session</div>
    <div style={{ marginBottom: 24 }}>
      <p>You are about to start a seeing session for:</p>
      <div style={{ fontWeight: 500, fontSize: 18 }}>{image.title}</div>
      <img src={image.thumbnail} alt={image.title} style={{ width: '100%', maxWidth: 320, borderRadius: 8, margin: '16px 0' }} />
      <p style={{ color: '#666', fontSize: 15 }}>
        You will start a sort of "seeing meditation" of this image. All you need to do is to see the image, imagine engaging your hand with it, touch the corners, hover, trace, like seeing with your hand(s).<br /><br />
        Would love for you to share your narration as well, as well as the ambient sound of your environment. If that is fine with you, click the record audio button. At the end, you'll be prompted to share some context about your session.
      </p>
    </div>
    <button
      style={{
        padding: '12px 32px',
        background: '#DD4627',
        color: '#fff',
        border: 'none',
        borderRadius: 8,
        fontWeight: 600,
        fontSize: 18,
        cursor: 'pointer',
        marginTop: 8,
      }}
      onClick={onStart}
    >
      Start Seeing Session
    </button>
  </div>
);

const GalleryDetailPanel: React.FC<GalleryDetailPanelProps> = ({ hovered, selected }) => {
  const [inSession, setInSession] = useState(false);
  const navigate = useNavigate();
  // If a selection is locked, show selected; otherwise show hovered
  const display = selected || hovered;

  if (!display || !display.image) {
    return (
      <div style={{ width: 645, minWidth: 645, maxWidth: 645, padding: 36, background: '#fff', height: '100vh', overflowY: 'auto', color: '#aaa', fontStyle: 'italic' }}>
        Hover over an image or session to see details here.
      </div>
    );
  }

  // If 'start session' is selected, show prepare page
  if (display.session && display.session.id === 'new' && !inSession) {
    const handleStart = () => {
      // Generate a mock sessionId (in real app, generate properly)
      const sessionId = `sess${Math.floor(Math.random() * 100000)}`;
      navigate(`/session/${display.image.id}/${sessionId}`);
    };
    return (
      <div style={{ width: 645, minWidth: 645, maxWidth: 645, padding: 36, background: '#fff', height: '100vh', overflowY: 'auto' }}>
        <PrepareSessionPanel image={display.image} onStart={handleStart} />
      </div>
    );
  }

  // If in session, show placeholder for drawing tool
  if (inSession) {
    return (
      <div style={{ width: 645, minWidth: 645, maxWidth: 645, padding: 36, background: '#fff', height: '100vh', overflowY: 'auto' }}>
        <div style={{ fontWeight: 600, fontSize: 22, marginBottom: 16 }}>Drawing/Recording Tool (placeholder)</div>
        <p>Here you will draw and record audio for your session.</p>
      </div>
    );
  }

  return (
    <div style={{ width: 645, minWidth: 645, maxWidth: 645, padding: 36, background: '#fff', height: '100vh', overflowY: 'auto' }}>
      <div style={{ fontWeight: 600, fontSize: 24, marginBottom: 16 }}>{display.image.title}</div>
      <img
        src={display.image.thumbnail}
        alt={display.image.title}
        style={{ width: '100%', maxWidth: 400, borderRadius: 8, marginBottom: 24 }}
      />
      {display.session ? (
        <div style={{ marginBottom: 16 }}>
          <div style={{ fontWeight: 500, fontSize: 18 }}>{display.session.name}</div>
          <div style={{ color: '#888', fontSize: 14 }}>by {display.session.user}</div>
        </div>
      ) : (
        <div style={{ marginBottom: 16, color: '#888' }}>No session selected</div>
      )}
      {/* TODO: Add prepare/session/survey logic here */}
    </div>
  );
};

export default GalleryDetailPanel; 