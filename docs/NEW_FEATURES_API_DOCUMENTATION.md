# New Features - API Documentation Update

**Date:** October 19, 2025  
**Version:** 1.1.0  
**New Features:** Profile Photo Management & Rider Location Tracking

---

## Table of Contents - New Sections
1. [Profile Management](#profile-management)
2. [Ride Details (Passenger)](#ride-details-passenger)
3. [Updated Endpoints](#updated-endpoints)

---

## Profile Management

### 1. Upload Profile Photo (Multipart)

**Endpoint:** `POST /me/photo`  
**Authentication:** Required (Any role)  
**Content-Type:** `multipart/form-data`  
**Description:** Upload a profile photo using multipart form data

**Request Body (Form Data):**
```
photo: <file> (Required)
```

**File Requirements:**
- **Formats:** JPG, JPEG, PNG, WEBP
- **Max Size:** 5MB
- **Processing:** Automatically uploaded to Cloudinary with optimization

**Success Response (200 OK):**
```json
{
  "message": "Profile photo updated successfully",
  "profilePhotoUrl": "https://res.cloudinary.com/your-cloud/image/upload/v1234567/campus-connect/profiles/user_abc123.jpg"
}
```

**Error Responses:**
- `400 Bad Request`: No file uploaded or invalid file type
- `401 Unauthorized`: Invalid or missing token
- `404 Not Found`: User not found
- `500 Internal Server Error`: Cloudinary upload failed (entire operation fails)

**Example cURL:**
```bash
curl -X POST http://localhost:4000/me/photo \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -F "photo=@/path/to/your/image.jpg"
```

**Notes:**
- If user has an existing profile photo, it will be automatically deleted from Cloudinary before uploading the new one
- Photos are stored in Cloudinary folder: `campus-connect/profiles/`
- Each user's photo has a unique identifier based on their user ID

---

### 2. Upload Profile Photo (Base64)

**Endpoint:** `POST /me/photo/base64`  
**Authentication:** Required (Any role)  
**Content-Type:** `application/json`  
**Description:** Upload a profile photo using base64 encoded image data

**Request Body:**
```json
{
  "photo": "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg=="
}
```

**Field Validations:**
- `photo`: Required, must start with `data:image/` and contain base64 encoded image data

**Success Response (200 OK):**
```json
{
  "message": "Profile photo updated successfully",
  "profilePhotoUrl": "https://res.cloudinary.com/your-cloud/image/upload/v1234567/campus-connect/profiles/user_abc123.jpg"
}
```

**Error Responses:**
- `400 Bad Request`: Invalid base64 format or validation error
- `401 Unauthorized`: Invalid or missing token
- `404 Not Found`: User not found
- `500 Internal Server Error`: Cloudinary upload failed

**Example cURL:**
```bash
curl -X POST http://localhost:4000/me/photo/base64 \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "photo": "data:image/png;base64,iVBORw0KG..."
  }'
```

**Notes:**
- Frontend can use JavaScript FileReader API to convert files to base64
- Same upload rules apply as multipart upload (5MB limit, allowed formats)
- Old photos are automatically deleted before uploading new ones

---

### 3. Delete Profile Photo

**Endpoint:** `DELETE /me/photo`  
**Authentication:** Required (Any role)  
**Description:** Delete the current user's profile photo

**Success Response (200 OK):**
```json
{
  "message": "Profile photo deleted successfully"
}
```

**Error Responses:**
- `401 Unauthorized`: Invalid or missing token
- `404 Not Found`: User not found or no profile photo to delete
- `500 Internal Server Error`: Failed to delete photo from Cloudinary

**Example cURL:**
```bash
curl -X DELETE http://localhost:4000/me/photo \
  -H "Authorization: Bearer YOUR_TOKEN"
```

**Notes:**
- Removes photo from both database and Cloudinary
- After deletion, `profilePhotoUrl` will be `null`
- Returns 404 if user has no profile photo

---

### 4. Update Profile Details

**Endpoint:** `PUT /me`  
**Authentication:** Required (Passenger or Rider role)  
**Content-Type:** `application/json`  
**Description:** Update user profile information (role-specific fields)

#### For Passengers:

**Request Body:**
```json
{
  "name": "Updated Name",
  "phone": "0700000000",
  "gender": "FEMALE",
  "registrationNumber": "CS1021999"
}
```

**Editable Fields:**
- `name`: Optional, string, minimum 1 character
- `phone`: Optional, string, minimum 7 characters
- `gender`: Optional, enum (`MALE` or `FEMALE`)
- `registrationNumber`: Optional, string, minimum 1 character

**Non-Editable Fields:**
- `email` - Cannot be changed
- `password` - Cannot be changed via this endpoint

#### For Riders:

**Request Body:**
```json
{
  "name": "Updated Rider Name",
  "licenseNumber": "DL999999999",
  "licensePlate": "XYZ-9999"
}
```

**Editable Fields:**
- `name`: Optional, string, minimum 1 character
- `licenseNumber`: Optional, string, minimum 1 character
- `licensePlate`: Optional, string, minimum 1 character

**Non-Editable Fields:**
- `phone` - Cannot be changed
- `password` - Cannot be changed via this endpoint

**Success Response (200 OK) - Passenger:**
```json
{
  "message": "Profile updated successfully",
  "user": {
    "id": "181e88ad-9d4f-4d41-8bd6-ca9248b7f993",
    "name": "Updated Name",
    "email": "agabatimo@gmail.com",
    "phone": "0700000000",
    "role": "PASSENGER",
    "gender": "FEMALE",
    "registrationNumber": "CS1021999",
    "profilePhotoUrl": "https://res.cloudinary.com/...",
    "createdAt": "2025-10-03T13:30:00.000Z"
  }
}
```

**Success Response (200 OK) - Rider:**
```json
{
  "message": "Profile updated successfully",
  "user": {
    "id": "a8b9c0d1-2e3f-4a5b-6c7d-8e9f0a1b2c3d",
    "name": "Updated Rider Name",
    "phone": "0755975505",
    "role": "RIDER",
    "licenseNumber": "DL999999999",
    "licensePlate": "XYZ-9999",
    "profilePhotoUrl": "https://res.cloudinary.com/...",
    "createdAt": "2025-10-03T13:30:00.000Z"
  }
}
```

**Error Responses:**
- `400 Bad Request`: Validation error, phone already in use, or license plate already in use
- `401 Unauthorized`: Invalid or missing token
- `403 Forbidden`: User role not allowed to update profile (e.g., ADMIN)
- `404 Not Found`: User not found
- `500 Internal Server Error`: Server error

**Example cURL - Passenger:**
```bash
curl -X PUT http://localhost:4000/me \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Updated Name",
    "phone": "0700000000",
    "gender": "MALE",
    "registrationNumber": "CS1021999"
  }'
```

**Example cURL - Rider:**
```bash
curl -X PUT http://localhost:4000/me \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Updated Rider Name",
    "licenseNumber": "DL999999999",
    "licensePlate": "XYZ-9999"
  }'
```

**Notes:**
- All fields are optional - you can update any combination
- Phone number must be unique across all users
- License plate must be unique across all riders
- Profile photo URL is automatically included in response

---

## Ride Details (Passenger)

### 5. Get Ride by ID

**Endpoint:** `GET /rides/:id`  
**Authentication:** Required (Passenger role)  
**Description:** Get detailed information about a specific ride. Only accessible to passengers who are participants in the ride.

**URL Parameters:**
- `id`: The ride UUID

**Access Control:**
- **Single Rides:** Only the ride creator (passenger) can access
- **Shared Rides:** The creator and all participants can access
- Other passengers will receive a 403 Forbidden error

**Success Response (200 OK):**
```json
{
  "ride": {
    "id": "e4888452-678a-42ee-87d0-bf195d496103",
    "type": "SINGLE",
    "pickupAddress": "Main Campus Gate",
    "pickupLat": 0.3476,
    "pickupLng": 32.5825,
    "destinationAddress": "Supermarket",
    "destinationLat": 0.3456,
    "destinationLng": 32.5845,
    "distanceKm": 5.2,
    "scheduledAt": "2025-10-19T14:30:00.000Z",
    "fare": "15.5",
    "status": "ACCEPTED",
    "sharedCode": null,
    "capacity": null,
    "vehicleType": "CAR",
    "riderAcceptanceLat": 0.3480,
    "riderAcceptanceLng": 32.5820,
    "riderAcceptanceTimestamp": "2025-10-19T10:30:00.000Z",
    "createdAt": "2025-10-19T09:00:00.000Z",
    "updatedAt": "2025-10-19T10:30:00.000Z",
    "passengerId": "181e88ad-9d4f-4d41-8bd6-ca9248b7f993",
    "riderId": "a8b9c0d1-2e3f-4a5b-6c7d-8e9f0a1b2c3d",
    "passenger": {
      "id": "181e88ad-9d4f-4d41-8bd6-ca9248b7f993",
      "name": "Agaba Timothy",
      "email": "agabatimo@gmail.com",
      "phone": "0722976605",
      "profilePhotoUrl": "https://res.cloudinary.com/..."
    },
    "rider": {
      "id": "a8b9c0d1-2e3f-4a5b-6c7d-8e9f0a1b2c3d",
      "name": "Musa Jona",
      "phone": "0755975505",
      "licensePlate": "ABC-1234",
      "licenseNumber": "DL123456789",
      "profilePhotoUrl": "https://res.cloudinary.com/..."
    },
    "participants": [
      {
        "id": "b7c8d9e0-1f2a-3b4c-5d6e-7f8a9b0c1d2e",
        "rideId": "e4888452-678a-42ee-87d0-bf195d496103",
        "passengerId": "181e88ad-9d4f-4d41-8bd6-ca9248b7f993",
        "joinedAt": "2025-10-19T09:00:00.000Z",
        "passenger": {
          "id": "181e88ad-9d4f-4d41-8bd6-ca9248b7f993",
          "name": "Agaba Timothy",
          "email": "agabatimo@gmail.com",
          "phone": "0722976605",
          "profilePhotoUrl": "https://res.cloudinary.com/..."
        }
      }
    ]
  }
}
```

**Rider Location Fields (Only present if ride is ACCEPTED/ONGOING):**
- `riderAcceptanceLat`: Rider's latitude when they accepted the ride
- `riderAcceptanceLng`: Rider's longitude when they accepted the ride
- `riderAcceptanceTimestamp`: Timestamp when rider accepted the ride

**Note:** Location fields will be `null` if:
- Ride is PENDING (not yet accepted)
- Ride is COMPLETED (location data cleared)
- Ride is CANCELLED

**Error Responses:**
- `401 Unauthorized`: Invalid or missing token
- `403 Forbidden`: User is not a participant in this ride
- `404 Not Found`: Ride not found
- `500 Internal Server Error`: Server error

**Example cURL:**
```bash
curl -X GET http://localhost:4000/rides/e4888452-678a-42ee-87d0-bf195d496103 \
  -H "Authorization: Bearer YOUR_TOKEN"
```

**Use Cases:**
- Passenger wants to see rider's location after ride is accepted
- Passenger wants to check ride status and details
- Passenger wants to see all participants in a shared ride
- Frontend can use location data to show rider's position on a map

---

## Updated Endpoints

### 6. Accept Ride (Updated)

**Endpoint:** `POST /rides/:id/accept`  
**Authentication:** Required (Rider role)  
**Content-Type:** `application/json`  
**Description:** Accept a pending ride request. Now requires rider's current location.

**URL Parameters:**
- `id`: The ride UUID

**Request Body (NEW - Required):**
```json
{
  "latitude": 0.3476,
  "longitude": 32.5825
}
```

**Field Validations:**
- `latitude`: Required, number between -90 and 90
- `longitude`: Required, number between -180 and 180

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
    "vehicleType": "CAR",
    "riderAcceptanceLat": 0.3476,
    "riderAcceptanceLng": 32.5825,
    "riderAcceptanceTimestamp": "2025-10-19T10:30:00.000Z",
    "createdAt": "2025-10-03T13:43:44.304Z",
    "updatedAt": "2025-10-19T10:30:00.000Z",
    "passengerId": "181e88ad-9d4f-4d41-8bd6-ca9248b7f993",
    "riderId": "a8b9c0d1-2e3f-4a5b-6c7d-8e9f0a1b2c3d",
    "passenger": {
      "id": "181e88ad-9d4f-4d41-8bd6-ca9248b7f993",
      "name": "Agaba Timothy",
      "email": "agabatimo@gmail.com",
      "phone": "0722976605",
      "profilePhotoUrl": "https://res.cloudinary.com/..."
    },
    "participants": [...],
    "rider": {
      "id": "a8b9c0d1-2e3f-4a5b-6c7d-8e9f0a1b2c3d",
      "name": "Musa Jona",
      "phone": "0755975505",
      "licenseNumber": "DL123456789",
      "licensePlate": "ABC-1234",
      "profilePhotoUrl": "https://res.cloudinary.com/..."
    }
  }
}
```

**Error Responses:**
- `400 Bad Request`: Invalid coordinates or validation error
- `401 Unauthorized`: Invalid or missing token
- `403 Forbidden`: User is not a rider
- `409 Conflict`: Ride already accepted or unavailable
- `500 Internal Server Error`: Server error

**Example cURL:**
```bash
curl -X POST http://localhost:4000/rides/e4888452-678a-42ee-87d0-bf195d496103/accept \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "latitude": 0.3476,
    "longitude": 32.5825
  }'
```

**BREAKING CHANGE:**
- This endpoint now requires latitude and longitude in the request body
- Frontend must capture rider's GPS location before calling this endpoint
- Previous API calls without location data will receive 400 Bad Request

**Frontend Integration:**
```javascript
// Example: Getting user's location and accepting ride
navigator.geolocation.getCurrentPosition(
  async (position) => {
    const response = await fetch(`/rides/${rideId}/accept`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        latitude: position.coords.latitude,
        longitude: position.coords.longitude
      })
    });
    const data = await response.json();
    console.log('Ride accepted:', data);
  },
  (error) => {
    console.error('Location error:', error);
  },
  { enableHighAccuracy: true }
);
```

---

### 7. Complete Ride (Updated)

**Endpoint:** `POST /rides/:id/complete`  
**Authentication:** Required (Rider role)  
**Description:** Mark a ride as completed. Now automatically clears rider location data.

**Behavior Changes:**
- When ride is marked as COMPLETED:
  - `riderAcceptanceLat` is set to `null`
  - `riderAcceptanceLng` is set to `null`
  - `riderAcceptanceTimestamp` is set to `null`
  - Location data is permanently removed from the ride record

**No other changes to this endpoint.**

**Example Response:**
```json
{
  "message": "Ride completed"
}
```

**Note:** After completion, calling `GET /rides/:id` will show location fields as `null`.

---

### 8. Profile Photo in All Responses (Updated)

**All user objects now include `profilePhotoUrl` field:**

#### Affected Endpoints:
- `GET /me`
- `GET /auth/validate-token`
- `GET /rides/available/single` (in passenger details)
- `GET /rides/available/shared` (in passenger details)
- `POST /rides/:id/accept` (in passenger and rider details)
- `GET /passenger/rides` (in rider details)
- `GET /rider/rides` (in passenger details)
- `GET /admin/users` (in user list)
- `GET /admin/rides` (in passenger and rider details)

**Example User Object (Updated):**
```json
{
  "id": "181e88ad-9d4f-4d41-8bd6-ca9248b7f993",
  "name": "Agaba Timothy",
  "email": "agabatimo@gmail.com",
  "phone": "0722976605",
  "role": "PASSENGER",
  "profilePhotoUrl": "https://res.cloudinary.com/your-cloud/image/upload/v1234567/campus-connect/profiles/user_abc123.jpg"
}
```

**If user has no profile photo:**
```json
{
  "profilePhotoUrl": null
}
```

---

## Data Model Changes

### Updated User Model

```typescript
{
  id: string
  name: string
  email: string | null
  phone: string | null
  password: string
  role: Role
  gender: Gender | null
  registrationNumber: string | null
  licenseNumber: string | null
  licensePlate: string | null
  profilePhotoUrl: string | null  // NEW FIELD
  createdAt: Date
  updatedAt: Date
}
```

### Updated Ride Model

```typescript
{
  id: string
  type: RideType
  pickupAddress: string
  pickupLat: number | null
  pickupLng: number | null
  destinationAddress: string
  destinationLat: number | null
  destinationLng: number | null
  distanceKm: number | null
  scheduledAt: Date | null
  fare: Decimal
  status: RideStatus
  sharedCode: string | null
  capacity: number | null
  vehicleType: VehicleType | null
  riderAcceptanceLat: number | null        // NEW FIELD
  riderAcceptanceLng: number | null        // NEW FIELD
  riderAcceptanceTimestamp: Date | null    // NEW FIELD
  createdAt: Date
  updatedAt: Date
  passengerId: string
  riderId: string | null
}
```

---

## Migration Notes

### Database Migrations

Two new migrations were created:
1. `20251019182041_add_profile_photo_and_rider_location`

**Changes:**
- Added `profile_photo_url` column to `User` table (nullable string)
- Added `rider_acceptance_lat` column to `Ride` table (nullable float)
- Added `rider_acceptance_lng` column to `Ride` table (nullable float)
- Added `rider_acceptance_timestamp` column to `Ride` table (nullable datetime)

**Backward Compatibility:**
- All existing users have `profilePhotoUrl` set to `null`
- All existing rides have location fields set to `null`
- No data migration required
- API is backward compatible for reading data

**Breaking Changes:**
- `POST /rides/:id/accept` now requires `latitude` and `longitude` in request body

---

## Environment Variables

### New Required Variables

Add the following to your `.env` file:

```env
# Cloudinary Configuration (for profile photo uploads)
CLOUDINARY_CLOUD_NAME=your_actual_cloud_name
CLOUDINARY_API_KEY=your_actual_api_key
CLOUDINARY_API_SECRET=your_actual_api_secret
```

**Setup Instructions:**
1. Create a free account at [Cloudinary](https://cloudinary.com/)
2. Get your credentials from the Cloudinary dashboard
3. Replace the dummy values in `.env` with your actual credentials
4. Restart the server for changes to take effect

---

## Error Handling

### New Error Scenarios

#### Profile Photo Upload:
- **Invalid File Type:** Returns 400 with message about allowed formats
- **File Too Large:** Returns 400 with message about 5MB limit
- **Cloudinary Failure:** Returns 500 with descriptive error message
- **No Photo to Delete:** Returns 404 when trying to delete non-existent photo

#### Location Tracking:
- **Invalid Coordinates:** Returns 400 with validation errors
- **Missing Location Data:** Returns 400 when accepting ride without coordinates
- **Unauthorized Access:** Returns 403 when non-participant tries to view ride details

---

## Testing Examples

### Complete Workflow Example

#### 1. Register as Passenger
```bash
curl -X POST http://localhost:4000/auth/passenger/register \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Test User",
    "email": "test@example.com",
    "phone": "0700000000",
    "gender": "MALE",
    "registrationNumber": "CS1021999",
    "password": "password123"
  }'
```

#### 2. Upload Profile Photo
```bash
curl -X POST http://localhost:4000/me/photo \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -F "photo=@profile.jpg"
```

#### 3. Update Profile
```bash
curl -X PUT http://localhost:4000/me \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Updated Test User",
    "registrationNumber": "CS1022000"
  }'
```

#### 4. Create Ride
```bash
curl -X POST http://localhost:4000/rides/single \
  -H "Authorization: Bearer YOUR_PASSENGER_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "pickupAddress": "Campus Gate",
    "pickupLat": 0.3476,
    "pickupLng": 32.5825,
    "destinationAddress": "City Center",
    "destinationLat": 0.3456,
    "destinationLng": 32.5845,
    "distanceKm": 5.2,
    "fare": 15.5,
    "vehicleType": "CAR"
  }'
```

#### 5. Accept Ride (as Rider with Location)
```bash
curl -X POST http://localhost:4000/rides/RIDE_ID/accept \
  -H "Authorization: Bearer YOUR_RIDER_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "latitude": 0.3480,
    "longitude": 32.5820
  }'
```

#### 6. Get Ride Details (as Passenger)
```bash
curl -X GET http://localhost:4000/rides/RIDE_ID \
  -H "Authorization: Bearer YOUR_PASSENGER_TOKEN"
```

---

## Support and Questions

For issues or questions about these new features:
1. Check that Cloudinary credentials are correctly configured
2. Ensure frontend is sending location data when accepting rides
3. Verify that file sizes are under 5MB for photo uploads
4. Contact the backend development team for assistance

---

**Last Updated:** October 19, 2025  
**Version:** 1.1.0  
**New Features:** Profile Photo Management & Rider Location Tracking
