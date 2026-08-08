/**
 * @mfe-runtime/shell-kit — Slot rendering utilities
 *
 * Implements shell-kit / Slot and critical-error rendering utilities.
 * See openspec/changes/shared-boilerplate-packages/specs/shell-kit/spec.md
 *
 * Renders static templates (not-found, access-denied) into slots and
 * clears slots as needed. All rendering uses cloned <template> content —
 * no dynamic HTML strings — so no XSS risk.
 */

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

export interface SlotRenderers {
  /**
   * Render not-found content into the specified slot.
   * @param slotId - ID of the slot element
   * @param templateId - ID of the not-found template element (defaults to "shell-template-not-found")
   */
  renderNotFound(slotId: string, templateId?: string): void;

  /**
   * Render access-denied content into the specified slot.
   * @param slotId - ID of the slot element
   * @param templateId - ID of the access-denied template element (defaults to "shell-template-access-denied")
   */
  renderAccessDenied(slotId: string, templateId?: string): void;

  /**
   * Clear all content from a slot.
   * @param slotId - ID of the slot element to clear
   */
  clearSlot(slotId: string): void;
}

export function createSlotRenderers(): SlotRenderers {
  return {
    renderNotFound(slotId: string, templateId = "shell-template-not-found"): void {
      const slot = getSlot(slotId);
      if (!slot) return;
      cloneTemplateInto(slot, templateId);
    },

    renderAccessDenied(slotId: string, templateId = "shell-template-access-denied"): void {
      const slot = getSlot(slotId);
      if (!slot) return;
      cloneTemplateInto(slot, templateId);
    },

    clearSlot(slotId: string): void {
      const slot = getSlot(slotId);
      if (slot) slot.innerHTML = "";
    },
  };
}
