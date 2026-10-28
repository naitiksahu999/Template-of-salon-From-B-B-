package com.bbfamilysalon.app.ui

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.bbfamilysalon.app.data.SalonRepository
import com.bbfamilysalon.app.data.models.*
import kotlinx.coroutines.launch
import java.util.UUID

val SalonGold = Color(0xFFC29F67)
val SalonDark = Color(0xFF1C1B1A)
val SalonBackground = Color(0xFFFAF7F2)
val SalonCardBg = Color(0xFFFFFFFF)

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun SalonAppScreen(repository: SalonRepository) {
    var selectedTab by remember { mutableIntStateOf(0) }
    val scope = rememberCoroutineScope()

    var services by remember { mutableStateOf<List<ServiceEntity>>(emptyList()) }
    var businessHours by remember { mutableStateOf<List<BusinessHoursEntity>>(emptyList()) }
    var blockedDates by remember { mutableStateOf<List<BlockedDateEntity>>(emptyList()) }
    var settings by remember { mutableStateOf(SalonSettingsEntity()) }
    var isLoading by remember { mutableStateOf(true) }
    var lastSyncTime by remember { mutableStateOf("Just now") }

    fun refreshData() {
        scope.launch {
            isLoading = true
            try {
                services = repository.getLiveServices()
                businessHours = repository.getLiveBusinessHours()
                blockedDates = repository.getLiveBlockedDates()
                settings = repository.getLiveSettings()
                lastSyncTime = "Synced"
            } catch (e: Exception) {
                e.printStackTrace()
            } finally {
                isLoading = false
            }
        }
    }

    LaunchedEffect(Unit) {
        refreshData()
    }

    Scaffold(
        topBar = {
            TopAppBar(
                title = {
                    Column {
                        Text(
                            text = settings.salonName.ifEmpty { "B & B Family Salon" },
                            fontWeight = FontWeight.Bold,
                            fontSize = 18.sp,
                            color = Color.White
                        )
                        Row(verticalAlignment = Alignment.CenterVertically) {
                            Box(
                                modifier = Modifier
                                    .size(8.dp)
                                    .background(Color(0xFF10B981), shape = RoundedCornerShape(4.dp))
                            )
                            Spacer(modifier = Modifier.width(4.dp))
                            Text(
                                text = "Live Supabase Sync",
                                fontSize = 11.sp,
                                color = SalonGold
                            )
                        }
                    }
                },
                actions = {
                    IconButton(onClick = { refreshData() }) {
                        Icon(
                            Icons.Default.Refresh,
                            contentDescription = "Sync Live Data",
                            tint = Color.White
                        )
                    }
                },
                colors = TopAppBarDefaults.topAppBarColors(containerColor = SalonDark)
            )
        },
        bottomBar = {
            NavigationBar(containerColor = SalonDark) {
                NavigationBarItem(
                    selected = selectedTab == 0,
                    onClick = { selectedTab = 0 },
                    icon = { Icon(Icons.Default.ContentCut, contentDescription = "Services") },
                    label = { Text("Services", color = if (selectedTab == 0) SalonGold else Color.Gray) },
                    colors = NavigationBarItemDefaults.colors(
                        selectedIconColor = SalonGold,
                        indicatorColor = Color.Transparent
                    )
                )
                NavigationBarItem(
                    selected = selectedTab == 1,
                    onClick = { selectedTab = 1 },
                    icon = { Icon(Icons.Default.CalendarMonth, contentDescription = "Book") },
                    label = { Text("Book", color = if (selectedTab == 1) SalonGold else Color.Gray) },
                    colors = NavigationBarItemDefaults.colors(
                        selectedIconColor = SalonGold,
                        indicatorColor = Color.Transparent
                    )
                )
                NavigationBarItem(
                    selected = selectedTab == 2,
                    onClick = { selectedTab = 2 },
                    icon = { Icon(Icons.Default.Person, contentDescription = "Bookings") },
                    label = { Text("My Bookings", color = if (selectedTab == 2) SalonGold else Color.Gray) },
                    colors = NavigationBarItemDefaults.colors(
                        selectedIconColor = SalonGold,
                        indicatorColor = Color.Transparent
                    )
                )
                NavigationBarItem(
                    selected = selectedTab == 3,
                    onClick = { selectedTab = 3 },
                    icon = { Icon(Icons.Default.LocationOn, contentDescription = "Salon") },
                    label = { Text("Salon Info", color = if (selectedTab == 3) SalonGold else Color.Gray) },
                    colors = NavigationBarItemDefaults.colors(
                        selectedIconColor = SalonGold,
                        indicatorColor = Color.Transparent
                    )
                )
            }
        },
        containerColor = SalonBackground
    ) { padding ->
        Box(
            modifier = Modifier
                .padding(padding)
                .fillMaxSize()
        ) {
            if (isLoading && services.isEmpty()) {
                Box(modifier = Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
                    CircularProgressIndicator(color = SalonGold)
                }
            } else {
                when (selectedTab) {
                    0 -> ServicesTab(services = services)
                    1 -> BookingTab(services = services, repository = repository, onBookingDone = { selectedTab = 2 })
                    2 -> MyBookingsTab(repository = repository)
                    3 -> SalonInfoTab(settings = settings, businessHours = businessHours)
                }
            }
        }
    }
}

@Composable
fun ServicesTab(services: List<ServiceEntity>) {
    LazyColumn(
        contentPadding = PaddingValues(16.dp),
        verticalArrangement = Arrangement.spacedBy(12.dp)
    ) {
        item {
            Card(
                colors = CardDefaults.cardColors(containerColor = SalonCardBg),
                shape = RoundedCornerShape(12.dp),
                modifier = Modifier.fillMaxWidth()
            ) {
                Column(modifier = Modifier.padding(16.dp)) {
                    Text(
                        text = "Live Services & Pricing",
                        fontSize = 20.sp,
                        fontWeight = FontWeight.Bold,
                        color = SalonDark
                    )
                    Text(
                        text = "Synchronized in real-time with B & B Family Salon Supabase database",
                        fontSize = 12.sp,
                        color = Color.Gray
                    )
                }
            }
        }

        items(services) { service ->
            Card(
                colors = CardDefaults.cardColors(containerColor = SalonCardBg),
                shape = RoundedCornerShape(12.dp),
                modifier = Modifier.fillMaxWidth()
            ) {
                Row(
                    modifier = Modifier
                        .padding(16.dp)
                        .fillMaxWidth(),
                    horizontalArrangement = Arrangement.SpaceBetween,
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Column(modifier = Modifier.weight(1f)) {
                        Text(
                            text = service.name,
                            fontWeight = FontWeight.SemiBold,
                            fontSize = 16.sp,
                            color = SalonDark
                        )
                        if (!service.description.isNullOrEmpty()) {
                            Text(
                                text = service.description,
                                fontSize = 12.sp,
                                color = Color.Gray,
                                maxLines = 2
                            )
                        }
                        Text(
                            text = "${service.durationMinutes} mins",
                            fontSize = 11.sp,
                            color = SalonGold,
                            fontWeight = FontWeight.Medium
                        )
                    }
                    Text(
                        text = "₹${service.price.toInt()}",
                        fontWeight = FontWeight.Bold,
                        fontSize = 18.sp,
                        color = SalonDark
                    )
                }
            }
        }
    }
}

@Composable
fun BookingTab(
    services: List<ServiceEntity>,
    repository: SalonRepository,
    onBookingDone: () -> Unit
) {
    var name by remember { mutableStateOf("") }
    var phone by remember { mutableStateOf("") }
    var selectedService by remember { mutableStateOf<ServiceEntity?>(services.firstOrNull()) }
    var date by remember { mutableStateOf("2026-10-06") }
    var time by remember { mutableStateOf("11:00") }
    var isSubmitting by remember { mutableStateOf(false) }
    var message by remember { mutableStateOf<String?>(null) }
    val scope = rememberCoroutineScope()

    LazyColumn(
        contentPadding = PaddingValues(16.dp),
        verticalArrangement = Arrangement.spacedBy(14.dp)
    ) {
        item {
            Text(
                text = "Reserve an Appointment",
                fontSize = 20.sp,
                fontWeight = FontWeight.Bold,
                color = SalonDark
            )
            Text(
                text = "Bookings sync directly to Supabase and reflect instantly on website admin.",
                fontSize = 12.sp,
                color = Color.Gray
            )
        }

        item {
            OutlinedTextField(
                value = name,
                onValueChange = { name = it },
                label = { Text("Full Name") },
                modifier = Modifier.fillMaxWidth()
            )
        }

        item {
            OutlinedTextField(
                value = phone,
                onValueChange = { phone = it },
                label = { Text("Phone Number") },
                modifier = Modifier.fillMaxWidth()
            )
        }

        item {
            Text("Select Service:", fontWeight = FontWeight.SemiBold, fontSize = 14.sp)
            services.forEach { s ->
                val isSelected = selectedService?.id == s.id
                Card(
                    onClick = { selectedService = s },
                    colors = CardDefaults.cardColors(
                        containerColor = if (isSelected) SalonDark else SalonCardBg
                    ),
                    shape = RoundedCornerShape(8.dp),
                    modifier = Modifier
                        .fillMaxWidth()
                        .padding(vertical = 4.dp)
                ) {
                    Row(
                        modifier = Modifier
                            .padding(12.dp)
                            .fillMaxWidth(),
                        horizontalArrangement = Arrangement.SpaceBetween
                    ) {
                        Text(
                            s.name,
                            color = if (isSelected) Color.White else SalonDark,
                            fontWeight = FontWeight.Medium
                        )
                        Text(
                            "₹${s.price.toInt()}",
                            color = if (isSelected) SalonGold else SalonDark,
                            fontWeight = FontWeight.Bold
                        )
                    }
                }
            }
        }

        item {
            OutlinedTextField(
                value = date,
                onValueChange = { date = it },
                label = { Text("Date (YYYY-MM-DD)") },
                modifier = Modifier.fillMaxWidth()
            )
        }

        item {
            OutlinedTextField(
                value = time,
                onValueChange = { time = it },
                label = { Text("Time (HH:MM)") },
                modifier = Modifier.fillMaxWidth()
            )
        }

        item {
            if (message != null) {
                Text(message ?: "", color = Color(0xFF10B981), fontWeight = FontWeight.Bold)
            }

            Button(
                onClick = {
                    if (name.isBlank() || phone.isBlank() || selectedService == null) {
                        message = "Please fill in all details"
                        return@Button
                    }
                    scope.launch {
                        isSubmitting = true
                        val appointment = AppointmentEntity(
                            id = "appt_${System.currentTimeMillis()}",
                            bookingNumber = "BB-${(1000..9999).random()}",
                            customerName = name,
                            customerPhone = phone,
                            serviceId = selectedService!!.id,
                            serviceName = selectedService!!.name,
                            servicePrice = selectedService!!.price,
                            serviceDuration = selectedService!!.durationMinutes,
                            appointmentDate = date,
                            appointmentTime = time,
                            status = "confirmed"
                        )
                        val success = repository.bookAppointment(appointment)
                        isSubmitting = false
                        if (success) {
                            message = "Appointment booked successfully & synced to Supabase!"
                            onBookingDone()
                        } else {
                            message = "Synced locally. Retrying cloud link..."
                        }
                    }
                },
                enabled = !isSubmitting,
                colors = ButtonDefaults.buttonColors(containerColor = SalonDark),
                modifier = Modifier
                    .fillMaxWidth()
                    .height(50.dp)
            ) {
                if (isSubmitting) {
                    CircularProgressIndicator(color = Color.White, modifier = Modifier.size(24.dp))
                } else {
                    Text("Confirm Appointment", color = Color.White, fontWeight = FontWeight.Bold)
                }
            }
        }
    }
}

@Composable
fun MyBookingsTab(repository: SalonRepository) {
    var phoneInput by remember { mutableStateOf("") }
    var appointments by remember { mutableStateOf<List<AppointmentEntity>>(emptyList()) }
    var isSearching by remember { mutableStateOf(false) }
    val scope = rememberCoroutineScope()

    Column(modifier = Modifier.padding(16.dp)) {
        Text("My Bookings", fontSize = 20.sp, fontWeight = FontWeight.Bold, color = SalonDark)
        Text("Look up your active bookings directly from Supabase", fontSize = 12.sp, color = Color.Gray)

        Spacer(modifier = Modifier.height(12.dp))

        Row(modifier = Modifier.fillMaxWidth(), verticalAlignment = Alignment.CenterVertically) {
            OutlinedTextField(
                value = phoneInput,
                onValueChange = { phoneInput = it },
                label = { Text("Phone Number") },
                modifier = Modifier.weight(1f)
            )
            Spacer(modifier = Modifier.width(8.dp))
            Button(
                onClick = {
                    scope.launch {
                        isSearching = true
                        appointments = repository.getAppointmentsByPhone(phoneInput)
                        isSearching = false
                    }
                },
                colors = ButtonDefaults.buttonColors(containerColor = SalonDark)
            ) {
                Text("Search", color = Color.White)
            }
        }

        Spacer(modifier = Modifier.height(16.dp))

        if (isSearching) {
            CircularProgressIndicator(color = SalonGold)
        } else if (appointments.isEmpty() && phoneInput.isNotBlank()) {
            Text("No appointments found for this phone number.", color = Color.Gray)
        } else {
            LazyColumn(verticalArrangement = Arrangement.spacedBy(8.dp)) {
                items(appointments) { appt ->
                    Card(
                        colors = CardDefaults.cardColors(containerColor = SalonCardBg),
                        modifier = Modifier.fillMaxWidth()
                    ) {
                        Column(modifier = Modifier.padding(14.dp)) {
                            Row(
                                modifier = Modifier.fillMaxWidth(),
                                horizontalArrangement = Arrangement.SpaceBetween
                            ) {
                                Text(appt.bookingNumber, fontWeight = FontWeight.Bold, color = SalonGold)
                                Text(appt.status.uppercase(), fontSize = 12.sp, color = Color(0xFF10B981))
                            }
                            Text(appt.serviceName, fontWeight = FontWeight.SemiBold, fontSize = 15.sp)
                            Text("Date: ${appt.appointmentDate} at ${appt.appointmentTime}", fontSize = 13.sp, color = Color.Gray)
                            Text("Amount: ₹${appt.servicePrice.toInt()}", fontWeight = FontWeight.Medium)
                        }
                    }
                }
            }
        }
    }
}

@Composable
fun SalonInfoTab(settings: SalonSettingsEntity, businessHours: List<BusinessHoursEntity>) {
    LazyColumn(contentPadding = PaddingValues(16.dp), verticalArrangement = Arrangement.spacedBy(12.dp)) {
        item {
            Card(colors = CardDefaults.cardColors(containerColor = SalonCardBg), modifier = Modifier.fillMaxWidth()) {
                Column(modifier = Modifier.padding(16.dp)) {
                    Text(settings.salonName, fontWeight = FontWeight.Bold, fontSize = 18.sp, color = SalonDark)
                    if (!settings.tagline.isNullOrEmpty()) {
                        Text(settings.tagline, fontSize = 12.sp, color = SalonGold)
                    }
                    Spacer(modifier = Modifier.height(8.dp))
                    Text("📍 Address:", fontWeight = FontWeight.SemiBold)
                    Text(settings.address, fontSize = 13.sp, color = Color.DarkGray)
                    if (!settings.landmarks.isNullOrEmpty()) {
                        Text("(${settings.landmarks})", fontSize = 12.sp, color = Color.Gray)
                    }
                    Spacer(modifier = Modifier.height(8.dp))
                    Text("📞 Contact: ${settings.phone}", fontWeight = FontWeight.SemiBold)
                    Text("✉️ Email: ${settings.email}", fontSize = 13.sp, color = Color.DarkGray)
                }
            }
        }

        item {
            Text("Operating Hours (Supabase Live)", fontWeight = FontWeight.Bold, fontSize = 16.sp)
        }

        items(businessHours) { bh ->
            Card(colors = CardDefaults.cardColors(containerColor = SalonCardBg), modifier = Modifier.fillMaxWidth()) {
                Row(
                    modifier = Modifier.padding(12.dp).fillMaxWidth(),
                    horizontalArrangement = Arrangement.SpaceBetween
                ) {
                    Text(bh.dayName, fontWeight = FontWeight.Medium)
                    if (bh.isClosed) {
                        Text("Closed", color = Color.Red, fontWeight = FontWeight.SemiBold)
                    } else {
                        Text("${bh.openTime} - ${bh.closeTime}", color = SalonDark)
                    }
                }
            }
        }
    }
}
