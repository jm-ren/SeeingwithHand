import React from 'react';
import { useAudioRecorder } from '../hooks/useAudioRecorder';

const AudioTest: React.FC = () => {
  const audio = useAudioRecorder();

  const testMicrophone = async () => {
    try {
      console.log('[AudioTest] Testing microphone access...');
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      console.log('[AudioTest] Microphone test successful!');
      stream.getTracks().forEach(track => track.stop());
      alert('Microphone test successful! Audio recording should work.');
    } catch (err: any) {
      console.error('[AudioTest] Microphone test failed:', err);
      alert(`Microphone test failed: ${err.message}`);
    }
  };

  return (
    <div style={{ 
      position: 'fixed', 
      top: '10px', 
      right: '10px', 
      background: 'white', 
      padding: '10px', 
      border: '1px solid #ccc',
      zIndex: 9999 
    }}>
      <h3>Audio Test</h3>
      <div>Recording: {audio.isRecording ? 'YES' : 'NO'}</div>
      <div>Audio URL: {audio.audioUrl ? 'Available' : 'None'}</div>
      <br />
      <button onClick={testMicrophone} style={{ marginRight: '5px' }}>Test Mic</button>
      <button onClick={audio.start} disabled={audio.isRecording} style={{ marginRight: '5px' }}>Start</button>
      <button onClick={audio.stop} disabled={!audio.isRecording} style={{ marginRight: '5px' }}>Stop</button>
      <br />
      {audio.audioUrl && (
        <audio controls src={audio.audioUrl} style={{ marginTop: '10px', width: '200px' }} />
      )}
    </div>
  );
};

export default AudioTest; 