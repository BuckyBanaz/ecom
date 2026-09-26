const { PrismaClient } = require('@prisma/client');
const p = new PrismaClient();
p.brand.findMany({ 
  select: { id: true, slug: true, name: true }, 
  orderBy: { name: 'asc' } 
}).then(r => {
  console.log('=== BRANDS ===');
  console.log(JSON.stringify(r, null, 2));
  return p.series.findMany({ 
    select: { id: true, slug: true, name: true, brand: { select: { name: true } } },
    where: { name: { contains: 'marbella', mode: 'insensitive' } }
  });
}).then(r => {
  console.log('=== MARBELLA SERIES ===');
  console.log(JSON.stringify(r, null, 2));
  process.exit(0);
}).catch(e => {
  console.error(e);
  process.exit(1);
});
