const { execSync } = require('child_process');
try {
  console.log('Running prisma db push...');
  execSync('npx prisma db push', { stdio: 'inherit' });
  console.log('Done.');
} catch (e) {
  console.error(e);
}
