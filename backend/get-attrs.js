const { PrismaClient } = require('@prisma/client');
const p = new PrismaClient();
p.attribute.findMany({ 
  select: { slug: true, name: true, type: true, attributeValues: { select: { value: true } } }, 
  orderBy: { name: 'asc' } 
}).then(r => {
  console.log(JSON.stringify(r, null, 2));
  process.exit(0);
}).catch(e => {
  console.error(e);
  process.exit(1);
});
