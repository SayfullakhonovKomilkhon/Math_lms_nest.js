const { execSync } = require('child_process');

try {
  const env = { ...process.env };
  if (!env.DATABASE_URL) {
    console.log('DATABASE_URL not found, using dummy URL for Prisma generation');
    env.DATABASE_URL = 'postgresql://dummy:dummy@localhost/dummy';
  }
  execSync('npx prisma generate', { env, stdio: 'inherit' });
} catch (error) {
  console.error('Prisma generation failed');
  process.exit(1);
}
