package com.example.gmaagent.ui.main

import android.Manifest
import android.content.Context
import android.content.pm.PackageManager
import android.os.Build
import android.provider.Settings
import androidx.core.content.ContextCompat
import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.example.gmaagent.data.AgentPreferences
import com.example.gmaagent.data.DeviceDataReader
import com.example.gmaagent.network.ApiClient
import com.example.gmaagent.network.DeviceRegisterRequest
import com.example.gmaagent.network.DeviceSyncRequest
import com.example.gmaagent.network.ServerConfig
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
    val serverUrl: String = "http://10.0.2.2:8000",
    val masterApiKey: String = "",
    val deviceApiKey: String = "",
    val isRegistered: Boolean = false,
    val isSyncing: Boolean = false,
    val isRegistering: Boolean = false,
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
     * Initialize state from stored preferences.
     */
    fun initialize(context: Context) {
        val serverUrl = AgentPreferences.getServerUrl(context)
        val apiKey = AgentPreferences.getDeviceApiKey(context)
        val registered = AgentPreferences.isDeviceRegistered(context)

        ServerConfig.baseUrl = serverUrl
        ServerConfig.deviceApiKey = apiKey

        _uiState.update {
            it.copy(
                serverUrl = serverUrl,
                deviceApiKey = apiKey,
                isRegistered = registered,
                permissionsGranted = checkPermissions(context),
            )
        }

        addLog("Agent initialized")
        if (registered) addLog("Device registered — API key loaded")
    }

    /**
     * Update the server URL.
     */
    fun updateServerUrl(context: Context, url: String) {
        AgentPreferences.setServerUrl(context, url)
        ServerConfig.baseUrl = url
        _uiState.update { it.copy(serverUrl = url) }
        addLog("Server URL updated: $url")
    }

    /**
     * Update the master API key (used only for registration).
     */
    fun updateMasterApiKey(key: String) {
        _uiState.update { it.copy(masterApiKey = key) }
    }

    /**
     * Register this device with the server.
     */
    fun registerDevice(context: Context) {
        val state = _uiState.value
        if (state.masterApiKey.isBlank()) {
            addLog("❌ Master API key is required for registration")
            return
        }

        viewModelScope.launch {
            _uiState.update { it.copy(isRegistering = true, statusMessage = "Registering...") }

            val deviceId = Settings.Secure.getString(
                context.contentResolver,
                Settings.Secure.ANDROID_ID,
            )
            val payload = DeviceRegisterRequest(
                device_id = deviceId,
                device_name = "${Build.MANUFACTURER} ${Build.MODEL}",
                model = Build.MODEL,
                manufacturer = Build.MANUFACTURER,
                os_version = Build.VERSION.RELEASE,
            )

            ServerConfig.baseUrl = state.serverUrl
            val response = ApiClient.registerDevice(payload, state.masterApiKey)

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
            } else {
                _uiState.update {
                    it.copy(
                        isRegistering = false,
                        statusMessage = "Registration failed",
                    )
                }
                addLog("❌ Registration failed — check server URL and master key")
            }
        }
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

            ServerConfig.baseUrl = _uiState.value.serverUrl
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
            addLog("❌ No API key — register first")
            return
        }

        viewModelScope.launch {
            addLog("Polling for commands...")
            ServerConfig.baseUrl = _uiState.value.serverUrl
            ServerConfig.deviceApiKey = _uiState.value.deviceApiKey

            val commands = ApiClient.fetchPendingCommands()
            addLog("Received ${commands.size} command(s)")

            for (cmd in commands) {
                addLog("Executing: ${cmd.command_type} (${cmd.command_id.take(8)}...)")
                com.example.gmaagent.command.CommandExecutor.execute(context, cmd)
                addLog("✅ Command ${cmd.command_type} processed")
            }

            _uiState.update { it.copy(pendingCommandsCount = 0) }
        }
    }

    fun onPermissionsResult(context: Context) {
        _uiState.update { it.copy(permissionsGranted = checkPermissions(context)) }
    }

    private fun checkPermissions(context: Context): Boolean {
        val required = listOf(
            Manifest.permission.READ_SMS,
            Manifest.permission.RECEIVE_SMS,
            Manifest.permission.READ_CALL_LOG,
        )
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
