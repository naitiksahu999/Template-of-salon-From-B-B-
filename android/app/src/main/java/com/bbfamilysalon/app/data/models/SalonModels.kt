package com.bbfamilysalon.app.data.models

import kotlinx.serialization.SerialName
import kotlinx.serialization.Serializable

@Serializable
data class ServiceEntity(
    val id: String,
    @SerialName("category_id") val categoryId: String? = null,
    val name: String,
    val description: String? = null,
    val price: Double = 0.0,
    @SerialName("duration_minutes") val durationMinutes: Int = 30,
    @SerialName("image_url") val imageUrl: String? = null,
    @SerialName("is_active") val isActive: Boolean = true,
    @SerialName("is_featured") val isFeatured: Boolean = false
)

@Serializable
data class BusinessHoursEntity(
    @SerialName("day_of_week") val dayOfWeek: Int,
    @SerialName("day_name") val dayName: String,
    @SerialName("open_time") val openTime: String,
    @SerialName("close_time") val closeTime: String,
    @SerialName("is_closed") val isClosed: Boolean = false
)

@Serializable
data class BlockedDateEntity(
    val id: String,
    val date: String,
    val reason: String? = null,
    @SerialName("all_day") val allDay: Boolean = true,
    @SerialName("start_time") val startTime: String? = null,
    @SerialName("end_time") val endTime: String? = null
)

@Serializable
data class SalonSettingsEntity(
    val id: String = "salon_settings_singleton",
    @SerialName("salon_name") val salonName: String = "Tassel Unisex Salon",
    @SerialName("alternate_name") val alternateName: String? = "Tassel Salon Bhopal",
    val tagline: String? = "The Art of Refined Grooming & Beauty Sanctuary in Bhopal",
    val phone: String = "+91 78800 86990",
    val email: String? = "contact@tasselunisexsalon.com",
    val address: String = "Kolar Road, Good Shapard Kalan, Mandakini Colony, Bhopal",
    val landmarks: String? = "Mandakini Colony, Kolar Road",
    val city: String = "Bhopal",
    val state: String = "Madhya Pradesh",
    val pincode: String = "462042",
    @SerialName("google_maps_url") val googleMapsUrl: String? = "https://www.google.co.in/maps/place/Tassel+Unisex+Salon,+Kolar+Rd,+Good+Shapard+Kalan,+Mandakini+Colony,+Kolar+Rd,+Bhopal,+Madhya+Pradesh+462042/@23.1823711,77.4175763,17z/",
    @SerialName("admin_whatsapp_phone") val adminWhatsAppPhone: String? = "+91 78800 86990",
    @SerialName("auto_confirm_bookings") val autoConfirmBookings: Boolean = true
)

@Serializable
data class AppointmentEntity(
    val id: String,
    @SerialName("booking_number") val bookingNumber: String,
    @SerialName("customer_id") val customerId: String? = null,
    @SerialName("customer_name") val customerName: String,
    @SerialName("customer_phone") val customerPhone: String,
    @SerialName("customer_email") val customerEmail: String? = null,
    @SerialName("service_id") val serviceId: String,
    @SerialName("service_name") val serviceName: String,
    @SerialName("service_price") val servicePrice: Double = 0.0,
    @SerialName("service_duration") val serviceDuration: Int = 30,
    @SerialName("appointment_date") val appointmentDate: String,
    @SerialName("appointment_time") val appointmentTime: String,
    val status: String = "confirmed",
    val notes: String? = null,
    @SerialName("created_at") val createdAt: String? = null
)
