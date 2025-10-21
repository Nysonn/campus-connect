import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import * as dotenv from 'dotenv';
import { PrismaClient, Role, RideStatus, RideType, VehicleType } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import * as jwt from 'jsonwebtoken';
import { z } from 'zod';
import Decimal from 'decimal.js';
import { uploadProfilePhoto, deleteProfilePhoto, extractPublicId } from './config/cloudinary';
import { uploadPhoto } from './middleware/upload';

dotenv.config();

const prisma = new PrismaClient();
const app = express();

// Enable CORS with credentials support
app.use(cors({
  origin: '*', 
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true, 
}));
app.use(express.json());
app.use(cookieParser());

const PORT = Number(process.env.PORT || 4000);
const JWT_SECRET = process.env.JWT_SECRET || 'dev_secret_change_me';
const JWT_EXP = '180d'; // 6 months (approximately 180 days)
const COOKIE_NAME = 'campus_connect_token';
const COOKIE_MAX_AGE = 180 * 24 * 60 * 60 * 1000; // 6 months in milliseconds 

// Types & Extending Request 
type JwtPayload = { userId: string; role: Role };

declare global {
  namespace Express {
    interface Request {
      user?: { id: string; role: Role };
    }
  }
}

// Help functions
async function hashPassword(password: string) {
  return bcrypt.hash(password, 10);
}
async function verifyPassword(password: string, hash: string) {
  return bcrypt.compare(password, hash);
}
function generateToken(payload: JwtPayload) {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: JWT_EXP });
}
function verifyToken(token: string) {
  try {
    return jwt.verify(token, JWT_SECRET) as JwtPayload;
  } catch (err) {
    return null;
  }
}

function setAuthCookie(res: Response, token: string) {
  res.cookie(COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: COOKIE_MAX_AGE,
  });
}

// Middleware
function authMiddleware(req: Request, res: Response, next: NextFunction) {
  // Try to get token from Authorization header first, then from cookie
  let token: string | null = null;
  
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    token = authHeader.slice(7);
  } else if (req.cookies && req.cookies[COOKIE_NAME]) {
    token = req.cookies[COOKIE_NAME];
  }
  
  if (!token) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  
  const payload = verifyToken(token);
  if (!payload) return res.status(401).json({ error: 'Invalid token' });
  req.user = { id: payload.userId, role: payload.role };
  next();
}

function requireRole(roles: Role[]) {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) return res.status(401).json({ error: 'Unauthorized' });
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ error: 'Forbidden' });
    }
    next();
  };
}

// Validation Schemas
const emailSchema = z.string().email();
const passwordSchema = z.string().min(6);

const passengerRegisterSchema = z.object({
  name: z.string().min(1),
  email: emailSchema,
  phone: z.string().min(7),
  gender: z.enum(['MALE', 'FEMALE']), 
  registrationNumber: z.string().min(1),
  password: passwordSchema,
});

const passengerLoginSchema = z.object({
  email: emailSchema,
  password: passwordSchema,
});

const riderRegisterSchema = z.object({
  name: z.string().min(1),
  licenseNumber: z.string().min(1),
  licensePlate: z.string().min(1),
  phone: z.string().min(7),
  password: passwordSchema,
});

const riderLoginSchema = z.object({
  phone: z.string().min(7),
  password: passwordSchema,
});

const adminLoginSchema = z.object({
  email: emailSchema,
  password: passwordSchema,
});

const createSingleRideSchema = z.object({
  pickupAddress: z.string().min(1),
  pickupLat: z.number(),
  pickupLng: z.number(),
  destinationAddress: z.string().min(1),
  destinationLat: z.number(),
  destinationLng: z.number(),
  distanceKm: z.number().optional(),
  scheduledAt: z.string().datetime().optional(),
  fare: z.number().nonnegative(),
  vehicleType: z.enum(['BODA_BIKE', 'CAR']),
});

const createSharedRideSchema = z.object({
  pickupAddress: z.string().min(1),
  pickupLat: z.number(),
  pickupLng: z.number(),
  destinationAddress: z.string().min(1),
  destinationLat: z.number(),
  destinationLng: z.number(),
  distanceKm: z.number().optional(),
  scheduledAt: z.string().datetime().optional(),
  fare: z.number().nonnegative(),
  vehicleType: z.enum(['CAR', 'MINI_VAN', 'VAN', 'PREMIUM_VAN']),
  capacity: z.number().int().positive().optional(), // Will be set based on vehicleType
});

const joinSharedSchema = z.object({
  code: z.string().min(4).max(4),
});

const ratingSchema = z.object({
  rating: z.number().int().min(1).max(5),
});

const updatePassengerProfileSchema = z.object({
  name: z.string().min(1).optional(),
  phone: z.string().min(7).optional(),
  gender: z.enum(['MALE', 'FEMALE']).optional(),
  registrationNumber: z.string().min(1).optional(),
});

const updateRiderProfileSchema = z.object({
  name: z.string().min(1).optional(),
  licenseNumber: z.string().min(1).optional(),
  licensePlate: z.string().min(1).optional(),
});

const uploadPhotoBase64Schema = z.object({
  photo: z.string().min(1), // base64 string
});

const acceptRideSchema = z.object({
  latitude: z.number().min(-90).max(90),
  longitude: z.number().min(-180).max(180),
});

// Utility Functions
function generateSharedCode(): string {
  // 4-char alphanumeric (uppercase)
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let code = '';
  for (let i = 0; i < 4; i++) code += chars[Math.floor(Math.random() * chars.length)];
  return code;
}

// Ensure a unique sharedCode in DB. Retries a few times on collision.
async function createUniqueSharedCode(): Promise<string> {
  const maxAttempts = 6;
  for (let i = 0; i < maxAttempts; i++) {
    const code = generateSharedCode();
    const exists = await prisma.ride.findUnique({ where: { sharedCode: code } });
    if (!exists) return code;
  }
  throw new Error('Failed to generate unique shared ride code');
}

// Auth Routes

// Creating a passenger account
app.post('/auth/passenger/register', async (req: Request, res: Response) => {
  try {
    const parsed = passengerRegisterSchema.parse(req.body);
    const existing = await prisma.user.findFirst({
      where: { OR: [{ email: parsed.email }, { phone: parsed.phone }] },
    });
    if (existing) return res.status(400).json({ error: 'Email or phone already in use' });

    const hashed = await hashPassword(parsed.password);
    const user = await prisma.user.create({
      data: {
        name: parsed.name,
        email: parsed.email,
        phone: parsed.phone,
        password: hashed,
        role: Role.PASSENGER,
        gender: parsed.gender,
        registrationNumber: parsed.registrationNumber,
      },
    });

    const token = generateToken({ userId: user.id, role: user.role });
    setAuthCookie(res, token);
    res.json({ token, user: { id: user.id, name: user.name, email: user.email, role: user.role } });
  } catch (err: any) {
    if (err?.issues) {
      return res.status(400).json({ error: err.issues });
    }
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

//  Logging in for a passenger
app.post('/auth/passenger/login', async (req: Request, res: Response) => {
  try {
    const parsed = passengerLoginSchema.parse(req.body);
    const user = await prisma.user.findUnique({ where: { email: parsed.email } });
    if (!user || user.role !== Role.PASSENGER) return res.status(401).json({ error: 'Invalid credentials' });
    const ok = await verifyPassword(parsed.password, user.password);
    if (!ok) return res.status(401).json({ error: 'Invalid credentials' });
    const token = generateToken({ userId: user.id, role: user.role });
    setAuthCookie(res, token);
    res.json({ token, user: { id: user.id, name: user.name, email: user.email, role: user.role } });
  } catch (err: any) {
    if (err?.issues) return res.status(400).json({ error: err.issues });
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// creating and account as a rider
app.post('/auth/rider/register', async (req: Request, res: Response) => {
  try {
    const parsed = riderRegisterSchema.parse(req.body);
    const existing = await prisma.user.findFirst({ where: { OR: [{ phone: parsed.phone }, { licensePlate: parsed.licensePlate }] } });
    if (existing) return res.status(400).json({ error: 'Phone or license plate already in use' });

    const hashed = await hashPassword(parsed.password);
    const user = await prisma.user.create({
      data: {
        name: parsed.name,
        phone: parsed.phone,
        password: hashed,
        role: Role.RIDER,
        licenseNumber: parsed.licenseNumber,
        licensePlate: parsed.licensePlate,
      },
    });
    const token = generateToken({ userId: user.id, role: user.role });
    setAuthCookie(res, token);
    res.json({ token, user: { id: user.id, name: user.name, phone: user.phone, role: user.role } });
  } catch (err: any) {
    if (err?.issues) return res.status(400).json({ error: err.issues });
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// logging in as a rider
app.post('/auth/rider/login', async (req: Request, res: Response) => {
  try {
    const parsed = riderLoginSchema.parse(req.body);
    const user = await prisma.user.findUnique({ where: { phone: parsed.phone } });
    if (!user || user.role !== Role.RIDER) return res.status(401).json({ error: 'Invalid credentials' });
    const ok = await verifyPassword(parsed.password, user.password);
    if (!ok) return res.status(401).json({ error: 'Invalid credentials' });
    const token = generateToken({ userId: user.id, role: user.role });
    setAuthCookie(res, token);
    res.json({ token, user: { id: user.id, name: user.name, phone: user.phone, role: user.role } });
  } catch (err: any) {
    if (err?.issues) return res.status(400).json({ error: err.issues });
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// Logging in as an Admin
app.post('/auth/admin/login', async (req: Request, res: Response) => {
  try {
    const parsed = adminLoginSchema.parse(req.body);
    const user = await prisma.user.findUnique({ where: { email: parsed.email } });
    if (!user || user.role !== Role.ADMIN) return res.status(401).json({ error: 'Invalid credentials' });
    const ok = await verifyPassword(parsed.password, user.password);
    if (!ok) return res.status(401).json({ error: 'Invalid credentials' });
    const token = generateToken({ userId: user.id, role: user.role });
    setAuthCookie(res, token);
    res.json({ token, user: { id: user.id, name: user.name, email: user.email, role: user.role } });
  } catch (err: any) {
    if (err?.issues) return res.status(400).json({ error: err.issues });
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// Validate Token Endpoint - Allows frontend to check if user is still authenticated
app.get('/auth/validate-token', authMiddleware, async (req: Request, res: Response) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user!.id },
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        role: true,
        gender: true,
        registrationNumber: true,
        licenseNumber: true,
        licensePlate: true,
        profilePhotoUrl: true,
      },
    });

    if (!user) {
      return res.status(401).json({ error: 'User not found' });
    }

    res.json({ 
      valid: true, 
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        phone: user.phone,
        role: user.role,
        gender: user.gender,
        registrationNumber: user.registrationNumber,
        licenseNumber: user.licenseNumber,
        licensePlate: user.licensePlate,
        profilePhotoUrl: user.profilePhotoUrl,
      }
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// Logout Endpoint - Clears the authentication cookie
app.post('/auth/logout', (req: Request, res: Response) => {
  res.clearCookie(COOKIE_NAME, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
  });
  res.json({ message: 'Logged out successfully' });
});

// Getting user Account Details
app.get('/me', authMiddleware, async (req: Request, res: Response) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user!.id },
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        role: true,
        gender: true,
        registrationNumber: true,
        licenseNumber: true,
        licensePlate: true,
        profilePhotoUrl: true,
        createdAt: true,
      },
    });
    res.json({ user });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// Update Profile Details
app.put('/me', authMiddleware, async (req: Request, res: Response) => {
  try {
    const userId = req.user!.id;
    const userRole = req.user!.role;

    // Get current user
    const currentUser = await prisma.user.findUnique({ where: { id: userId } });
    if (!currentUser) return res.status(404).json({ error: 'User not found' });

    // Validate and update based on role
    if (userRole === Role.PASSENGER) {
      const parsed = updatePassengerProfileSchema.parse(req.body);
      
      // Check if phone is being changed and if it's already in use
      if (parsed.phone && parsed.phone !== currentUser.phone) {
        const existing = await prisma.user.findUnique({ where: { phone: parsed.phone } });
        if (existing) return res.status(400).json({ error: 'Phone number already in use' });
      }

      const updatedUser = await prisma.user.update({
        where: { id: userId },
        data: {
          name: parsed.name,
          phone: parsed.phone,
          gender: parsed.gender,
          registrationNumber: parsed.registrationNumber,
        },
        select: {
          id: true,
          name: true,
          email: true,
          phone: true,
          role: true,
          gender: true,
          registrationNumber: true,
          profilePhotoUrl: true,
          createdAt: true,
        },
      });

      return res.json({ message: 'Profile updated successfully', user: updatedUser });
    } else if (userRole === Role.RIDER) {
      const parsed = updateRiderProfileSchema.parse(req.body);
      
      // Check if license plate is being changed and if it's already in use
      if (parsed.licensePlate && parsed.licensePlate !== currentUser.licensePlate) {
        const existing = await prisma.user.findFirst({ where: { licensePlate: parsed.licensePlate } });
        if (existing) return res.status(400).json({ error: 'License plate already in use' });
      }

      const updatedUser = await prisma.user.update({
        where: { id: userId },
        data: {
          name: parsed.name,
          licenseNumber: parsed.licenseNumber,
          licensePlate: parsed.licensePlate,
        },
        select: {
          id: true,
          name: true,
          phone: true,
          role: true,
          licenseNumber: true,
          licensePlate: true,
          profilePhotoUrl: true,
          createdAt: true,
        },
      });

      return res.json({ message: 'Profile updated successfully', user: updatedUser });
    } else {
      return res.status(403).json({ error: 'Profile update not allowed for this role' });
    }
  } catch (err: any) {
    if (err?.issues) return res.status(400).json({ error: err.issues });
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// Upload Profile Photo (multipart/form-data)
app.post('/me/photo', authMiddleware, uploadPhoto.single('photo'), async (req: Request, res: Response) => {
  try {
    const userId = req.user!.id;
    
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    // Get current user to check for existing photo
    const currentUser = await prisma.user.findUnique({ where: { id: userId } });
    if (!currentUser) return res.status(404).json({ error: 'User not found' });

    // Delete old photo from Cloudinary if it exists
    if (currentUser.profilePhotoUrl) {
      const publicId = extractPublicId(currentUser.profilePhotoUrl);
      if (publicId) {
        try {
          await deleteProfilePhoto(publicId);
        } catch (err) {
          console.error('Error deleting old photo:', err);
          // Continue even if delete fails
        }
      }
    }

    // Upload new photo to Cloudinary
    const result = await uploadProfilePhoto(req.file.buffer, userId);

    // Update user profile with new photo URL
    await prisma.user.update({
      where: { id: userId },
      data: { profilePhotoUrl: result.url },
    });

    res.json({ 
      message: 'Profile photo updated successfully', 
      profilePhotoUrl: result.url 
    });
  } catch (err: any) {
    console.error('Upload error:', err);
    res.status(500).json({ error: err.message || 'Failed to upload photo' });
  }
});

// Upload Profile Photo (base64 JSON)
app.post('/me/photo/base64', authMiddleware, async (req: Request, res: Response) => {
  try {
    const userId = req.user!.id;
    const parsed = uploadPhotoBase64Schema.parse(req.body);

    // Validate base64 format
    if (!parsed.photo.startsWith('data:image/')) {
      return res.status(400).json({ error: 'Invalid base64 image format' });
    }

    // Get current user to check for existing photo
    const currentUser = await prisma.user.findUnique({ where: { id: userId } });
    if (!currentUser) return res.status(404).json({ error: 'User not found' });

    // Delete old photo from Cloudinary if it exists
    if (currentUser.profilePhotoUrl) {
      const publicId = extractPublicId(currentUser.profilePhotoUrl);
      if (publicId) {
        try {
          await deleteProfilePhoto(publicId);
        } catch (err) {
          console.error('Error deleting old photo:', err);
          // Continue even if delete fails
        }
      }
    }

    // Upload new photo to Cloudinary
    const result = await uploadProfilePhoto(parsed.photo, userId);

    // Update user profile with new photo URL
    await prisma.user.update({
      where: { id: userId },
      data: { profilePhotoUrl: result.url },
    });

    res.json({ 
      message: 'Profile photo updated successfully', 
      profilePhotoUrl: result.url 
    });
  } catch (err: any) {
    if (err?.issues) return res.status(400).json({ error: err.issues });
    console.error('Upload error:', err);
    res.status(500).json({ error: err.message || 'Failed to upload photo' });
  }
});

// Delete Profile Photo
app.delete('/me/photo', authMiddleware, async (req: Request, res: Response) => {
  try {
    const userId = req.user!.id;

    // Get current user
    const currentUser = await prisma.user.findUnique({ where: { id: userId } });
    if (!currentUser) return res.status(404).json({ error: 'User not found' });

    if (!currentUser.profilePhotoUrl) {
      return res.status(404).json({ error: 'No profile photo to delete' });
    }

    // Delete from Cloudinary
    const publicId = extractPublicId(currentUser.profilePhotoUrl);
    if (publicId) {
      await deleteProfilePhoto(publicId);
    }

    // Update user profile to remove photo URL
    await prisma.user.update({
      where: { id: userId },
      data: { profilePhotoUrl: null },
    });

    res.json({ message: 'Profile photo deleted successfully' });
  } catch (err: any) {
    console.error('Delete error:', err);
    res.status(500).json({ error: err.message || 'Failed to delete photo' });
  }
});

// Create a single ride
app.post('/rides/single', authMiddleware, requireRole([Role.PASSENGER]), async (req: Request, res: Response) => {
  try {
    const parsed = createSingleRideSchema.parse(req.body);
    const fareDecimal = parsed.fare;

    const ride = await prisma.ride.create({
      data: {
        type: RideType.SINGLE,
        pickupAddress: parsed.pickupAddress,
        pickupLat: parsed.pickupLat,
        pickupLng: parsed.pickupLng,
        destinationAddress: parsed.destinationAddress,
        destinationLat: parsed.destinationLat,
        destinationLng: parsed.destinationLng,
        distanceKm: parsed.distanceKm,
        scheduledAt: parsed.scheduledAt ? new Date(parsed.scheduledAt) : null,
        fare: new Decimal(fareDecimal) as any,
        vehicleType: parsed.vehicleType as VehicleType,
        passengerId: req.user!.id,
      },
      select: {
        id: true,
        type: true,
        pickupAddress: true,
        pickupLat: true,
        pickupLng: true,
        destinationAddress: true,
        destinationLat: true,
        destinationLng: true,
        distanceKm: true,
        scheduledAt: true,
        fare: true,
        status: true,
        sharedCode: true,
        capacity: true,
        vehicleType: true,
        createdAt: true,
        updatedAt: true,
        passengerId: true,
        riderId: true,
      },
    });

    // For single rides we also create a RideParticipant for the creator (helps queries)
    await prisma.rideParticipant.create({
      data: { rideId: ride.id, passengerId: req.user!.id },
    });

    res.json({ ride });
  } catch (err: any) {
    if (err?.issues) return res.status(400).json({ error: err.issues });
    if (err?.code === 'P2002') return res.status(400).json({ error: 'Unique constraint violation' });
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// Create a shared ride
app.post('/rides/shared', authMiddleware, requireRole([Role.PASSENGER]), async (req: Request, res: Response) => {
  try {
    const parsed = createSharedRideSchema.parse(req.body);
    const code = await createUniqueSharedCode();

    // Map vehicle type to capacity
    const vehicleCapacityMap: Record<string, number> = {
      'CAR': 4,
      'MINI_VAN': 7,
      'VAN': 10,
      'PREMIUM_VAN': 14,
    };

    const capacity = parsed.capacity || vehicleCapacityMap[parsed.vehicleType];

    const ride = await prisma.ride.create({
      data: {
        type: RideType.SHARED,
        pickupAddress: parsed.pickupAddress,
        pickupLat: parsed.pickupLat,
        pickupLng: parsed.pickupLng,
        destinationAddress: parsed.destinationAddress,
        destinationLat: parsed.destinationLat,
        destinationLng: parsed.destinationLng,
        distanceKm: parsed.distanceKm,
        scheduledAt: parsed.scheduledAt ? new Date(parsed.scheduledAt) : null,
        fare: new Decimal(parsed.fare) as any,
        vehicleType: parsed.vehicleType as VehicleType,
        passengerId: req.user!.id,
        sharedCode: code,
        capacity: capacity,
      },
      select: {
        id: true,
        type: true,
        pickupAddress: true,
        pickupLat: true,
        pickupLng: true,
        destinationAddress: true,
        destinationLat: true,
        destinationLng: true,
        distanceKm: true,
        scheduledAt: true,
        fare: true,
        status: true,
        sharedCode: true,
        capacity: true,
        vehicleType: true,
        createdAt: true,
        updatedAt: true,
        passengerId: true,
        riderId: true,
      },
    });

    // Creator becomes initial participant
    await prisma.rideParticipant.create({
      data: { rideId: ride.id, passengerId: req.user!.id },
    });

    res.json({ ride });
  } catch (err: any) {
    if (err?.issues) return res.status(400).json({ error: err.issues });
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// Join a shared ride using a specific code
app.post('/rides/join', authMiddleware, requireRole([Role.PASSENGER]), async (req: Request, res: Response) => {
  try {
    const parsed = joinSharedSchema.parse(req.body);
    const code = parsed.code.toUpperCase();

    const ride = await prisma.ride.findUnique({
      where: { sharedCode: code },
      include: { participants: true },
    });
    if (!ride) return res.status(404).json({ error: 'Shared ride not found' });
    if (ride.type !== RideType.SHARED) return res.status(400).json({ error: 'Not a shared ride' });

    // Count participants (participants relation)
    const participantCount = ride.participants.length;
    if (typeof ride.capacity !== 'number') return res.status(500).json({ error: 'Ride capacity missing' });
    if (participantCount >= ride.capacity) return res.status(400).json({ error: 'Ride is full' });

    // Prevent duplicate joins
    const existing = await prisma.rideParticipant.findUnique({
      where: { rideId_passengerId: { rideId: ride.id, passengerId: req.user!.id } },
    });
    if (existing) return res.status(400).json({ error: 'You have already joined this ride' });

    const rp = await prisma.rideParticipant.create({
      data: { rideId: ride.id, passengerId: req.user!.id },
    });

    res.json({ message: 'Joined shared ride', participant: rp });
  } catch (err: any) {
    if (err?.issues) return res.status(400).json({ error: err.issues });
    if (err?.code === 'P2002') return res.status(400).json({ error: 'Already joined' });
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// List available single rides
app.get('/rides/available/single', authMiddleware, requireRole([Role.RIDER]), async (req: Request, res: Response) => {
  try {
    const userId = req.user!.id;
    // Get all PENDING single rides that this rider has NOT accepted
    const rides = await prisma.ride.findMany({
      where: { 
        type: RideType.SINGLE, 
        status: RideStatus.PENDING,
      },
      include: { passenger: true },
      orderBy: { createdAt: 'asc' },
    });
    res.json({ rides });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// List available shared rides
app.get('/rides/available/shared', authMiddleware, requireRole([Role.RIDER]), async (req: Request, res: Response) => {
  try {
    const userId = req.user!.id;
    // Get all PENDING shared rides that this rider has NOT accepted
    const rides = await prisma.ride.findMany({
      where: { 
        type: RideType.SHARED, 
        status: RideStatus.PENDING,
      },
      include: { passenger: true, participants: true },
      orderBy: { createdAt: 'asc' },
    });
    // filter out full rides (in case capacity changed)
    const available = rides.filter((r) => (r.capacity ?? 0) > r.participants.length);
    res.json({ rides: available });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// Rider can accept a ride
app.post('/rides/:id/accept', authMiddleware, requireRole([Role.RIDER]), async (req: Request, res: Response) => {
  try {
    const rideId = req.params.id;
    const parsed = acceptRideSchema.parse(req.body);
    
    // Attempt to atomically update the ride if still pending
    const result = await prisma.ride.updateMany({
      where: { id: rideId, status: RideStatus.PENDING },
      data: { 
        status: RideStatus.ACCEPTED, 
        riderId: req.user!.id,
        riderAcceptanceLat: parsed.latitude,
        riderAcceptanceLng: parsed.longitude,
        riderAcceptanceTimestamp: new Date(),
      },
    });

    if (result.count === 0) {
      return res.status(409).json({ error: 'Ride already accepted or unavailable' });
    }

    // Fetch updated ride and participants
    const ride = await prisma.ride.findUnique({
      where: { id: rideId },
      include: { passenger: true, participants: { include: { passenger: true } }, rider: true },
    });

    res.json({ message: 'Ride accepted', ride });
  } catch (err: any) {
    if (err?.issues) return res.status(400).json({ error: err.issues });
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// Passenger can cancel a ride
app.post('/rides/:id/cancel', authMiddleware, requireRole([Role.PASSENGER]), async (req: Request, res: Response) => {
  try {
    const rideId = req.params.id;
    const userId = req.user!.id;

    const ride = await prisma.ride.findUnique({
      where: { id: rideId },
      include: { participants: true },
    });
    if (!ride) return res.status(404).json({ error: 'Ride not found' });

    const isCreator = ride.passengerId === userId;
    const isParticipant = !!(await prisma.rideParticipant.findUnique({
      where: { rideId_passengerId: { rideId: ride.id, passengerId: userId } },
    }));

    if (!isCreator && !isParticipant) return res.status(403).json({ error: 'Not part of this ride' });

    // If ride was ACCEPTED => cancel whole ride
    if (ride.status === RideStatus.ACCEPTED) {
      await prisma.ride.update({
        where: { id: ride.id },
        data: { status: RideStatus.CANCELLED, riderId: null },
      });
      return res.json({ message: 'Ride cancelled (was accepted)' });
    }

    if (ride.type === RideType.SINGLE) {
      // only creator can cancel a single ride
      if (!isCreator) return res.status(403).json({ error: 'Only ride creator can cancel this single ride' });
      await prisma.ride.update({ where: { id: ride.id }, data: { status: RideStatus.CANCELLED } });
      return res.json({ message: 'Single ride cancelled' });
    } else {
      // SHARED
      if (isCreator) {
        await prisma.ride.update({ where: { id: ride.id }, data: { status: RideStatus.CANCELLED } });
        return res.json({ message: 'Shared ride cancelled (creator cancelled)' });
      } else {
        // remove participant
        await prisma.rideParticipant.delete({
          where: { rideId_passengerId: { rideId: ride.id, passengerId: userId } },
        });
        return res.json({ message: 'You left the shared ride' });
      }
    }
  } catch (err: any) {
    if (err?.code === 'P2025') return res.status(404).json({ error: 'Participant not found' });
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// Riders can flag rides as complete 
app.post('/rides/:id/complete', authMiddleware, requireRole([Role.RIDER]), async (req: Request, res: Response) => {
  try {
    const rideId = req.params.id;
    const riderId = req.user!.id;

    const ride = await prisma.ride.findUnique({ where: { id: rideId } });
    if (!ride) return res.status(404).json({ error: 'Ride not found' });
    if (ride.riderId !== riderId) return res.status(403).json({ error: 'Not the accepting rider' });
    if (![RideStatus.ACCEPTED, RideStatus.ONGOING].includes(ride.status as any)) {
      return res.status(400).json({ error: 'Ride is not active' });
    }

    // Complete ride and clear location data
    await prisma.ride.update({ 
      where: { id: rideId }, 
      data: { 
        status: RideStatus.COMPLETED,
        riderAcceptanceLat: null,
        riderAcceptanceLng: null,
        riderAcceptanceTimestamp: null,
      } 
    });

    res.json({ message: 'Ride completed' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// Rating a ride
app.post('/rides/:id/rate', authMiddleware, async (req: Request, res: Response) => {
  try {
    const rideId = req.params.id;
    const { rating } = ratingSchema.parse(req.body);
    const rateeId = req.body.rateeId as string;
    const raterId = req.user!.id;

    const ride = await prisma.ride.findUnique({
      where: { id: rideId },
      include: { participants: true, rider: true, passenger: true },
    });
    if (!ride) return res.status(404).json({ error: 'Ride not found' });
    if (ride.status !== RideStatus.COMPLETED) return res.status(400).json({ error: 'Can rate only after completion' });

    // Check rater is part of ride
    const isRaterParticipant = ride.participants.some((p) => p.passengerId === raterId);
    const isRaterPassengerCreator = ride.passengerId === raterId;
    const isRaterRider = ride.riderId === raterId;

    if (!isRaterParticipant && !isRaterPassengerCreator && !isRaterRider) {
      return res.status(403).json({ error: 'You are not related to this ride' });
    }

    // Check ratee is part of ride
    const isRateeParticipant = ride.participants.some((p) => p.passengerId === rateeId);
    const isRateePassengerCreator = ride.passengerId === rateeId;
    const isRateeRider = ride.riderId === rateeId;

    if (!isRateeParticipant && !isRateePassengerCreator && !isRateeRider) {
      return res.status(400).json({ error: 'Ratee not related to this ride' });
    }

    // Store rating (no text, only integer as requested)
    const r = await prisma.rating.create({
      data: {
        rideId,
        raterId,
        rateeId,
        rating,
      },
    });

    res.json({ message: 'Rating saved', rating: r });
  } catch (err: any) {
    if (err?.issues) return res.status(400).json({ error: err.issues });
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// Get all passenger rides
// Get ride by ID (for passengers)
app.get('/rides/:id', authMiddleware, requireRole([Role.PASSENGER]), async (req: Request, res: Response) => {
  try {
    const rideId = req.params.id;
    const userId = req.user!.id;

    // Find the ride
    const ride = await prisma.ride.findUnique({
      where: { id: rideId },
      include: { 
        passenger: {
          select: {
            id: true,
            name: true,
            email: true,
            phone: true,
            profilePhotoUrl: true,
          }
        }, 
        rider: {
          select: {
            id: true,
            name: true,
            phone: true,
            licensePlate: true,
            licenseNumber: true,
            profilePhotoUrl: true,
          }
        },
        participants: {
          include: {
            passenger: {
              select: {
                id: true,
                name: true,
                email: true,
                phone: true,
                profilePhotoUrl: true,
              }
            }
          }
        }
      },
    });

    if (!ride) {
      return res.status(404).json({ error: 'Ride not found' });
    }

    // Check if user is a participant in the ride
    const isParticipant = ride.participants.some(p => p.passengerId === userId);
    const isCreator = ride.passengerId === userId;

    if (!isParticipant && !isCreator) {
      return res.status(403).json({ error: 'You are not authorized to view this ride' });
    }

    res.json({ ride });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

app.get('/passenger/rides', authMiddleware, requireRole([Role.PASSENGER]), async (req: Request, res: Response) => {
  try {
    const userId = req.user!.id;
    // Rides where they are a participant (joined or creator)
    const participants = await prisma.rideParticipant.findMany({
      where: { passengerId: userId },
      include: { ride: { include: { rider: true, passenger: true } } },
      orderBy: { joinedAt: 'desc' },
    });

    // Map to simple shape
    const rides = participants.map((p) => {
      const r = p.ride;
      return {
        id: r.id,
        type: r.type,
        pickupAddress: r.pickupAddress,
        destinationAddress: r.destinationAddress,
        rider: r.rider ? { id: r.rider.id, name: r.rider.name, licensePlate: r.rider.licensePlate, profilePhotoUrl: r.rider.profilePhotoUrl } : null,
        status: r.status,
        fare: r.fare,
        createdAt: r.createdAt,
      };
    });

    res.json({ rides });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// Rider activity: list rides accepted by this rider (ongoing / completed / etc.)
app.get('/rider/rides', authMiddleware, requireRole([Role.RIDER]), async (req: Request, res: Response) => {
  try {
    const userId = req.user!.id;
    const rides = await prisma.ride.findMany({
      where: { riderId: userId },
      include: { passenger: true },
      orderBy: { createdAt: 'desc' },
    });

    res.json({ rides });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// Get rider's ride history (all rides they've accepted/completed, excluding PENDING)
app.get('/rider/rides/history', authMiddleware, requireRole([Role.RIDER]), async (req: Request, res: Response) => {
  try {
    const userId = req.user!.id;
    // Get all rides where this rider is assigned, excluding PENDING status
    const rides = await prisma.ride.findMany({
      where: { 
        riderId: userId,
        status: {
          in: [RideStatus.ACCEPTED, RideStatus.ONGOING, RideStatus.COMPLETED, RideStatus.CANCELLED]
        }
      },
      include: { 
        passenger: {
          select: {
            id: true,
            name: true,
            email: true,
            phone: true,
            profilePhotoUrl: true,
          }
        },
        participants: {
          include: {
            passenger: {
              select: {
                id: true,
                name: true,
                email: true,
                profilePhotoUrl: true,
              }
            }
          }
        }
      },
      orderBy: { createdAt: 'desc' },
    });

    res.json({ rides });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// Get all users
app.get('/admin/users', authMiddleware, requireRole([Role.ADMIN]), async (req: Request, res: Response) => {
  try {
    const roleQuery = (req.query.role as string | undefined) ?? undefined;
    const where: any = {};
    if (roleQuery) where.role = roleQuery as Role;

    const users = await prisma.user.findMany({
      where,
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        role: true,
        licenseNumber: true,
        licensePlate: true,
        registrationNumber: true,
      },
      orderBy: { createdAt: 'desc' },
    });
    res.json({ users });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// Get all rides
app.get('/admin/rides', authMiddleware, requireRole([Role.ADMIN]), async (req: Request, res: Response) => {
  try {
    const rides = await prisma.ride.findMany({
      include: { passenger: true, rider: true },
      orderBy: { createdAt: 'desc' },
    });
    res.json({ rides });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// Gets the total passengers, total riders and total rides
app.get('/admin/stats', authMiddleware, requireRole([Role.ADMIN]), async (req: Request, res: Response) => {
  try {
    const totalRiders = await prisma.user.count({ where: { role: Role.RIDER } });
    const totalPassengers = await prisma.user.count({ where: { role: Role.PASSENGER } });
    const totalRides = await prisma.ride.count();
    res.json({ totalRiders, totalPassengers, totalRides });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// Error Handling
app.get('/', (req: Request, res: Response) => {
  res.status(200).json({ response: "Welcome to Campus Connect" })
})

app.use((req: Request, res: Response) => {
  res.status(404).json({ error: 'Not found' });
});

// Start the Server
app.listen(PORT, () => {
  console.log(`Campus Connect API running on port ${PORT}`);
});
