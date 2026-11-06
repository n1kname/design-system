// Opens a SidePanel from script, for detail read on demand (a workout from a list, say). The panel
// opens at once with its title and a quiet loading state; then shows what arrived, or says it
// failed, with a way to try again. `load` returns a promise of HTML, escaped by the caller.
//
//     import { openPanel } from '@n1kname/components/sidepanel.js';
//     row.addEventListener('click', () =>
//       openPanel('workout', { title: 'Cycling', load: () => fetch(url).then((r) => r.json()).then(render) }));
//
// What the panel shows goes in its [data-panel-body] if it has one, else in its body.
export const openPanel = (id, { title, load, failed = 'This did not load.', retry = 'Try again' }) => {
  const panel = document.getElementById(id);
  const body = panel.querySelector('[data-panel-body]') ?? panel.querySelector('.body');
  if (title !== undefined) document.getElementById(`${id}-title`).textContent = title;
  const run = () => {
    panel.dataset.state = 'loading';
    body.innerHTML = '<div class="panel-loading" role="status" aria-label="Loading"><span></span><span></span><span></span></div>';
    Promise.resolve()
      .then(load)
      .then((html) => {
        body.innerHTML = `<div class="panel-arrived">${html}</div>`;
        panel.dataset.state = 'ready';
      })
      .catch(() => {
        body.innerHTML = `<div class="panel-arrived panel-failed" role="alert"><p>${failed}</p><button type="button" data-panel-retry>${retry}</button></div>`;
        body.querySelector('[data-panel-retry]').addEventListener('click', run);
        panel.dataset.state = 'failed';
      });
  };
  if (!panel.open) panel.showModal();
  panel.scrollTop = 0;
  run();
};
