import bcrypt from 'bcryptjs'
import pg from 'pg'
import { readFileSync } from 'fs'

// Lire le .env manuellement
const env = readFileSync('.env', 'utf8')
env.split('\n').forEach(line => {
  const [key, ...val] = line.split('=')
  if (key && val) process.env[key.trim()] = val.join('=').trim().replace(/"/g, '')
})

const pool = new pg.Pool({
  connectionString: process.env.DATABASE_URL
})

const hash = bcrypt.hashSync('Admin@12345', 12)

try {
  await pool.query(`
    INSERT INTO users (
      id, "firstName", "lastName", email, password,
      "userRole", "isVerified", "isActive", "createdAt", "updatedAt"
    )
    VALUES (
      gen_random_uuid(),
      $1, $2,
      $3,
      $4,
      'ADMIN', true, true, NOW(), NOW()
    )
    ON CONFLICT (email) DO NOTHING
  `, ['Super', 'Admin', 'admin@redsys.com', hash])
  console.log('✅ Admin créé avec succès !')
  console.log('📧 Email    : admin@redsys.com')
  console.log('🔑 Password : Admin@12345')
} catch (err) {
  console.error('❌ Erreur :', err.message)
} finally {
  await pool.end()
}