# Campus Connect API Documentation

**Version:** 1.0.0  
**Base URL:** `http://localhost:4000`  
**Last Updated:** October 3, 2025

---

## Table of Contents
1. [Authentication](#authentication)
2. [User Profile](#user-profile)
3. [Rides - Passenger](#rides---passenger)
4. [Rides - Rider](#rides---rider)
5. [Ratings](#ratings)
6. [Admin](#admin)
7. [Error Codes](#error-codes)
8. [Data Models](#data-models)

---

## Authentication

All authenticated endpoints require a Bearer token in the Authorization header:
```
Authorization: Bearer <your-jwt-token>
```

### 1. Passenger Register

**Endpoint:** `POST /auth/passenger/register`  
**Authentication:** Not required  
**Description:** Register a new passenger account

**Request Body:**
```json
{
  "name": "Agaba Timothy",
  "email": "agabatimo@gmail.com",
  "phone": "0722976605",
  "gender": "MALE",
  "registrationNumber": "CS1021001",
  "password": "password123"
}
```

**Field Validations:**
- `name`: Required, minimum 1 character
- `email`: Required, valid email format
- `phone`: Required, minimum 7 characters
- `gender`: Required, must be either `MALE` or `FEMALE`
- `registrationNumber`: Required, minimum 1 character
- `password`: Required, minimum 6 characters

**Success Response (200 OK):**
```json
{
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": "181e88ad-9d4f-4d41-8bd6-ca9248b7f993",
    "name": "Agaba Timothy",
    "email": "agabatimo@gmail.com",
    "role": "PASSENGER"
  }
}
```

**Error Responses:**
- `400 Bad Request`: Validation error or email/phone already in use
- `500 Internal Server Error`: Server error

---

### 2. Passenger Login

**Endpoint:** `POST /auth/passenger/login`  
**Authentication:** Not required  
**Description:** Login as a passenger

**Request Body:**
```json
{
  "email": "nysonagumya@gmail.com",
  "password": "password123"
}
```

**Field Validations:**
- `email`: Required, valid email format
- `password`: Required, minimum 6 characters

**Success Response (200 OK):**
```json
{
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": "181e88ad-9d4f-4d41-8bd6-ca9248b7f993",
    "name": "Nyson Agumya",
    "email": "nysonagumya@gmail.com",
    "role": "PASSENGER"
  }
}
```

**Error Responses:**
- `401 Unauthorized`: Invalid credentials
- `400 Bad Request`: Validation error
- `500 Internal Server Error`: Server error

---

### 3. Rider Register

**Endpoint:** `POST /auth/rider/register`  
**Authentication:** Not required  
**Description:** Register a new rider account

**Request Body:**
```json
{
  "name": "Musa Jona",
  "licenseNumber": "DL123456789",
  "licensePlate": "ABC-1234",
  "phone": "0755975505",
  "password": "password123"
}
```

**Field Validations:**
- `name`: Required, minimum 1 character
- `licenseNumber`: Required, minimum 1 character
- `licensePlate`: Required, minimum 1 character
- `phone`: Required, minimum 7 characters
- `password`: Required, minimum 6 characters

**Success Response (200 OK):**
```json
{
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": "a8b9c0d1-2e3f-4a5b-6c7d-8e9f0a1b2c3d",
    "name": "Musa Jona",
    "phone": "0755975505",
    "role": "RIDER"
  }
}
```

**Error Responses:**
- `400 Bad Request`: Validation error or phone/license plate already in use
- `500 Internal Server Error`: Server error

---

### 4. Rider Login

**Endpoint:** `POST /auth/rider/login`  
**Authentication:** Not required  
**Description:** Login as a rider

**Request Body:**
```json
{
  "phone": "0755975505",
  "password": "password123"
}
```

**Field Validations:**
- `phone`: Required, minimum 7 characters
- `password`: Required, minimum 6 characters

**Success Response (200 OK):**
```json
{
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": "a8b9c0d1-2e3f-4a5b-6c7d-8e9f0a1b2c3d",
    "name": "Musa Jona",
    "phone": "0755975505",
    "role": "RIDER"
  }
}
```

**Error Responses:**
- `401 Unauthorized`: Invalid credentials
- `400 Bad Request`: Validation error
- `500 Internal Server Error`: Server error

---

### 5. Admin Login

**Endpoint:** `POST /auth/admin/login`  
**Authentication:** Not required  
**Description:** Login as an administrator

**Request Body:**
```json
{
  "email": "admin@campus-connect.com",
  "password": "admin123"
}
```

**Field Validations:**
- `email`: Required, valid email format
- `password`: Required, minimum 6 characters

**Success Response (200 OK):**
```json
{
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": "d4e5f6a7-8b9c-0d1e-2f3a-4b5c6d7e8f9a",
    "name": "Campus Admin",
    "email": "admin@campus-connect.com",
    "role": "ADMIN"
  }
}
```

**Error Responses:**
- `401 Unauthorized`: Invalid credentials
- `400 Bad Request`: Validation error
- `500 Internal Server Error`: Server error

---

## User Profile

### 6. Get Current User

**Endpoint:** `GET /me`  
**Authentication:** Required (Any role)  
**Description:** Get the current authenticated user's profile information

**Request Headers:**
```
Authorization: Bearer <your-jwt-token>
```

**Success Response (200 OK):**
```json
{
  "user": {
    "id": "181e88ad-9d4f-4d41-8bd6-ca9248b7f993",
    "name": "Agaba Timothy",
    "email": "agabatimo@gmail.com",
    "phone": "0722976605",
    "role": "PASSENGER",
    "gender": "MALE",
    "registrationNumber": "CS1021001",
    "licenseNumber": null,
    "licensePlate": null,
    "createdAt": "2025-10-03T13:30:00.000Z"
  }
}
```

**Note:** Fields like `licenseNumber` and `licensePlate` are null for passengers. For riders, `email`, `gender`, and `registrationNumber` may be null.

**Error Responses:**
- `401 Unauthorized`: Invalid or missing token
- `500 Internal Server Error`: Server error

---

## Rides - Passenger

All passenger ride endpoints require authentication and PASSENGER role.

### 7. Create Single Ride

**Endpoint:** `POST /rides/single`  
**Authentication:** Required (PASSENGER role)  
**Description:** Create a new single ride request

**Request Headers:**
```
Authorization: Bearer <your-jwt-token>
Content-Type: application/json
```

**Request Body:**
```json
{
  "pickupAddress": "Main Campus Gate",
  "destinationAddress": "Supermarket",
  "distanceKm": 5.2,
  "scheduledAt": "2025-10-05T14:30:00Z",
  "fare": 15.50
}
```

**Field Validations:**
- `pickupAddress`: Required, minimum 1 character
- `destinationAddress`: Required, minimum 1 character
- `distanceKm`: Optional, number
- `scheduledAt`: Optional, ISO 8601 datetime format
- `fare`: Required, non-negative number

**Success Response (200 OK):**
```json
{
  "ride": {
    "id": "e4888452-678a-42ee-87d0-bf195d496103",
    "type": "SINGLE",
    "pickupAddress": "Main Campus Gate",
    "destinationAddress": "Supermarket",
    "distanceKm": 5.2,
    "scheduledAt": "2025-10-05T14:30:00.000Z",
    "fare": "15.5",
    "status": "PENDING",
    "sharedCode": null,
    "capacity": null,
    "createdAt": "2025-10-03T13:43:44.304Z",
    "updatedAt": "2025-10-03T13:43:44.304Z",
    "passengerId": "181e88ad-9d4f-4d41-8bd6-ca9248b7f993",
    "riderId": null
  }
}
```

**Error Responses:**
- `400 Bad Request`: Validation error
- `401 Unauthorized`: Invalid or missing token
- `403 Forbidden`: User is not a passenger
- `500 Internal Server Error`: Server error

---

### 8. Create Shared Ride

**Endpoint:** `POST /rides/shared`  
**Authentication:** Required (PASSENGER role)  
**Description:** Create a new shared ride. Returns a unique 4-character code that others can use to join.

**Request Headers:**
```
Authorization: Bearer <your-jwt-token>
Content-Type: application/json
```

**Request Body:**
```json
{
  "pickupAddress": "Library Building",
  "destinationAddress": "City Center",
  "distanceKm": 8.5,
  "scheduledAt": "2025-10-05T16:00:00Z",
  "fare": 25.00,
  "capacity": "4"
}
```

**Field Validations:**
- `pickupAddress`: Required, minimum 1 character
- `destinationAddress`: Required, minimum 1 character
- `distanceKm`: Optional, number
- `scheduledAt`: Optional, ISO 8601 datetime format
- `fare`: Required, non-negative number
- `capacity`: Required, must be one of: `"4"`, `"6"`, `"8"`, `"12"`, `"14"`, `"16"` (string)

**Success Response (200 OK):**
```json
{
  "ride": {
    "id": "f5999563-789b-53ff-98e1-cf206e507214",
    "type": "SHARED",
    "pickupAddress": "Library Building",
    "destinationAddress": "City Center",
    "distanceKm": 8.5,
    "scheduledAt": "2025-10-05T16:00:00.000Z",
    "fare": "25.0",
    "status": "PENDING",
    "sharedCode": "6W92",
    "capacity": 4,
    "createdAt": "2025-10-03T14:00:00.000Z",
    "updatedAt": "2025-10-03T14:00:00.000Z",
    "passengerId": "181e88ad-9d4f-4d41-8bd6-ca9248b7f993",
    "riderId": null
  }
}
```

**Important:** Save the `sharedCode` from the response. Users will need this code to join the shared ride.

**Error Responses:**
- `400 Bad Request`: Validation error
- `401 Unauthorized`: Invalid or missing token
- `403 Forbidden`: User is not a passenger
- `500 Internal Server Error`: Server error or failed to generate unique code

---

### 9. Join Shared Ride

**Endpoint:** `POST /rides/join`  
**Authentication:** Required (PASSENGER role)  
**Description:** Join an existing shared ride using a 4-character code

**Request Headers:**
```
Authorization: Bearer <your-jwt-token>
Content-Type: application/json
```

**Request Body:**
```json
{
  "code": "6W92"
}
```

**Field Validations:**
- `code`: Required, exactly 4 characters (case-insensitive, will be converted to uppercase)

**Success Response (200 OK):**
```json
{
  "message": "Joined shared ride",
  "participant": {
    "id": "b7c8d9e0-1f2a-3b4c-5d6e-7f8a9b0c1d2e",
    "rideId": "f5999563-789b-53ff-98e1-cf206e507214",
    "passengerId": "282f99be-0e5g-5e52-9ce7-db9349c8g004",
    "joinedAt": "2025-10-03T14:15:00.000Z"
  }
}
```

**Error Responses:**
- `400 Bad Request`: Validation error, already joined, or ride is full
- `401 Unauthorized`: Invalid or missing token
- `403 Forbidden`: User is not a passenger
- `404 Not Found`: Shared ride with that code not found
- `500 Internal Server Error`: Server error

---

### 10. Cancel Ride

**Endpoint:** `POST /rides/:id/cancel`  
**Authentication:** Required (PASSENGER role)  
**Description:** Cancel a ride or leave a shared ride

**URL Parameters:**
- `id`: The ride UUID

**Request Headers:**
```
Authorization: Bearer <your-jwt-token>
```

**Request URL Example:**
```
POST /rides/e4888452-678a-42ee-87d0-bf195d496103/cancel
```

**Behavior:**
- **Single Ride:** Only the creator can cancel. Sets status to `CANCELLED`.
- **Shared Ride (Creator):** Cancels entire ride for all participants. Sets status to `CANCELLED`.
- **Shared Ride (Participant):** Removes you from the ride, others can continue.
- **Accepted Ride:** If a rider has already accepted, the entire ride is cancelled and rider is removed.

**Success Response (200 OK):**
```json
{
  "message": "Single ride cancelled"
}
```

Or for shared ride participant:
```json
{
  "message": "You left the shared ride"
}
```

**Error Responses:**
- `403 Forbidden`: Not part of this ride or not authorized
- `404 Not Found`: Ride not found
- `401 Unauthorized`: Invalid or missing token
- `500 Internal Server Error`: Server error

---

### 11. Get Passenger Rides

**Endpoint:** `GET /passenger/rides`  
**Authentication:** Required (PASSENGER role)  
**Description:** Get all rides for the current passenger (both created and joined rides)

**Request Headers:**
```
Authorization: Bearer <your-jwt-token>
```

**Success Response (200 OK):**
```json
{
  "rides": [
    {
      "id": "e4888452-678a-42ee-87d0-bf195d496103",
      "type": "SINGLE",
      "pickupAddress": "Main Campus Gate",
      "destinationAddress": "Supermarket",
      "rider": {
        "id": "a8b9c0d1-2e3f-4a5b-6c7d-8e9f0a1b2c3d",
        "name": "Musa Jona",
        "licensePlate": "ABC-1234"
      },
      "status": "COMPLETED",
      "fare": "15.5",
      "createdAt": "2025-10-03T13:43:44.304Z"
    },
    {
      "id": "f5999563-789b-53ff-98e1-cf206e507214",
      "type": "SHARED",
      "pickupAddress": "Library Building",
      "destinationAddress": "City Center",
      "rider": null,
      "status": "PENDING",
      "fare": "25.0",
      "createdAt": "2025-10-03T14:00:00.000Z"
    }
  ]
}
```

**Note:** If no rider has accepted yet, `rider` will be `null`.

**Error Responses:**
- `401 Unauthorized`: Invalid or missing token
- `403 Forbidden`: User is not a passenger
- `500 Internal Server Error`: Server error

---

## Rides - Rider

All rider endpoints require authentication and RIDER role.

### 12. Get Available Single Rides

**Endpoint:** `GET /rides/available/single`  
**Authentication:** Required (RIDER role)  
**Description:** List all available single rides with PENDING status

**Request Headers:**
```
Authorization: Bearer <your-jwt-token>
```

**Success Response (200 OK):**
```json
{
  "rides": [
    {
      "id": "e4888452-678a-42ee-87d0-bf195d496103",
      "type": "SINGLE",
      "pickupAddress": "Main Campus Gate",
      "destinationAddress": "Supermarket",
      "distanceKm": 5.2,
      "scheduledAt": "2025-10-05T14:30:00.000Z",
      "fare": "15.5",
      "status": "PENDING",
      "sharedCode": null,
      "capacity": null,
      "createdAt": "2025-10-03T13:43:44.304Z",
      "updatedAt": "2025-10-03T13:43:44.304Z",
      "passengerId": "181e88ad-9d4f-4d41-8bd6-ca9248b7f993",
      "riderId": null,
      "passenger": {
        "id": "181e88ad-9d4f-4d41-8bd6-ca9248b7f993",
        "name": "Agaba Timothy",
        "email": "agabatimo@gmail.com",
        "phone": "0722976605",
        "role": "PASSENGER"
      }
    }
  ]
}
```

**Error Responses:**
- `401 Unauthorized`: Invalid or missing token
- `403 Forbidden`: User is not a rider
- `500 Internal Server Error`: Server error

---

### 13. Get Available Shared Rides

**Endpoint:** `GET /rides/available/shared`  
**Authentication:** Required (RIDER role)  
**Description:** List all available shared rides with PENDING status that have available capacity

**Request Headers:**
```
Authorization: Bearer <your-jwt-token>
```

**Success Response (200 OK):**
```json
{
  "rides": [
    {
      "id": "f5999563-789b-53ff-98e1-cf206e507214",
      "type": "SHARED",
      "pickupAddress": "Library Building",
      "destinationAddress": "City Center",
      "distanceKm": 8.5,
      "scheduledAt": "2025-10-05T16:00:00.000Z",
      "fare": "25.0",
      "status": "PENDING",
      "sharedCode": "6W92",
      "capacity": 4,
      "createdAt": "2025-10-03T14:00:00.000Z",
      "updatedAt": "2025-10-03T14:00:00.000Z",
      "passengerId": "181e88ad-9d4f-4d41-8bd6-ca9248b7f993",
      "riderId": null,
      "passenger": {
        "id": "181e88ad-9d4f-4d41-8bd6-ca9248b7f993",
        "name": "Agaba Timothy",
        "email": "agabatimo@gmail.com",
        "phone": "0722976605",
        "role": "PASSENGER"
      },
      "participants": [
        {
          "id": "b7c8d9e0-1f2a-3b4c-5d6e-7f8a9b0c1d2e",
          "rideId": "f5999563-789b-53ff-98e1-cf206e507214",
          "passengerId": "181e88ad-9d4f-4d41-8bd6-ca9248b7f993",
          "joinedAt": "2025-10-03T14:00:00.000Z"
        }
      ]
    }
  ]
}
```

**Note:** Rides are filtered to only show those with available capacity (participants.length < capacity).

**Error Responses:**
- `401 Unauthorized`: Invalid or missing token
- `403 Forbidden`: User is not a rider
- `500 Internal Server Error`: Server error

---

### 14. Accept Ride

**Endpoint:** `POST /rides/:id/accept`  
**Authentication:** Required (RIDER role)  
**Description:** Accept a pending ride request. Changes ride status to ACCEPTED.

**URL Parameters:**
- `id`: The ride UUID

**Request Headers:**
```
Authorization: Bearer <your-jwt-token>
```

**Request URL Example:**
```
POST /rides/e4888452-678a-42ee-87d0-bf195d496103/accept
```

**Success Response (200 OK):**
```json
{
  "message": "Ride accepted",
  "ride": {
    "id": "e4888452-678a-42ee-87d0-bf195d496103",
    "type": "SINGLE",
    "pickupAddress": "Main Campus Gate",
    "destinationAddress": "Supermarket",
    "distanceKm": 5.2,
    "scheduledAt": "2025-10-05T14:30:00.000Z",
    "fare": "15.5",
    "status": "ACCEPTED",
    "sharedCode": null,
    "capacity": null,
    "createdAt": "2025-10-03T13:43:44.304Z",
    "updatedAt": "2025-10-03T14:30:00.000Z",
    "passengerId": "181e88ad-9d4f-4d41-8bd6-ca9248b7f993",
    "riderId": "a8b9c0d1-2e3f-4a5b-6c7d-8e9f0a1b2c3d",
    "passenger": {
      "id": "181e88ad-9d4f-4d41-8bd6-ca9248b7f993",
      "name": "Agaba Timothy",
      "email": "agabatimo@gmail.com",
      "phone": "0722976605"
    },
    "participants": [
      {
        "id": "b7c8d9e0-1f2a-3b4c-5d6e-7f8a9b0c1d2e",
        "rideId": "e4888452-678a-42ee-87d0-bf195d496103",
        "passengerId": "181e88ad-9d4f-4d41-8bd6-ca9248b7f993",
        "joinedAt": "2025-10-03T13:43:44.304Z",
        "passenger": {
          "id": "181e88ad-9d4f-4d41-8bd6-ca9248b7f993",
          "name": "Agaba Timothy",
          "email": "agabatimo@gmail.com",
          "phone": "0722976605"
        }
      }
    ],
    "rider": {
      "id": "a8b9c0d1-2e3f-4a5b-6c7d-8e9f0a1b2c3d",
      "name": "Musa Jona",
      "phone": "0755975505",
      "licenseNumber": "DL123456789",
      "licensePlate": "ABC-1234"
    }
  }
}
```

**Error Responses:**
- `409 Conflict`: Ride already accepted or unavailable
- `401 Unauthorized`: Invalid or missing token
- `403 Forbidden`: User is not a rider
- `500 Internal Server Error`: Server error

---

### 15. Complete Ride

**Endpoint:** `POST /rides/:id/complete`  
**Authentication:** Required (RIDER role)  
**Description:** Mark a ride as completed. Can only be done by the rider who accepted the ride.

**URL Parameters:**
- `id`: The ride UUID

**Request Headers:**
```
Authorization: Bearer <your-jwt-token>
```

**Request URL Example:**
```
POST /rides/e4888452-678a-42ee-87d0-bf195d496103/complete
```

**Success Response (200 OK):**
```json
{
  "message": "Ride completed"
}
```

**Error Responses:**
- `400 Bad Request`: Ride is not active (must be ACCEPTED or ONGOING status)
- `403 Forbidden`: Not the accepting rider
- `404 Not Found`: Ride not found
- `401 Unauthorized`: Invalid or missing token
- `500 Internal Server Error`: Server error

---

### 16. Get Rider Rides

**Endpoint:** `GET /rider/rides`  
**Authentication:** Required (RIDER role)  
**Description:** Get all rides accepted by the current rider

**Request Headers:**
```
Authorization: Bearer <your-jwt-token>
```

**Success Response (200 OK):**
```json
{
  "rides": [
    {
      "id": "e4888452-678a-42ee-87d0-bf195d496103",
      "type": "SINGLE",
      "pickupAddress": "Main Campus Gate",
      "destinationAddress": "Supermarket",
      "distanceKm": 5.2,
      "scheduledAt": "2025-10-05T14:30:00.000Z",
      "fare": "15.5",
      "status": "COMPLETED",
      "sharedCode": null,
      "capacity": null,
      "createdAt": "2025-10-03T13:43:44.304Z",
      "updatedAt": "2025-10-03T15:00:00.000Z",
      "passengerId": "181e88ad-9d4f-4d41-8bd6-ca9248b7f993",
      "riderId": "a8b9c0d1-2e3f-4a5b-6c7d-8e9f0a1b2c3d",
      "passenger": {
        "id": "181e88ad-9d4f-4d41-8bd6-ca9248b7f993",
        "name": "Agaba Timothy",
        "email": "agabatimo@gmail.com",
        "phone": "0722976605",
        "role": "PASSENGER"
      }
    }
  ]
}
```

**Error Responses:**
- `401 Unauthorized`: Invalid or missing token
- `403 Forbidden`: User is not a rider
- `500 Internal Server Error`: Server error

---

## Ratings

### 17. Rate Ride Participant

**Endpoint:** `POST /rides/:id/rate`  
**Authentication:** Required (Any role)  
**Description:** Rate a participant in a completed ride. Rating must be between 1-5. Both rater and ratee must be part of the ride.

⚠️ **NOTE: This endpoint is currently not working. Under investigation.**

**URL Parameters:**
- `id`: The ride UUID

**Request Headers:**
```
Authorization: Bearer <your-jwt-token>
Content-Type: application/json
```

**Request Body:**
```json
{
  "rating": 5,
  "rateeId": "181e88ad-9d4f-4d41-8bd6-ca9248b7f993"
}
```

**Field Validations:**
- `rating`: Required, integer between 1 and 5
- `rateeId`: Required, valid user UUID who participated in the ride

**Expected Success Response (200 OK):**
```json
{
  "message": "Rating saved",
  "rating": {
    "id": "c9d0e1f2-3a4b-5c6d-7e8f-9a0b1c2d3e4f",
    "rideId": "e4888452-678a-42ee-87d0-bf195d496103",
    "raterId": "a8b9c0d1-2e3f-4a5b-6c7d-8e9f0a1b2c3d",
    "rateeId": "181e88ad-9d4f-4d41-8bd6-ca9248b7f993",
    "rating": 5,
    "createdAt": "2025-10-03T15:30:00.000Z"
  }
}
```

**Expected Error Responses:**
- `400 Bad Request`: Validation error, ride not completed, or ratee not related to ride
- `403 Forbidden`: Rater is not related to this ride
- `404 Not Found`: Ride not found
- `401 Unauthorized`: Invalid or missing token
- `500 Internal Server Error`: Server error

---

## Admin

All admin endpoints require authentication and ADMIN role.

### 18. Get All Users

**Endpoint:** `GET /admin/users`  
**Authentication:** Required (ADMIN role)  
**Description:** Get all users in the system. Optionally filter by role.

**Request Headers:**
```
Authorization: Bearer <your-jwt-token>
```

**Query Parameters (Optional):**
- `role`: Filter by role. Values: `PASSENGER`, `RIDER`, `ADMIN`

**Request URL Examples:**
```
GET /admin/users
GET /admin/users?role=PASSENGER
GET /admin/users?role=RIDER
```

**Success Response (200 OK):**
```json
{
  "users": [
    {
      "id": "181e88ad-9d4f-4d41-8bd6-ca9248b7f993",
      "name": "Agaba Timothy",
      "email": "agabatimo@gmail.com",
      "phone": "0722976605",
      "role": "PASSENGER",
      "licenseNumber": null,
      "licensePlate": null,
      "registrationNumber": "CS1021001"
    },
    {
      "id": "a8b9c0d1-2e3f-4a5b-6c7d-8e9f0a1b2c3d",
      "name": "Musa Jona",
      "email": null,
      "phone": "0755975505",
      "role": "RIDER",
      "licenseNumber": "DL123456789",
      "licensePlate": "ABC-1234",
      "registrationNumber": null
    }
  ]
}
```

**Error Responses:**
- `401 Unauthorized`: Invalid or missing token
- `403 Forbidden`: User is not an admin
- `500 Internal Server Error`: Server error

---

### 19. Get All Rides

**Endpoint:** `GET /admin/rides`  
**Authentication:** Required (ADMIN role)  
**Description:** Get all rides in the system with passenger and rider details

**Request Headers:**
```
Authorization: Bearer <your-jwt-token>
```

**Success Response (200 OK):**
```json
{
  "rides": [
    {
      "id": "e4888452-678a-42ee-87d0-bf195d496103",
      "type": "SINGLE",
      "pickupAddress": "Main Campus Gate",
      "destinationAddress": "Supermarket",
      "distanceKm": 5.2,
      "scheduledAt": "2025-10-05T14:30:00.000Z",
      "fare": "15.5",
      "status": "COMPLETED",
      "sharedCode": null,
      "capacity": null,
      "createdAt": "2025-10-03T13:43:44.304Z",
      "updatedAt": "2025-10-03T15:00:00.000Z",
      "passengerId": "181e88ad-9d4f-4d41-8bd6-ca9248b7f993",
      "riderId": "a8b9c0d1-2e3f-4a5b-6c7d-8e9f0a1b2c3d",
      "passenger": {
        "id": "181e88ad-9d4f-4d41-8bd6-ca9248b7f993",
        "name": "Agaba Timothy",
        "email": "agabatimo@gmail.com",
        "phone": "0722976605",
        "role": "PASSENGER"
      },
      "rider": {
        "id": "a8b9c0d1-2e3f-4a5b-6c7d-8e9f0a1b2c3d",
        "name": "Musa Jona",
        "phone": "0755975505",
        "role": "RIDER"
      }
    }
  ]
}
```

**Error Responses:**
- `401 Unauthorized`: Invalid or missing token
- `403 Forbidden`: User is not an admin
- `500 Internal Server Error`: Server error

---

### 20. Get Statistics

**Endpoint:** `GET /admin/stats`  
**Authentication:** Required (ADMIN role)  
**Description:** Get platform statistics including total passengers, total riders, and total rides

**Request Headers:**
```
Authorization: Bearer <your-jwt-token>
```

**Success Response (200 OK):**
```json
{
  "totalRiders": 15,
  "totalPassengers": 127,
  "totalRides": 89
}
```

**Error Responses:**
- `401 Unauthorized`: Invalid or missing token
- `403 Forbidden`: User is not an admin
- `500 Internal Server Error`: Server error

---

## Error Codes

### Standard HTTP Status Codes

| Code | Description |
|------|-------------|
| 200  | Success - Request completed successfully |
| 400  | Bad Request - Invalid input or validation error |
| 401  | Unauthorized - Missing or invalid authentication token |
| 403  | Forbidden - Valid token but insufficient permissions |
| 404  | Not Found - Resource does not exist |
| 409  | Conflict - Resource already exists or conflict with current state |
| 500  | Internal Server Error - Unexpected server error |

### Error Response Format

All error responses follow this format:

```json
{
  "error": "Error message description"
}
```

For validation errors:
```json
{
  "error": [
    {
      "code": "invalid_type",
      "expected": "string",
      "received": "number",
      "path": ["email"],
      "message": "Expected string, received number"
    }
  ]
}
```

---

## Data Models

### User Roles
- `PASSENGER` - Can create and join rides
- `RIDER` - Can accept and complete rides (driver)
- `ADMIN` - Can view all users, rides, and statistics

### Ride Types
- `SINGLE` - One-on-one ride (one passenger, one rider)
- `SHARED` - Shared ride (multiple passengers, one rider)

### Ride Status
- `PENDING` - Waiting for a rider to accept
- `ACCEPTED` - Rider has accepted, ride is ongoing
- `ONGOING` - Ride is in progress
- `COMPLETED` - Ride has been completed
- `CANCELLED` - Ride was cancelled

### Gender
- `MALE`
- `FEMALE`

---

## Authentication Flow

### For Passengers:
1. Register using `POST /auth/passenger/register`
2. Login using `POST /auth/passenger/login` to get JWT token
3. Use token in `Authorization: Bearer <token>` header for all requests
4. Token expires after 8 hours

### For Riders:
1. Register using `POST /auth/rider/register`
2. Login using `POST /auth/rider/login` to get JWT token
3. Use token in `Authorization: Bearer <token>` header for all requests
4. Token expires after 8 hours

### For Admins:
1. Use seeded credentials (no registration)
2. Login using `POST /auth/admin/login` to get JWT token
3. Use token in `Authorization: Bearer <token>` header for all requests
4. Token expires after 8 hours

---

## Important Notes

### Date Format
All datetime fields use ISO 8601 format: `YYYY-MM-DDTHH:mm:ssZ`

Example: `2025-10-05T14:30:00Z`

### Fare Format
Fare is stored as a decimal but returned as a string in responses to prevent precision loss.

Example: `"15.5"` or `"25.0"`

### UUID Format
All IDs use UUID v4 format.

Example: `"e4888452-678a-42ee-87d0-bf195d496103"`

### Shared Ride Code
- 4 characters long
- Alphanumeric (A-Z, 0-9)
- Case-insensitive (converted to uppercase)
- Unique across all active shared rides

Example: `"6W92"`

### Capacity Values
Shared ride capacity must be one of: `4`, `6`, `8`, `12`, `14`, `16`

**Note:** Send as string in request: `"4"`, `"6"`, etc.

### Phone Number Format
No specific format enforced, but minimum 7 characters required.

Recommended format: Include country code or local format.

Examples: `"0722976605"`, `"0755975505"`

---

## Testing Credentials

### Admin Account (Pre-seeded)
```
Email: admin@campus-connect.com
Password: admin123
```

### Test Accounts
Create your own using the registration endpoints.

---

## Rate Limiting
Currently no rate limiting is implemented. May be added in future versions.

---

## API Version
Current version: **1.0.0**

---

## Support
For issues or questions, contact the backend development team.

---

**Last Updated:** October 3, 2025  
**Generated for:** Frontend Integration Team
