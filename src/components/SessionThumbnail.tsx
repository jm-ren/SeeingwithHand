import React from 'react';
import { Annotation, Point } from '../types/annotations';

interface SessionThumbnailProps {
  imageSrc: string;
  annotations: Annotation[];
  alt?: string;
}

function renderAnnotation(annotation: Annotation, key: string): React.ReactNode {
  const { type, points, color } = annotation;
  const stroke = color || '#2CA800';
  const nonScaling = { vectorEffect: 'non-scaling-stroke' as const };

  switch (type) {
    case 'point':
      if (points[0]) {
        return (
          <circle
            key={key}
            cx={points[0].x}
            cy={points[0].y}
            r={0.015}
            fill={stroke}
          />
        );
      }
      return null;

    case 'line':
      if (points.length >= 2) {
        return (
          <line
            key={key}
            x1={points[0].x}
            y1={points[0].y}
            x2={points[points.length - 1].x}
            y2={points[points.length - 1].y}
            stroke={stroke}
            fill="none"
            strokeWidth={1.5}
            {...nonScaling}
          />
        );
      }
      return null;

    case 'freehand': {
      if (points.length < 2) return null;
      const d = points
        .map((p: Point, i: number) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`)
        .join(' ');
      return (
        <path
          key={key}
          d={d}
          stroke={stroke}
          fill="none"
          strokeWidth={1.5}
          strokeLinecap="round"
          strokeLinejoin="round"
          {...nonScaling}
        />
      );
    }

    case 'frame':
      if (points.length >= 3) {
        const pts = points.map((p: Point) => `${p.x},${p.y}`).join(' ');
        return (
          <polygon
            key={key}
            points={pts}
            stroke={stroke}
            fill="none"
            strokeWidth={1.5}
            {...nonScaling}
          />
        );
      }
      return null;

    case 'area':
      if (points.length >= 3) {
        const pts = points.map((p: Point) => `${p.x},${p.y}`).join(' ');
        return (
          <polygon
            key={key}
            points={pts}
            stroke={stroke}
            fill={stroke}
            fillOpacity={0.2}
            strokeWidth={1.5}
            {...nonScaling}
          />
        );
      }
      return null;

    default:
      return null;
  }
}

const SessionThumbnail: React.FC<SessionThumbnailProps> = ({
  imageSrc,
  annotations,
  alt = '',
}) => {
  return (
    <div style={{ position: 'relative', width: '100%' }}>
      <img
        src={imageSrc}
        alt={alt}
        style={{ width: '100%', height: 'auto', display: 'block' }}
      />
      {annotations.length > 0 && (
        <svg
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            width: '100%',
            height: '100%',
            pointerEvents: 'none',
          }}
          viewBox="0 0 1 1"
          preserveAspectRatio="none"
        >
          {annotations.map((ann, i) => renderAnnotation(ann, `ann-${ann.id || i}`))}
        </svg>
      )}
    </div>
  );
};

export default SessionThumbnail;
