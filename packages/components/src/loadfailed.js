// Shows and hides a LoadFailed and the content it stands in for. `hide` is what goes away while it
// shows: a page's #content, or on a map page the panels over the map ([data-content]), so the
// title and the map stay.

const CONTENT = '#content, [data-content]';

export const showFailed = ({ id = 'failed', hide = CONTENT } = {}) => {
  const el = document.getElementById(id);
  // Try again opens this very address, with its query (a year, a filter), not just the page.
  el.querySelector('a')?.setAttribute('href', location.href);
  el.hidden = false;
  document.querySelectorAll(hide).forEach((el) => (el.hidden = true));
};

export const hideFailed = ({ id = 'failed', hide = CONTENT } = {}) => {
  document.getElementById(id).hidden = true;
  document.querySelectorAll(hide).forEach((el) => (el.hidden = false));
};
