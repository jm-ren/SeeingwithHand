import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';

interface GalleryDetailPanelProps {
  hovered?: { image: any; session?: any } | null;
  selected?: { image: any; session?: any } | null;
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
        {image.title}
      </div>
      <div 
        className="gallery-image-container"
        style={{ 
          margin: '16px 0' 
        }}
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
  const [inSession, setInSession] = useState(false);
  const navigate = useNavigate();
  // If a selection is locked, show selected; otherwise show hovered
  const display = selected || hovered;

  if (!display || !display.image) {
    return (
      <div style={{ 
        flex: '1 1 50%', 
        maxWidth: '1032px',
        minWidth: '400px',
        padding: 36, 
        background: '#FBFAF8', 
        height: '100%', 
        overflowY: 'auto'
      }}>
        <div className="gallery-text-placeholder">
          Hover over an image or session to see details here.
        </div>
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
      <div style={{ 
        flex: '1 1 50%', 
        maxWidth: '1032px',
        minWidth: '400px',
        padding: 36, 
        background: '#FBFAF8', 
        height: '100%', 
        overflowY: 'auto' 
      }}>
        <PrepareSessionPanel image={display.image} onStart={handleStart} />
      </div>
    );
  }

  // If in session, show placeholder for drawing tool
  if (inSession) {
    return (
      <div style={{ 
        flex: '1 1 50%', 
        maxWidth: '1032px',
        minWidth: '400px',
        padding: 36, 
        background: '#FBFAF8', 
        height: '100%', 
        overflowY: 'auto' 
      }}>
        <div className="gallery-title-section">
          Drawing/Recording Tool (placeholder)
        </div>
        <p className="gallery-text-body">
          Here you will draw and record audio for your session.
        </p>
      </div>
    );
  }

  return (
    <div style={{ 
      flex: '1 1 50%', 
      maxWidth: '1032px',
      minWidth: '400px',
      padding: 36, 
      background: '#FBFAF8', 
      height: '100%', 
      overflowY: 'auto' 
    }}>
      <div className="gallery-title-main">
        {display.image.title}
      </div>
      <div 
        className="gallery-image-container"
        style={{ 
          marginBottom: 24 
        }}
      >
        <img
          src={display.image.thumbnail}
          alt={display.image.title}
        />
      </div>
      {display.session ? (
        <div style={{ marginBottom: 16 }}>
          <div className="gallery-title-sub">
            {display.session.name}
          </div>
          <div className="gallery-text-small" style={{ color: '#666666' }}>
            by {display.session.user}
          </div>
        </div>
      ) : (
        <div className="gallery-text-secondary" style={{ marginBottom: 16 }}>
          No session selected
        </div>
      )}
      {/* TODO: Add prepare/session/survey logic here */}
    </div>
  );
};

export default GalleryDetailPanel; 