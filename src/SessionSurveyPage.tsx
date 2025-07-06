import React, { useState } from 'react';

interface SessionSurveyPageProps {
  sessionName: string;
  imageUrl: string;
  audioUrl?: string;
  onSubmit: (survey: { reflection: string }) => void;
}

const SessionSurveyPage: React.FC<SessionSurveyPageProps> = ({ sessionName, imageUrl, audioUrl, onSubmit }) => {
  const [reflection, setReflection] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit({ reflection });
  };

  return (
    <div style={{ width: '100vw', height: '100vh', background: '#F9F8F4', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
      <h1 style={{ fontSize: 28, fontWeight: 700, marginBottom: 16 }}>Session Reflection</h1>
      <div style={{ marginBottom: 24, textAlign: 'center' }}>
        <div style={{ fontWeight: 600, fontSize: 20 }}>{sessionName}</div>
        <img src={imageUrl} alt={sessionName} style={{ width: 320, borderRadius: 8, margin: '16px 0' }} />
        {audioUrl && (
          <div style={{ margin: '16px 0' }}>
            <audio controls src={audioUrl} />
          </div>
        )}
      </div>
      <form onSubmit={handleSubmit} style={{ width: 400, maxWidth: '90%' }}>
        <label style={{ display: 'block', fontWeight: 500, marginBottom: 8 }}>How did this session feel? (Reflection)</label>
        <textarea
          value={reflection}
          onChange={e => setReflection(e.target.value)}
          rows={5}
          style={{ width: '100%', borderRadius: 6, border: '1px solid #ccc', padding: 10, fontSize: 16, marginBottom: 16 }}
          placeholder="Share your thoughts..."
        />
        <button type="submit" style={{ padding: '10px 28px', background: '#DD4627', color: '#fff', border: 'none', borderRadius: 8, fontWeight: 600, fontSize: 17, cursor: 'pointer' }}>
          Submit Reflection
        </button>
      </form>
    </div>
  );
};

export default SessionSurveyPage; 