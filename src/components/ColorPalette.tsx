import React from 'react';
import { useAnnotations } from '../context/AnnotationContext';

const PALETTE_COLORS = [
  '#2CA800', // Green
  '#2DB9DD', // Blue
  '#FFE900', // Yellow
  '#FF49B0', // Pink
];

interface ColorPaletteProps {
  className?: string;
}

const ColorPalette: React.FC<ColorPaletteProps> = ({ className = '' }) => {
  const { selectedColor, setSelectedColor } = useAnnotations();

  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <div className="text-xs text-[#666666] font-normal mr-2" style={{ 
        fontFamily: 'Azeret Mono, monospace',
        letterSpacing: '0.5px'
      }}>
        color
      </div>
      <div className="flex items-center gap-1">
        {PALETTE_COLORS.map((color, index) => (
          <button
            key={color}
            onClick={() => setSelectedColor(color)}
            className="w-5 h-5 border transition-all hover:scale-110 rounded-full"
            style={{
              backgroundColor: color,
              borderWidth: selectedColor === color ? '2px' : '1px',
              borderColor: selectedColor === color ? '#333333' : '#666666',
            }}
            title={`Color ${index + 1}: ${color}`}
          />
        ))}
      </div>
    </div>
  );
};

export default ColorPalette; 