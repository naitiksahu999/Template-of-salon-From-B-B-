import fs from 'fs';
import path from 'path';
import bcrypt from 'bcryptjs';
import { getSupabase } from './supabase.ts';
import { hydrateMediaStorage } from './mediaStorage.ts';
import type {
  AdminUser,
  Customer,
  ServiceCategory,
  Service,
  Appointment,
  BusinessHoursDay,
  BlockedDate,
  Review,
  GalleryItem,
  SiteSettings,
  NotificationLog,
  StaffMember,
  AdminNotification
} from '../src/types/index.ts';

export interface SalonDatabase {
  adminUsers: AdminUser[];
  customers: Customer[];
  categories: ServiceCategory[];
  services: Service[];
  appointments: Appointment[];
  businessHours: BusinessHoursDay[];
  blockedDates: BlockedDate[];
  reviews: Review[];
  galleryItems: GalleryItem[];
  settings: SiteSettings;
  notificationsLog: NotificationLog[];
  staff: StaffMember[];
  adminNotifications?: AdminNotification[];
  deletedAppointmentIds?: string[];
  deletedBookingNumbers?: string[];
  deletedCustomerIds?: string[];
  deletedCustomerPhones?: string[];
  deletedCustomerEmails?: string[];
  deletedNotificationIds?: string[];
  deletedLogIds?: string[];
  logsClearedAt?: string;
  notificationsClearedAt?: string;
}

const DATA_DIR = path.resolve(process.cwd(), 'data');
const DB_FILE = path.join(DATA_DIR, 'salon_db.json');

// In-memory cached database
let dbCache: SalonDatabase | null = null;

// Initial Seed Data Definitions
const adminPasswordHash = '$2b$10$Gad3hOiS7nK/wVaFjMDCQ.O7l/8xV6gOhl8t9YX6d.1qdcuFlMBSm'; // Valid hash for 'bnbadmin2026'

export const defaultAdmin: AdminUser = {
  id: 'admin_primary',
  username: 'admin',
  email: 'naitiksahu054@gmail.com',
  passwordHash: adminPasswordHash,
  role: 'superadmin',
  createdAt: '2026-10-09T00:00:00.000Z'
};

export const defaultCategories: ServiceCategory[] = [
  {
    id: 'cat_hair',
    name: 'Hair Craft & Styling',
    slug: 'hair',
    description: 'Precision haircuts, bespoke styling, hair coloring, keratin, and restorative hair spa.',
    sortOrder: 1
  },
  {
    id: 'cat_skin',
    name: 'Beauty & Skin Care',
    slug: 'beauty-skin',
    description: 'Invigorating facials, de-tan therapies, hygienic threading, and waxing care.',
    sortOrder: 2
  },
  {
    id: 'cat_makeup',
    name: 'Makeup & Bridal Artistry',
    slug: 'makeup',
    description: 'High-definition party makeup, bridal glam, and couture occasion styling.',
    sortOrder: 3
  }
];

export const defaultServices: Service[] = [
  // Hair
  {
    id: 'srv_hair_1',
    categoryId: 'cat_hair',
    name: 'Men’s Signature Haircut & Styling',
    description: 'Consultation, precision shear cut, wash, and luxury matte/pomade finish.',
    price: 250,
    durationMinutes: 30,
    imageUrl: '/assets/images/salon_hair_styling_1790779479714.jpg',
    isActive: true,
    isFeatured: true,
    createdAt: new Date().toISOString()
  },
  {
    id: 'srv_hair_2',
    categoryId: 'cat_hair',
    name: 'Women’s Precision Cut & Blowdry',
    description: 'Customized hair reshaping tailored to face profile, soothing wash, and volume blow-dry.',
    price: 550,
    durationMinutes: 45,
    imageUrl: '/assets/images/salon_hair_styling_1790779479714.jpg',
    isActive: true,
    isFeatured: true,
    createdAt: new Date().toISOString()
  },
  {
    id: 'srv_hair_3',
    categoryId: 'cat_hair',
    name: 'Kids Gentle Haircut',
    description: 'Patient, gentle styling for young clients in a calm, comfortable environment.',
    price: 200,
    durationMinutes: 30,
    imageUrl: '/assets/images/salon_hair_styling_1790779479714.jpg',
    isActive: true,
    isFeatured: false,
    createdAt: new Date().toISOString()
  },
  {
    id: 'srv_hair_4',
    categoryId: 'cat_hair',
    name: 'Hair Colour & Root Retouch',
    description: 'Premium ammonia-safe hair color for natural tone blending and gray coverage.',
    price: 1200,
    durationMinutes: 60,
    imageUrl: '/assets/images/salon_hair_styling_1790779479714.jpg',
    isActive: true,
    isFeatured: false,
    createdAt: new Date().toISOString()
  },
  {
    id: 'srv_hair_5',
    categoryId: 'cat_hair',
    name: 'Keratin Smoothing & Hair Botox',
    description: 'Intense frizz reduction, mirror shine, cuticle nourishment, and humidity resistance.',
    price: 3500,
    durationMinutes: 120,
    imageUrl: '/assets/images/salon_hair_styling_1790779479714.jpg',
    isActive: true,
    isFeatured: true,
    createdAt: new Date().toISOString()
  },
  {
    id: 'srv_hair_6',
    categoryId: 'cat_hair',
    name: 'Moroccan Oil Hydrating Hair Spa',
    description: 'Deep scalp massage, steam infusion, and restorative argan butter mask.',
    price: 950,
    durationMinutes: 45,
    imageUrl: '/assets/images/salon_hair_styling_1790779479714.jpg',
    isActive: true,
    isFeatured: false,
    createdAt: new Date().toISOString()
  },

  // Skin
  {
    id: 'srv_skin_1',
    categoryId: 'cat_skin',
    name: 'Signature Gold Glow Facial',
    description: 'Multi-step micro-cleansing, exfoliation, antioxidant mask, and lymphatic facial massage.',
    price: 1500,
    durationMinutes: 60,
    imageUrl: '/assets/images/salon_facial_skincare_1790779494754.jpg',
    isActive: true,
    isFeatured: true,
    createdAt: new Date().toISOString()
  },
  {
    id: 'srv_skin_2',
    categoryId: 'cat_skin',
    name: 'Oxy De-Tan Skin Brightening Therapy',
    description: 'Removes environmental tan, hydrates tired skin, and restores natural skin luminance.',
    price: 900,
    durationMinutes: 45,
    imageUrl: '/assets/images/salon_facial_skincare_1790779494754.jpg',
    isActive: true,
    isFeatured: true,
    createdAt: new Date().toISOString()
  },
  {
    id: 'srv_skin_3',
    categoryId: 'cat_skin',
    name: 'Eyebrow Threading & Facial Waxing Combo',
    description: 'Meticulous eyebrow shaping and gentle upper lip/chin threading using sterile threads.',
    price: 150,
    durationMinutes: 20,
    imageUrl: '/assets/images/salon_facial_skincare_1790779494754.jpg',
    isActive: true,
    isFeatured: false,
    createdAt: new Date().toISOString()
  },
  {
    id: 'srv_skin_4',
    categoryId: 'cat_skin',
    name: 'Luxury Full Arms & Legs Waxing (Honey/Aloe)',
    description: 'Smooth, skin-soothing hair removal with gentle pre-wax tonic and post-wax cooling oil.',
    price: 850,
    durationMinutes: 50,
    imageUrl: '/assets/images/salon_facial_skincare_1790779494754.jpg',
    isActive: true,
    isFeatured: false,
    createdAt: new Date().toISOString()
  },

  // Makeup
  {
    id: 'srv_mkup_1',
    categoryId: 'cat_makeup',
    name: 'HD Occasion & Party Makeup',
    description: 'Flawless camera-ready finish, highlighting, eye makeup, and hairstyle integration.',
    price: 2800,
    durationMinutes: 60,
    imageUrl: '/assets/images/salon_bridal_makeup_1790779508056.jpg',
    isActive: true,
    isFeatured: true,
    createdAt: new Date().toISOString()
  },
  {
    id: 'srv_mkup_2',
    categoryId: 'cat_makeup',
    name: 'Couture Bridal Makeup & Styling Suite',
    description: 'Comprehensive bridal transformation: high-definition makeup, dupatta drape, jewelry setting & hair styling.',
    price: 8500,
    durationMinutes: 180,
    imageUrl: '/assets/images/salon_bridal_makeup_1790779508056.jpg',
    isActive: true,
    isFeatured: true,
    createdAt: new Date().toISOString()
  }
];

export const defaultBusinessHours: BusinessHoursDay[] = [
  { dayOfWeek: 0, dayName: 'Sunday', isOpen: true, openTime: '10:00', closeTime: '21:00', breaks: [] },
  { dayOfWeek: 1, dayName: 'Monday', isOpen: true, openTime: '10:00', closeTime: '21:00', breaks: [] },
  { dayOfWeek: 2, dayName: 'Tuesday', isOpen: true, openTime: '10:00', closeTime: '21:00', breaks: [] },
  { dayOfWeek: 3, dayName: 'Wednesday', isOpen: true, openTime: '10:00', closeTime: '21:00', breaks: [] },
  { dayOfWeek: 4, dayName: 'Thursday', isOpen: true, openTime: '10:00', closeTime: '21:00', breaks: [] },
  { dayOfWeek: 5, dayName: 'Friday', isOpen: true, openTime: '10:00', closeTime: '21:00', breaks: [] },
  { dayOfWeek: 6, dayName: 'Saturday', isOpen: true, openTime: '10:00', closeTime: '21:00', breaks: [] }
];

export const defaultReviews: Review[] = [
  {
    id: 'rev_1',
    authorName: 'Rohit Malviya',
    rating: 5,
    reviewText: 'Exceptional styling and very courteous team at Tassel Unisex Salon on Kolar Road. Extremely satisfied with the hygiene and stylist attention.',
    reviewDate: 'September 2026',
    source: 'Google Reviews',
    isVerified: true,
    isFeatured: true,
    sourceUrl: 'https://maps.google.com'
  },
  {
    id: 'rev_2',
    authorName: 'Priyanka Sharma',
    rating: 5,
    reviewText: 'One of the best unisex salons in Mandakini Colony, Kolar Road. Welcoming team, modern tools, and the facial treatment was truly revitalizing.',
    reviewDate: 'August 2026',
    source: 'Google Reviews',
    isVerified: true,
    isFeatured: true,
    sourceUrl: 'https://maps.google.com'
  },
  {
    id: 'rev_3',
    authorName: 'Alok Verma',
    rating: 5,
    reviewText: 'Visited Tassel Salon for haircut and grooming. Clean environment, patient staff, and very transparent pricing.',
    reviewDate: 'August 2026',
    source: 'Google Reviews',
    isVerified: true,
    isFeatured: true,
    sourceUrl: 'https://maps.google.com'
  },
  {
    id: 'rev_4',
    authorName: 'Neha Gupta',
    rating: 5,
    reviewText: 'Pleased with the de-tan and skin service at Tassel. Very polite behavior and thorough cleanliness throughout the salon. Highly recommended in Bhopal.',
    reviewDate: 'July 2026',
    source: 'Google Reviews',
    isVerified: true,
    isFeatured: true,
    sourceUrl: 'https://maps.google.com'
  }
];

export const defaultGallery: GalleryItem[] = [
  {
    id: 'gal_1',
    title: 'Styling Workstations & Vanity Mirrors',
    category: 'Ambience',
    imageUrl: '/assets/images/hero_salon_interior_1790779465939.jpg',
    description: 'Circular backlit mirrors, ergonomic leather chairs, and spacious salon floor.',
    isFeatured: true
  },
  {
    id: 'gal_2',
    title: 'Precision Hair Cut & Craft',
    category: 'Hair',
    imageUrl: '/assets/images/salon_hair_styling_1790779479714.jpg',
    description: 'Custom scissor work, hair texturizing, and finishing styling.',
    isFeatured: true
  },
  {
    id: 'gal_3',
    title: 'Rejuvenating Botanical Facial Therapy',
    category: 'Beauty & Skin',
    imageUrl: '/assets/images/salon_facial_skincare_1790779494754.jpg',
    description: 'Hygienic skin treatment rooms designed for deep relaxation.',
    isFeatured: true
  },
  {
    id: 'gal_4',
    title: 'Couture Bridal & HD Makeup Artistry',
    category: 'Makeup',
    imageUrl: '/assets/images/salon_bridal_makeup_1790779508056.jpg',
    description: 'High-definition occasion makeup and bridal prep.',
    isFeatured: true
  },
  {
    id: 'gal_5',
    title: 'Client Reception & Waiting Lounge',
    category: 'Ambience',
    imageUrl: '/assets/images/salon_ambience_lounge_1790779524195.jpg',
    description: 'Comfortable waiting area with complimentary hospitality.',
    isFeatured: true
  }
];

export const defaultSettings: SiteSettings = {
  salonName: 'Tassel Unisex Salon',
  alternateName: 'Tassel Salon Bhopal',
  tagline: 'Luxury Unisex Salon & Beauty Sanctuary in Bhopal',
  phone: '+91 78800 86990',
  email: 'contact@tasselunisexsalon.com',
  address: 'Kolar Road, Good Shapard Kalan, Mandakini Colony',
  landmarks: 'Mandakini Colony, Kolar Road',
  city: 'Bhopal',
  state: 'Madhya Pradesh',
  pincode: '462042',
  googleMapsUrl: 'https://www.google.co.in/maps/place/Tassel+Unisex+Salon,+Kolar+Rd,+Good+Shapard+Kalan,+Mandakini+Colony,+Kolar+Rd,+Bhopal,+Madhya+Pradesh+462042/@23.1823711,77.4175763,17z/',
  slotIntervalMinutes: 30,
  autoConfirmBookings: true,
  cancellationDeadlineHours: 2,
  adminNotificationEmail: 'naitiksahu054@gmail.com',
  enableSmsNotifications: true,
  enableWhatsAppNotifications: true,
  enableEmailNotifications: false
};

export const defaultStaff: StaffMember[] = [
  {
    id: 'staff_1',
    name: 'Rajesh Sharma',
    role: 'Master Hair Artist & Senior Stylist',
    specialties: ['Precision Fades', 'Bespoke Scissor Work', 'Beard Architecture', 'Keratin Therapy'],
    experienceYears: 10,
    rating: 4.9,
    bio: 'Renowned hair artisan with over a decade of grooming mastery in Bhopal. Specializes in tailored face-shape cuts and low-maintenance styling.',
    imageUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=600&q=80',
    phone: '+91 78800 86990',
    isActive: true,
    createdAt: '2026-01-01T00:00:00.000Z'
  },
  {
    id: 'staff_2',
    name: 'Priya Sen',
    role: 'Senior Aesthetician & Skin Care Specialist',
    specialties: ['Botanical Facials', 'Hydra-Glow Therapy', 'Micro-Exfoliation', 'Anti-Stress Massage'],
    experienceYears: 8,
    rating: 4.9,
    bio: 'Certified dermacare aesthetician delivering restorative, luminous skin rituals using hospital-grade hygiene and dermatological botanicals.',
    imageUrl: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&w=600&q=80',
    phone: '+91 78800 86990',
    isActive: true,
    createdAt: '2026-01-01T00:00:00.000Z'
  },
  {
    id: 'staff_3',
    name: 'Aman Khan',
    role: 'Creative Hair Colorist & Texture Specialist',
    specialties: ['Balayage & Highlights', 'Global Hair Coloring', 'Botox Hair Spa', 'Cysteine Smoothing'],
    experienceYears: 7,
    rating: 4.8,
    bio: 'Expert colorist known for seamless dimensional blondes, rich brunette tones, and hair damage reversal treatments.',
    imageUrl: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=600&q=80',
    phone: '+91 78800 86990',
    isActive: true,
    createdAt: '2026-01-01T00:00:00.000Z'
  },
  {
    id: 'staff_4',
    name: 'Sunita Verma',
    role: 'Couture Bridal & HD Makeup Specialist',
    specialties: ['HD Bridal Makeup', 'Airbrush Artistry', 'Dupatta Draping', 'Sangeet & Reception Glam'],
    experienceYears: 9,
    rating: 5.0,
    bio: 'Celebrated bridal makeup visionary creating photogenic, long-lasting bridal looks that enhance natural beauty with couture elegance.',
    imageUrl: 'https://images.unsplash.com/photo-1580489944761-15a19d654956?auto=format&fit=crop&w=600&q=80',
    phone: '+91 78800 86990',
    isActive: true,
    createdAt: '2026-01-01T00:00:00.000Z'
  }
];

export async function getDb(): Promise<SalonDatabase> {
  if (dbCache) {
    return dbCache;
  }
  await initDb();
  return dbCache!;
}

export async function saveDb(updatedData: SalonDatabase): Promise<void> {
  // Guarantee deletion arrays never store booking reference numbers or customer phone numbers
  if (Array.isArray(updatedData.deletedAppointmentIds)) {
    updatedData.deletedAppointmentIds = updatedData.deletedAppointmentIds.filter(
      (id) => typeof id === 'string' && !id.startsWith('BB-') && !id.startsWith('TS-')
    );
  }
  if (Array.isArray(updatedData.deletedCustomerIds)) {
    updatedData.deletedCustomerIds = updatedData.deletedCustomerIds.filter(
      (id) => typeof id === 'string' && !/^\+?\d+$/.test(id.replace(/\s+/g, ''))
    );
  }
  dbCache = updatedData;
  try {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
    const jsonContent = JSON.stringify(updatedData, null, 2);
    fs.writeFileSync(DB_FILE, jsonContent, 'utf-8');

    // Keep backup copy
    const backupPath = path.join(DATA_DIR, 'salon_db.backup.json');
    fs.writeFileSync(backupPath, jsonContent, 'utf-8');

    // Also persist admin credentials backup file if admin exists
    if (updatedData.adminUsers && updatedData.adminUsers.length > 0) {
      const adminCredPath = path.join(DATA_DIR, 'admin_account.json');
      fs.writeFileSync(adminCredPath, JSON.stringify(updatedData.adminUsers, null, 2), 'utf-8');
    }
  } catch (err) {
    console.error('Failed to write to database file:', err);
  }

  // Asynchronously synchronize complete salon state to Supabase cloud database
  try {
    const supabase = getSupabase();
    if (supabase) {
      const cloudPayload = {
        settings: updatedData.settings,
        businessHours: updatedData.businessHours,
        blockedDates: updatedData.blockedDates,
        adminUsers: updatedData.adminUsers,
        services: updatedData.services,
        categories: updatedData.categories,
        reviews: updatedData.reviews,
        galleryItems: updatedData.galleryItems,
        customers: updatedData.customers,
        staff: updatedData.staff,
        appointments: updatedData.appointments || [],
        deletedAppointmentIds: updatedData.deletedAppointmentIds || [],
        deletedBookingNumbers: updatedData.deletedBookingNumbers || [],
        deletedCustomerIds: updatedData.deletedCustomerIds || [],
        deletedCustomerPhones: updatedData.deletedCustomerPhones || [],
        deletedCustomerEmails: updatedData.deletedCustomerEmails || [],
        notificationsLog: updatedData.notificationsLog || [],
        deletedLogIds: updatedData.deletedLogIds || [],
        logsClearedAt: updatedData.logsClearedAt,
        adminNotifications: updatedData.adminNotifications || [],
        deletedNotificationIds: updatedData.deletedNotificationIds || [],
        notificationsClearedAt: updatedData.notificationsClearedAt,
        savedAt: new Date().toISOString()
      };
      try {
        const { error } = await supabase
          .from('appointments')
          .upsert({
            id: '__salon_global_state__',
            booking_number: 'CFG-001',
            customer_name: 'Salon State Engine',
            customer_phone: '0000000000',
            service_id: 'cfg_state',
            service_name: 'Configuration Payload',
            service_price: 0,
            service_duration: 0,
            appointment_date: '2026-01-01',
            appointment_time: '00:00',
            status: 'system',
            notes: JSON.stringify(cloudPayload)
          }, { onConflict: 'id' });
        if (error) {
          console.warn('[Supabase State Cloud Sync Notice]:', error.message || error);
        } else {
          console.log('[Supabase State Cloud Sync]: Successfully persisted salon changes to cloud.');
        }
      } catch (err: any) {
        console.warn('[Supabase State Cloud Sync Notice]:', err?.message || err);
      }
    }
  } catch (syncErr: any) {
    console.warn('[Supabase State Cloud Sync Notice]:', syncErr?.message || syncErr);
  }
}

export async function initDb(): Promise<SalonDatabase> {
  // Ensure media storage is fully initialized and hydrated from cloud before loading database
  try {
    await hydrateMediaStorage();
  } catch (mErr) {
    console.warn('[initDb] Media storage hydration notice:', mErr);
  }

  const tryRead = (filePath: string): any => {
    try {
      if (fs.existsSync(filePath)) {
        const content = fs.readFileSync(filePath, 'utf-8');
        return JSON.parse(content);
      }
    } catch (e) {
      console.error(`Error reading ${filePath}:`, e);
    }
    return null;
  };

  dbCache = tryRead(DB_FILE) || tryRead(path.join(DATA_DIR, 'salon_db.backup.json'));

  if (!dbCache) {
    dbCache = {
      adminUsers: [defaultAdmin],
      customers: [],
      categories: defaultCategories,
      services: defaultServices,
      appointments: [],
      businessHours: defaultBusinessHours,
      blockedDates: [],
      reviews: defaultReviews,
      galleryItems: defaultGallery,
      settings: defaultSettings,
      notificationsLog: [],
      staff: defaultStaff,
      adminNotifications: []
    };
  } else {
    // Ensure all root keys exist and are populated with defaults if missing
    dbCache.customers = dbCache.customers || [];
    dbCache.categories = (dbCache.categories && dbCache.categories.length > 0) ? dbCache.categories : defaultCategories;
    dbCache.services = (dbCache.services && dbCache.services.length > 0) ? dbCache.services : defaultServices;
    dbCache.appointments = dbCache.appointments || [];
    dbCache.businessHours = (dbCache.businessHours && dbCache.businessHours.length > 0) ? dbCache.businessHours : defaultBusinessHours;
    dbCache.blockedDates = dbCache.blockedDates || [];
    dbCache.reviews = (dbCache.reviews && dbCache.reviews.length > 0) ? dbCache.reviews : defaultReviews;
    dbCache.galleryItems = (dbCache.galleryItems && dbCache.galleryItems.length > 0) ? dbCache.galleryItems : defaultGallery;
    dbCache.settings = { ...defaultSettings, ...(dbCache.settings || {}) };
    dbCache.notificationsLog = dbCache.notificationsLog || [];
    dbCache.staff = (dbCache.staff && dbCache.staff.length > 0) ? dbCache.staff : defaultStaff;
    dbCache.adminNotifications = dbCache.adminNotifications || [];

    // Ensure Admin Slot is ALWAYS booked and never reset!
    if (!dbCache.adminUsers || dbCache.adminUsers.length === 0) {
      const adminCredPath = path.join(DATA_DIR, 'admin_account.json');
      const savedAdmin = tryRead(adminCredPath);
      if (Array.isArray(savedAdmin) && savedAdmin.length > 0) {
        dbCache.adminUsers = savedAdmin;
      } else {
        dbCache.adminUsers = [defaultAdmin];
      }
    }
  }

  // Hydrate persistent state from Supabase Cloud if available (guarantees persistence across container restarts or days of inactivity)
  try {
    const supabase = getSupabase();
    if (supabase) {
      const { data: cloudRecord } = await supabase
        .from('appointments')
        .select('notes')
        .eq('id', '__salon_global_state__')
        .single();

      if (cloudRecord?.notes) {
        try {
          const parsedCloud = JSON.parse(cloudRecord.notes);
          if (parsedCloud && typeof parsedCloud === 'object') {
            console.log('[Supabase State Cloud Hydration]: Loaded persistent state from cloud database.');
            if (parsedCloud.settings) dbCache.settings = { ...defaultSettings, ...parsedCloud.settings };
            if (Array.isArray(parsedCloud.businessHours) && parsedCloud.businessHours.length > 0) {
              dbCache.businessHours = parsedCloud.businessHours;
            }
            if (Array.isArray(parsedCloud.blockedDates)) {
              dbCache.blockedDates = parsedCloud.blockedDates;
            }
            if (Array.isArray(parsedCloud.adminUsers) && parsedCloud.adminUsers.length > 0) {
              dbCache.adminUsers = parsedCloud.adminUsers;
            }
            if (Array.isArray(parsedCloud.services) && parsedCloud.services.length > 0) {
              dbCache.services = parsedCloud.services;
            }
            if (Array.isArray(parsedCloud.categories) && parsedCloud.categories.length > 0) {
              dbCache.categories = parsedCloud.categories;
            }
            if (Array.isArray(parsedCloud.reviews) && parsedCloud.reviews.length > 0) {
              dbCache.reviews = parsedCloud.reviews;
            }
            if (Array.isArray(parsedCloud.galleryItems) && parsedCloud.galleryItems.length > 0) {
              dbCache.galleryItems = parsedCloud.galleryItems;
            }
            if (Array.isArray(parsedCloud.staff) && parsedCloud.staff.length > 0) {
              dbCache.staff = parsedCloud.staff;
            }
            if (Array.isArray(parsedCloud.deletedAppointmentIds)) {
              const sanitizedCloudApptIds = parsedCloud.deletedAppointmentIds.filter(
                (id: string) => typeof id === 'string' && !id.startsWith('BB-') && !id.startsWith('TS-')
              );
              const sanitizedLocalApptIds = (dbCache.deletedAppointmentIds || []).filter(
                (id: string) => typeof id === 'string' && !id.startsWith('BB-') && !id.startsWith('TS-')
              );
              const unionAppt = new Set([...sanitizedLocalApptIds, ...sanitizedCloudApptIds]);
              dbCache.deletedAppointmentIds = Array.from(unionAppt);
            }
            if (Array.isArray(parsedCloud.deletedBookingNumbers)) {
              const unionBNum = new Set([...(dbCache.deletedBookingNumbers || []), ...parsedCloud.deletedBookingNumbers]);
              dbCache.deletedBookingNumbers = Array.from(unionBNum);
            }
            if (Array.isArray(parsedCloud.deletedCustomerIds)) {
              const sanitizedCloudCustIds = parsedCloud.deletedCustomerIds.filter(
                (id: string) => typeof id === 'string' && !/^\+?\d+$/.test(id.replace(/\s+/g, ''))
              );
              const sanitizedLocalCustIds = (dbCache.deletedCustomerIds || []).filter(
                (id: string) => typeof id === 'string' && !/^\+?\d+$/.test(id.replace(/\s+/g, ''))
              );
              const unionCust = new Set([...sanitizedLocalCustIds, ...sanitizedCloudCustIds]);
              dbCache.deletedCustomerIds = Array.from(unionCust);
            }
            if (Array.isArray(parsedCloud.deletedCustomerPhones)) {
              const unionPhones = new Set([...(dbCache.deletedCustomerPhones || []), ...parsedCloud.deletedCustomerPhones]);
              dbCache.deletedCustomerPhones = Array.from(unionPhones);
            }
            if (Array.isArray(parsedCloud.deletedCustomerEmails)) {
              const unionEmails = new Set([...(dbCache.deletedCustomerEmails || []), ...parsedCloud.deletedCustomerEmails]);
              dbCache.deletedCustomerEmails = Array.from(unionEmails);
            }
            if (Array.isArray(parsedCloud.deletedLogIds)) {
              const unionLogs = new Set([...(dbCache.deletedLogIds || []), ...parsedCloud.deletedLogIds]);
              dbCache.deletedLogIds = Array.from(unionLogs);
            }
            if (parsedCloud.logsClearedAt) {
              if (!dbCache.logsClearedAt || parsedCloud.logsClearedAt > dbCache.logsClearedAt) {
                dbCache.logsClearedAt = parsedCloud.logsClearedAt;
              }
            }
            if (Array.isArray(parsedCloud.deletedNotificationIds)) {
              const unionNotif = new Set([...(dbCache.deletedNotificationIds || []), ...parsedCloud.deletedNotificationIds]);
              dbCache.deletedNotificationIds = Array.from(unionNotif);
            }
            if (parsedCloud.notificationsClearedAt) {
              if (!dbCache.notificationsClearedAt || parsedCloud.notificationsClearedAt > dbCache.notificationsClearedAt) {
                dbCache.notificationsClearedAt = parsedCloud.notificationsClearedAt;
              }
            }

            // Hydrate appointments from cloud snapshot if not deleted
            if (Array.isArray(parsedCloud.appointments) && parsedCloud.appointments.length > 0) {
              const apptDelSet = new Set(dbCache.deletedAppointmentIds || []);
              const bNumDelSet = new Set(dbCache.deletedBookingNumbers || []);
              const apptMap = new Map<string, Appointment>();
              (dbCache.appointments || []).forEach((a) => {
                if (a.id && !apptDelSet.has(a.id) && (!a.bookingNumber || !bNumDelSet.has(a.bookingNumber))) {
                  apptMap.set(a.id, a);
                }
              });
              parsedCloud.appointments.forEach((ca: Appointment) => {
                if (
                  ca.id &&
                  !apptDelSet.has(ca.id) &&
                  (!ca.bookingNumber || !bNumDelSet.has(ca.bookingNumber)) &&
                  (ca.status as any) !== 'deleted'
                ) {
                  if (!apptMap.has(ca.id)) {
                    apptMap.set(ca.id, ca);
                  }
                }
              });
              dbCache.appointments = Array.from(apptMap.values());
            }

            // Merge cloud notification logs safely without overwriting deletions
            if (Array.isArray(parsedCloud.notificationsLog)) {
              const delLogSet = new Set(dbCache.deletedLogIds || []);
              const logsClearTime = dbCache.logsClearedAt ? new Date(dbCache.logsClearedAt).getTime() : 0;
              const logMap = new Map<string, NotificationLog>();
              (dbCache.notificationsLog || []).forEach((l) => {
                if (
                  l.id &&
                  !delLogSet.has(l.id) &&
                  (!logsClearTime || new Date(l.createdAt).getTime() > logsClearTime)
                ) {
                  logMap.set(l.id, l);
                }
              });
              parsedCloud.notificationsLog.forEach((cl: NotificationLog) => {
                if (
                  cl.id &&
                  !delLogSet.has(cl.id) &&
                  (!logsClearTime || new Date(cl.createdAt).getTime() > logsClearTime)
                ) {
                  if (!logMap.has(cl.id)) {
                    logMap.set(cl.id, cl);
                  }
                }
              });
              dbCache.notificationsLog = Array.from(logMap.values());
            }

            // Merge cloud admin notifications safely without overwriting deletions
            if (Array.isArray(parsedCloud.adminNotifications)) {
              const delNotifSet = new Set(dbCache.deletedNotificationIds || []);
              const notifsClearTime = dbCache.notificationsClearedAt ? new Date(dbCache.notificationsClearedAt).getTime() : 0;
              const notifMap = new Map<string, AdminNotification>();
              (dbCache.adminNotifications || []).forEach((n) => {
                if (
                  n.id &&
                  !delNotifSet.has(n.id) &&
                  (!notifsClearTime || new Date(n.createdAt).getTime() > notifsClearTime)
                ) {
                  notifMap.set(n.id, n);
                }
              });
              parsedCloud.adminNotifications.forEach((cn: AdminNotification) => {
                if (
                  cn.id &&
                  !delNotifSet.has(cn.id) &&
                  (!notifsClearTime || new Date(cn.createdAt).getTime() > notifsClearTime)
                ) {
                  if (!notifMap.has(cn.id)) {
                    notifMap.set(cn.id, cn);
                  }
                }
              });
              dbCache.adminNotifications = Array.from(notifMap.values());
            }
          }
        } catch (e) {
          console.error('[Supabase State Cloud Hydration Parse Error]:', e);
        }
      }

      // Final sanitize of deletion sets
      dbCache.deletedAppointmentIds = (dbCache.deletedAppointmentIds || []).filter(
        (id: string) => typeof id === 'string' && !id.startsWith('BB-') && !id.startsWith('TS-')
      );
      dbCache.deletedCustomerIds = (dbCache.deletedCustomerIds || []).filter(
        (id: string) => typeof id === 'string' && !/^\+?\d+$/.test(id.replace(/\s+/g, ''))
      );

      const deletedApptSet = new Set(dbCache.deletedAppointmentIds || []);
      const deletedBNumSet = new Set(dbCache.deletedBookingNumbers || []);
      const deletedCustSet = new Set(dbCache.deletedCustomerIds || []);
      const deletedPhoneSet = new Set(dbCache.deletedCustomerPhones || []);
      const deletedEmailSet = new Set(dbCache.deletedCustomerEmails || []);
      const deletedLogSet = new Set(dbCache.deletedLogIds || []);
      const deletedNotifSet = new Set(dbCache.deletedNotificationIds || []);
      const finalLogsClearTime = dbCache.logsClearedAt ? new Date(dbCache.logsClearedAt).getTime() : 0;
      const finalNotifsClearTime = dbCache.notificationsClearedAt ? new Date(dbCache.notificationsClearedAt).getTime() : 0;

      // Filter local appointments strictly
      dbCache.appointments = (dbCache.appointments || []).filter(
        (a) =>
          !deletedApptSet.has(a.id) &&
          (!a.bookingNumber || !deletedBNumSet.has(a.bookingNumber)) &&
          (a.status as any) !== 'deleted'
      );

      // Filter and deduplicate local customers
      const filteredCustomers = (dbCache.customers || []).filter((c) => {
        if (deletedCustSet.has(c.id)) return false;
        const cDigits = c.phone ? c.phone.replace(/\D/g, '').slice(-10) : '';
        if (cDigits && deletedPhoneSet.has(cDigits)) return false;
        const cEmail = c.email ? c.email.trim().toLowerCase() : '';
        if (cEmail && deletedEmailSet.has(cEmail)) return false;
        return true;
      });

      // Deduplicate customers by 10-digit phone number
      const custDedupMap = new Map<string, Customer>();
      filteredCustomers.forEach((c) => {
        const cDigits = c.phone ? c.phone.replace(/\D/g, '').slice(-10) : c.id;
        if (!custDedupMap.has(cDigits)) {
          custDedupMap.set(cDigits, c);
        } else {
          const ex = custDedupMap.get(cDigits)!;
          ex.totalBookings = Math.max(ex.totalBookings || 1, c.totalBookings || 1);
          if (c.lastBookingDate && (!ex.lastBookingDate || c.lastBookingDate > ex.lastBookingDate)) {
            ex.lastBookingDate = c.lastBookingDate;
          }
        }
      });
      dbCache.customers = Array.from(custDedupMap.values());

      // Filter notification logs and admin notifications against permanent deletion logs and cleared timestamps
      dbCache.notificationsLog = (dbCache.notificationsLog || []).filter(
        (l) => !deletedLogSet.has(l.id) && (!finalLogsClearTime || new Date(l.createdAt).getTime() > finalLogsClearTime)
      );
      dbCache.adminNotifications = (dbCache.adminNotifications || []).filter(
        (n) => !deletedNotifSet.has(n.id) && (!finalNotifsClearTime || new Date(n.createdAt).getTime() > finalNotifsClearTime)
      );

      // Pull persistent customers directly from Supabase cloud table
      const { data: cloudCustomers } = await supabase
        .from('customers')
        .select('*');

      if (Array.isArray(cloudCustomers) && cloudCustomers.length > 0) {
        cloudCustomers.forEach((cc: any) => {
          if (!cc.id) return;
          const cleanPhone = cc.phone ? cc.phone.trim() : '';
          const digits = cleanPhone.replace(/\D/g, '').slice(-10);
          const cleanEmail = cc.email ? cc.email.trim().toLowerCase() : '';

          if (
            deletedCustSet.has(cc.id) ||
            (digits && deletedPhoneSet.has(digits)) ||
            (cleanEmail && deletedEmailSet.has(cleanEmail))
          ) {
            // Already deleted customer, do not revive
            return;
          }

          const existingCustIdx = dbCache!.customers.findIndex(
            (c) => c.id === cc.id || (digits && c.phone.replace(/\D/g, '').endsWith(digits))
          );
          if (existingCustIdx !== -1) {
            dbCache!.customers[existingCustIdx].name = cc.name || dbCache!.customers[existingCustIdx].name;
            dbCache!.customers[existingCustIdx].totalBookings = cc.total_bookings ?? dbCache!.customers[existingCustIdx].totalBookings;
            dbCache!.customers[existingCustIdx].lastBookingDate = cc.last_booking_date || dbCache!.customers[existingCustIdx].lastBookingDate;
            dbCache!.customers[existingCustIdx].isVerified = true;
            dbCache!.customers[existingCustIdx].isRegistered = true;
          } else {
            dbCache!.customers.push({
              id: cc.id,
              name: cc.name,
              phone: cleanPhone,
              email: cc.email || undefined,
              totalBookings: cc.total_bookings || 1,
              lastBookingDate: cc.last_booking_date || undefined,
              createdAt: cc.created_at || new Date().toISOString(),
              isRegistered: true,
              isVerified: true,
              notes: ''
            });
          }
        });
      }

      // Also pull appointments from Supabase cloud
      const { data: cloudAppointments } = await supabase
        .from('appointments')
        .select('*')
        .neq('id', '__salon_global_state__');

      if (Array.isArray(cloudAppointments) && cloudAppointments.length > 0) {
        cloudAppointments.forEach((ca: any) => {
          if (
            ca.id &&
            !ca.id.startsWith('__salon_') &&
            !ca.id.startsWith('test_') &&
            !ca.id.startsWith('system_') &&
            ca.status !== 'deleted' &&
            !deletedApptSet.has(ca.id) &&
            (!ca.booking_number || !deletedBNumSet.has(ca.booking_number)) &&
            !ca.booking_number?.startsWith('TEST-') &&
            !ca.booking_number?.startsWith('SYS-')
          ) {
            let collectedAmt = typeof ca.actual_amount_collected === 'number' ? ca.actual_amount_collected : undefined;
            let pMethod = ca.payment_method;
            let pNotes = ca.amount_notes;
            const fullNotes = (ca.internal_notes || '') + ' ' + (ca.notes || '');
            if (collectedAmt === undefined && fullNotes.includes('[ACTUAL_COLLECTED:')) {
              const match = fullNotes.match(/\[ACTUAL_COLLECTED:\s*₹?(\d+(?:\.\d+)?)\]/);
              if (match) collectedAmt = parseFloat(match[1]);
            }
            if (!pMethod && fullNotes.includes('[PAYMENT_METHOD:')) {
              const match = fullNotes.match(/\[PAYMENT_METHOD:\s*([^\]]+)\]/);
              if (match) pMethod = match[1].trim();
            }
            if (!pNotes && fullNotes.includes('[PAYMENT_NOTES:')) {
              const match = fullNotes.match(/\[PAYMENT_NOTES:\s*([^\]]+)\]/);
              if (match) pNotes = match[1].trim();
            }

            const rawCreated = ca.created_at || ca.createdAt || new Date().toISOString();
            const createdAtIST = new Date(rawCreated).toLocaleString('en-IN', {
              timeZone: 'Asia/Kolkata',
              day: '2-digit',
              month: 'short',
              year: 'numeric',
              hour: '2-digit',
              minute: '2-digit',
              hour12: true
            }) + ' IST';

            const mappedAppt: Appointment = {
              id: ca.id,
              bookingNumber: ca.booking_number || ca.bookingNumber || `TS-${ca.id}`,
              customerId: ca.customer_id || ca.customerId,
              customerName: ca.customer_name || ca.customerName || 'Customer',
              customerPhone: ca.customer_phone || ca.customerPhone || '',
              customerEmail: ca.customer_email || ca.customerEmail || '',
              serviceId: ca.service_id || ca.serviceId || 'srv_hair_1',
              serviceName: ca.service_name || ca.serviceName || 'Haircut',
              servicePrice: Number(ca.service_price || ca.servicePrice || 0),
              serviceDuration: Number(ca.service_duration || ca.serviceDuration || 30),
              date: ca.appointment_date || ca.date,
              time: ca.appointment_time || ca.time || '10:00',
              endTime: ca.end_time || ca.endTime,
              status: ca.status || 'confirmed',
              notes: ca.notes || '',
              stylistId: ca.stylist_id || ca.stylistId || undefined,
              stylistName: ca.stylist_name || ca.stylistName || undefined,
              internalNotes: ca.internal_notes || ca.internalNotes || '',
              actualAmountCollected: collectedAmt,
              paymentMethod: pMethod,
              amountNotes: pNotes,
              createdAtIST,
              createdAt: rawCreated,
              updatedAt: ca.updated_at || ca.updatedAt || rawCreated
            };
            const existingIdx = dbCache!.appointments.findIndex(
              (a) => a.id === mappedAppt.id || a.bookingNumber === mappedAppt.bookingNumber
            );
            if (existingIdx !== -1) {
              dbCache!.appointments[existingIdx] = mappedAppt;
            } else {
              dbCache!.appointments.push(mappedAppt);
            }
          }
        });
      }

      // Also pull direct salon settings from Supabase settings table
      const { data: cloudSettings } = await supabase
        .from('settings')
        .select('*')
        .eq('id', 'salon_settings_singleton')
        .single();
      if (cloudSettings) {
        if (typeof cloudSettings.auto_confirm_bookings === 'boolean') {
          dbCache.settings.autoConfirmBookings = cloudSettings.auto_confirm_bookings;
        }
        if (cloudSettings.salon_name) dbCache.settings.salonName = cloudSettings.salon_name;
        if (cloudSettings.phone) dbCache.settings.phone = cloudSettings.phone;
        if (cloudSettings.email) dbCache.settings.email = cloudSettings.email;
        if (cloudSettings.address) dbCache.settings.address = cloudSettings.address;
        if (cloudSettings.landmarks) dbCache.settings.landmarks = cloudSettings.landmarks;
      }
    }
  } catch (cloudErr) {
    console.warn('[Supabase Cloud Hydration Notice]: Unable to query cloud, using disk snapshot:', cloudErr);
  }

  // Ensure createdAtIST is populated for all appointments
  (dbCache.appointments || []).forEach((a) => {
    if (!a.createdAtIST && a.createdAt) {
      try {
        a.createdAtIST = new Date(a.createdAt).toLocaleString('en-IN', {
          timeZone: 'Asia/Kolkata',
          day: '2-digit',
          month: 'short',
          year: 'numeric',
          hour: '2-digit',
          minute: '2-digit',
          hour12: true
        }) + ' IST';
      } catch {}
    }
  });

  // Ensure Admin Slot is ALWAYS booked and never reset!
  if (!dbCache.adminUsers || dbCache.adminUsers.length === 0) {
    dbCache.adminUsers = [defaultAdmin];
  }

  // Normalize image paths to /assets/images/ so they work across dev & prod
  dbCache.services.forEach((s) => {
    if (s.imageUrl && s.imageUrl.startsWith('/src/assets/')) {
      s.imageUrl = s.imageUrl.replace('/src/assets/', '/assets/');
    }
  });
  dbCache.galleryItems.forEach((g) => {
    if (g.imageUrl && g.imageUrl.startsWith('/src/assets/')) {
      g.imageUrl = g.imageUrl.replace('/src/assets/', '/assets/');
    }
  });

  // Preserve and restore uploaded hero banner if it was temporarily reset by previous buggy auto-repair
  const knownUploadedHero = '/assets/uploads/upload_1791825309583_Screenshot_2026-10-09-11-57-43.jpg';
  const heroFileExists = fs.existsSync(path.join(process.cwd(), 'public/assets/uploads', path.basename(knownUploadedHero))) ||
    fs.existsSync(path.join(process.cwd(), 'data/uploads', path.basename(knownUploadedHero)));
  if (
    heroFileExists &&
    (!dbCache.settings.heroBannerUrl || dbCache.settings.heroBannerUrl.includes('hero_salon_interior'))
  ) {
    dbCache.settings.heroBannerUrl = knownUploadedHero;
    console.log('[db.ts] Restored saved uploaded hero banner:', knownUploadedHero);
  }

  // Ensure disk files are completely up to date with populated database
  await saveDb(dbCache);
  return dbCache;
}

