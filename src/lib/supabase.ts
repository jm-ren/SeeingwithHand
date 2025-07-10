// Check if Supabase credentials are available
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || "";
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || "";
const isSupabaseConfigured = supabaseUrl && supabaseAnonKey;

// Types for session data
export interface SessionData {
  id?: string;
  session_name: string;
  image_id: string;
  session_id: string;
  annotations: any[];
  groups: any[];
  audio_url?: string;
  survey_data?: any;
  created_at?: string;
  updated_at?: string;
}

// Mock data for development
const mockSessions: SessionData[] = [
  {
    id: 'mock-1',
    session_name: 'Sample Session 1',
    image_id: 'img1',
    session_id: 'session-mock-1',
    annotations: [],
    groups: [],
    survey_data: { nickname: 'demo_user' },
    created_at: new Date().toISOString(),
  },
  {
    id: 'mock-2',
    session_name: 'Sample Session 2',
    image_id: 'img2',
    session_id: 'session-mock-2',
    annotations: [],
    groups: [],
    survey_data: { nickname: 'test_user' },
    created_at: new Date().toISOString(),
  },
];

let sessionStorage: SessionData[] = [...mockSessions];

// Initialize Supabase client only if configured
let supabase: any = null;

if (isSupabaseConfigured) {
  console.log('Supabase credentials found, but skipping initialization to avoid 504 errors');
  console.log('To enable Supabase, ensure proper network access and restart the dev server');
  // TODO: Uncomment when ready to use real Supabase
  // try {
  //   const { createClient } = require("@supabase/supabase-js");
  //   supabase = createClient(supabaseUrl, supabaseAnonKey);
  //   console.log('Supabase client initialized successfully');
  // } catch (error) {
  //   console.error('Failed to initialize Supabase:', error);
  // }
} else {
  console.log('Supabase credentials not found. Using mock data mode.');
}

export { supabase };

// Save a complete session
export async function saveSession(sessionData: Omit<SessionData, 'id' | 'created_at' | 'updated_at'>): Promise<SessionData | null> {
  if (!supabase) {
    console.log('Mock mode: Saving session data:', sessionData);
    
    const newSession: SessionData = {
      id: `mock-${Date.now()}`,
      ...sessionData,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    
    sessionStorage.push(newSession);
    return newSession;
  }

  try {
    const { data, error } = await supabase
      .from('sessions')
      .insert({
        session_name: sessionData.session_name,
        image_id: sessionData.image_id,
        session_id: sessionData.session_id,
        annotations: sessionData.annotations,
        groups: sessionData.groups,
        audio_url: sessionData.audio_url,
        survey_data: sessionData.survey_data,
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

// Fetch all sessions for a specific image
export async function getSessionsByImage(imageId: string): Promise<SessionData[]> {
  if (!supabase) {
    console.log('Mock mode: Fetching sessions for image:', imageId);
    return sessionStorage.filter(session => session.image_id === imageId);
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

// Fetch a specific session by ID
export async function getSessionById(sessionId: string): Promise<SessionData | null> {
  if (!supabase) {
    console.log('Mock mode: Fetching session:', sessionId);
    return sessionStorage.find(session => session.session_id === sessionId) || null;
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

// Upload audio file
export async function uploadAudioFile(audioBlob: Blob, fileName: string): Promise<string | null> {
  if (!supabase) {
    console.log('Mock mode: Audio upload simulated for:', fileName);
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

// Delete a session
export async function deleteSession(sessionId: string): Promise<boolean> {
  if (!supabase) {
    console.log('Mock mode: Deleting session:', sessionId);
    sessionStorage = sessionStorage.filter(session => session.session_id !== sessionId);
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
