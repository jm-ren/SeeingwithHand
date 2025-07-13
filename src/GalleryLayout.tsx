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
        
        /* Responsive Typography System */
        /* Main titles - largest headings */
        .gallery-title-main {
          font-family: 'Azeret Mono', monospace;
          font-weight: 400;
          color: #333333;
          letter-spacing: -0.5px;
          margin-bottom: 16px;
          font-size: clamp(13px, 2.0vw, 15px);
          line-height: 1.0;
        }
        
        /* Section headers */
        .gallery-title-section {
          font-family: 'Azeret Mono', monospace;
          font-weight: 400;
          color: #333333;
          letter-spacing: 0.0px;
          margin-bottom: 8px;
          font-size: clamp(12px, 1.0vw, 14px);
          line-height: 1.0;
        }
        
        /* Subtitle/medium titles */
        .gallery-title-sub {
          font-family: 'Azeret Mono', monospace;
          font-weight: 400;
          color: #333333;
          letter-spacing: -0.3px;
          font-size: clamp(11px, 1.4vw, 13px);
          line-height: 1.0;
        }
        
        /* Body text */
        .gallery-text-body {
          font-family: 'Azeret Mono', monospace;
          font-weight: 400;
          color: #333333;
          letter-spacing: -0.2px;
          font-size: clamp(9px, 1.1vw, 11px);
          line-height: 1.2;
        }
        
        /* Secondary/muted text */
        .gallery-text-secondary {
          font-family: 'Azeret Mono', monospace;
          font-weight: 400;
          color: #666666;
          letter-spacing: 0.2px;
          font-size: clamp(9px, 1.1vw, 11px);
          line-height: 1.6;
        }
        
        /* Small text - labels, tags */
        .gallery-text-small {
          font-family: 'Azeret Mono', monospace;
          font-weight: 400;
          color: #333333;
          letter-spacing: 0.3px;
          font-size: clamp(8px, 1.0vw, 10px);
          line-height: 1.4;
        }
        
        /* Button text */
        .gallery-button-text {
          font-family: 'Azeret Mono', monospace;
          font-weight: 500;
          color: #FFFFFF;
          letter-spacing: 0.5px;
          font-size: clamp(9px, 1.1vw, 11px);
          line-height: 1;
        }
        
        /* Large button text */
        .gallery-button-text-large {
          font-family: 'Azeret Mono', monospace;
          font-weight: 500;
          color: #FFFFFF;
          letter-spacing: 0.5px;
          font-size: clamp(8px, 1.1vw, 10px);
          line-height: 1.5;
        }
        
        /* Placeholder/italic text */
        .gallery-text-placeholder {
          font-family: 'Azeret Mono', monospace;
          font-weight: 400;
          color: #666666;
          letter-spacing: 0.5px;
          font-style: italic;
          font-size: clamp(9px, 1.1vw, 11px);
          line-height: 1.4;
        }
        
        /* Responsive image containers */
        .gallery-image-container {
          width: 100%;
          background: #FFFFFF;
          border: 1px solid #CCCCCC;
          border-radius: 0;
          display: flex;
          align-items: center;
          justify-content: flex-start;
          overflow: hidden;
        }
        
        .gallery-image-container img {
          width: 100%;
          height: auto;
          max-height: 400px;
          object-fit: contain;
          display: block;
          border: none;
        }
        
        /* Responsive image adjustments */
        @media screen and (max-width: 767px) {
          .gallery-image-container {
            max-height: 300px;
          }
          
          .gallery-image-container img {
            max-height: 300px;
          }
        }
        
        @media screen and (max-width: 480px) {
          .gallery-image-container {
            max-height: 250px;
          }
          
          .gallery-image-container img {
            max-height: 250px;
          }
        }
        
        /* Responsive button utilities */
        .gallery-button {
          padding: 12px 24px;
          background: #666666;
          color: #FFFFFF;
          border: 1px solid #666666;
          border-radius: 0;
          cursor: pointer;
          transition: all 0.2s ease;
          font-family: 'Azeret Mono', monospace;
          font-weight: 500;
          letter-spacing: 0.5px;
        }
        
        .gallery-button:hover {
          background: #333333;
        }
        
        .gallery-button-large {
          padding: 12px 32px;
        }
        
        /* Responsive spacing utilities */
        .gallery-spacing-sm { margin-bottom: 8px; }
        .gallery-spacing-md { margin-bottom: 16px; }
        .gallery-spacing-lg { margin-bottom: 24px; }
        .gallery-spacing-xl { margin-bottom: 32px; }
        
        @media screen and (max-width: 767px) {
          .gallery-button {
            padding: 10px 20px;
            width: 100%;
            text-align: center;
          }
          
          .gallery-button-large {
            padding: 12px 24px;
            width: 100%;
          }
          
          .gallery-spacing-sm { margin-bottom: 6px; }
          .gallery-spacing-md { margin-bottom: 12px; }
          .gallery-spacing-lg { margin-bottom: 18px; }
          .gallery-spacing-xl { margin-bottom: 24px; }
        }
        
        @media screen and (max-width: 480px) {
          .gallery-button {
            padding: 8px 16px;
            font-size: 9px;
          }
          
          .gallery-button-large {
            padding: 10px 20px;
            font-size: 11px;
          }
          
          .gallery-spacing-sm { margin-bottom: 4px; }
          .gallery-spacing-md { margin-bottom: 8px; }
          .gallery-spacing-lg { margin-bottom: 12px; }
          .gallery-spacing-xl { margin-bottom: 16px; }
        }
        
        /* Responsive adjustments for different screen sizes */
        /* Large screens (desktop) */
        @media screen and (min-width: 1400px) {
          .gallery-container {
            padding: 0 15vw;
          }
          
          .gallery-title-main { margin-bottom: 20px; }
          .gallery-title-section { margin-bottom: 18px; }
          .gallery-content { min-width: 1000px; }
        }
        
        /* Medium screens (tablet landscape) */
        @media screen and (min-width: 768px) and (max-width: 1399px) {
          .gallery-container {
            padding: 0 8vw;
          }
          
          .gallery-title-main { margin-bottom: 16px; }
          .gallery-title-section { margin-bottom: 14px; }
          .gallery-content { min-width: 800px; }
          
          /* Tablet gallery panel adjustments */
          .gallery-content > div:first-child {
            padding: 28px;
            flex: 1 1 55%;
            max-width: 55%;
          }
          
          .gallery-content > div:last-child {
            padding: 28px;
            flex: 1 1 45%;
            max-width: 45%;
          }
        }
        
        /* Small screens (mobile) */
        @media screen and (max-width: 767px) {
          .gallery-container {
            padding: 0 20px;
          }
          
          .gallery-content {
            flex-direction: column;
            height: auto;
            min-width: 100%;
            max-width: 100%;
          }
          
          .gallery-title-main { 
            margin-bottom: 12px;
            font-size: 15px;
          }
          .gallery-title-section { 
            margin-bottom: 10px;
            font-size: 13px;
          }
          .gallery-title-sub { 
            font-size: 12px;
          }
          .gallery-text-body { 
            font-size: 10px;
            line-height: 1.6;
          }
          .gallery-text-secondary { 
            font-size: 10px;
            line-height: 1.7;
          }
          .gallery-text-small { 
            font-size: 9px;
          }
          .gallery-button-text { 
            font-size: 10px;
          }
          .gallery-button-text-large { 
            font-size: 12px;
          }
          
          /* Mobile gallery panel adjustments */
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
        
        /* Extra small screens */
        @media screen and (max-width: 480px) {
          .gallery-container {
            padding: 0 16px;
          }
          
          .gallery-title-main { 
            font-size: 14px;
            margin-bottom: 10px;
          }
          .gallery-title-section { 
            font-size: 12px;
            margin-bottom: 8px;
          }
          .gallery-title-sub { 
            font-size: 11px;
          }
          .gallery-text-body { 
            font-size: 9px;
            line-height: 1.7;
          }
          .gallery-text-secondary { 
            font-size: 9px;
            line-height: 1.8;
          }
          .gallery-text-small { 
            font-size: 8px;
          }
          .gallery-button-text { 
            font-size: 9px;
          }
          .gallery-button-text-large { 
            font-size: 11px;
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