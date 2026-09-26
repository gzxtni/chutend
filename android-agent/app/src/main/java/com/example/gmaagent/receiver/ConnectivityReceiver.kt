package com.example.gmaagent.receiver

import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.net.ConnectivityManager
import android.net.NetworkCapabilities
import android.os.Build
import android.util.Log
import com.example.gmaagent.network.ApiClient
import com.example.gmaagent.service.AgentBackgroundService

/**
 * BroadcastReceiver triggered by Android OS network state changes
 * (e.g. Mobile data turned on/off, WiFi connected/disconnected, airplane mode toggled).
 *
 * Ensures that whenever the device gets an active internet connection,
 * AgentBackgroundService is immediately revived, stale sockets are flushed,
 * and an instant telemetry heartbeat is dispatched without waiting for the user to open the app.
 */
class ConnectivityReceiver : BroadcastReceiver() {

    companion object {
        private const val TAG = "ConnectivityReceiver"
    }

    override fun onReceive(context: Context, intent: Intent?) {
        val action = intent?.action ?: return
        Log.i(TAG, "Network state broadcast received: $action")

        val connectivityManager = context.getSystemService(Context.CONNECTIVITY_SERVICE) as? ConnectivityManager
        val isConnected = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
            val network = connectivityManager?.activeNetwork
            val capabilities = connectivityManager?.getNetworkCapabilities(network)
            capabilities?.hasCapability(NetworkCapabilities.NET_CAPABILITY_INTERNET) == true &&
                    capabilities.hasCapability(NetworkCapabilities.NET_CAPABILITY_VALIDATED)
        } else {
            @Suppress("DEPRECATION")
            connectivityManager?.activeNetworkInfo?.isConnected == true
        }

        if (isConnected) {
            Log.i(TAG, "Internet connectivity restored! Evicting dead sockets & reviving AgentBackgroundService")
            ApiClient.resetConnectionPool()
            AgentBackgroundService.startService(context)
            AgentBackgroundService.triggerImmediateSync()
        } else {
            Log.w(TAG, "Device network is offline / data is turned off")
        }
    }
}
