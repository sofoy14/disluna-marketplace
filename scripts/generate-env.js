#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const dotenv = require('dotenv');

// Load environment files in order of priority (Next.js style)
// .env.local has priority over .env
const envFiles = ['.env.local', '.env'];

for (const file of envFiles) {
  const envPath = path.join(process.cwd(), file);
  if (fs.existsSync(envPath)) {
    const result = dotenv.config({ path: envPath });
    if (result.error) {
      console.warn(`⚠️  Warning: Could not load ${file}:`, result.error.message);
    } else {
      console.log(`✅ Loaded ${file}`);
      break; // Stop after loading the first available file
    }
  }
}

// Read environment variables - prioritize process.env (loaded from .env or system)
const env = {
  NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL || '',
  NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL || '',
  NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '',
  NEXT_PUBLIC_BILLING_ENABLED: process.env.NEXT_PUBLIC_BILLING_ENABLED || 'false',
};

// Check if critical Supabase variables are missing
const missingVars = [];
if (!env.NEXT_PUBLIC_SUPABASE_URL) missingVars.push('NEXT_PUBLIC_SUPABASE_URL');
if (!env.NEXT_PUBLIC_SUPABASE_ANON_KEY) missingVars.push('NEXT_PUBLIC_SUPABASE_ANON_KEY');

// Generate a more robust env.js that can handle runtime injection
const content = `// Public environment variables for client-side access
// Auto-generated from environment variables during build
// This file provides fallback values; runtime environment variables will take precedence if available

window.__ENV__ = ${JSON.stringify(env, null, 2)};

// Runtime fallback: if build-time values are empty, try to read from meta tags
// (Meta tags can be injected by the server via next/head)
(function() {
  if (!window.__ENV__.NEXT_PUBLIC_SUPABASE_URL || !window.__ENV__.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
    try {
      const metaUrl = document.querySelector('meta[name="supabase-url"]');
      const metaKey = document.querySelector('meta[name="supabase-anon-key"]');
      if (metaUrl && metaUrl.content) window.__ENV__.NEXT_PUBLIC_SUPABASE_URL = metaUrl.content;
      if (metaKey && metaKey.content) window.__ENV__.NEXT_PUBLIC_SUPABASE_ANON_KEY = metaKey.content;
    } catch (e) {
      // Silently fail if DOM not ready
    }
  }
})();
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

if (missingVars.length > 0) {
  console.warn('⚠️  Warning: Missing environment variables:', missingVars.join(', '));
  console.warn('⚠️  These variables should be configured in your deployment platform.');
  console.warn('⚠️  The app will try to load them from meta tags at runtime.');
} else {
  console.log('✅ All required environment variables are present.');
}
console.log('📝 Variables:', Object.keys(env).join(', '));
