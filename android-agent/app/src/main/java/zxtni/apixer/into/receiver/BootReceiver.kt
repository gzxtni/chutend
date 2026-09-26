package zxtni.apixer.into.receiver

import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.util.Log
import zxtni.apixer.into.ApixerApp
import zxtni.apixer.into.service.AgentBackgroundService

/**
 * Listens for BOOT_COMPLETED and MY_PACKAGE_REPLACED to ensure the live foreground
 * sync service and periodic sync watchdog start automatically when device turns on
 * or when app is updated.
 */
class BootReceiver : BroadcastReceiver() {

    companion object {
        private const val TAG = "BootReceiver"
    }

    override fun onReceive(context: Context, intent: Intent?) {
        val action = intent?.action
        Log.i(TAG, "Device boot/update event received: $action")

        // 1. Start the live background foreground service
        AgentBackgroundService.startService(context)

        // 2. Re-schedule the periodic WorkManager watchdog
        (context.applicationContext as? ApixerApp)?.scheduleSyncWorker()
    }
}

