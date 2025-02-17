import { createClient } from '@supabase/supabase-js'

//VITE_SUPABASE_URL='https://zgedeuxhmfzodolyjiek.supabase.co'
//VITE_SUPABASE_ANON_KEY='eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpnZWRldXhobWZ6b2RvbHlqaWVrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Mzk2Mjc5OTksImV4cCI6MjA1NTIwMzk5OX0.vecjXrSFy79iD6EVz66QjMitNqqMEpOitGTDWV_U9QE'
        


const supabaseUrl = 'https://zgedeuxhmfzodolyjiek.supabase.co'
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpnZWRldXhobWZ6b2RvbHlqaWVrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Mzk2Mjc5OTksImV4cCI6MjA1NTIwMzk5OX0.vecjXrSFy79iD6EVz66QjMitNqqMEpOitGTDWV_U9QE'

export const supabase = createClient(
  supabaseUrl, 
  supabaseAnonKey, 
);

