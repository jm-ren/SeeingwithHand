import React, { useState } from 'react';
import GalleryCataloguePanel from './components/GalleryCataloguePanel';
import GalleryDetailPanel from './components/GalleryDetailPanel';

const GalleryLayout: React.FC = () => {
  // State for hovered and selected image/session
  const [hovered, setHovered] = useState<{ image: any; session?: any } | null>(null);
  const [selected, setSelected] = useState<{ image: any; session?: any } | null>(null);

  return (
    <div style={{ display: 'flex', height: '100vh', background: '#FBFAF8', fontFamily: 'Azeret Mono, monospace' }}>
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
  );
};

export default GalleryLayout; 