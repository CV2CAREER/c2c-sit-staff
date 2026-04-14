import dotenv from 'dotenv';
dotenv.config();
import pg from 'pg';

(async () => {
  const config = {
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    port: parseInt(process.env.DB_PORT || '5432', 10),
    ssl: {
      rejectUnauthorized: false
    }
  };

  console.log('🔗 Connecting to:', config.host);
  const client = new pg.Client(config);

  try {
    await client.connect();
    console.log('✅ Connected via pg');
    
    const userId = '413634f2-6695-4974-bd80-fdc39bb501e9';
    
    // Update role
    const res = await client.query(
      "UPDATE users SET role = 'admin', manager = true, \"isActive\" = true, \"isEmailVerified\" = true WHERE id = $1 RETURNING email",
      [userId]
    );

    if (res.rowCount === 0) {
      console.error('❌ User not found');
    } else {
      console.log('✅ Updated user:', res.rows[0].email);
    }

    await client.end();
    process.exit(0);
  } catch (err) {
    console.error('❌ pg connection failed:', err);
    process.exit(1);
  }
})();
