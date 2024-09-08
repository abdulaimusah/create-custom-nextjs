#!/usr/bin/env node

const { execSync } = require("child_process");
const fs = require("fs");
const path = require("path");
const readline = require("readline");

const TEMPLATE_REPO =
  "https://github.com/abdulaimusah/nextjs-custom-template.git";

function runCommand(command) {
  try {
    execSync(command, { stdio: "inherit" });
    return true;
  } catch (error) {
    console.error(`Failed to execute ${command}`, error);
    return false;
  }
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

async function promptForFeatures() {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  const features = {
    testing: await askQuestion(rl, "Include automated testing setup? (y/n) "),
    docker: await askQuestion(rl, "Include Docker integration? (y/n) "),
    stateManagement: await askQuestion(
      rl,
      "Set up Redux for state management? (y/n) "
    ),
    deploymentScripts: await askQuestion(
      rl,
      "Include deployment scripts? (y/n) "
    ),
    environmentManagement: await askQuestion(
      rl,
      "Set up environment management? (y/n) "
    ),
    performanceMonitoring: await askQuestion(
      rl,
      "Include performance monitoring? (y/n) "
    ),
  };

  rl.close();
  return features;
}

function askQuestion(rl, question) {
  return new Promise((resolve) => {
    rl.question(question, (answer) => {
      resolve(answer.toLowerCase() === "y");
    });
  });
}

async function createNextJsApp(appName) {
  const currentDir = process.cwd();
  const projectPath = path.join(currentDir, appName);

  console.log(`Creating a new Next.js app in ${projectPath}`);

  const createNextAppCmd = `npx create-next-app@latest ${appName} --typescript --eslint --tailwind --src-dir --app --import-alias @/* --use-npm`;
  if (!runCommand(createNextAppCmd)) {
    console.error("Failed to create Next.js app");
    return;
  }

  process.chdir(projectPath);

  const features = await promptForFeatures();

  const tempDir = path.join(currentDir, `${appName}-template`);
  const cloneCmd = `git clone ${TEMPLATE_REPO} ${tempDir}`;
  if (!runCommand(cloneCmd)) {
    console.error("Failed to clone the template repository");
    return;
  }

  copyTemplateFiles(tempDir, projectPath);

  fs.rmSync(tempDir, { recursive: true, force: true });

  updatePackageJson(projectPath);

  if (features.testing) await installTestingSetup();
  if (features.docker) await installDockerSetup();
  if (features.stateManagement) await installStateManagement();
  if (features.deploymentScripts) await installDeploymentScripts();
  if (features.environmentManagement) await setupEnvironmentManagement();
  if (features.performanceMonitoring) await setupPerformanceMonitoring();

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

async function installTestingSetup() {
  await runCommand(
    "npm install --save-dev jest@29.7.0 @testing-library/react@14.2.1 @testing-library/jest-dom@6.4.2 @types/jest@29.5.12"
  );

  const jestConfig = `
const nextJest = require('next/jest')

const createJestConfig = nextJest({
  dir: './',
})

const customJestConfig = {
  setupFilesAfterEnv: ['<rootDir>/jest.setup.js'],
  testEnvironment: 'jest-environment-jsdom',
}

module.exports = createJestConfig(customJestConfig)
`;
  fs.writeFileSync("jest.config.js", jestConfig);

  const jestSetup = `
import '@testing-library/jest-dom'
`;
  fs.writeFileSync("jest.setup.js", jestSetup);

  const packageJson = JSON.parse(fs.readFileSync("package.json", "utf8"));
  packageJson.scripts.test = "jest";
  fs.writeFileSync("package.json", JSON.stringify(packageJson, null, 2));

  console.log("Automated testing setup completed with latest versions");
}

async function installDockerSetup() {
  const dockerfile = `
FROM node:20-alpine AS base

# Install dependencies only when needed
FROM base AS deps
WORKDIR /app

# Install dependencies based on the preferred package manager
COPY package.json yarn.lock* package-lock.json* pnpm-lock.yaml* ./
RUN \\
  if [ -f yarn.lock ]; then yarn --frozen-lockfile; \\
  elif [ -f package-lock.json ]; then npm ci; \\
  elif [ -f pnpm-lock.yaml ]; then yarn global add pnpm && pnpm i --frozen-lockfile; \\
  else echo "Lockfile not found." && exit 1; \\
  fi

# Rebuild the source code only when needed
FROM base AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Next.js collects completely anonymous telemetry data about general usage.
# Learn more here: https://nextjs.org/telemetry
# Uncomment the following line in case you want to disable telemetry during the build.
# ENV NEXT_TELEMETRY_DISABLED 1

RUN npm run build

# Production image, copy all the files and run next
FROM base AS runner
WORKDIR /app

ENV NODE_ENV production
# Uncomment the following line in case you want to disable telemetry during runtime.
# ENV NEXT_TELEMETRY_DISABLED 1

RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

COPY --from=builder /app/public ./public

# Automatically leverage output traces to reduce image size
# https://nextjs.org/docs/advanced-features/output-file-tracing
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

USER nextjs

EXPOSE 3000

ENV PORT 3000

CMD ["node", "server.js"]
`;
  fs.writeFileSync("Dockerfile", dockerfile);

  const dockerCompose = `
version: '3'
services:
  web:
    build:
      context: .
      dockerfile: Dockerfile
    ports:
      - "3000:3000"
    environment:
      - NODE_ENV=production
`;
  fs.writeFileSync("docker-compose.yml", dockerCompose);

  console.log("Docker setup completed with latest best practices");
}

async function installStateManagement() {
  await runCommand("npm install @reduxjs/toolkit@2.2.1 react-redux@9.1.0");

  const storeSetup = `
import { configureStore } from '@reduxjs/toolkit';
import { TypedUseSelectorHook, useDispatch, useSelector } from 'react-redux';

export const store = configureStore({
  reducer: {
    // Add your reducers here
  },
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;

// Use throughout your app instead of plain 'useDispatch' and 'useSelector'
export const useAppDispatch: () => AppDispatch = useDispatch;
export const useAppSelector: TypedUseSelectorHook<RootState> = useSelector;
`;
  fs.mkdirSync("src/store", { recursive: true });
  fs.writeFileSync("src/store/index.ts", storeSetup);

  console.log("State management (Redux) setup completed with latest version");
}

async function installDeploymentScripts() {
  const packageJson = JSON.parse(fs.readFileSync("package.json", "utf8"));
  packageJson.scripts.build = "next build";
  packageJson.scripts["deploy:vercel"] = "vercel";
  fs.writeFileSync("package.json", JSON.stringify(packageJson, null, 2));

  console.log(
    "Deployment scripts added to package.json (updated for Next.js 14+)"
  );
}

async function setupEnvironmentManagement() {
  const envExample = `
NEXT_PUBLIC_API_URL=http://localhost:3000/api
`;
  fs.writeFileSync(".env.example", envExample);
  fs.writeFileSync(".env.development", envExample);
  fs.writeFileSync(".env.production", envExample);

  fs.appendFileSync(".gitignore", "\n.env\n");

  console.log("Environment management setup completed");
}

async function setupPerformanceMonitoring() {
  await runCommand("npm install --save-dev @next/bundle-analyzer@14.2.0");

  const nextConfig = `
const withBundleAnalyzer = require('@next/bundle-analyzer')({
  enabled: process.env.ANALYZE === 'true',
})

module.exports = withBundleAnalyzer({
  // Your Next.js config
})
`;
  fs.writeFileSync("next.config.js", nextConfig);

  const packageJson = JSON.parse(fs.readFileSync("package.json", "utf8"));
  packageJson.scripts.analyze = "ANALYZE=true next build";
  fs.writeFileSync("package.json", JSON.stringify(packageJson, null, 2));

  console.log(
    "Performance monitoring setup completed with @next/bundle-analyzer"
  );
}

const appName = process.argv[2];

if (!appName) {
  console.error("Please specify the project name:");
  console.error("  npx create-nextjs-custom-app my-app");
  process.exit(1);
}

createNextJsApp(appName);
