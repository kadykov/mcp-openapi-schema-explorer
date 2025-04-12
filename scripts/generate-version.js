// scripts/generate-version.js
// Purpose: Writes the release version provided by semantic-release to src/version.ts
// Called by: @semantic-release/exec during the 'prepare' step

import fs from 'fs'; // Use import
import path from 'path'; // Use import
import { fileURLToPath } from 'url'; // Needed to convert import.meta.url

// Get version from the command line argument passed by semantic-release exec
// process is globally available in ESM
const version = process.argv[2];

if (!version) {
  console.error('Error: No version argument provided to generate-version.js!');
  process.exit(1);
}

// Basic check for semantic version format (adjust regex if needed)
if (!/^\d+\.\d+\.\d+(-[\w.-]+)?(\+[\w.-]+)?$/.test(version)) {
  console.error(`Error: Invalid version format received: "${version}"`);
  process.exit(1);
}

const content = `// Auto-generated by scripts/generate-version.js during semantic-release prepare step
// Do not edit this file manually.

export const VERSION = '${version}';
`;

// Derive the directory path in ESM
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Construct the absolute path to src/version.ts
const filePath = path.join(__dirname, '..', 'src', 'version.ts');
const fileDir = path.dirname(filePath);

try {
  // Ensure the src directory exists (though it should)
  if (!fs.existsSync(fileDir)) {
    fs.mkdirSync(fileDir, { recursive: true });
  }
  // Write the version file
  fs.writeFileSync(filePath, content, { encoding: 'utf-8' });
  console.log(`Successfully wrote version ${version} to ${filePath}`);
} catch (error) {
  console.error(`Error writing version file to ${filePath}:`, error);
  process.exit(1);
}
