import React from 'react';

const Header: React.FC = () => {
  return (
    <>
      <style>{`
        .header-container {
          display: flex;
          justify-content: center;
          align-items: center;
          max-width: 2072px;
          margin: 0 auto;
          padding: 0 20px;
        }

        @media screen and (min-width: 1400px) {
          .header-container {
            padding: 0 15vw;
          }
        }

        @media screen and (min-width: 768px) and (max-width: 1399px) {
          .header-container {
            padding: 0 8vw;
          }
        }

        @media screen and (max-width: 767px) {
          .header-container {
            padding: 0 20px;
          }
        }

        @media screen and (max-width: 480px) {
          .header-container {
            padding: 0 16px;
          }
        }
      `}</style>
      <header style={{
        background: '#FBFAF8',
        borderBottom: '1px solid #CCCCCC',
        padding: 'clamp(16px, 2.5vw, 20px) 0',
        fontFamily: 'Azeret Mono, monospace'
      }}>
        <div className="header-container">
          <img 
            src="/co-see-horizontal logo.svg" 
            alt="Co-See Logo" 
            style={{
              height: 'clamp(16px, 2.5vw, 20px)',
              objectFit: 'contain'
            }}
          />
        </div>
      </header>
    </>
  );
};

export default Header; 