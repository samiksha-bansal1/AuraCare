# AuraCare - AI-Powered Emotional Care for Patients

AuraCare revolutionizes ICU care by combining cutting-edge AI with compassionate interventions — improving patient well-being, supporting medical staff, and engaging families.

## 🚀 Features

### Frontend (React + TypeScript)
- **Modern UI/UX**: Beautiful, responsive design with Tailwind CSS
- **User Authentication**: Separate login flows for Patients, Nurses, and Family members
- **Role-based Dashboards**: Customized interfaces for each user type
- **Real-time Monitoring**: Patient vital signs and emotional state tracking
- **Responsive Design**: Works seamlessly on desktop, tablet, and mobile

### Backend (Node.js + Express + TypeScript)
- **RESTful API**: Complete authentication and user management
- **JWT Authentication**: Secure token-based authentication
- **MongoDB Integration**: Scalable database with Mongoose ODM
- **Password Security**: Bcrypt hashing for secure password storage
- **TypeScript**: Full type safety and better development experience

## 🏗️ Project Structure

```
AuraCare/
├── frontend/                 # React frontend application
│   ├── src/
│   │   ├── components/       # React components
│   │   ├── contexts/         # React contexts (Auth)
│   │   ├── App.tsx          # Main app component
│   │   └── main.tsx         # App entry point
│   ├── package.json
│   └── README.md
├── backend/                  # Node.js backend API
│   ├── src/
│   │   ├── models/          # Database models
│   │   ├── routes/          # API routes
│   │   ├── middleware/      # Express middleware
│   │   └── server.ts        # Server entry point
│   ├── package.json
│   └── README.md
└── README.md                # This file
```

## 🛠️ Installation & Setup

### Prerequisites
- Node.js (v16 or higher)
- npm or yarn
- MongoDB (local or cloud instance)

### Backend Setup

1. Navigate to the backend directory:
```bash
cd auracare-backend
```

2. Install dependencies:
```bash
npm install
```

3. Create a `.env` file in the backend directory:
```env
PORT=5000
MONGODB_URI=mongodb://localhost:27017/auracare
JWT_SECRET=your-super-secret-jwt-key-change-this-in-production
NODE_ENV=development
CLIENT_URL=http://localhost:5173
AI_SERVICE_URL=http://localhost:8000
```

4. Start the development server:
```bash
npm run dev
```

The backend API will be available at `http://localhost:5000`

### Frontend Setup

1. Navigate to the frontend directory:
```bash
cd frontend
```

2. Install dependencies:
```bash
npm install
```

3. Start the development server:
```bash
npm run dev
```

The frontend will be available at `http://localhost:5173`

### Running Both Services

1. Start MongoDB (if running locally):
```bash
mongod
```

2. Start the backend (in one terminal):
```bash
cd auracare-backend
npm run dev
```

3. Start the frontend (in another terminal):
```bash
cd frontend
npm run dev
```

4. Open your browser and navigate to `http://localhost:5173`

## 👥 User Types & Authentication

### Patient
- **Login Fields**: Patient ID, Patient Name, Room Number
- **Features**: View personal health data, emotional state, and receive calming interventions

### Nurse
- **Login Fields**: Nurse ID, Room Number, Password, Patient ID
- **Features**: Monitor multiple patients, receive alerts, manage interventions

### Family Member
- **Login Fields**: Patient Name, Patient ID, Password, Family Member Name
- **Features**: View patient status, receive updates, communicate with care team

## 🔧 API Endpoints

### Authentication
- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - Login user
- `GET /api/auth/me` - Get current user (protected)

### Health Check
- `GET /api/health` - API status check

## 🔌 Integration Features

### Real-time Communication
- **Socket.IO Integration**: Real-time updates for vital signs, alerts, and family content sharing
- **WebSocket Authentication**: Secure token-based authentication for real-time connections
- **Room-based Broadcasting**: Targeted messaging based on user roles and patient assignments

### Frontend-Backend Communication
- **Direct API Connection**: Frontend connects directly to backend API at `http://localhost:5000/api`
- **JWT Token Management**: Automatic token handling with axios interceptors
- **CORS Configuration**: Properly configured for cross-origin requests
- **Error Handling**: Comprehensive error handling with automatic logout on authentication failures

### Real-time Features
- **Vital Signs Monitoring**: Real-time patient vital signs updates
- **Critical Alerts**: Instant notifications for critical patient conditions
- **Family Content Sharing**: Real-time sharing of photos, videos, and messages
- **Emotion Analysis**: AI-powered emotion detection and updates
- **Staff Notifications**: Real-time alerts for medical staff

## 🎨 UI Components

### HomePage
- Landing page with feature overview
- Call-to-action buttons
- Responsive navigation

### LoginScreen
- Role-based form fields
- Password visibility toggle
- Form validation

### Dashboards
- **PatientInterface**: Personal health monitoring
- **NurseDashboard**: Multi-patient management
- **FamilyDashboard**: Patient status viewing

## 🔒 Security Features

- JWT token authentication
- Password hashing with bcrypt
- CORS protection
- Input validation
- Protected routes

## 🚀 Deployment

### Frontend
```bash
cd frontend
npm run build
```

### Backend
```bash
cd backend
npm run build
npm start
```

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📝 License

This project is licensed under the ISC License.


## 🙏 Acknowledgments

- React and TypeScript communities
- Tailwind CSS for styling
- MongoDB for database
- Express.js for backend framework
