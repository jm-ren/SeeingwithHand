import React from 'react';

const Header: React.FC = () => {
  return (
    <header style={{
      background: '#FBFAF8',
      borderBottom: '1px solid #CCCCCC',
      padding: '20px 0',
      fontFamily: 'Azeret Mono, monospace'
    }}>
      <div style={{
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        maxWidth: '2072px',
        margin: '0 auto',
        padding: '0 20px'
      }}>
        <img 
          src="/co-see-horizontal logo.svg" 
          alt="Co-See Logo" 
          style={{
            height: '20px',
            objectFit: 'contain'
          }}
        />
      </div>
    </header>
  );
};

export default Header; 