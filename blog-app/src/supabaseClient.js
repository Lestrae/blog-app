// import { createClient } from '@supabase/supabase-js'
// const supabaseUrl = 'https://kjyfmyplmdqnztifgtgk.supabase.co'
// const supabaseKey = process.env.SUPABASE_KEY
// const supabase = createClient(supabaseUrl, supabaseKey)

import { createClient } from '@supabase/supabase-js'

console.log('URL:', import.meta.env.VITE_SUPABASE_URL)
console.log('KEY:', import.meta.env.VITE_SUPABASE_KEY?.slice(0, 6) + '...')

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

export const supabase = createClient(supabaseUrl, supabaseAnonKey);