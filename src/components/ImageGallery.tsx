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
    <div style={{ display: 'flex', height: '100vh' }}>
      {/* Left Panel: Image Catalogue */}
      <div style={{ width: 360, overflowY: 'auto', borderRight: '1px solid #eee', padding: 16 }}>
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
                background: '#fafafa',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                border: '1px solid #ddd',
                borderRadius: 8,
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
                }}
              />
            </div>
            <div style={{ fontWeight: 600 }}>{img.title}</div>
          </div>
        ))}
      </div>

      {/* Right Panel: Details */}
      <div style={{ flex: 1, padding: 32 }}>
        {hoveredImage ? (
          <div>
            <h2 style={{ marginTop: 0 }}>{hoveredImage.title}</h2>
            <p>{hoveredImage.caption}</p>
            <p>
              <strong>Uploaded by:</strong> {hoveredImage.uploaded_by}
            </p>
            <p>
              <strong>Upload date:</strong> {hoveredImage.upload_date}
            </p>
            <p>
              <strong>Source:</strong>{' '}
              <a href={hoveredImage.source_url} target="_blank" rel="noopener noreferrer">
                {hoveredImage.source_url}
              </a>
            </p>
          </div>
        ) : (
          <div style={{ color: '#aaa', fontStyle: 'italic' }}>Hover over an image to see details here.</div>
        )}
      </div>
    </div>
  );
};

export default ImageGallery; 