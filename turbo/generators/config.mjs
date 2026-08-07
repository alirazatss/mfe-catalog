// Implements app-scaffolding: MFE generator requirement
// See openspec/changes/mfe-shell-scaffolding/specs/app-scaffolding/spec.md

import { validateName, checkCollision } from "./lib/validation.mjs";
import { assignPort } from "./lib/port-assignment.mjs";
import { printSummary } from "./lib/summary.mjs";
import { wireToShellConfigs, wireToCleanupWorkflow } from "./lib/wire-mfe.mjs";
import { 
  discoverMFEsForShell, 
  generateDevRemotesConfig, 
  generateProdRemotesConfig,
  wireShellToCleanupWorkflow 
} from "./lib/wire-shell.mjs";
import { writeFileSync } from "node:fs";

export default function generator(plop) {
  // MFE Generator
  plop.setGenerator("mfe", {
    description: "Scaffold a new micro-frontend (MFE)",
    prompts: [
      {
        type: "input",
        name: "name",
        message: "MFE short name (lowercase, alphanumeric with hyphens, e.g., 'orders'):",
        validate: (input) => {
          // Implements app-scaffolding: name validation requirement
          const nameValidation = validateName(input);
          if (!nameValidation.valid) {
            return nameValidation.error || "Invalid name";
          }

          // Implements app-scaffolding: collision check requirement
          const collisionCheck = checkCollision(`mfe-${input}`);
          if (!collisionCheck.valid) {
            return collisionCheck.error || "Name already exists";
          }

          return true;
        },
      },
    ],
    actions: (data) => {
      const name = data?.name;
      const packageName = `@mfe-runtime/mfe-${name}`;
      const shortName = `mfe-${name}`;

      // Implements app-scaffolding: port assignment requirement
      const port = assignPort();
      const scope = name.replace(/-([a-z])/g, (_, letter) => letter.toUpperCase());

      return [
        {
          type: "addMany",
          destination: `apps/mfes/${shortName}`,
          base: "templates/mfe",
          templateFiles: "templates/mfe/**/*",
          data: {
            name,
            packageName,
            shortName,
            port,
            scope,
          },
        },
        () => {
          // Implements app-scaffolding: auto-wire requirement
          const basePath = `/${name}`;
          
          // Wire to all shell configs
          const configFiles = wireToShellConfigs(shortName, scope, basePath, port);
          
          // Wire to cleanup workflow
          const workflowFile = wireToCleanupWorkflow(shortName);
          
          const filesModified = [];
          if (configFiles.length > 0) {
            filesModified.push(...configFiles);
          }
          if (workflowFile) {
            filesModified.push(workflowFile);
          }

          // Implements app-scaffolding: run summary requirement
          printSummary({
            type: "mfe",
            name: shortName,
            filesCreated: [
              `apps/mfes/${shortName}/package.json`,
              `apps/mfes/${shortName}/vite.config.ts`,
              `apps/mfes/${shortName}/vitest.config.ts`,
              `apps/mfes/${shortName}/tsconfig.json`,
              `apps/mffes/${shortName}/index.html`,
              `apps/mfes/${shortName}/src/bootstrap.ts`,
              `apps/mfes/${shortName}/src/main.ts`,
              `apps/mfes/${shortName}/src/App.tsx`,
              `apps/mfes/${shortName}/src/App.test.tsx`,
              `apps/mfes/${shortName}/README.md`,
            ],
            filesModified,
            manualSteps: [
              "Run `pnpm install` to install dependencies",
            ],
            metadata: {
              port,
              scope,
              packageName,
            },
          });
          return "MFE scaffolded successfully!";
        },
      ];
    },
  });

  // Shell Generator
  plop.setGenerator("shell", {
    description: "Scaffold a new shell application",
    prompts: [
      {
        type: "input",
        name: "name",
        message: "Shell name (lowercase, alphanumeric with hyphens, e.g., 'ccis'):",
        validate: (input) => {
          const nameValidation = validateName(input);
          if (!nameValidation.valid) {
            return nameValidation.error || "Invalid name";
          }

          const collisionCheck = checkCollision(input, "apps/shells");
          if (!collisionCheck.valid) {
            return collisionCheck.error || "Name already exists";
          }

          return true;
        },
      },
    ],
    actions: (data) => {
      const name = data?.name;
      const titleName = name.charAt(0).toUpperCase() + name.slice(1).replace(/-([a-z])/g, (_, letter) => letter.toUpperCase());

      return [
        {
          type: "addMany",
          destination: `apps/shells/${name}`,
          base: "templates/shell",
          templateFiles: "templates/shell/**/*",
          skipIfExists: true,
          data: {
            name,
            titleName,
          },
        },
        () => {
          // Generate remote configs from discovered MFEs
          const mfes = discoverMFEsForShell();
          const devConfig = generateDevRemotesConfig(mfes);
          const prodConfig = generateProdRemotesConfig(mfes);

          writeFileSync(
            `apps/shells/${name}/public/remotes.config.dev.json`,
            JSON.stringify(devConfig, null, 2) + "\n"
          );
          writeFileSync(
            `apps/shells/${name}/public/remotes.config.prod.json`,
            JSON.stringify(prodConfig, null, 2) + "\n"
          );

          return "Generated remote configs from discovered MFEs";
        },
        {
          type: "add",
          path: `.github/workflows/deploy-${name}.yml`,
          templateFile: "templates/shell-workflow/deploy-shell.yml.hbs",
          data: {
            name: data?.name,
            titleName,
          },
        },
        () => {
          // Wire shell to cleanup workflow
          const workflowFile = wireShellToCleanupWorkflow(name);

          const filesModified = workflowFile ? [workflowFile] : [];

          printSummary({
            type: "shell",
            name,
            filesCreated: [
              `apps/shells/${name}/package.json`,
              `apps/shells/${name}/vite.config.ts`,
              `apps/shells/${name}/vitest.config.ts`,
              `apps/shells/${name}/tsconfig.json`,
              `apps/shells/${name}/index.html`,
              `apps/shells/${name}/src/main.ts`,
              `apps/shells/${name}/public/app-config.json`,
              `apps/shells/${name}/public/remotes.config.dev.json`,
              `apps/shells/${name}/public/remotes.config.prod.json`,
              `.github/workflows/deploy-${name}.yml`,
            ],
            filesModified,
            manualSteps: [
              "Run `pnpm install` to install dependencies",
              `Run \`pnpm turbo run build test --filter=${name}\` to verify`,
              `Run \`tsx scripts/check-shell-size.ts ${name}\` to check bundle size`,
            ],
            metadata: {
              mfesDiscovered: discoverMFEsForShell().length,
            },
          });

          return "Shell scaffolded successfully!";
        },
      ];
    },
  });
}
