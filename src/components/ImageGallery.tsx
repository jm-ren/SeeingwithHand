import React, { useEffect, useState } from 'react';

interface ImageMeta {
  filename: string;
  title: string;
  caption: string;
  uploaded_by: string;
  upload_date: string;
  source_url: string;
  display_order: number;
}

const CANVAS_WIDTH = 320;
const CANVAS_HEIGHT = 240;

const ImageGallery: React.FC = () => {
  const [images, setImages] = useState<ImageMeta[]>([]);
  const [hoveredImage, setHoveredImage] = useState<ImageMeta | null>(null);

  useEffect(() => {
    fetch('/images/images.json')
      .then((res) => res.json())
      .then((data) => {
        // Sort by display_order
        setImages(data.sort((a: ImageMeta, b: ImageMeta) => a.display_order - b.display_order));
      });
  }, []);

  return (
    <div style={{ display: 'flex', height: '100vh', fontFamily: 'Azeret Mono, monospace' }}>
      {/* Left Panel: Image Catalogue */}
      <div style={{ 
        width: 360, 
        overflowY: 'auto', 
        borderRight: '1px solid #666666', 
        padding: 16,
        background: '#FBFAF8'
      }}>
        {images.map((img) => (
          <div
            key={img.filename}
            style={{ marginBottom: 32, cursor: 'pointer' }}
            onMouseEnter={() => setHoveredImage(img)}
            onMouseLeave={() => setHoveredImage(null)}
          >
            <div
              style={{
                width: CANVAS_WIDTH,
                height: CANVAS_HEIGHT,
                background: '#FFFFFF',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                border: '1px solid #CCCCCC',
                borderRadius: '0',
                marginBottom: 8,
              }}
            >
              <img
                src={`/images/${img.filename}`}
                alt={img.title}
                style={{
                  maxWidth: '100%',
                  maxHeight: '100%',
                  objectFit: 'contain',
                  display: 'block',
                  border: 'none',
                }}
              />
            </div>
            <div style={{ 
              fontFamily: 'Azeret Mono, monospace',
              fontWeight: 500,
              fontSize: '14px',
              letterSpacing: '0.5px',
              color: '#333333'
            }}>
              {img.title}
            </div>
          </div>
        ))}
      </div>

      {/* Right Panel: Details */}
      <div style={{ flex: 1, padding: 32, background: '#FFFFFF' }}>
        {hoveredImage ? (
          <div>
            <h2 style={{ 
              marginTop: 0,
              fontFamily: 'Azeret Mono, monospace',
              fontSize: '20px',
              fontWeight: 500,
              letterSpacing: '0.5px',
              color: '#333333'
            }}>
              {hoveredImage.title}
            </h2>
            <p style={{
              fontFamily: 'Azeret Mono, monospace',
              fontSize: '14px',
              fontWeight: 400,
              letterSpacing: '0.5px',
              color: '#333333',
              lineHeight: '1.6'
            }}>
              {hoveredImage.caption}
            </p>
            <p style={{
              fontFamily: 'Azeret Mono, monospace',
              fontSize: '14px',
              fontWeight: 400,
              letterSpacing: '0.5px',
              color: '#333333'
            }}>
              <strong>Uploaded by:</strong> {hoveredImage.uploaded_by}
            </p>
            <p style={{
              fontFamily: 'Azeret Mono, monospace',
              fontSize: '14px',
              fontWeight: 400,
              letterSpacing: '0.5px',
              color: '#333333'
            }}>
              <strong>Upload date:</strong> {hoveredImage.upload_date}
            </p>
            <p style={{
              fontFamily: 'Azeret Mono, monospace',
              fontSize: '14px',
              fontWeight: 400,
              letterSpacing: '0.5px',
              color: '#333333'
            }}>
              <strong>Source:</strong>{' '}
              <a 
                href={hoveredImage.source_url} 
                target="_blank" 
                rel="noopener noreferrer"
                style={{
                  color: '#DD4627',
                  textDecoration: 'underline'
                }}
              >
                {hoveredImage.source_url}
              </a>
            </p>
          </div>
        ) : (
          <div style={{ 
            fontFamily: 'Azeret Mono, monospace',
            color: '#666666', 
            fontStyle: 'italic',
            fontSize: '14px',
            fontWeight: 400,
            letterSpacing: '0.5px'
          }}>
            Hover over an image to see details here.
          </div>
        )}
      </div>
    </div>
  );
};

export default ImageGallery; 