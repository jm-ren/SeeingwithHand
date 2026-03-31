import React, { useState, useEffect } from 'react';
import { getSessionsByImage, SessionData } from '../lib/supabase';
import { getImages, getImageThumbnail, ImageInfo } from '../lib/images';
import SessionThumbnail from './SessionThumbnail';
import { toSentenceCase } from '../lib/utils';

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
  const [images, setImages] = useState<(ImageInfo & { thumbnail: string })[]>([]);
  const [imageSessions, setImageSessions] = useState<{ [imageId: string]: SessionData[] }>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchAll = async () => {
      setLoading(true);
      const imageList = await getImages();
      const withThumbs = imageList.map(img => ({
        ...img,
        thumbnail: getImageThumbnail(img),
      }));
      setImages(withThumbs);

      const sessionsByImage: { [imageId: string]: SessionData[] } = {};
      for (const image of imageList) {
        try {
          sessionsByImage[image.id] = await getSessionsByImage(image.id);
        } catch (error) {
          console.error(`Error fetching sessions for image ${image.id}:`, error);
          sessionsByImage[image.id] = [];
        }
      }
      setImageSessions(sessionsByImage);
      setLoading(false);
    };

    fetchAll();
  }, []);

  const handleHover = (image: any, session?: any) => {
    if (!locked) onHover(image, session);
  };

  const handleClick = (image: any, session?: any) => {
    setLocked({ imageId: image.id, sessionId: session?.id });
    onSelect(image, session);
  };

  if (loading) {
    return (
      <div style={{ 
        flex: '1 1 50%', 
        maxWidth: '582px',
        minWidth: '400px',
        padding: 36, 
        background: '#FBFAF8', 
        height: '100%', 
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'center'
      }}>
        <div className="gallery-text-body">Loading sessions...</div>
      </div>
    );
  }

  return (
    <div style={{ 
      flex: '1 1 50%', 
      maxWidth: '582px',
      minWidth: '400px',
      overflowY: 'auto', 
      borderRight: '1px solid #CCCCCC', 
      padding: 36, 
      background: '#FBFAF8', 
      height: '100%'
    }}>
      {images.map((img) => {
        const sessions = imageSessions[img.id] || [];
        
        return (
          <div key={img.id} style={{ marginBottom: 48 }}>
            <div
              style={{
                width: '100%',
                height: 'calc(100% * 3 / 4)',
                margin: '0 0 8px 0',
                cursor: 'pointer',
                boxShadow: locked?.imageId === img.id && !locked.sessionId ? '0 0 0 2px #333333' : undefined,
              }}
              className={`gallery-image-container${locked?.imageId !== img.id ? ' gallery-image-bw' : ''}`}
              onMouseEnter={() => handleHover(img)}
              onClick={() => handleClick(img)}
            >
              <img
                src={img.thumbnail}
                alt={img.title}
              />
            </div>
            <div className="gallery-title-sub">
              {toSentenceCase(img.title)}
            </div>
            
            {sessions.length > 0 && (
              <div style={{
                marginTop: 12,
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fill, minmax(100px, 1fr))',
                gap: 8,
              }}>
                {sessions.map((session: SessionData) => (
                  <div
                    key={session.id}
                    style={{
                      cursor: 'pointer',
                      background: '#FFFFFF',
                      border: '1px solid #CCCCCC',
                      boxShadow: locked?.imageId === img.id && locked.sessionId === session.id
                        ? '0 0 0 2px #333333'
                        : undefined,
                      overflow: 'hidden',
                    }}
                    onMouseEnter={() => handleHover(img, session)}
                    onClick={() => handleClick(img, session)}
                  >
                    <SessionThumbnail
                      imageSrc={img.thumbnail}
                      annotations={session.annotations || []}
                      alt={`${session.session_name} traces`}
                    />
                    <div style={{ padding: '4px 8px' }} className="gallery-text-small">
                      <div>{session.session_name}</div>
                      <div style={{ color: '#666666', fontSize: '0.9em' }}>
                        {session.nickname || 'anonymous'}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
};

export default GalleryCataloguePanel;
