import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';

interface GalleryDetailPanelProps {
  hovered?: { image: any; session?: any } | null;
  selected?: { image: any; session?: any } | null;
}

const PrepareSessionPanel: React.FC<{ image: any; onStart: () => void }> = ({ image, onStart }) => (
  <div>
    <div style={{ 
      fontFamily: 'Azeret Mono, monospace',
      fontWeight: 500, 
      fontSize: '20px', 
      letterSpacing: '0.5px',
      color: '#333333',
      marginBottom: 16 
    }}>
      Prepare for Seeing Session
    </div>
    <div style={{ marginBottom: 24 }}>
      <p style={{
        fontFamily: 'Azeret Mono, monospace',
        fontSize: '14px',
        fontWeight: 400,
        letterSpacing: '0.5px',
        color: '#333333',
        lineHeight: '1.5',
        marginBottom: 16
      }}>
        You are about to start a seeing session for:
      </p>
      <div style={{ 
        fontFamily: 'Azeret Mono, monospace',
        fontWeight: 500, 
        fontSize: '16px',
        letterSpacing: '0.5px',
        color: '#333333'
      }}>
        {image.title}
      </div>
      <div style={{ 
        width: '100%', 
        maxHeight: 400,
        background: '#FFFFFF',
        border: '1px solid #CCCCCC',
        borderRadius: '0',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'flex-start',
        margin: '16px 0' 
      }}>
        <img 
          src={image.thumbnail} 
          alt={image.title} 
          style={{ 
            width: '100%',
            maxHeight: 400,
            objectFit: 'contain',
            display: 'block',
            border: 'none'
          }} 
        />
      </div>
      <p style={{ 
        fontFamily: 'Azeret Mono, monospace',
        color: '#666666', 
        fontSize: '14px',
        fontWeight: 400,
        letterSpacing: '0.5px',
        lineHeight: '1.6',
        marginBottom: 0
      }}>
        You will start a sort of "seeing meditation" of this image. All you need to do is to see the image, imagine engaging your hand with it, touch the corners, hover, trace, like seeing with your hand(s).<br /><br />
        Would love for you to share your narration as well, as well as the ambient sound of your environment. If that is fine with you, click the record audio button. At the end, you'll be prompted to share some context about your session.
      </p>
    </div>
    <button
      style={{
        padding: '12px 32px',
        background: '#DD4627',
        color: '#FFFFFF',
        border: '1px solid #666666',
        borderRadius: '0',
        fontFamily: 'Azeret Mono, monospace',
        fontWeight: 500,
        fontSize: '16px',
        letterSpacing: '0.5px',
        cursor: 'pointer',
        marginTop: 8,
        transition: 'all 0.2s ease'
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.backgroundColor = '#B73A20';
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.backgroundColor = '#DD4627';
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
      <div style={{ 
        flex: '1 1 50%', 
        maxWidth: '1032px',
        minWidth: '400px',
        padding: 36, 
        background: '#FBFAF8', 
        height: '100%', 
        overflowY: 'auto',
        fontFamily: 'Azeret Mono, monospace',
        color: '#666666', 
        fontStyle: 'italic',
        fontSize: '14px',
        fontWeight: 400,
        letterSpacing: '0.5px'
      }}>
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
        <div style={{ 
          fontFamily: 'Azeret Mono, monospace',
          fontWeight: 500, 
          fontSize: '20px', 
          letterSpacing: '0.5px',
          color: '#333333',
          marginBottom: 16 
        }}>
          Drawing/Recording Tool (placeholder)
        </div>
        <p style={{
          fontFamily: 'Azeret Mono, monospace',
          fontSize: '14px',
          fontWeight: 400,
          letterSpacing: '0.5px',
          color: '#333333'
        }}>
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
      <div style={{ 
        fontFamily: 'Azeret Mono, monospace',
        fontWeight: 500, 
        fontSize: '22px', 
        letterSpacing: '0.5px',
        color: '#333333',
        marginBottom: 16 
      }}>
        {display.image.title}
      </div>
      <div style={{ 
        width: '100%', 
        maxHeight: 400,
        background: '#FFFFFF',
        border: '1px solid #CCCCCC',
        borderRadius: '0',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'flex-start',
        marginBottom: 24 
      }}>
        <img
          src={display.image.thumbnail}
          alt={display.image.title}
          style={{ 
            width: '100%', 
            maxHeight: 400,
            objectFit: 'contain',
            display: 'block',
            border: 'none'
          }}
        />
      </div>
      {display.session ? (
        <div style={{ marginBottom: 16 }}>
          <div style={{ 
            fontFamily: 'Azeret Mono, monospace',
            fontWeight: 500, 
            fontSize: '16px',
            letterSpacing: '0.5px',
            color: '#333333'
          }}>
            {display.session.name}
          </div>
          <div style={{ 
            fontFamily: 'Azeret Mono, monospace',
            color: '#666666', 
            fontSize: '12px',
            fontWeight: 400,
            letterSpacing: '0.5px'
          }}>
            by {display.session.user}
          </div>
        </div>
      ) : (
        <div style={{ 
          marginBottom: 16, 
          fontFamily: 'Azeret Mono, monospace',
          color: '#666666',
          fontSize: '14px',
          fontWeight: 400,
          letterSpacing: '0.5px'
        }}>
          No session selected
        </div>
      )}
      {/* TODO: Add prepare/session/survey logic here */}
    </div>
  );
};

export default GalleryDetailPanel; 