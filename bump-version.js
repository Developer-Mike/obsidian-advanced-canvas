// Bump version script
// Usage: node bump-version.js [patch|minor|major]
// Before doing anything, it asks the user for confirmation by displaying the current version and the new version.
// This script updates the version in the manifest.json file.
// Additionally, it runs `git add manifest.json` and `git commit -m "Bump version <oldVersion> -> <newVersion>"`.
// After that, it makes a git tag with the new version and pushes the changes to the remote repository using `git push`.
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');
const prompt = require('prompt-sync')();

// Get the current version from the manifest.json file
const manifestPath = path.join(__dirname, 'manifest.json');
const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));

const versionType = process.argv[2];
if (!['patch', 'minor', 'major'].includes(versionType)) {
  console.error('Usage: node bump-version.js [patch|minor|major]');
  process.exit(1);
}

// If git branch is not main, exit
const currentBranch = execSync('git rev-parse --abbrev-ref HEAD').toString().trim();
if (currentBranch !== 'main') {
  console.error('You must be on the main branch to bump the version.');
  process.exit(1);
}

const versionParts = manifest.version.split('.').map(Number);
if (versionType === 'patch') {
  versionParts[2] += 1; // Increment patch version
}
else if (versionType === 'minor') {
  versionParts[1] += 1; // Increment minor version
  versionParts[2] = 0; // Reset patch version
}
else if (versionType === 'major') {
  versionParts[0] += 1; // Increment major version
  versionParts[1] = 0; // Reset minor version
  versionParts[2] = 0; // Reset patch version
}
const newVersion = versionParts.join('.');

console.log(`Version will be bumped from ${oldVersion} to ${newVersion}`);
const confirmation = prompt('Do you want to proceed? (yes/no): ').trim().toLowerCase();
if (confirmation !== 'yes') {
  console.log('Version bump cancelled.');
  process.exit(0);
}

// Update obsidian/manifest.json
manifest.version = newVersion;
fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2), 'utf8');
console.log(`Updated version in manifest.json to ${newVersion}`);

// Git operations
execSync(`git add ${versionFilePath} ${manifestPath}`, { stdio: 'inherit' });
execSync(`git commit -m "Bump version ${oldVersion} -> ${newVersion}"`, { stdio: 'inherit' });
console.log(`Committed changes with message: "Bump version ${oldVersion} -> ${newVersion}"`);

// Create git tag
execSync(`git tag ${newVersion}`, { stdio: 'inherit' });
console.log(`Created tag ${newVersion}`);

// Push changes and tags to remote
execSync('git push', { stdio: 'inherit' });
execSync('git push --tags', { stdio: 'inherit' });
console.log('Pushed changes to remote repository');
