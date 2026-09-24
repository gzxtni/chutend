package com.example.gmaagent.receiver

import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.util.Log
import com.example.gmaagent.GmaAgentApp

/**
 * Listens for BOOT_COMPLETED to re-schedule the sync worker after device reboot.
 */
class BootReceiver : BroadcastReceiver() {
    override fun onReceive(context: Context, intent: Intent?) {
        if (intent?.action == Intent.ACTION_BOOT_COMPLETED) {
            Log.i("BootReceiver", "Device booted — rescheduling sync worker")
            (context.applicationContext as? GmaAgentApp)?.scheduleSyncWorker()
        }
    }
}
