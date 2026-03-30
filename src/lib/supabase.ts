import { Annotation, Group } from '../types/annotations';
import { SessionEvent } from '../context/ApplicationContext';
import { AdditionalContextItem } from '../components/AdditionalContextFolder';

// Check if Supabase credentials are available
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || "";
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || "";
const isSupabaseConfigured = supabaseUrl && supabaseAnonKey;

// === Session Data Types === //

export interface SessionData {
  id: string;
  session_name: string;
  session_id: string;
  image_id: string;

  annotations: Annotation[];
  groups: Group[];
  session_events: SessionEvent[];

  audio_url: string | null;
  audio_started_at: number | null;

  session_start_time: number;
  session_end_time: number;
  duration_ms: number;

  nickname: string;
  location: string;
  weather: string;
  mood: string;
  feelings: string;

  additional_context: AdditionalContextItem[];

  is_public: boolean;
  share_slug: string | null;

  created_at: string;
  updated_at: string;
}

export type SessionDataInput = Omit<SessionData, 'id' | 'created_at' | 'updated_at'>;

// === localStorage persistence === //

const STORAGE_KEY = 'co-see-sessions';

function readStorage(): SessionData[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch (e) {
    console.error('Failed to read sessions from localStorage:', e);
    return [];
  }
}

function writeStorage(sessions: SessionData[]): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(sessions));
  } catch (e) {
    console.error('Failed to write sessions to localStorage:', e);
  }
}

// === Initialize Supabase client (disabled until go-live) === //

let supabase: any = null;

if (isSupabaseConfigured) {
  console.log('Supabase credentials found, but skipping initialization (using localStorage)');
} else {
  console.log('Supabase not configured. Using localStorage for session persistence.');
}

export { supabase };

// === CRUD operations === //

export async function saveSession(input: SessionDataInput): Promise<SessionData | null> {
  if (!supabase) {
    const now = new Date().toISOString();
    const newSession: SessionData = {
      id: `session-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
      ...input,
      created_at: now,
      updated_at: now,
    };

    const sessions = readStorage();
    sessions.push(newSession);
    writeStorage(sessions);
    console.log('Session saved to localStorage:', newSession.session_name);
    return newSession;
  }

  try {
    const { data, error } = await supabase
      .from('sessions')
      .insert({
        session_name: input.session_name,
        session_id: input.session_id,
        image_id: input.image_id,
        annotations: input.annotations,
        groups: input.groups,
        session_events: input.session_events,
        audio_url: input.audio_url,
        audio_started_at: input.audio_started_at,
        session_start_time: input.session_start_time,
        session_end_time: input.session_end_time,
        duration_ms: input.duration_ms,
        nickname: input.nickname,
        location: input.location,
        weather: input.weather,
        mood: input.mood,
        feelings: input.feelings,
        additional_context: input.additional_context,
        is_public: input.is_public,
        share_slug: input.share_slug,
      })
      .select()
      .single();

    if (error) {
      console.error('Error saving session:', error);
      return null;
    }
    return data;
  } catch (error) {
    console.error('Error saving session:', error);
    return null;
  }
}

export async function getSessionsByImage(imageId: string): Promise<SessionData[]> {
  if (!supabase) {
    return readStorage()
      .filter(s => s.image_id === imageId)
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
  }

  try {
    const { data, error } = await supabase
      .from('sessions')
      .select('*')
      .eq('image_id', imageId)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching sessions:', error);
      return [];
    }
    return data || [];
  } catch (error) {
    console.error('Error fetching sessions:', error);
    return [];
  }
}

export async function getSessionById(sessionId: string): Promise<SessionData | null> {
  if (!supabase) {
    return readStorage().find(s => s.session_id === sessionId) || null;
  }

  try {
    const { data, error } = await supabase
      .from('sessions')
      .select('*')
      .eq('session_id', sessionId)
      .single();

    if (error) {
      console.error('Error fetching session:', error);
      return null;
    }
    return data;
  } catch (error) {
    console.error('Error fetching session:', error);
    return null;
  }
}

export async function deleteSession(sessionId: string): Promise<boolean> {
  if (!supabase) {
    const sessions = readStorage();
    const filtered = sessions.filter(s => s.session_id !== sessionId);
    writeStorage(filtered);
    return true;
  }

  try {
    const { error } = await supabase
      .from('sessions')
      .delete()
      .eq('session_id', sessionId);

    if (error) {
      console.error('Error deleting session:', error);
      return false;
    }
    return true;
  } catch (error) {
    console.error('Error deleting session:', error);
    return false;
  }
}

export async function getSessionBySlug(slug: string): Promise<SessionData | null> {
  if (!supabase) {
    return readStorage().find(s => s.share_slug === slug) || null;
  }

  try {
    const { data, error } = await supabase
      .from('sessions')
      .select('*')
      .eq('share_slug', slug)
      .single();

    if (error) {
      console.error('Error fetching session by slug:', error);
      return null;
    }
    return data;
  } catch (error) {
    console.error('Error fetching session by slug:', error);
    return null;
  }
}

export async function updateSession(sessionId: string, patch: Partial<SessionData>): Promise<boolean> {
  if (!supabase) {
    const sessions = readStorage();
    const index = sessions.findIndex(s => s.session_id === sessionId);
    if (index === -1) return false;
    sessions[index] = { ...sessions[index], ...patch, updated_at: new Date().toISOString() };
    writeStorage(sessions);
    return true;
  }

  try {
    const { error } = await supabase
      .from('sessions')
      .update({ ...patch, updated_at: new Date().toISOString() })
      .eq('session_id', sessionId);

    if (error) {
      console.error('Error updating session:', error);
      return false;
    }
    return true;
  } catch (error) {
    console.error('Error updating session:', error);
    return false;
  }
}

// === File uploads (mock in localStorage mode) === //

export async function uploadAudioFile(audioBlob: Blob, fileName: string): Promise<string | null> {
  if (!supabase) {
    console.log('localStorage mode: Audio upload simulated for:', fileName);
    return `mock-audio-url-${fileName}`;
  }

  try {
    const { data, error } = await supabase.storage
      .from('audio-recordings')
      .upload(fileName, audioBlob, {
        contentType: 'audio/webm',
        upsert: false
      });

    if (error) {
      console.error('Error uploading audio:', error);
      return null;
    }

    const { data: urlData } = supabase.storage
      .from('audio-recordings')
      .getPublicUrl(data.path);

    return urlData.publicUrl;
  } catch (error) {
    console.error('Error uploading audio:', error);
    return null;
  }
}

export async function uploadContextFile(file: File, fileName: string): Promise<string | null> {
  if (!supabase) {
    console.log('localStorage mode: Context file upload simulated for:', fileName);
    return `mock-context-file-url-${fileName}`;
  }

  try {
    const { data, error } = await supabase.storage
      .from('context-files')
      .upload(fileName, file, {
        contentType: file.type,
        upsert: false
      });

    if (error) {
      console.error('Error uploading context file:', error);
      return null;
    }

    const { data: urlData } = supabase.storage
      .from('context-files')
      .getPublicUrl(data.path);

    return urlData.publicUrl;
  } catch (error) {
    console.error('Error uploading context file:', error);
    return null;
  }
}
