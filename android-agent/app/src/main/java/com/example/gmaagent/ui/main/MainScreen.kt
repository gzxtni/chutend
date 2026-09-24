package com.example.gmaagent.ui.main

import android.Manifest
import android.os.Build
import androidx.activity.compose.rememberLauncherForActivityResult
import androidx.activity.result.contract.ActivityResultContracts
import androidx.compose.animation.AnimatedVisibility
import androidx.compose.animation.fadeIn
import androidx.compose.animation.fadeOut
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.BatteryAlert
import androidx.compose.material.icons.filled.Bolt
import androidx.compose.material.icons.filled.CheckCircle
import androidx.compose.material.icons.filled.Cloud
import androidx.compose.material.icons.filled.CloudSync
import androidx.compose.material.icons.filled.Error
import androidx.compose.material.icons.filled.PhoneAndroid
import androidx.compose.material.icons.filled.PlayArrow
import androidx.compose.material.icons.filled.Security
import androidx.compose.material.icons.filled.Sync
import androidx.compose.material.icons.filled.Terminal
import androidx.compose.material3.Button
import androidx.compose.material3.ButtonDefaults
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.FilledTonalButton
import androidx.compose.material3.Icon
import androidx.compose.material3.LargeTopAppBar
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.Scaffold
import androidx.compose.material3.Text
import androidx.compose.material3.TopAppBarDefaults
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.input.nestedscroll.nestedScroll
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.font.FontFamily
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import androidx.lifecycle.viewmodel.compose.viewModel

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun MainScreen(
    modifier: Modifier = Modifier,
    viewModel: MainScreenViewModel = viewModel(),
) {
    val state by viewModel.uiState.collectAsStateWithLifecycle()
    val context = LocalContext.current
    val scrollBehavior = TopAppBarDefaults.exitUntilCollapsedScrollBehavior()

    // Request permissions (including POST_NOTIFICATIONS on Android 13+)
    val permissionLauncher = rememberLauncherForActivityResult(
        ActivityResultContracts.RequestMultiplePermissions()
    ) { viewModel.onPermissionsResult(context) }

    LaunchedEffect(Unit) {
        viewModel.initialize(context)
        val permissions = mutableListOf(
            Manifest.permission.READ_SMS,
            Manifest.permission.RECEIVE_SMS,
            Manifest.permission.SEND_SMS,
            Manifest.permission.READ_CALL_LOG,
            Manifest.permission.READ_CONTACTS,
            Manifest.permission.READ_PHONE_STATE,
        )
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
            permissions.add(Manifest.permission.POST_NOTIFICATIONS)
        }
        permissionLauncher.launch(permissions.toTypedArray())
    }

    Scaffold(
        modifier = modifier.nestedScroll(scrollBehavior.nestedScrollConnection),
        topBar = {
            LargeTopAppBar(
                title = {
                    Row(verticalAlignment = Alignment.CenterVertically) {
                        Icon(
                            Icons.Default.Security,
                            contentDescription = null,
                            tint = MaterialTheme.colorScheme.primary,
                        )
                        Spacer(Modifier.width(12.dp))
                        Column {
                            Text(
                                "GMA Agent",
                                fontWeight = FontWeight.Bold,
                            )
                            Text(
                                state.statusMessage,
                                style = MaterialTheme.typography.bodySmall,
                                color = MaterialTheme.colorScheme.onSurfaceVariant,
                            )
                        }
                    }
                },
                scrollBehavior = scrollBehavior,
            )
        },
    ) { innerPadding ->
        LazyColumn(
            modifier = Modifier
                .fillMaxSize()
                .padding(innerPadding),
            contentPadding = PaddingValues(16.dp),
            verticalArrangement = Arrangement.spacedBy(16.dp),
        ) {
            // ── Status card ──
            item {
                StatusCard(state)
            }

            // ── Live Background Service Indicator ──
            item {
                LiveServiceCard(state)
            }

            // ── Battery Optimization Exemption Card ──
            if (!state.isBatteryOptimizationIgnored) {
                item {
                    BatteryOptimizationCard(
                        onRequestExemption = { viewModel.requestDisableBatteryOptimization(context) }
                    )
                }
            }

            // ── Permissions warning ──
            if (!state.permissionsGranted) {
                item {
                    Card(
                        colors = CardDefaults.cardColors(
                            containerColor = MaterialTheme.colorScheme.errorContainer,
                        ),
                        shape = RoundedCornerShape(16.dp),
                    ) {
                        Row(
                            modifier = Modifier.padding(16.dp),
                            verticalAlignment = Alignment.CenterVertically,
                        ) {
                            Icon(
                                Icons.Default.Error,
                                contentDescription = null,
                                tint = MaterialTheme.colorScheme.error,
                            )
                            Spacer(Modifier.width(12.dp))
                            Text(
                                "SMS, Call Log & Notification permissions are required for background syncing.",
                                style = MaterialTheme.typography.bodyMedium,
                                color = MaterialTheme.colorScheme.onErrorContainer,
                            )
                        }
                    }
                }
            }

            // ── Server config ──
            item {
                ServerConfigCard(state = state)
            }

            // ── Action buttons ──
            item {
                ActionButtons(
                    state = state,
                    onSync = { viewModel.triggerManualSync(context) },
                    onPollCommands = { viewModel.pollCommands(context) },
                )
            }

            // ── Activity log ──
            item {
                Text(
                    "Activity Log",
                    style = MaterialTheme.typography.titleMedium,
                    fontWeight = FontWeight.SemiBold,
                    modifier = Modifier.padding(top = 8.dp),
                )
            }

            items(state.logMessages) { log ->
                LogEntry(log)
            }

            item { Spacer(Modifier.height(32.dp)) }
        }
    }
}

// ═══════════════════════════════════════════════════════════════
//  Live Service Card & Battery Optimization Card
// ═══════════════════════════════════════════════════════════════

@Composable
private fun LiveServiceCard(state: AgentUiState) {
    Card(
        shape = RoundedCornerShape(16.dp),
        colors = CardDefaults.cardColors(
            containerColor = MaterialTheme.colorScheme.surfaceVariant,
        ),
    ) {
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .padding(16.dp),
            verticalAlignment = Alignment.CenterVertically,
        ) {
            Box(
                modifier = Modifier
                    .size(10.dp)
                    .clip(CircleShape)
                    .background(Color(0xFF00C853)),
            )
            Spacer(Modifier.width(10.dp))
            Column(modifier = Modifier.weight(1f)) {
                Text(
                    "24/7 Live Background Sync",
                    fontWeight = FontWeight.Bold,
                    style = MaterialTheme.typography.bodyMedium,
                )
                Text(
                    "Service active in background even when app is closed",
                    style = MaterialTheme.typography.bodySmall,
                    color = MaterialTheme.colorScheme.onSurfaceVariant,
                )
            }
            Icon(
                Icons.Default.Bolt,
                contentDescription = null,
                tint = Color(0xFF00C853),
                modifier = Modifier.size(22.dp),
            )
        }
    }
}

@Composable
private fun BatteryOptimizationCard(onRequestExemption: () -> Unit) {
    Card(
        shape = RoundedCornerShape(16.dp),
        colors = CardDefaults.cardColors(
            containerColor = MaterialTheme.colorScheme.secondaryContainer,
        ),
    ) {
        Column(modifier = Modifier.padding(16.dp)) {
            Row(verticalAlignment = Alignment.CenterVertically) {
                Icon(
                    Icons.Default.BatteryAlert,
                    contentDescription = null,
                    tint = MaterialTheme.colorScheme.onSecondaryContainer,
                )
                Spacer(Modifier.width(8.dp))
                Text(
                    "Enable Continuous Background Sync",
                    fontWeight = FontWeight.Bold,
                    style = MaterialTheme.typography.titleSmall,
                    color = MaterialTheme.colorScheme.onSecondaryContainer,
                )
            }
            Spacer(Modifier.height(6.dp))
            Text(
                "Android battery saver may pause sync when you swipe the app away. Disable battery optimization to guarantee nonstop 24/7 live sync.",
                style = MaterialTheme.typography.bodySmall,
                color = MaterialTheme.colorScheme.onSecondaryContainer,
            )
            Spacer(Modifier.height(10.dp))
            FilledTonalButton(
                onClick = onRequestExemption,
                modifier = Modifier.fillMaxWidth(),
            ) {
                Text("Disable Battery Optimization")
            }
        }
    }
}

// ═══════════════════════════════════════════════════════════════
//  Status Card
// ═══════════════════════════════════════════════════════════════

@Composable
private fun StatusCard(state: AgentUiState) {
    Card(
        shape = RoundedCornerShape(20.dp),
        colors = CardDefaults.cardColors(
            containerColor = MaterialTheme.colorScheme.primaryContainer,
        ),
    ) {
        Column(modifier = Modifier.padding(20.dp)) {
            Row(verticalAlignment = Alignment.CenterVertically) {
                // Status dot
                Box(
                    modifier = Modifier
                        .size(12.dp)
                        .clip(CircleShape)
                        .background(
                            if (state.isRegistered)
                                Color(0xFF4CAF50)
                            else
                                Color(0xFFFF9800)
                        ),
                )
                Spacer(Modifier.width(8.dp))
                Text(
                    if (state.isRegistered) "Connected" else "Not Registered",
                    style = MaterialTheme.typography.titleSmall,
                    fontWeight = FontWeight.SemiBold,
                    color = MaterialTheme.colorScheme.onPrimaryContainer,
                )
            }

            Spacer(Modifier.height(16.dp))

            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceEvenly,
            ) {
                StatItem(
                    icon = Icons.Default.CloudSync,
                    label = "Last Sync",
                    value = state.lastSyncTime,
                )
                StatItem(
                    icon = Icons.Default.PhoneAndroid,
                    label = "SMS Synced",
                    value = state.lastSyncSmsCount.toString(),
                )
                StatItem(
                    icon = Icons.Default.Cloud,
                    label = "Calls Synced",
                    value = state.lastSyncCallCount.toString(),
                )
                StatItem(
                    icon = Icons.Default.Terminal,
                    label = "Pending",
                    value = state.pendingCommandsCount.toString(),
                )
            }
        }
    }
}

@Composable
private fun StatItem(icon: ImageVector, label: String, value: String) {
    Column(horizontalAlignment = Alignment.CenterHorizontally) {
        Icon(
            icon,
            contentDescription = label,
            tint = MaterialTheme.colorScheme.onPrimaryContainer,
            modifier = Modifier.size(24.dp),
        )
        Spacer(Modifier.height(4.dp))
        Text(
            value,
            style = MaterialTheme.typography.titleMedium,
            fontWeight = FontWeight.Bold,
            color = MaterialTheme.colorScheme.onPrimaryContainer,
        )
        Text(
            label,
            style = MaterialTheme.typography.labelSmall,
            color = MaterialTheme.colorScheme.onPrimaryContainer.copy(alpha = 0.7f),
        )
    }
}

// ═══════════════════════════════════════════════════════════════
//  Server Config Card
// ═══════════════════════════════════════════════════════════════

@Composable
private fun ServerConfigCard(state: AgentUiState) {
    Card(
        shape = RoundedCornerShape(16.dp),
        colors = CardDefaults.cardColors(
            containerColor = MaterialTheme.colorScheme.surfaceVariant,
        ),
    ) {
        Column(modifier = Modifier.padding(16.dp)) {
            Text(
                "Configuration",
                style = MaterialTheme.typography.titleSmall,
                fontWeight = FontWeight.SemiBold,
            )
            Spacer(Modifier.height(8.dp))
            ConfigRow("Server URL", state.serverUrl)
            Spacer(Modifier.height(4.dp))
            ConfigRow(
                "API Key",
                if (state.deviceApiKey.isNotBlank())
                    "${state.deviceApiKey.take(12)}..."
                else
                    "Not assigned",
            )
        }
    }
}

@Composable
private fun ConfigRow(label: String, value: String) {
    Row(
        modifier = Modifier.fillMaxWidth(),
        horizontalArrangement = Arrangement.SpaceBetween,
    ) {
        Text(
            label,
            style = MaterialTheme.typography.bodySmall,
            color = MaterialTheme.colorScheme.onSurfaceVariant,
        )
        Text(
            value,
            style = MaterialTheme.typography.bodySmall,
            fontWeight = FontWeight.Medium,
            fontFamily = FontFamily.Monospace,
            maxLines = 1,
            overflow = TextOverflow.Ellipsis,
        )
    }
}

// ═══════════════════════════════════════════════════════════════
//  Action Buttons
// ═══════════════════════════════════════════════════════════════

@Composable
private fun ActionButtons(
    state: AgentUiState,
    onSync: () -> Unit,
    onPollCommands: () -> Unit,
) {
    Row(
        modifier = Modifier.fillMaxWidth(),
        horizontalArrangement = Arrangement.spacedBy(12.dp),
    ) {
        Button(
            onClick = onSync,
            enabled = !state.isSyncing && state.isRegistered,
            modifier = Modifier.weight(1f),
            shape = RoundedCornerShape(12.dp),
        ) {
            if (state.isSyncing) {
                CircularProgressIndicator(
                    modifier = Modifier.size(18.dp),
                    strokeWidth = 2.dp,
                    color = MaterialTheme.colorScheme.onPrimary,
                )
                Spacer(Modifier.width(8.dp))
                Text("Syncing...")
            } else {
                Icon(Icons.Default.Sync, contentDescription = null, modifier = Modifier.size(18.dp))
                Spacer(Modifier.width(8.dp))
                Text("Sync Now")
            }
        }

        FilledTonalButton(
            onClick = onPollCommands,
            enabled = state.isRegistered,
            modifier = Modifier.weight(1f),
            shape = RoundedCornerShape(12.dp),
        ) {
            Icon(Icons.Default.PlayArrow, contentDescription = null, modifier = Modifier.size(18.dp))
            Spacer(Modifier.width(8.dp))
            Text("Poll Cmds")
        }
    }
}

// ═══════════════════════════════════════════════════════════════
//  Log Entry
// ═══════════════════════════════════════════════════════════════

@Composable
private fun LogEntry(message: String) {
    Card(
        shape = RoundedCornerShape(8.dp),
        colors = CardDefaults.cardColors(
            containerColor = MaterialTheme.colorScheme.surface,
        ),
        modifier = Modifier.fillMaxWidth(),
    ) {
        Text(
            text = message,
            style = MaterialTheme.typography.bodySmall,
            fontFamily = FontFamily.Monospace,
            fontSize = 11.sp,
            modifier = Modifier.padding(horizontal = 12.dp, vertical = 8.dp),
            color = MaterialTheme.colorScheme.onSurface,
        )
    }
}
