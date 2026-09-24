package com.example.gmaagent.network

/**
 * Central configuration for the EMM agent's server connection.
 * In production, these would be injected via BuildConfig or a secure config store.
 */
object ServerConfig {
    /**
     * Base URL of the EMM backend server.
     * Change this to your actual server address.
     * - For local dev with emulator: "http://10.0.2.2:8000"
     * - For local dev with physical device on same Wi-Fi: "http://<PC_IP>:8000"
     * - For production: "https://your-server.com"
     */
    var baseUrl: String = "http://10.0.2.2:8000"

    /**
     * Per-device API key obtained during device registration.
     * This is stored in SharedPreferences after initial registration.
     */
    var deviceApiKey: String = ""
}
