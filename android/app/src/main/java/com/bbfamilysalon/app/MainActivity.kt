package com.bbfamilysalon.app

import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Surface
import androidx.compose.ui.Modifier
import com.bbfamilysalon.app.data.SalonRepository
import com.bbfamilysalon.app.ui.SalonAppScreen

class MainActivity : ComponentActivity() {
    private val repository = SalonRepository()

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContent {
            MaterialTheme {
                Surface(
                    modifier = Modifier.fillMaxSize(),
                    color = MaterialTheme.colorScheme.background
                ) {
                    SalonAppScreen(repository = repository)
                }
            }
        }
    }
}
