import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import * as dotenv from 'dotenv';
import { PrismaClient, Role, RideStatus, RideType } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import * as jwt from 'jsonwebtoken';
import { z } from 'zod';
import Decimal from 'decimal.js';

dotenv.config();

const prisma = new PrismaClient();
const app = express();

// Enable CORS for all origins
app.use(cors({
  origin: '*', // Allow all origins
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: false, 
}));
app.use(express.json());

const PORT = Number(process.env.PORT || 4000);
const JWT_SECRET = process.env.JWT_SECRET || 'dev_secret_change_me';
const JWT_EXP = '8h'; 

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

// Middleware
function authMiddleware(req: Request, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  const token = authHeader.slice(7);
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
  destinationAddress: z.string().min(1),
  distanceKm: z.number().optional(),
  scheduledAt: z.string().datetime().optional(),
  fare: z.number().nonnegative(),
});

const createSharedRideSchema = createSingleRideSchema.extend({
  capacity: z.enum(['4', '6', '8', '12', '14', '16']).transform((s) => Number(s)),
});

const joinSharedSchema = z.object({
  code: z.string().min(4).max(4),
});

const ratingSchema = z.object({
  rating: z.number().int().min(1).max(5),
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
    res.json({ token, user: { id: user.id, name: user.name, email: user.email, role: user.role } });
  } catch (err: any) {
    if (err?.issues) return res.status(400).json({ error: err.issues });
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
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
        createdAt: true,
      },
    });
    res.json({ user });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
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
        destinationAddress: parsed.destinationAddress,
        distanceKm: parsed.distanceKm,
        scheduledAt: parsed.scheduledAt ? new Date(parsed.scheduledAt) : null,
        fare: new Decimal(fareDecimal) as any,
        passengerId: req.user!.id,
      },
      select: {
        id: true,
        type: true,
        pickupAddress: true,
        destinationAddress: true,
        distanceKm: true,
        scheduledAt: true,
        fare: true,
        status: true,
        sharedCode: true,
        capacity: true,
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

    const ride = await prisma.ride.create({
      data: {
        type: RideType.SHARED,
        pickupAddress: parsed.pickupAddress,
        destinationAddress: parsed.destinationAddress,
        distanceKm: parsed.distanceKm,
        scheduledAt: parsed.scheduledAt ? new Date(parsed.scheduledAt) : null,
        fare: new Decimal(parsed.fare) as any,
        passengerId: req.user!.id,
        sharedCode: code,
        capacity: parsed.capacity,
      },
      select: {
        id: true,
        type: true,
        pickupAddress: true,
        destinationAddress: true,
        distanceKm: true,
        scheduledAt: true,
        fare: true,
        status: true,
        sharedCode: true,
        capacity: true,
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
    const rides = await prisma.ride.findMany({
      where: { type: RideType.SINGLE, status: RideStatus.PENDING },
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
    const rides = await prisma.ride.findMany({
      where: { type: RideType.SHARED, status: RideStatus.PENDING },
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
    // Attempt to atomically update the ride if still pending
    const result = await prisma.ride.updateMany({
      where: { id: rideId, status: RideStatus.PENDING },
      data: { status: RideStatus.ACCEPTED, riderId: req.user!.id },
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
  } catch (err) {
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

    await prisma.ride.update({ where: { id: rideId }, data: { status: RideStatus.COMPLETED } });

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
        rider: r.rider ? { id: r.rider.id, name: r.rider.name, licensePlate: r.rider.licensePlate } : null,
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
app.use((req: Request, res: Response) => {
  res.status(404).json({ error: 'Not found' });
});

// Start the Server
app.listen(PORT, () => {
  console.log(`Campus Connect API running on port ${PORT}`);
});
