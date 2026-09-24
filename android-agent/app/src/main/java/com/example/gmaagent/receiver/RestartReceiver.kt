package com.example.gmaagent.receiver

import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.util.Log
import com.example.gmaagent.service.AgentBackgroundService

/**
 * BroadcastReceiver responsible for reviving AgentBackgroundService
 * if it is ever killed by the system or when app tasks are removed.
 */
class RestartReceiver : BroadcastReceiver() {

    companion object {
        private const val TAG = "RestartReceiver"
    }

    override fun onReceive(context: Context, intent: Intent?) {
        Log.i(TAG, "Restart trigger received: ${intent?.action} -> Restarting AgentBackgroundService")
        AgentBackgroundService.startService(context)
    }
}
