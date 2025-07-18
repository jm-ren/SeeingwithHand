import React, { useState } from 'react';

const SystemCheck: React.FC = () => {
  const [status, setStatus] = useState<string>('Ready to test...');

  const checkPermissions = async () => {
    setStatus('Checking...');
    
    try {
      // Check if navigator.mediaDevices exists
      if (!navigator.mediaDevices) {
        setStatus('❌ navigator.mediaDevices not available (non-HTTPS?)');
        return;
      }

      // Check if getUserMedia exists
      if (!navigator.mediaDevices.getUserMedia) {
        setStatus('❌ getUserMedia not supported');
        return;
      }

      // Try to get permissions without requesting stream
      if (navigator.permissions) {
        try {
          const result = await navigator.permissions.query({ name: 'microphone' as PermissionName });
          setStatus(`🔍 Permission state: ${result.state}`);
          
          if (result.state === 'denied') {
            setStatus('❌ Microphone permission DENIED in browser. Please allow microphone access.');
            return;
          }
        } catch (e) {
          console.log('Permission query not supported');
        }
      }

      // Try to actually access the microphone
      setStatus('🎤 Requesting microphone access...');
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      
      // Success!
      setStatus('✅ Microphone access GRANTED! Audio recording should work.');
      
      // Stop the stream
      stream.getTracks().forEach(track => track.stop());
      
    } catch (error: any) {
      console.error('Permission check error:', error);
      
      if (error.name === 'NotAllowedError') {
        setStatus('❌ DENIED: Microphone access blocked. Check browser permissions!');
      } else if (error.name === 'NotFoundError') {
        setStatus('❌ NO MICROPHONE: No microphone device found.');
      } else if (error.name === 'NotSupportedError') {
        setStatus('❌ NOT SUPPORTED: Browser doesn\'t support audio recording.');
      } else {
        setStatus(`❌ ERROR: ${error.message}`);
      }
    }
  };

  return (
    <div style={{ 
      position: 'fixed', 
      top: '60px', 
      right: '10px', 
      background: '#f0f0f0', 
      padding: '15px', 
      border: '2px solid #333',
      borderRadius: '5px',
      maxWidth: '300px',
      zIndex: 9999,
      fontFamily: 'monospace',
      fontSize: '12px'
    }}>
      <h3 style={{ margin: '0 0 10px 0' }}>🔧 System Check</h3>
      <div style={{ marginBottom: '10px', lineHeight: '1.4' }}>{status}</div>
      <button 
        onClick={checkPermissions}
        style={{ 
          padding: '8px 12px', 
          background: '#333', 
          color: 'white', 
          border: 'none',
          borderRadius: '3px',
          cursor: 'pointer'
        }}
      >
        Check Permissions
      </button>
      
      <div style={{ marginTop: '10px', fontSize: '10px', opacity: 0.7 }}>
        Quick fixes:<br/>
        • Click 🔒 in address bar → Allow mic<br/>
        • Check System Preferences → Security → Microphone<br/>
        • Try different browser
      </div>
    </div>
  );
};

export default SystemCheck; 