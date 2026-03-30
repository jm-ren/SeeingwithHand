export interface Comment {
  id: string;
  session_id: string;
  nickname: string;
  text: string;
  created_at: string;
}

const storageKey = (sessionId: string) => `co-see-comments-${sessionId}`;
const NICKNAME_KEY = 'co-see-last-nickname';

function readComments(sessionId: string): Comment[] {
  try {
    const raw = localStorage.getItem(storageKey(sessionId));
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function writeComments(sessionId: string, comments: Comment[]): void {
  try {
    localStorage.setItem(storageKey(sessionId), JSON.stringify(comments));
  } catch (e) {
    console.error('Failed to write comments:', e);
  }
}

export function getComments(sessionId: string): Comment[] {
  return readComments(sessionId);
}

export function addComment(sessionId: string, nickname: string, text: string): Comment {
  const comment: Comment = {
    id: `comment-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
    session_id: sessionId,
    nickname: nickname.trim(),
    text: text.trim(),
    created_at: new Date().toISOString(),
  };
  const comments = readComments(sessionId);
  comments.push(comment);
  writeComments(sessionId, comments);
  return comment;
}

export function getLastNickname(): string {
  return localStorage.getItem(NICKNAME_KEY) || '';
}

export function saveLastNickname(nickname: string): void {
  localStorage.setItem(NICKNAME_KEY, nickname);
}
