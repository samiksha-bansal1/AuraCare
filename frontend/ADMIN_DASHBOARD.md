# Admin Dashboard

The Admin Dashboard provides comprehensive management capabilities for healthcare administrators to manage patients, staff members, and family members within the AuraCare system.

## Features

### 🔐 Authentication
- **Admin Login**: Use admin credentials to access the dashboard
- **Role-based Access**: Only users with admin role can access admin functions
- **Secure Routes**: All admin endpoints are protected with authentication middleware

### 👥 Patient Management
- **View All Patients**: See complete list of registered patients
- **Patient Details**: View patient information including room number, condition, and status
- **Add New Patients**: Register new patients with required information
- **Activate/Deactivate**: Enable or disable patient accounts
- **Room Assignment**: Assign patients to specific hospital rooms

### 🏥 Staff Management
- **View All Staff**: See complete list of healthcare staff members
- **Staff Details**: View staff information including role, department, and status
- **Add New Staff**: Register new staff members with roles (nurse, doctor, admin)
- **Role Management**: Assign appropriate roles and departments
- **Account Status**: Activate or deactivate staff accounts

### 👨‍👩‍👧‍👦 Family Member Management
- **View All Family Members**: See complete list of registered family members
- **Family Details**: View relationship, access level, and approval status
- **Add New Family Members**: Register family members for specific patients
- **Approval System**: Approve or reject family member registrations
- **Access Control**: Set access levels (full or limited) for patient data
- **Patient Linking**: Associate family members with specific patients

## API Endpoints

### Patients
- `GET /api/patients` - Get all patients (admin only)
- `POST /api/auth/patient/register` - Register new patient
- `PUT /api/patients/:id/deactivate` - Activate/deactivate patient

### Staff
- `GET /api/staff` - Get all staff members (admin only)
- `POST /api/auth/staff/register` - Register new staff member
- `PUT /api/staff/:id/deactivate` - Activate/deactivate staff member

### Family Members
- `GET /api/family` - Get all family members (admin only)
- `POST /api/auth/family/register` - Register new family member
- `PUT /api/family/:id/approve` - Approve family member
- `PUT /api/family/:id/deactivate` - Deactivate family member

## Usage Instructions

### 1. Access Admin Dashboard
1. Navigate to the login page
2. Select "Admin" user type
3. Enter admin credentials:
   - Email: `admin@hospital.test`
   - Password: `Admin123!`
4. Click "Sign In"

### 2. Navigate Between Sections
- Use the tab navigation to switch between:
  - **Patients**: Manage patient accounts and information
  - **Staff**: Manage healthcare staff members
  - **Family**: Manage family member registrations and approvals

### 3. Add New Users

#### Adding a Patient
1. Click "Add Patient" button in the Patients tab
2. Fill in required information:
   - Patient ID (e.g., PAT001)
   - Full Name
   - Age
   - Medical Condition
   - Room Number
3. Click "Add Patient"

#### Adding a Staff Member
1. Click "Add Staff" button in the Staff tab
2. Fill in required information:
   - Staff ID (e.g., STAFF001)
   - Full Name
   - Email
   - Password
   - Role (nurse, doctor, admin)
   - Department
3. Click "Add Staff Member"

#### Adding a Family Member
1. Click "Add Family Member" button in the Family tab
2. Fill in required information:
   - Full Name
   - Email
   - Password
   - Phone Number
   - Relationship to Patient
   - Select Patient from dropdown
   - Access Level (full or limited)
3. Click "Add Family Member"

### 4. Manage Existing Users

#### Approving Family Members
- Family members are initially in "Pending" status
- Click "Approve" button to grant access
- Approved members can log in and access patient information

#### Activating/Deactivating Users
- Use the "Deactivate" button to disable user accounts
- Use the "Activate" button to re-enable disabled accounts
- Deactivated users cannot log in or access the system

## Security Features

- **Role-based Authorization**: All admin functions require admin role
- **Password Hashing**: All passwords are securely hashed using bcrypt
- **JWT Authentication**: Secure token-based authentication
- **Input Validation**: All form inputs are validated on both frontend and backend
- **Audit Logging**: Admin actions are logged for security purposes

## Data Validation

### Patient Registration
- Patient ID must be unique
- Room number must not be occupied by another active patient
- Age must be between 0-150 years

### Staff Registration
- Staff ID must be unique
- Email must be unique and valid format
- Password must be at least 6 characters
- Role must be one of: doctor, nurse, admin

### Family Member Registration
- Email must be unique
- Patient must exist in the system
- Relationship must be specified
- Access level determines data visibility

## Error Handling

- **Duplicate Entries**: System prevents duplicate emails and IDs
- **Validation Errors**: Clear error messages for invalid input
- **Network Errors**: Graceful handling of API failures
- **Permission Errors**: Clear access denied messages

## Troubleshooting

### Common Issues

1. **Cannot Access Admin Dashboard**
   - Ensure you're logged in with admin role
   - Check if your account is active
   - Verify admin permissions in database

2. **Cannot Add Users**
   - Check if required fields are filled
   - Ensure unique constraints (email, ID) are met
   - Verify database connection

3. **Family Members Not Approved**
   - Check approval status in Family tab
   - Use "Approve" button to grant access
   - Verify patient association

### Support

For technical support or questions about the admin dashboard, contact the system administrator or development team.

## Development Notes

- Built with React and TypeScript
- Uses Tailwind CSS for styling
- Integrates with Node.js/Express backend
- MongoDB database with Mongoose ODM
- JWT-based authentication system
- Responsive design for mobile and desktop
