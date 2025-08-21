# AuraCare ICU Patient Monitoring System - Backend API

A comprehensive backend API for ICU patient monitoring, family communication, and staff management built with Node.js, Express, and MongoDB.

## 🚀 Features

- **Patient Management**: Register and manage ICU patients
- **Staff Management**: Doctor, nurse, and admin user management
- **Family Member Access**: Secure family member registration and approval system
- **Vital Signs Monitoring**: Real-time vital signs tracking and updates
- **Alert System**: Critical alerts and notifications for medical staff
- **Content Sharing**: Family members can share photos, videos, and messages
- **Real-time Communication**: Socket.IO integration for live updates
- **Emotion Tracking**: Patient emotional state monitoring
- **Role-based Access Control**: Secure authorization system with fine-grained permissions
- **Audit Logging**: Comprehensive tracking of all system actions
- **Rate Limiting**: Protection against abuse and DDoS attacks
- **Feature Flags**: Toggle features without code deployment
- **Database Indexing**: Optimized query performance
- **Error Handling**: Structured error responses and logging
- **Request Validation**: Input validation and sanitization
- **Security Headers**: Helmet.js for enhanced security
- **CORS Configuration**: Secure cross-origin requests
- **Environment-based Configuration**: Different settings for dev, test, and prod

## 📋 Table of Contents

- [Prerequisites](#prerequisites)
- [Installation](#installation)
- [Environment Variables](#environment-variables)
- [API Documentation](#api-documentation)
- [Testing Guide](#testing-guide)
- [Socket.IO Events](#socketio-events)
- [Error Handling](#error-handling)

## 🔧 Prerequisites

- Node.js (v16 or higher)
- MongoDB (v5.0 or higher)
- Redis (v6 or higher, optional for rate limiting)
- npm (v8 or higher) or yarn (v1.22 or higher)

## 📦 Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd auracare-backend
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Run the setup script**
   ```bash
   npm run setup
   # This will create necessary directories and configuration files
   ```

4. **Set up environment variables**
   ```bash
   cp .env.example .env
   # Edit .env with your configuration
   ```

5. **Create database indexes (recommended for production)**
   ```bash
   npm run create-indexes
   ```

6. **Start the server**
   ```bash
   # Development mode with hot-reload
   npm run dev
   
   # Production mode
   npm start
   
   # Production mode with PM2
   npm install -g pm2
   pm2 start server.js --name auracare-backend
   ```

## 🔐 Environment Variables

Create a `.env` file in the root directory. Here are the available configuration options:

```env
# ===== Server Configuration =====
PORT=3000
NODE_ENV=development

# ===== Database =====
MONGO_URI=mongodb://localhost:27017/auracare

# ===== JWT =====
JWT_SECRET=your_jwt_secret_here
JWT_EXPIRE=30d
JWT_COOKIE_EXPIRE=30

# ===== CORS =====
CORS_ORIGINS=http://localhost:5173,http://localhost:3000

# ===== Feature Flags =====
ALERT_SIMULATOR=off
VITALS_POLLER_INTERVAL_MS=3000

# ===== External Services =====
FASTAPI_BASE_URL=http://localhost:8000

# ===== Redis (for rate limiting) =====
# REDIS_HOST=localhost
# REDIS_PORT=6379
# REDIS_PASSWORD=

# ===== Logging =====
LOG_LEVEL=info

# ===== Test Credentials =====
# TEST_PATIENT_ID=
# TEST_PATIENT_TOKEN=
# TEST_STAFF_TOKEN=
# TEST_FAMILY_TOKEN=
```

## 🔄 Scripts

- `npm start` - Start the production server
- `npm run dev` - Start the development server with hot-reload
- `npm test` - Run tests
- `npm run lint` - Run ESLint
- `npm run lint:fix` - Fix linting issues
- `npm run format` - Format code with Prettier
- `npm run setup` - Run initial setup script
- `npm run create-indexes` - Create database indexes for better performance

## 🛡️ Security Features

### Authentication & Authorization
- JWT-based authentication with refresh tokens
- Role-based access control (RBAC)
- Secure password hashing with bcrypt
- Rate limiting to prevent brute force attacks
- Request validation and sanitization

### Data Protection
- Input validation with Joi and express-validator
- NoSQL injection prevention
- XSS protection
- CSRF protection
- Security headers with Helmet.js
- Rate limiting for API endpoints

### Audit Logging
- All sensitive actions are logged
- Request/response logging
- Error tracking with Sentry
- Comprehensive audit trails

## 📚 API Documentation

### Base URL
```
http://localhost:5000
```

### Authentication
Most endpoints require authentication using JWT Bearer tokens:
```
Authorization: Bearer <your-jwt-token>
```

---

## 🔐 Authentication Routes (`/api/auth`)

### 1. Staff Registration
**POST** `/api/auth/staff/register`

Register a new staff member (doctor, nurse, or admin).

**Request Body:**
```json
{
  "staffId": "DOC001",
  "name": "Dr. John Smith",
  "email": "john.smith@hospital.com",
  "password": "password123",
  "role": "doctor",
  "department": "ICU"
}
```

**Response:**
```json
{
  "message": "Staff registered successfully",
  "staff": {
    "id": "60f7b3b3b3b3b3b3b3b3b3b3",
    "staffId": "DOC001",
    "name": "Dr. John Smith",
    "email": "john.smith@hospital.com",
    "role": "doctor",
    "department": "ICU"
  }
}
```

**Validation Rules:**
- `staffId`: Required, must be unique
- `name`: Required string
- `email`: Required, valid email format, must be unique
- `password`: Required, minimum 6 characters
- `role`: Must be "doctor", "nurse", or "admin"
- `department`: Required string

---

### 2. Staff Login
**POST** `/api/auth/staff/login`

Authenticate staff member and receive JWT token.

**Request Body:**
```json
{
  "email": "john.smith@hospital.com",
  "password": "password123"
}
```

**Response:**
```json
{
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": "60f7b3b3b3b3b3b3b3b3b3b3",
    "name": "Dr. John Smith",
    "email": "john.smith@hospital.com",
    "role": "doctor",
    "department": "ICU"
  }
}
```

---

### 3. Patient Registration
**POST** `/api/auth/patient/register`

Register a new patient (typically done during admission).

**Request Body:**
```json
{
  "patientId": "PAT001",
  "name": "Alice Johnson",
  "age": 65,
  "condition": "Post-surgery recovery",
  "roomNumber": "101"
}
```

**Response:**
```json
{
  "message": "Patient registered successfully",
  "patient": {
    "id": "60f7b3b3b3b3b3b3b3b3b3b3",
    "patientId": "PAT001",
    "name": "Alice Johnson",
    "age": 65,
    "condition": "Post-surgery recovery",
    "roomNumber": "101",
    "admissionDate": "2024-01-01T12:00:00.000Z"
  }
}
```

**Validation Rules:**
- `patientId`: Required, must be unique
- `name`: Required string
- `age`: Required, 0-150
- `condition`: Required string
- `roomNumber`: Optional, must be unique if provided

---

### 4. Family Member Registration
**POST** `/api/auth/family/register`

Register a family member for patient access (requires approval).

**Request Body:**
```json
{
  "name": "David Johnson",
  "email": "david.johnson@email.com",
  "password": "password123",
  "phone": "+1234567890",
  "relationship": "spouse",
  "patientId": "PAT001"
}
```

**Response:**
```json
{
  "message": "Registration successful. Awaiting staff approval.",
  "familyMemberId": "60f7b3b3b3b3b3b3b3b3b3b3"
}
```

**Validation Rules:**
- `name`: Required string
- `email`: Required, valid email format, must be unique
- `password`: Required, minimum 6 characters
- `phone`: Required string
- `relationship`: Required string
- `patientId`: Required, must exist in database

---

### 5. Family Member Login
**POST** `/api/auth/family/login`

Authenticate family member and receive JWT token.

**Request Body:**
```json
{
  "email": "david.johnson@email.com",
  "password": "password123"
}
```

**Response:**
```json
{
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": "60f7b3b3b3b3b3b3b3b3b3b3",
    "name": "David Johnson",
    "email": "david.johnson@email.com",
    "relationship": "spouse",
    "patient": {
      "_id": "60f7b3b3b3b3b3b3b3b3b3b3",
      "name": "Alice Johnson",
      "patientId": "PAT001"
    },
    "accessLevel": "full"
  }
}
```

---

## 👥 Patient Management Routes (`/api/patients`)

### 1. Get All Patients
**GET** `/api/patients`

Retrieve all active patients (staff only).

**Headers:** `Authorization: Bearer <staff_token>`

**Response:**
```json
[
  {
    "_id": "60f7b3b3b3b3b3b3b3b3b3b3",
    "patientId": "PAT001",
    "name": "Alice Johnson",
    "age": 65,
    "condition": "Post-surgery recovery",
    "admissionDate": "2024-01-01T12:00:00.000Z",
    "assignedStaff": [
      {
        "_id": "60f7b3b3b3b3b3b3b3b3b3b3",
        "name": "Dr. John Smith",
        "role": "doctor"
      }
    ],
    "familyMembers": [
      {
        "_id": "60f7b3b3b3b3b3b3b3b3b3b3",
        "name": "David Johnson",
        "relationship": "spouse",
        "isApproved": true
      }
    ]
  }
]
```

---

### 2. Get Specific Patient Details
**GET** `/api/patients/{id}`

Retrieve details of a specific patient by ID or patientId.

**Headers:** `Authorization: Bearer <token>`

**URL Examples:**
- `GET /api/patients/60f7b3b3b3b3b3b3b3b3b3b3` (MongoDB ObjectId)
- `GET /api/patients/PAT001` (Patient ID string)

**Response:** Same as patient object above

**Access Control:**
- Staff: Can access all patients
- Family: Can only access their assigned patient

---

### 3. Get Patient Vital Signs
**GET** `/api/patients/{id}/vitals`

Retrieve vital signs for a specific patient from external FastAPI service or fallback to dummy data.

**Headers:** `Authorization: Bearer <token>`

**Response (External API Success):**
```json
{
  "patientId": "PAT001",
  "patientName": "Alice Johnson",
  "roomNumber": "101",
  "vitalSigns": {
    "heartRate": 75,
    "bloodPressure": {
      "systolic": 120,
      "diastolic": 80
    },
    "oxygenSaturation": 98,
    "temperature": 98.6,
    "respiratoryRate": 16,
    "timestamp": "2024-01-01T12:00:00.000Z",
    "roomNumber": "101",
    "status": "normal"
  },
  "source": "external_api",
  "lastUpdated": "2024-01-01T12:00:00.000Z"
}
```

**Response (Dummy Data Fallback):**
```json
{
  "patientId": "PAT001",
  "patientName": "Alice Johnson",
  "roomNumber": "101",
  "vitalSigns": {
    "heartRate": 72.5,
    "bloodPressure": {
      "systolic": 118.2,
      "diastolic": 79.8
    },
    "oxygenSaturation": 97.8,
    "temperature": 98.4,
    "respiratoryRate": 15.7,
    "timestamp": "2024-01-01T12:00:00.000Z",
    "roomNumber": "101",
    "status": "normal"
  },
  "source": "dummy_data",
  "lastUpdated": "2024-01-01T12:00:00.000Z",
  "note": "Using dummy data due to external API unavailability"
}
```

**Features:**
- Fetches real-time data from FastAPI service using room number
- Falls back to realistic dummy data if external API is unavailable
- Both staff and family members can access (with proper authorization)
- Room-specific vital signs patterns

---

### 4. Update Patient Vital Signs
**PUT** `/api/patients/{id}/vitals`

Update vital signs for a patient in external FastAPI service (staff only).

**Headers:** 
- `Authorization: Bearer <staff_token>`
- `Content-Type: application/json`

**Request Body:**
```json
{
  "heartRate": 75,
  "bloodPressure": {
    "systolic": 120,
    "diastolic": 80
  },
  "oxygenSaturation": 98,
  "temperature": 98.6,
  "respiratoryRate": 16
}
```

**Response (External API Success):**
```json
{
  "message": "Vital signs updated successfully in external service",
  "roomNumber": "101",
  "vitalSigns": {
    "heartRate": 75,
    "bloodPressure": {
      "systolic": 120,
      "diastolic": 80
    },
    "oxygenSaturation": 98,
    "temperature": 98.6,
    "respiratoryRate": 16,
    "timestamp": "2024-01-01T12:00:00.000Z"
  },
  "source": "external_api"
}
```

**Response (Local Fallback):**
```json
{
  "message": "Vital signs updated in local database (external service unavailable)",
  "roomNumber": "101",
  "vitalSigns": {
    "heartRate": 75,
    "bloodPressure": {
      "systolic": 120,
      "diastolic": 80
    },
    "oxygenSaturation": 98,
    "temperature": 98.6,
    "respiratoryRate": 16,
    "lastUpdated": "2024-01-01T12:00:00.000Z"
  },
  "source": "local_database",
  "note": "External API unavailable, data stored locally"
}
```

**Validation Rules:**
- `heartRate`: 0-300
- `bloodPressure.systolic`: 0-300
- `bloodPressure.diastolic`: 0-200
- `oxygenSaturation`: 0-100
- `temperature`: 90-110
- `respiratoryRate`: 0-60

---

### 5. Get Patient Emotion History
**GET** `/api/patients/{id}/emotions`

Retrieve emotion tracking data for a patient.

**Headers:** `Authorization: Bearer <token>`

**Response:**
```json
[
  {
    "_id": "60f7b3b3b3b3b3b3b3b3b3b3",
    "patientId": "60f7b3b3b3b3b3b3b3b3b3b3",
    "emotion": "happy",
    "confidence": 0.85,
    "timestamp": "2024-01-01T12:00:00.000Z"
  }
]
```

---

## 👨‍👩‍👧‍👦 Family Management Routes (`/api/family`)

### 1. Get Family Profile
**GET** `/api/family/profile`

Retrieve family member's own profile (family only).

**Headers:** `Authorization: Bearer <family_token>`

**Response:**
```json
{
  "_id": "60f7b3b3b3b3b3b3b3b3b3b3",
  "name": "David Johnson",
  "email": "david.johnson@email.com",
  "phone": "+1234567890",
  "relationship": "spouse",
  "isApproved": true,
  "accessLevel": "full",
  "patientId": {
    "_id": "60f7b3b3b3b3b3b3b3b3b3b3",
    "name": "Alice Johnson",
    "patientId": "PAT001",
    "condition": "Post-surgery recovery"
  }
}
```

---

### 2. Share Content with Patient
**POST** `/api/family/share-content`

Share photos, videos, voice notes, or text messages with the patient (family only).

**Headers:** 
- `Authorization: Bearer <family_token>`
- `Content-Type: multipart/form-data`

**Form Data:**
- `type`: "photo" | "video" | "voice_note" | "text_message"
- `message`: String (optional)
- `title`: String (optional)
- `file`: File (for photo/video/voice_note)

**Response:**
```json
{
  "message": "Content shared successfully",
  "content": {
    "id": "1704067200000",
    "type": "photo",
    "title": "Home Photo",
    "message": "Here's a photo from home!",
    "fromFamily": {
      "name": "David Johnson",
      "relationship": "spouse"
    },
    "patientId": "60f7b3b3b3b3b3b3b3b3b3b3",
    "timestamp": "2024-01-01T12:00:00.000Z",
    "file": {
      "originalName": "photo.jpg",
      "mimetype": "image/jpeg",
      "size": 1024000
    }
  }
}
```

---

### 3. Get Pending Family Approvals
**GET** `/api/family/pending-approvals`

Retrieve all pending family member registrations (staff only).

**Headers:** `Authorization: Bearer <staff_token>`

**Response:**
```json
[
  {
    "_id": "60f7b3b3b3b3b3b3b3b3b3b3",
    "name": "Emma Wilson",
    "email": "emma.wilson@email.com",
    "phone": "+1234567891",
    "relationship": "daughter",
    "isApproved": false,
    "createdAt": "2024-01-01T12:00:00.000Z",
    "patientId": {
      "_id": "60f7b3b3b3b3b3b3b3b3b3b3",
      "name": "Bob Wilson",
      "patientId": "PAT002"
    }
  }
]
```

---

### 4. Approve/Reject Family Member
**PUT** `/api/family/approve/{id}`

Approve or reject a family member registration (staff only).

**Headers:** 
- `Authorization: Bearer <staff_token>`
- `Content-Type: application/json`

**Request Body:**
```json
{
  "approved": true,
  "accessLevel": "full"
}
```

**Response:**
```json
{
  "message": "Family member approved successfully"
}
```

**Access Levels:**
- `"full"`: Complete access to patient data
- `"limited"`: Restricted access to patient data

---

## 🚨 Alert Management Routes (`/api/alerts`)

### 1. Get All Alerts
**GET** `/api/alerts`

Retrieve all alerts with optional filtering (staff only).

**Headers:** `Authorization: Bearer <staff_token>`

**Query Parameters:**
- `page`: Page number (default: 1)
- `limit`: Items per page (default: 20)
- `type`: Filter by type ("critical", "warning", "info")
- `acknowledged`: Filter by acknowledgment status (true/false)

**Response:**
```json
{
  "alerts": [
    {
      "_id": "60f7b3b3b3b3b3b3b3b3b3b3",
      "patientId": {
        "_id": "60f7b3b3b3b3b3b3b3b3b3b3",
        "name": "Alice Johnson",
        "patientId": "PAT001"
      },
      "type": "warning",
      "category": "vital_signs",
      "message": "Blood pressure elevated",
      "data": {
        "systolic": 160,
        "diastolic": 95
      },
      "isAcknowledged": false,
      "isResolved": false,
      "createdAt": "2024-01-01T12:00:00.000Z"
    }
  ],
  "totalPages": 5,
  "currentPage": 1,
  "total": 100
}
```

---

### 2. Create Alert
**POST** `/api/alerts`

Create a new alert (staff only).

**Headers:** 
- `Authorization: Bearer <staff_token>`
- `Content-Type: application/json`

**Request Body:**
```json
{
  "patientId": "60f7b3b3b3b3b3b3b3b3b3b3",
  "type": "warning",
  "category": "vital_signs",
  "message": "Blood pressure elevated",
  "data": {
    "systolic": 160,
    "diastolic": 95
  }
}
```

**Alert Types:**
- `"critical"`: Immediate attention required
- `"warning"`: Attention needed soon
- `"info"`: Informational alert

**Alert Categories:**
- `"vital_signs"`: Vital signs related
- `"emotional_state"`: Emotional state related
- `"system"`: System related
- `"family_request"`: Family member request

---

### 3. Acknowledge Alert
**PUT** `/api/alerts/{id}/acknowledge`

Mark an alert as acknowledged (staff only).

**Headers:** `Authorization: Bearer <staff_token>`

**Response:**
```json
{
  "message": "Alert acknowledged successfully"
}
```

---

### 4. Resolve Alert
**PUT** `/api/alerts/{id}/resolve`

Mark an alert as resolved (staff only).

**Headers:** `Authorization: Bearer <staff_token>`

**Response:**
```json
{
  "message": "Alert resolved successfully"
}
```

---

## 🔌 Socket.IO Events

### Connection Events
- **Connection**: `io.on('connection')`
- **Authentication**: Uses JWT token for socket authentication
- **Room Joining**: Automatically joins rooms based on user role

### Emitted Events

#### From Client to Server
- `vital_signs_update`: Update patient vital signs (staff only)
- `share_content`: Share content with patient (family only)

#### From Server to Client
- `vital_signs`: Real-time vital signs updates
- `new_content`: New content shared by family
- `family_content_shared`: Notification to staff about family content
- `critical_alert`: Critical alert notifications
- `emotion_update`: Patient emotion updates

### Room Structure
- **Patients**: `patient_{patientId}`
- **Family**: `family_{patientId}`
- **Staff**: `staff_room`

---

## 🧪 Testing Guide

### Prerequisites
1. Start the server: `npm run dev`
2. Open Postman
3. Create a collection: "AuraCare API Testing"

### Testing Sequence

#### Phase 1: Setup
1. **Health Check**: `GET /health`
2. **Register Staff**: `POST /api/auth/staff/register`
3. **Staff Login**: `POST /api/auth/staff/login`

#### Phase 2: Patient Management
4. **Register Patient**: `POST /api/auth/patient/register`
5. **Get All Patients**: `GET /api/patients`
6. **Get Patient Details**: `GET /api/patients/{id}`

#### Phase 3: Family Management
7. **Register Family**: `POST /api/auth/family/register`
8. **Get Pending Approvals**: `GET /api/family/pending-approvals`
9. **Approve Family**: `PUT /api/family/approve/{id}`
10. **Family Login**: `POST /api/auth/family/login`

#### Phase 4: Vital Signs
11. **Update Vitals**: `PUT /api/patients/{id}/vitals`
12. **Get Vitals**: `GET /api/patients/{id}/vitals`

#### Phase 5: Alerts
13. **Create Alert**: `POST /api/alerts`
14. **Get Alerts**: `GET /api/alerts`
15. **Acknowledge Alert**: `PUT /api/alerts/{id}/acknowledge`
16. **Resolve Alert**: `PUT /api/alerts/{id}/resolve`

#### Phase 6: Family Features
17. **Get Family Profile**: `GET /api/family/profile`
18. **Share Content**: `POST /api/family/share-content`

### Postman Environment Variables
```json
{
  "base_url": "http://localhost:5000",
  "staff_token": "",
  "family_token": "",
  "patient_id": "",
  "family_member_id": "",
  "alert_id": ""
}
```

---

## ⚠️ Error Handling

### HTTP Status Codes
- `200`: Success
- `201`: Created
- `400`: Bad Request (validation errors)
- `401`: Unauthorized (invalid/missing token)
- `403`: Forbidden (insufficient permissions)
- `404`: Not Found
- `500`: Internal Server Error

### Error Response Format
```json
{
  "error": "Error message description"
}
```

### Common Error Scenarios
- **Invalid Token**: 401 Unauthorized
- **Missing Required Fields**: 400 Bad Request
- **Duplicate Email/ID**: 400 Bad Request
- **Patient Not Found**: 404 Not Found
- **Access Denied**: 403 Forbidden

---

## 🔒 Security Features

- **JWT Authentication**: Secure token-based authentication
- **Password Hashing**: bcrypt password encryption
- **Role-based Access Control**: Different permissions for staff and family
- **Input Validation**: Joi schema validation for all inputs
- **Rate Limiting**: Express rate limiting to prevent abuse
- **CORS Protection**: Configurable CORS settings
- **Helmet Security**: Security headers middleware

---

## 📝 License

This project is licensed under the MIT License.

---

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

---

## 📞 Support

For support and questions, please contact the development team or create an issue in the repository.
