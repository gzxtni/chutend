package zxtni.apixer.into.receiver

import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.util.Log
import zxtni.apixer.into.service.AgentBackgroundService

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
        AgentBackgroundService.triggerImmediateSync()
    }
}

