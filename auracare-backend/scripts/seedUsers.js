require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') })

const mongoose = require('mongoose')
const connectDB = require('../config/db')
const Patient = require('../models/Patient')
const Staff = require('../models/Staff')
const FamilyMember = require('../models/FamilyMember')

async function ensureConnected() {
  if (mongoose.connection.readyState === 1) return
  await connectDB()
}

async function upsertPatient() {
  const data = {
    patientId: 'PAT001',
    name: 'John Doe',
    age: 45,
    condition: 'Stable',
    roomNumber: '101',
  }
  let patient = await Patient.findOne({ patientId: data.patientId })
  if (!patient) {
    patient = await Patient.create(data)
    console.log(`[seed] Patient created: ${patient._id}`)
  } else {
    console.log(`[seed] Patient exists: ${patient._id}`)
  }
  return patient
}

async function upsertStaff() {
  const data = {
    staffId: 'NURSE001',
    name: 'Alice Nurse',
    email: 'nurse1@hospital.test',
    password: 'Passw0rd!',
    role: 'nurse',
    department: 'ICU',
  }
  let staff = await Staff.findOne({ email: data.email })
  if (!staff) {
    staff = await Staff.create(data)
    console.log(`[seed] Staff created: ${staff._id}`)
  } else {
    console.log(`[seed] Staff exists: ${staff._id}`)
  }
  return staff
}

async function upsertFamily(patient) {
  const data = {
    name: 'Jane Doe',
    email: 'jane.doe@test.com',
    password: 'Passw0rd!',
    phone: '+1-555-0101',
    relationship: 'spouse',
    patientId: patient._id,
    accessLevel: 'full',
    isApproved: true,
  }
  let family = await FamilyMember.findOne({ email: data.email })
  if (!family) {
    family = await FamilyMember.create(data)
    console.log(`[seed] Family created: ${family._id}`)
  } else {
    // ensure linkage and approval
    family.patientId = patient._id
    family.isApproved = true
    family.accessLevel = 'full'
    await family.save()
    console.log(`[seed] Family updated: ${family._id}`)
  }
  return family
}

async function linkRelations(patient, staff, family) {
  let changed = false
  // Link family to patient
  if (!patient.familyMembers.some(id => id.equals(family._id))) {
    patient.familyMembers.push(family._id)
    changed = true
  }
  // Link staff to patient
  if (!patient.assignedStaff.some(id => id.equals(staff._id))) {
    patient.assignedStaff.push(staff._id)
    changed = true
  }
  if (changed) {
    await patient.save()
    console.log('[seed] Patient relations updated')
  }
}

async function main() {
  try {
    await ensureConnected()

    const patient = await upsertPatient()
    const staff = await upsertStaff()
    const family = await upsertFamily(patient)

    await linkRelations(patient, staff, family)

    // Output credentials
    console.log('\n=== Seed Complete ===')
    console.log('Patient Login (unified /api/auth/login):')
    console.log('  type: patient')
    console.log('  id: PAT001')
    console.log('  name: John Doe')

    console.log('\nStaff (Nurse) Credentials:')
    console.log('  email: nurse1@hospital.test')
    console.log('  password: Passw0rd!')

    console.log('\nFamily Credentials:')
    console.log('  email: jane.doe@test.com')
    console.log('  password: Passw0rd!')

    console.log('\nIDs:')
    console.log(`  patientId (ObjectId): ${patient._id}`)
    console.log(`  staffId   (ObjectId): ${staff._id}`)
    console.log(`  familyId  (ObjectId): ${family._id}`)

    process.exit(0)
  } catch (err) {
    console.error('[seed] Error:', err)
    process.exit(1)
  }
}

main()
