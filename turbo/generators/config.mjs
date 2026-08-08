// Implements app-scaffolding: MFE and shell generator requirements
// See openspec/changes/mfe-shell-scaffolding/specs/app-scaffolding/spec.md

import { validateName, checkCollision } from "./lib/validation.mjs";
import { assignPort } from "./lib/port-assignment.mjs";
import { printSummary } from "./lib/summary.mjs";
import { wireToShellConfigs, wireToCleanupWorkflow } from "./lib/wire-mfe.mjs";
import {
  discoverMFEsForShell,
  generateDevRemotesConfig,
  generateProdRemotesConfig,
  wireShellToCleanupWorkflow,
} from "./lib/wire-shell.mjs";
import { writeFileSync, mkdirSync } from "node:fs";
import { resolve, join } from "node:path";

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
            manualSteps: ["Run `pnpm install` to install dependencies"],
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
    description: "Scaffold a new shell (host application)",
    prompts: [
      {
        type: "input",
        name: "name",
        message: "Shell name (lowercase, alphanumeric with hyphens, e.g., 'ccis'):",
        validate: (input) => {
          const nameValidation = validateName(input);
          if (!nameValidation.valid) return nameValidation.error || "Invalid name";
          const collisionCheck = checkCollision(input);
          if (!collisionCheck.valid) return collisionCheck.error || "Name already exists";
          return true;
        },
      },
    ],
    actions: (data) => {
      const name = data?.name;

      return [
        // Scaffold shell files from template
        {
          type: "addMany",
          destination: `apps/shells/{{name}}`,
          base: "templates/shell",
          templateFiles: "templates/shell/**/*",
          data: { name },
        },
        // Scaffold the thin caller workflow
        {
          type: "add",
          path: `.github/workflows/deploy-{{name}}.yml`,
          templateFile: "templates/shell-workflow/deploy-shell.yml.hbs",
          data: { name },
        },
        () => {
          const workspaceRoot = process.cwd();
          const shellDir = resolve(workspaceRoot, `apps/shells/${name}`);
          const publicDir = join(shellDir, "public");

          // Pre-populate remotes configs with all discovered MFEs
          mkdirSync(publicDir, { recursive: true });
          const mfes = discoverMFEsForShell();
          writeFileSync(
            join(publicDir, "remotes.config.dev.json"),
            JSON.stringify(generateDevRemotesConfig(mfes), null, 2) + "\n",
            "utf-8",
          );
          writeFileSync(
            join(publicDir, "remotes.config.prod.json"),
            JSON.stringify(generateProdRemotesConfig(mfes), null, 2) + "\n",
            "utf-8",
          );

          // Wire into cleanup-previews.yml shell fallback list
          const workflowFile = wireShellToCleanupWorkflow(name);

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
            filesModified: workflowFile ? [workflowFile] : [],
            manualSteps: [
              "Run `pnpm install` to install dependencies",
              `Add AZURE vars for shell '${name}' to GitHub Actions environment 'dev'`,
              `Cut first prod tag '${name}-v0.1.0' from main once the shell is ready`,
            ],
            metadata: { name },
          });
          return "Shell scaffolded successfully!";
        },
      ];
    },
  });
}
