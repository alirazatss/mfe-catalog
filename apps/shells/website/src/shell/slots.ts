/**
 * Thin Shell — slot management helpers.
 *
 * Renders static templates (not-found, access-denied) into main-slot and
 * clears slots as needed. All rendering uses cloned <template> content —
 * no dynamic HTML strings — so no XSS risk.
 */

const NOT_FOUND_TEMPLATE_ID = "shell-template-not-found";
const ACCESS_DENIED_TEMPLATE_ID = "shell-template-access-denied";

function getSlot(slotId: string): HTMLElement | null {
  return document.getElementById(slotId);
}

function cloneTemplateInto(slot: HTMLElement, templateId: string): void {
  const template = document.getElementById(templateId) as HTMLTemplateElement | null;
  slot.innerHTML = "";
  if (template?.content) {
    slot.appendChild(template.content.cloneNode(true));
  }
}

export function renderNotFoundIntoMain(): void {
  const slot = getSlot("main-slot");
  if (!slot) return;
  cloneTemplateInto(slot, NOT_FOUND_TEMPLATE_ID);
}

export function renderAccessDeniedIntoMain(): void {
  const slot = getSlot("main-slot");
  if (!slot) return;
  cloneTemplateInto(slot, ACCESS_DENIED_TEMPLATE_ID);
}

export function clearSlot(slotId: string): void {
  const slot = getSlot(slotId);
  if (slot) slot.innerHTML = "";
}
