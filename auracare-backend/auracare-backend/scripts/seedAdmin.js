require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') })

const connectDB = require('../config/db')
const Staff = require('../models/Staff')

async function main() {
  try {
    await connectDB()

    const data = {
      staffId: 'ADMIN001',
      name: 'Admin User',
      email: 'admin@hospital.test',
      password: 'Admin123!',
      role: 'admin',
      department: 'Administration',
      isActive: true,
    }

    let admin = await Staff.findOne({ email: data.email })
    if (!admin) {
      admin = await Staff.create(data)
      console.log(`[seed-admin] Admin created: ${admin._id}`)
    } else {
      admin.staffId = data.staffId
      admin.name = data.name
      admin.role = 'admin'
      admin.department = data.department
      admin.isActive = true
      await admin.save()
      console.log(`[seed-admin] Admin already exists: ${admin._id}. Ensured fields.`)
    }

    console.log('\n=== Admin Credentials ===')
    console.log('Email: admin@hospital.test')
    console.log('Password: Admin123!')

    process.exit(0)
  } catch (err) {
    console.error('[seed-admin] Error:', err)
    process.exit(1)
  }
}

main()
