package com.bbfamilysalon.app.data

import io.github.jan.supabase.SupabaseClient
import io.github.jan.supabase.createSupabaseClient
import io.github.jan.supabase.gotrue.Auth
import io.github.jan.supabase.postgrest.Postgrest
import io.github.jan.supabase.realtime.Realtime

object SupabaseConfig {
    const val SUPABASE_URL = "https://fkkbcnaazeajcnssniev.supabase.co"
    const val SUPABASE_ANON_KEY = "sb_publishable_SeQLZGYpG6SU7pj8fTTRRg_bXRnqudV"

    val client: SupabaseClient by lazy {
        createSupabaseClient(
            supabaseUrl = SUPABASE_URL,
            supabaseKey = SUPABASE_ANON_KEY
        ) {
            install(Postgrest)
            install(Realtime)
            install(Auth)
        }
    }
}
