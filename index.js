#!/usr/bin/env node

const { execSync } = require("child_process");
const fs = require("fs");
const path = require("path");

const TEMPLATE_REPO =
  "https://github.com/abdulaimusah/nextjs-custom-template.git";

function runCommand(command) {
  try {
    execSync(command, { stdio: "inherit" });
  } catch (error) {
    console.error(`Failed to execute ${command}`, error);
    return false;
  }
  return true;
}

function updatePackageJson(projectPath) {
  const packageJsonPath = path.join(projectPath, "package.json");
  const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, "utf8"));

  const newDependencies = {
    "@rownd/react": "^2.1.0",
    antd: "^5.20.5",
    axios: "^1.7.7",
  };

  packageJson.dependencies = {
    ...packageJson.dependencies,
    ...newDependencies,
  };

  fs.writeFileSync(packageJsonPath, JSON.stringify(packageJson, null, 2));
  console.log("Updated package.json with new dependencies");
}

function copyTemplateFiles(templatePath, projectPath) {
  const filesToCopy = [
    "src/components/AppWrapper.tsx",
    "src/components/AppLayout.tsx",
    "src/utils/axios.ts",
    "src/utils/authUtils.ts",
    "src/theme/themeConfig.ts",
  ];

  const filesToReplace = ["src/app/layout.tsx", "src/app/page.tsx"];

  filesToCopy.forEach((file) => {
    const sourcePath = path.join(templatePath, file);
    const destPath = path.join(projectPath, file);
    fs.mkdirSync(path.dirname(destPath), { recursive: true });
    fs.copyFileSync(sourcePath, destPath);
    console.log(`Copied: ${file}`);
  });

  filesToReplace.forEach((file) => {
    const sourcePath = path.join(templatePath, file);
    const destPath = path.join(projectPath, file);
    fs.copyFileSync(sourcePath, destPath);
    console.log(`Replaced: ${file}`);
  });
}

function createNextJsApp(appName) {
  const currentDir = process.cwd();
  const projectPath = path.join(currentDir, appName);

  console.log(`Creating a new Next.js app in ${projectPath}`);

  // Create Next.js app using create-next-app with automatic prompt responses
  const createNextAppCmd = `npx create-next-app@latest ${appName} --typescript --eslint --tailwind --src-dir --app --import-alias @/* --use-npm`;
  if (!runCommand(createNextAppCmd)) {
    console.error("Failed to create Next.js app");
    return;
  }

  // Change into the project directory
  process.chdir(projectPath);

  // Clone the template repository to a temporary directory
  const tempDir = path.join(currentDir, `${appName}-template`);
  const cloneCmd = `git clone ${TEMPLATE_REPO} ${tempDir}`;
  if (!runCommand(cloneCmd)) {
    console.error("Failed to clone the template repository");
    return;
  }

  // Copy template files to the project
  copyTemplateFiles(tempDir, projectPath);

  // Remove the temporary template directory
  fs.rmSync(tempDir, { recursive: true, force: true });

  // Update package.json
  updatePackageJson(projectPath);

  // Install dependencies
  if (!runCommand("npm install")) {
    console.error("Failed to install dependencies");
    return;
  }

  console.log("Next.js app created and customized successfully!");
  console.log(`To get started, run the following commands:

  cd ${appName}
  npm run dev
  `);
}

// Get the app name from command line arguments
const appName = process.argv[2];

if (!appName) {
  console.error("Please specify the project name:");
  console.error("  npx create-nextjs-custom-app my-app");
  process.exit(1);
}

createNextJsApp(appName);
