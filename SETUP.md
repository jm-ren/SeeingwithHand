# Setup Guide for Co-See Application

## Current Status
✅ **Application is working with mock data** - you can test all features without Supabase
🔧 **Supabase setup required** for production data persistence

## Quick Start (Mock Data)
The application will run with sample data if Supabase is not configured. You can:
- Create sessions and see them in the gallery
- Test the reflection form
- View session replay
- All data will be logged to console but not persisted

## Production Setup with Supabase

### 1. Create Supabase Project
1. Go to [supabase.com](https://supabase.com)
2. Create a new project
3. Wait for the project to be fully provisioned

### 2. Set up Database
1. Go to your Supabase project dashboard
2. Navigate to **SQL Editor**
3. Copy and paste the contents of `supabase-schema.sql`
4. Click **Run** to create the tables and policies

### 3. Configure Environment Variables
1. Create a `.env` file in your project root:
```bash
# Copy your project URL and anon key from Supabase dashboard
VITE_SUPABASE_URL=https://your-project-id.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

2. Get your credentials from Supabase:
   - **URL**: Go to Settings → API → Project URL
   - **Anon Key**: Go to Settings → API → Project API keys → anon/public

### 4. Restart Development Server
```bash
npm run dev
# or
pnpm dev
```

## Features Available

### With Mock Data (Current)
- ✅ Session creation and recording
- ✅ Audio recording (mock URLs)
- ✅ Reflection form submission
- ✅ Session replay
- ✅ Gallery display with sample sessions
- ⚠️ Data not persisted between page refreshes

### With Supabase (Production)
- ✅ All mock features
- ✅ Real data persistence
- ✅ Audio file storage
- ✅ Session data survives page refreshes
- ✅ Multi-user session sharing
- ✅ Session history and analytics

## Troubleshooting

### 504 Error (Current Issue)
This error occurs when Supabase credentials are not configured. The app now handles this gracefully with mock data.

### Database Connection Issues
1. Check your `.env` file has correct credentials
2. Verify Supabase project is active
3. Ensure database schema is properly set up

### Audio Upload Issues
1. Check Supabase Storage is enabled
2. Verify storage bucket policies are correct
3. Ensure audio-recordings bucket exists

## Development vs Production

### Development (Current)
- Uses mock data
- No external dependencies
- Perfect for testing UI/UX
- Console logging for debugging

### Production
- Real Supabase backend
- Persistent data storage
- Audio file uploads
- Multi-user sessions
- Analytics and reporting

You can continue developing and testing all features with the current mock data setup! 