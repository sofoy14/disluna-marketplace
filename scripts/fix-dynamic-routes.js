#!/usr/bin/env node
/**
 * Script to add 'export const dynamic' to all API routes that use cookies or request
 */

const fs = require('fs');
const path = require('path');

const API_DIR = path.join(process.cwd(), 'app', 'api');

function findRouteFiles(dir, files = []) {
  const items = fs.readdirSync(dir);
  
  for (const item of items) {
    const fullPath = path.join(dir, item);
    const stat = fs.statSync(fullPath);
    
    if (stat.isDirectory()) {
      findRouteFiles(fullPath, files);
    } else if (item === 'route.ts') {
      files.push(fullPath);
    }
  }
  
  return files;
}

function needsDynamic(content) {
  // Check if already has dynamic export
  if (content.includes('export const dynamic')) {
    return false;
  }
  
  // Check if uses cookies, headers, or request.url
  const needsDynamicPatterns = [
    /cookies\(\)/,
    /headers\(\)/,
    /request\.url/,
    /request\.headers/,
    /createClient\(/,
    /getServerProfile/,
    /getSession/,
    /getSupabaseServer/
  ];
  
  return needsDynamicPatterns.some(pattern => pattern.test(content));
}

function addDynamicExport(filePath) {
  let content = fs.readFileSync(filePath, 'utf8');
  
  if (!needsDynamic(content)) {
    return false;
  }
  
  // Add dynamic export at the beginning
  const lines = content.split('\n');
  
  // Find the first import or the beginning
  let insertIndex = 0;
  for (let i = 0; i < lines.length; i++) {
    if (lines[i].trim().startsWith('import ')) {
      insertIndex = i;
      break;
    }
  }
  
  // Insert the dynamic export before imports
  lines.splice(insertIndex, 0, "export const dynamic = 'force-dynamic'", '');
  
  fs.writeFileSync(filePath, lines.join('\n'), 'utf8');
  console.log(`✅ Fixed: ${filePath}`);
  return true;
}

// Main
console.log('🔧 Fixing dynamic API routes...\n');

const routeFiles = findRouteFiles(API_DIR);
let fixedCount = 0;

for (const file of routeFiles) {
  if (addDynamicExport(file)) {
    fixedCount++;
  }
}

console.log(`\n✅ Fixed ${fixedCount} routes`);
console.log(`📊 Total routes checked: ${routeFiles.length}`);
