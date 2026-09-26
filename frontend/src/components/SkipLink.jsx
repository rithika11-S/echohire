export default function SkipLink() {
  return (
    <a
      href="#main-content"
      className="skip-link"
      onClick={() => {
        const main = document.getElementById("main-content");
        if (main) {
          main.tabIndex = -1;
          main.focus();
        }
      }}
    >
      Skip to main content
    </a>
  );
}
