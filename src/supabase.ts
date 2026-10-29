import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://zskftejgcrtiaseicqka.supabase.co'
const supabaseAnonKey = 'sb_publishable_GZaOPsAwwNlUzBcM0qfvpA_a6mkF7cu' // (Samain ampe ujung)

export const supabase = createClient(supabaseUrl, supabaseAnonKey)