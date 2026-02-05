#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

// Read environment variables
const env = {
  NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL || '',
  NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL || '',
  NEXT_PUBLIC_BILLING_ENABLED: process.env.NEXT_PUBLIC_BILLING_ENABLED || 'false',
};

// Generate the content
const content = `// Public environment variables for client-side access
// Auto-generated from environment variables
window.__ENV__ = ${JSON.stringify(env, null, 2)};
`;

// Write to public folder
const publicDir = path.join(process.cwd(), 'public');
const envPath = path.join(publicDir, 'env.js');

// Ensure public directory exists
if (!fs.existsSync(publicDir)) {
  fs.mkdirSync(publicDir, { recursive: true });
}

fs.writeFileSync(envPath, content, 'utf8');

console.log('✅ Generated public/env.js');
console.log('📝 Variables:', Object.keys(env).join(', '));
