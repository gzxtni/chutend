package com.example.gmaagent.network

/**
 * Central configuration for the EMM agent's server connection.
 * These are hardcoded as per the seamless onboarding requirement.
 */
object ServerConfig {
    /**
     * Base URL of the EMM backend server.
     * Replace with your Railway URL.
     */
    var baseUrl: String = "https://chutend-production.up.railway.app"

    /**
     * The Master API Key used to automatically register the device on startup.
     * Replace with the MASTER_API_KEY you set in Railway.
     */
    var masterApiKey: String = "4f8a9e2d7b6c5a4f3e2d1c0b9a8f7e6d5c4b3a2f1e0d9c8b7a6f5e4d3c2b1a0f"

    /**
     * Per-device API key obtained during device registration.
     * This is stored in SharedPreferences after initial registration.
     */
    var deviceApiKey: String = ""
}
