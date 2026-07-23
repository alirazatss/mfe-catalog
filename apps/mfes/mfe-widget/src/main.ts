/**
 * MFE Widget - Main Entry Point
 *
 * The federated entry imports bootstrap.ts without executing this file.
 */

import { bootstrap, mount } from "./bootstrap.js";

const container = document.getElementById("app");
if (container) {
  const props = { container, basePath: "/" };
  bootstrap()
    .then(() => mount(props))
    .catch((error) => console.error("[MFE-Widget] Bootstrap error:", error));
}
