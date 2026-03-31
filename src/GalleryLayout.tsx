import React, { useState } from 'react';
import GalleryCataloguePanel from './components/GalleryCataloguePanel';
import GalleryDetailPanel from './components/GalleryDetailPanel';
import Header from './components/Header';

const GalleryLayout: React.FC = () => {
  // State for hovered and selected image/session
  const [hovered, setHovered] = useState<{ image: any; session?: any } | null>(null);
  const [selected, setSelected] = useState<{ image: any; session?: any } | null>(null);

  return (
    <>
      <style>{`
        .gallery-page {
          display: flex;
          flex-direction: column;
          min-height: 100vh;
          background: #FBFAF8;
          font-family: 'Azeret Mono', monospace;
        }

        .gallery-container {
          display: flex;
          justify-content: center;
          align-items: flex-start;
          flex: 1;
          box-sizing: border-box;
        }

        .gallery-content {
          display: flex;
          height: calc(100vh - 80px);
          width: 100%;
          max-width: 1161px;
          min-width: 800px;
          scrollbar-width: thin;
          scrollbar-color: #CCCCCC transparent;
        }

        @media screen and (min-width: 1400px) {
          .gallery-container { padding: 0 15vw; }
          .gallery-content { min-width: 1000px; }
        }

        @media screen and (min-width: 768px) and (max-width: 1399px) {
          .gallery-container { padding: 0 8vw; }
          .gallery-content { min-width: 800px; }
          .gallery-content > div:first-child { padding: 28px; flex: 1 1 55%; max-width: 55%; }
          .gallery-content > div:last-child  { padding: 28px; flex: 1 1 45%; max-width: 45%; }
        }

        @media screen and (max-width: 767px) {
          .gallery-container { padding: 0 20px; }
          .gallery-content {
            flex-direction: column;
            height: auto;
            min-width: 100%;
            max-width: 100%;
          }
          .gallery-content > div:first-child {
            border-right: none;
            border-bottom: 1px solid #CCCCCC;
            padding: 24px;
            flex: none;
            max-width: 100%;
            min-width: 100%;
            height: auto;
          }
          .gallery-content > div:last-child {
            padding: 24px;
            flex: none;
            max-width: 100%;
            min-width: 100%;
            height: auto;
          }
        }

        @media screen and (max-width: 480px) {
          .gallery-container { padding: 0 16px; }
        }

        .gallery-content ::-webkit-scrollbar { width: 1.5px; }
        .gallery-content ::-webkit-scrollbar-track { background: transparent; border-radius: 0; }
        .gallery-content ::-webkit-scrollbar-thumb { background: #CCCCCC; border-radius: 0 !important; }
        .gallery-content ::-webkit-scrollbar-thumb:hover { background: #B8B8B8; border-radius: 0 !important; }
      `}</style>
      
      <div className="gallery-page">
        <Header />
        <div className="gallery-container">
          <div className="gallery-content">
            <GalleryCataloguePanel
              onHover={(image, session) => setHovered({ image, session })}
              onSelect={(image, session) => setSelected({ image, session })}
              selected={selected ? { imageId: selected.image.id, sessionId: selected.session?.id } : null}
            />
            <GalleryDetailPanel
              hovered={hovered}
              selected={selected}
            />
          </div>
        </div>
      </div>
    </>
  );
};

export default GalleryLayout; 