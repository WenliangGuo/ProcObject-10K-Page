// Inline SVG icons (Font Awesome 5 Free paths, CC BY 4.0) used by the interactive widgets.
window.PROC_ICONS = { play: '<svg class="ico" viewBox="0 0 448 512" aria-hidden="true" focusable="false"><path fill="currentColor" d="M424.4 214.7L72.4 6.6C43.8-10.3 0 6.1 0 47.9V464c0 37.5 40.7 60.1 72.4 41.3l352-208c31.4-18.5 31.5-64.1 0-82.6z"/></svg>', pause: '<svg class="ico" viewBox="0 0 448 512" aria-hidden="true" focusable="false"><path fill="currentColor" d="M144 479H48c-26.5 0-48-21.5-48-48V79c0-26.5 21.5-48 48-48h96c26.5 0 48 21.5 48 48v352c0 26.5-21.5 48-48 48zm304-48V79c0-26.5-21.5-48-48-48h-96c-26.5 0-48 21.5-48 48v352c0 26.5 21.5 48 48 48h96c26.5 0 48-21.5 48-48z"/></svg>' };
// Navbar burger, BibTeX copy button, and scroll cues on tables that overflow.
document.addEventListener('DOMContentLoaded', () => {
  document.querySelectorAll('.navbar-burger').forEach((b) => {
    b.addEventListener('click', () => {
      const target = document.getElementById(b.dataset.target);
      b.classList.toggle('is-active');
      b.setAttribute('aria-expanded', b.classList.contains('is-active') ? 'true' : 'false');
      if (target) target.classList.toggle('is-active');
    });
  });
  document.querySelectorAll('#navbarMain .navbar-item').forEach((a) => {
    a.addEventListener('click', () => {
      document.querySelectorAll('.navbar-burger, #navbarMain').forEach((el) => el.classList.remove('is-active'));
      document.querySelectorAll('.navbar-burger').forEach((el) => el.setAttribute('aria-expanded', 'false'));
    });
  });

  const copyBtn = document.getElementById('copy-citation-btn');
  const citationText = document.getElementById('citation-bibtex');
  if (copyBtn && citationText) {
    copyBtn.addEventListener('click', async () => {
      const original = copyBtn.textContent;
      try {
        await navigator.clipboard.writeText(citationText.textContent);
        copyBtn.textContent = 'Copied';
      } catch (_) {
        copyBtn.textContent = 'Copy failed';
      }
      setTimeout(() => { copyBtn.textContent = original; }, 1200);
    });
  }

  const markOverflow = () => {
    document.querySelectorAll('.table-wrap').forEach((w) => {
      w.classList.toggle('overflows', w.scrollWidth > w.clientWidth + 2);
    });
  };
  markOverflow();
  window.addEventListener('resize', markOverflow);
  document.querySelectorAll('details').forEach((d) => d.addEventListener('toggle', markOverflow));
});
