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

  const client = new pg.Client(config);

  try {
    await client.connect();
    console.log('✅ Connected via pg');
    
    const userId = '413634f2-6695-4974-bd80-fdc39bb501e9';
    const abilities = ['read', 'write', 'delete', 'edit', 'full'];

    // 1. Fetch all resources
    const resResources = await client.query("SELECT id FROM resources");
    const resourceIds = resResources.rows.map(r => r.id);
    console.log(`✅ Found ${resourceIds.length} resources`);

    // 2. Prepare permissions JSONB
    const permissionsJsonb = resourceIds.map(id => ({
      resourceId: id,
      ability: abilities
    }));

    // 3. Update User table permissions JSONB
    await client.query(
      "UPDATE users SET permissions = $1 WHERE id = $2",
      [JSON.stringify(permissionsJsonb), userId]
    );
    console.log('✅ Updated users.permissions JSONB');

    // 4. Update UserPermission table
    // Delete existing
    await client.query("DELETE FROM user_permissions WHERE \"userId\" = $1", [userId]);
    console.log('✅ Cleared user_permissions table');

    // Bulk insert (using multiple queries or one unnest query for simplicity)
    for (const id of resourceIds) {
      await client.query(
        "INSERT INTO user_permissions (id, \"userId\", \"resourceId\", abilities, \"createdAt\", \"updatedAt\") VALUES ($1, $2, $3, $4, NOW(), NOW())",
        [crypto.randomUUID(), userId, id, JSON.stringify(abilities)]
      );
    }
    console.log(`✅ Inserted ${resourceIds.length} records into user_permissions table`);

    await client.end();
    console.log('✅ All updates completed');
    process.exit(0);
  } catch (err) {
    console.error('❌ Update failed:', err);
    process.exit(1);
  }
})();
