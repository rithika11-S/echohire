/**
 * Arrow key navigation handler for forms and accessible card grids.
 * Allows ArrowUp, ArrowDown, ArrowLeft, ArrowRight keys to move focus between input fields, buttons, and choice cards.
 */
export function handleFormArrowKeys(e) {
  const arrowKeys = ["ArrowDown", "ArrowUp", "ArrowRight", "ArrowLeft"];
  if (!arrowKeys.includes(e.key)) return;

  const target = e.target;
  const isTextArea = target.tagName === "TEXTAREA";
  
  // For textareas, left/right arrow keys allow moving text cursor unless Ctrl/Alt pressed
  if (isTextArea && (e.key === "ArrowLeft" || e.key === "ArrowRight") && !e.ctrlKey) {
    return;
  }

  // Find container
  const container = target.closest("form") || target.closest(".modal-card") || target.closest(".form-card") || document.body;
  if (!container) return;

  const focusables = Array.from(
    container.querySelectorAll(
      "input:not([type='hidden']):not([disabled]), select:not([disabled]), textarea:not([disabled]), button:not([disabled]), [tabindex='0']"
    )
  );

  if (focusables.length === 0) return;

  const currentIndex = focusables.indexOf(target);
  if (currentIndex === -1) return;

  if (e.key === "ArrowDown" || e.key === "ArrowRight") {
    e.preventDefault();
    const nextIndex = (currentIndex + 1) % focusables.length;
    focusables[nextIndex].focus();
  } else if (e.key === "ArrowUp" || e.key === "ArrowLeft") {
    e.preventDefault();
    const prevIndex = (currentIndex - 1 + focusables.length) % focusables.length;
    focusables[prevIndex].focus();
  }
}
