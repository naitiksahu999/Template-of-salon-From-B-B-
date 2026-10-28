package com.bbfamilysalon.app.data

import com.bbfamilysalon.app.data.models.AppointmentEntity
import com.bbfamilysalon.app.data.models.BlockedDateEntity
import com.bbfamilysalon.app.data.models.BusinessHoursEntity
import com.bbfamilysalon.app.data.models.SalonSettingsEntity
import com.bbfamilysalon.app.data.models.ServiceEntity
import io.github.jan.supabase.postgrest.from
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext

class SalonRepository {
    private val client = SupabaseConfig.client

    suspend fun getLiveServices(): List<ServiceEntity> = withContext(Dispatchers.IO) {
        try {
            client.from("services")
                .select()
                .decodeList<ServiceEntity>()
                .filter { it.isActive }
        } catch (e: Exception) {
            e.printStackTrace()
            emptyList()
        }
    }

    suspend fun getLiveBusinessHours(): List<BusinessHoursEntity> = withContext(Dispatchers.IO) {
        try {
            client.from("business_hours")
                .select()
                .decodeList<BusinessHoursEntity>()
        } catch (e: Exception) {
            e.printStackTrace()
            emptyList()
        }
    }

    suspend fun getLiveBlockedDates(): List<BlockedDateEntity> = withContext(Dispatchers.IO) {
        try {
            client.from("blocked_dates")
                .select()
                .decodeList<BlockedDateEntity>()
        } catch (e: Exception) {
            e.printStackTrace()
            emptyList()
        }
    }

    suspend fun getLiveSettings(): SalonSettingsEntity = withContext(Dispatchers.IO) {
        try {
            val list = client.from("settings")
                .select()
                .decodeList<SalonSettingsEntity>()
            list.firstOrNull() ?: SalonSettingsEntity()
        } catch (e: Exception) {
            e.printStackTrace()
            SalonSettingsEntity()
        }
    }

    suspend fun getAppointmentsByPhone(phone: String): List<AppointmentEntity> = withContext(Dispatchers.IO) {
        try {
            client.from("appointments")
                .select()
                .decodeList<AppointmentEntity>()
                .filter { it.customerPhone.replace("\\s+".toRegex(), "") == phone.replace("\\s+".toRegex(), "") }
        } catch (e: Exception) {
            e.printStackTrace()
            emptyList()
        }
    }

    suspend fun bookAppointment(appointment: AppointmentEntity): Boolean = withContext(Dispatchers.IO) {
        try {
            client.from("appointments").insert(appointment)
            true
        } catch (e: Exception) {
            e.printStackTrace()
            false
        }
    }
}
