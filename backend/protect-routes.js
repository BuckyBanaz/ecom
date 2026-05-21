const fs = require('fs');
const path = require('path');

const routesDir = path.join(__dirname, 'src', 'routes');

fs.readdirSync(routesDir).forEach(file => {
  if (file === 'authRoutes.ts' || !file.endsWith('.ts')) return;
  
  let content = fs.readFileSync(path.join(routesDir, file), 'utf-8');
  let modified = false;

  // Add import if not present
  if (!content.includes('authenticateJWT')) {
    content = content.replace(
      'import { Router } from "express";',
      'import { Router } from "express";\nimport { authenticateJWT, requireAdmin } from "../middlewares/authMiddleware";'
    );
    modified = true;
  }

  // Replace post, put, delete
  const methods = ['post', 'put', 'delete'];
  methods.forEach(method => {
    // Regex to match router.method("path", handler) or router.method('path', handler)
    // We want to avoid matching if it already has authenticateJWT
    const regex = new RegExp(`router\\.${method}\\((['"\`].*?['"\`]),\\s*(?!authenticateJWT)([^)]+)\\);`, 'g');
    if (regex.test(content)) {
      content = content.replace(regex, `router.${method}($1, authenticateJWT, requireAdmin, $2);`);
      modified = true;
    }
  });

  if (modified) {
    fs.writeFileSync(path.join(routesDir, file), content, 'utf-8');
    console.log(`Protected routes in ${file}`);
  }
});
