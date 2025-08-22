require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') })

const mongoose = require('mongoose')
const connectDB = require('../config/db')

async function main() {
  try {
    await connectDB()

    const collection = mongoose.connection.db.collection('patients')
    const indexes = await collection.indexes()
    console.log('[fix-indexes] Current patient indexes:')
    console.table(indexes.map(i => ({ name: i.name, key: JSON.stringify(i.key), unique: !!i.unique })))

    const badIndexNames = indexes
      .filter(i => i.name === 'email_1' || (i.key && i.key.email === 1))
      .map(i => i.name)

    for (const name of badIndexNames) {
      try {
        await collection.dropIndex(name)
        console.log(`[fix-indexes] Dropped index: ${name}`)
      } catch (err) {
        console.warn(`[fix-indexes] Could not drop index ${name}:`, err.message)
      }
    }

    const newIndexes = await collection.indexes()
    console.log('[fix-indexes] Patient indexes after cleanup:')
    console.table(newIndexes.map(i => ({ name: i.name, key: JSON.stringify(i.key), unique: !!i.unique })))

    process.exit(0)
  } catch (err) {
    console.error('[fix-indexes] Error:', err)
    process.exit(1)
  }
}

main()


