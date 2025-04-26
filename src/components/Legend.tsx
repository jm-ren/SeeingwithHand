import React from 'react';

interface LegendItem {
  color: string;
  label: string;
}

const legendItems: LegendItem[] = [
  { color: '#D24237', label: 'Point' },
  { color: '#EAB22B', label: 'Line' },
  { color: '#889DF0', label: 'Frame' },
  { color: '#1E6287', label: 'Area' },
  { color: '#10191B', label: 'Free Hand' },
];

const Legend: React.FC = () => {
  return (
    <div className="flex items-center gap-16">
      {legendItems.map((item, index) => (
        <div key={index} className="flex flex-col items-center gap-1.5">
          <div 
            className="w-[96px] h-[6px]" 
            style={{ backgroundColor: item.color }}
          />
          <span 
            className="text-sm" 
            style={{ 
              fontFamily: 'Inter, sans-serif',
              color: '#1A1A1A'
            }}
          >
            {item.label}
          </span>
        </div>
      ))}
    </div>
  );
};

export default Legend; 