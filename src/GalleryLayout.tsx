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
          height: calc(100vh - 80px); /* Subtract header height */
          width: 100%;
          max-width: 2072px;
          min-width: 800px;
        }
        
        /* Browser width > 11 inches (≈1056px): 15% padding */
        @media screen and (min-width: 1400px) {
          .gallery-container {
            padding: 0 15vw;
          }
        }
        
        /* Browser width 8-11 inches (768px-1400px): 8% padding */
        @media screen and (min-width: 768px) and (max-width: 1399px) {
          .gallery-container {
            padding: 0 8vw;
          }
        }
        
        /* Browser width < 8 inches (≈768px): minimal padding */
        @media screen and (max-width: 767px) {
          .gallery-container {
            padding: 0 20px;
          }
        }
        
        /* Custom scrollbar styling */
        .gallery-content ::-webkit-scrollbar {
          width: 1.5px; /* 50% thinner than 3px */
        }
        
        .gallery-content ::-webkit-scrollbar-track {
          background: transparent;
          border-radius: 0; /* Ensure track is not rounded */
        }
        
        .gallery-content ::-webkit-scrollbar-thumb {
          background: #CCCCCC; /* Light grey to match dividers */
          border-radius: 0 !important; /* Force no rounding */
        }
        
        .gallery-content ::-webkit-scrollbar-thumb:hover {
          background: #B8B8B8; /* Slightly darker on hover */
          border-radius: 0 !important; /* Force no rounding on hover */
        }
        
        /* Firefox scrollbar styling */
        .gallery-content {
          scrollbar-width: thin;
          scrollbar-color: #CCCCCC transparent;
        }
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