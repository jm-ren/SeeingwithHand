import React, { useState, useEffect, useRef } from 'react';
import { Comment, getComments, addComment, getLastNickname, saveLastNickname } from '../lib/comments';

interface SessionCommentsProps {
  sessionId: string;
}

function formatRelativeTime(iso: string): string {
  const now = Date.now();
  const then = new Date(iso).getTime();
  const diffMs = now - then;
  const diffSec = Math.floor(diffMs / 1000);
  const diffMin = Math.floor(diffSec / 60);
  const diffHour = Math.floor(diffMin / 60);
  const diffDay = Math.floor(diffHour / 24);

  if (diffSec < 60) return 'just now';
  if (diffMin < 60) return `${diffMin} minute${diffMin === 1 ? '' : 's'} ago`;
  if (diffHour < 24) return `${diffHour} hour${diffHour === 1 ? '' : 's'} ago`;
  if (diffDay < 30) return `${diffDay} day${diffDay === 1 ? '' : 's'} ago`;
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

const INPUT_STYLE: React.CSSProperties = {
  width: '100%',
  padding: '8px',
  border: '1px solid #CCCCCC',
  borderRadius: 0,
  fontFamily: 'Azeret Mono, monospace',
  fontSize: '11px',
  color: '#333333',
  backgroundColor: '#FFFFFF',
  outline: 'none',
  boxSizing: 'border-box',
};

const SessionComments: React.FC<SessionCommentsProps> = ({ sessionId }) => {
  const [comments, setComments] = useState<Comment[]>([]);
  const [nickname, setNickname] = useState('');
  const [text, setText] = useState('');
  const [error, setError] = useState('');
  const listEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setComments(getComments(sessionId));
    setNickname(getLastNickname());
  }, [sessionId]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmedNick = nickname.trim();
    const trimmedText = text.trim();

    if (!trimmedNick || !trimmedText) {
      setError('Both nickname and comment are required.');
      return;
    }

    saveLastNickname(trimmedNick);
    const newComment = addComment(sessionId, trimmedNick, trimmedText);
    setComments(prev => [...prev, newComment]);
    setText('');
    setError('');

    setTimeout(() => {
      listEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, 50);
  };

  return (
    <div style={{ borderTop: '1px solid #CCCCCC', paddingTop: 20 }}>
      <div className="gallery-title-sub" style={{ marginBottom: 16 }}>
        Comments
      </div>

      {/* Comment list */}
      {comments.length === 0 ? (
        <div
          className="gallery-text-small"
          style={{ color: '#999999', marginBottom: 20, fontStyle: 'italic' }}
        >
          Be the first to share a thought.
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16, marginBottom: 20 }}>
          {comments.map(comment => (
            <div key={comment.id}>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, marginBottom: 4 }}>
                <span
                  className="gallery-text-small"
                  style={{ fontWeight: 700, color: '#333333' }}
                >
                  {comment.nickname}
                </span>
                <span
                  className="gallery-text-small"
                  style={{ color: '#999999', fontSize: '10px' }}
                >
                  {formatRelativeTime(comment.created_at)}
                </span>
              </div>
              <div
                className="gallery-text-body"
                style={{ lineHeight: '1.6', color: '#333333', wordBreak: 'break-word' }}
              >
                {comment.text}
              </div>
            </div>
          ))}
          <div ref={listEndRef} />
        </div>
      )}

      {/* Add comment form */}
      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        <input
          type="text"
          placeholder="Nickname"
          value={nickname}
          onChange={e => setNickname(e.target.value)}
          style={INPUT_STYLE}
        />
        <textarea
          placeholder="Leave a thought…"
          value={text}
          onChange={e => setText(e.target.value)}
          rows={3}
          style={{ ...INPUT_STYLE, resize: 'vertical' }}
        />
        {error && (
          <div className="gallery-text-small" style={{ color: '#CC3333' }}>
            {error}
          </div>
        )}
        <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
          <button
            type="submit"
            style={{
              padding: '6px 16px',
              border: '1px solid #333333',
              borderRadius: 0,
              backgroundColor: '#333333',
              color: '#FFFFFF',
              cursor: 'pointer',
              fontSize: '11px',
              fontFamily: 'Azeret Mono, monospace',
              letterSpacing: '0.5px',
            }}
          >
            Post
          </button>
        </div>
      </form>
    </div>
  );
};

export default SessionComments;
