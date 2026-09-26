/**
 * Arrow key navigation handler for forms and accessible card grids.
 * Allows ArrowUp, ArrowDown, ArrowLeft, ArrowRight keys to move focus between input fields, buttons, and choice cards.
 */
export function handleFormArrowKeys(e) {
  const navKeys = ["ArrowDown", "ArrowUp", "ArrowRight", "ArrowLeft", "Enter"];
  if (!navKeys.includes(e.key)) return;

  const target = e.target;
  const isTextArea = target.tagName === "TEXTAREA";
  const isButton = target.tagName === "BUTTON";

  // For textareas, Enter creates newlines and left/right moves text cursor unless Ctrl/Alt pressed
  if (isTextArea && (e.key === "Enter" || ((e.key === "ArrowLeft" || e.key === "ArrowRight") && !e.ctrlKey))) {
    return;
  }

  // For buttons, Enter should trigger normal click action
  if (isButton && e.key === "Enter") {
    return;
  }

  // Find container
  const container = target.closest("form") || target.closest(".modal-card") || target.closest(".form-card") || document.body;
  if (!container) return;

  const focusables = Array.from(
    container.querySelectorAll(
      "input:not([type='hidden']):not([disabled]), select:not([disabled]), textarea:not([disabled]), button:not([disabled]), [tabindex='0']:not(div):not(section)"
    )
  );

  if (focusables.length === 0) return;

  const currentIndex = focusables.indexOf(target);
  if (currentIndex === -1) return;

  if (e.key === "ArrowDown" || e.key === "ArrowRight" || e.key === "Enter") {
    e.preventDefault();
    const nextIndex = (currentIndex + 1) % focusables.length;
    const nextEl = focusables[nextIndex];
    if (nextEl) {
      nextEl.focus();
      if (nextEl.scrollIntoView) {
        nextEl.scrollIntoView({ behavior: "smooth", block: "center" });
      }
    }
  } else if (e.key === "ArrowUp" || e.key === "ArrowLeft") {
    e.preventDefault();
    const prevIndex = (currentIndex - 1 + focusables.length) % focusables.length;
    const prevEl = focusables[prevIndex];
    if (prevEl) {
      prevEl.focus();
      if (prevEl.scrollIntoView) {
        prevEl.scrollIntoView({ behavior: "smooth", block: "center" });
      }
    }
  }
}
