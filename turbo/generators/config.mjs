// Implements app-scaffolding: MFE generator requirement
// See openspec/changes/mfe-shell-scaffolding/specs/app-scaffolding/spec.md

import { validateName, checkCollision } from "./lib/validation.mjs";
import { assignPort } from "./lib/port-assignment.mjs";
import { printSummary } from "./lib/summary.mjs";

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
            filesModified: [],
            manualSteps: [
              "Run `pnpm install` to install dependencies",
              "Add the MFE to shell remote configs (automated in next task group)",
              "Update cleanup-previews.yml fallback list (automated in next task group)",
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
}
