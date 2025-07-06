import React, { useState } from 'react';

// Mock data structure for images and sessions
const mockImages = [
  {
    id: 'img1',
    title: 'Agnes Martin in New Mexico',
    thumbnail: '/images/image 002_agnes martin.png',
    sessions: [
      { id: 'sess1', name: 'session 0001', user: 'paloma' },
      { id: 'sess2', name: 'session 0002', user: 'alex' },
    ],
  },
  {
    id: 'img2',
    title: 'Morandi Landscape Cottage',
    thumbnail: '/images/image 003_morandi_landscape_cottage.png',
    sessions: [
      { id: 'sess3', name: 'session 0001', user: 'jiamin' },
    ],
  },
];

interface GalleryCataloguePanelProps {
  onHover: (image: any, session?: any) => void;
  onSelect: (image: any, session?: any) => void;
  selected: { imageId: string; sessionId?: string } | null;
}

const GalleryCataloguePanel: React.FC<Partial<GalleryCataloguePanelProps>> = ({
  onHover = () => {},
  onSelect = () => {},
  selected = null,
}) => {
  const [locked, setLocked] = useState<{ imageId: string; sessionId?: string } | null>(selected);

  const handleHover = (image: any, session?: any) => {
    if (!locked) onHover(image, session);
  };

  const handleClick = (image: any, session?: any) => {
    setLocked({ imageId: image.id, sessionId: session?.id });
    onSelect(image, session);
  };

  return (
    <div style={{ width: 650, minWidth: 650, maxWidth: 650, overflowY: 'auto', borderRight: '1px solid #eee', padding: 24, background: '#F1EEEA', height: '100vh' }}>
      {mockImages.map((img) => (
        <div key={img.id} style={{ marginBottom: 48 }}>
          <div
            style={{
              width: 320,
              height: 240,
              background: '#fafafa',
              border: '1px solid #ddd',
              borderRadius: 8,
              marginBottom: 8,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              boxShadow: locked?.imageId === img.id && !locked.sessionId ? '0 0 0 2px #4285F4' : undefined,
            }}
            onMouseEnter={() => handleHover(img)}
            onClick={() => handleClick(img)}
          >
            <img
              src={img.thumbnail}
              alt={img.title}
              style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain', display: 'block' }}
            />
          </div>
          <div style={{ fontWeight: 600 }}>{img.title}</div>
          <div style={{ marginTop: 12, display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            {img.sessions.map((sess: any) => (
              <div
                key={sess.id}
                style={{
                  padding: '8px 16px',
                  background: '#fff',
                  border: '1px solid #bbb',
                  borderRadius: 6,
                  cursor: 'pointer',
                  fontSize: 14,
                  boxShadow: locked?.imageId === img.id && locked.sessionId === sess.id ? '0 0 0 2px #4285F4' : undefined,
                }}
                onMouseEnter={() => handleHover(img, sess)}
                onClick={() => handleClick(img, sess)}
              >
                {sess.name} <span style={{ color: '#888', fontSize: 12 }}>({sess.user})</span>
              </div>
            ))}
          </div>
          <div style={{ marginTop: 16 }}>
            <button
              style={{
                padding: '10px 24px',
                background: '#DD4627',
                color: '#fff',
                border: 'none',
                borderRadius: 8,
                fontWeight: 600,
                fontSize: 16,
                cursor: 'pointer',
                marginTop: 8,
                opacity: 0.9,
              }}
              onClick={() => handleClick(img, { id: 'new', name: 'start session' })}
            >
              start session
            </button>
          </div>
        </div>
      ))}
    </div>
  );
};

export default GalleryCataloguePanel; 