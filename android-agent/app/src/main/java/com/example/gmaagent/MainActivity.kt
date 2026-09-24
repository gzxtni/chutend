package com.example.gmaagent

import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.activity.enableEdgeToEdge
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Surface
import androidx.compose.ui.Modifier
import com.example.gmaagent.service.AgentBackgroundService
import com.example.gmaagent.theme.GMAAgentTheme

class MainActivity : ComponentActivity() {
  override fun onCreate(savedInstanceState: Bundle?) {
    super.onCreate(savedInstanceState)

    // Ensure always-running live background service is active
    AgentBackgroundService.startService(this)

    enableEdgeToEdge()
    setContent {
      GMAAgentTheme { Surface(modifier = Modifier.fillMaxSize(), color = MaterialTheme.colorScheme.background) { MainNavigation() } }
    }
  }

  override fun onResume() {
    super.onResume()
    // Re-verify background service is active whenever user returns to app
    AgentBackgroundService.startService(this)
  }
}
