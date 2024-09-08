#!/usr/bin/env node

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const TEMPLATE_REPO = 'https://github.com/abdulaimusah/nextjs-custom-template.git';

function runCommand(command) {
  try {
    execSync(command, { stdio: 'inherit' });
  } catch (error) {
    console.error(`Failed to execute ${command}`, error);
    return false;
  }
  return true;
}

function updatePackageJson(projectPath) {
  const packageJsonPath = path.join(projectPath, 'package.json');
  const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));

  const newDependencies = {
    "@rownd/react": "^2.1.0",
    "antd": "^5.20.5",
    "axios": "^1.7.7"
  };

  packageJson.dependencies = { ...packageJson.dependencies, ...newDependencies };

  fs.writeFileSync(packageJsonPath, JSON.stringify(packageJson, null, 2));
  console.log('Updated package.json with new dependencies');
}

function createNextJsApp(appName) {
  const currentDir = process.cwd();
  const projectPath = path.join(currentDir, appName);

  console.log(`Creating a new Next.js app in ${projectPath}`);

  // Clone the template repository
  const cloneCmd = `git clone ${TEMPLATE_REPO} ${appName}`;
  if (!runCommand(cloneCmd)) {
    console.error('Failed to clone the template repository');
    return;
  }

  // Change into the project directory
  process.chdir(projectPath);

  // Remove the .git folder to start fresh
  runCommand('rm -rf .git');

  // Initialize a new git repository
  runCommand('git init');

  // Update package.json
  updatePackageJson(projectPath);

  // Install dependencies
  if (!runCommand('npm install')) {
    console.error('Failed to install dependencies');
    return;
  }

  console.log('Next.js app created and customized successfully!');
  console.log(`To get started, run the following commands:

  cd ${appName}
  npm run dev
  `);
}

// Get the app name from command line arguments
const appName = process.argv[2];

if (!appName) {
  console.error('Please specify the project name:');
  console.error('  npx create-nextjs-custom-app my-app');
  process.exit(1);
}

createNextJsApp(appName);