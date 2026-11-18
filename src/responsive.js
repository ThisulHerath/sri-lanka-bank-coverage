// Navigation and mobile filter layout are independent of bank/map selection.
export function setupResponsiveLayout() {
  const body = document.body;
  const sidebar = document.querySelector('#sidebar');
  const workspace = document.querySelector('.workspace');
  const toggle = document.querySelector('#sidebar-toggle');
  const close = document.querySelector('#sidebar-close');
  const backdrop = document.querySelector('#sidebar-backdrop');
  const drawerQuery = matchMedia('(max-width: 1100px)');
  const filterQuery = matchMedia('(max-width: 1100px)');
  const controls = document.querySelector('#network-controls');
  const filterToggle = document.querySelector('#filters-toggle');
  let collapsed = false;
  let drawerOpen = false;
  let filtersOpen = false;
  try { collapsed = localStorage.getItem('bank-network-sidebar-collapsed') === 'true'; } catch { /* Optional preference storage. */ }

  function renderNavigation({restoreFocus = false} = {}) {
    const drawer = drawerQuery.matches;
    body.classList.toggle('sidebar-collapsed', !drawer && collapsed);
    body.classList.toggle('navigation-open', drawer && drawerOpen);
    sidebar.inert = drawer && !drawerOpen;
    workspace.inert = drawer && drawerOpen;
    backdrop.hidden = !drawer || !drawerOpen;
    toggle.setAttribute('aria-expanded', String(drawer ? drawerOpen : !collapsed));
    const label = drawer ? 'Open navigation' : collapsed ? 'Expand sidebar' : 'Minimize sidebar';
    toggle.setAttribute('aria-label', label);
    toggle.title = label;
    if (drawer && drawerOpen) {
      sidebar.setAttribute('role','dialog');
      sidebar.setAttribute('aria-modal','true');
      sidebar.setAttribute('aria-label','Main navigation');
      sidebar.removeAttribute('aria-hidden');
      close.focus({preventScroll:true});
    } else {
      sidebar.removeAttribute('role');
      sidebar.removeAttribute('aria-modal');
      if (drawer) sidebar.setAttribute('aria-hidden','true');
      else sidebar.removeAttribute('aria-hidden');
      if (restoreFocus) toggle.focus({preventScroll:true});
    }
  }
  function closeDrawer(restoreFocus = true) {
    drawerOpen = false;
    renderNavigation({restoreFocus});
  }
  toggle.addEventListener('click', () => {
    if (drawerQuery.matches) drawerOpen = !drawerOpen;
    else {
      collapsed = !collapsed;
      try { localStorage.setItem('bank-network-sidebar-collapsed',String(collapsed)); } catch { /* Continue without persistence. */ }
    }
    renderNavigation();
  });
  close.addEventListener('click',()=>closeDrawer());
  backdrop.addEventListener('click',()=>closeDrawer());
  sidebar.querySelector('nav').addEventListener('click',event => {
    const item = event.target.closest('.nav-item');
    if (!item) return;
    // Release the page before the existing data-dialog handler moves focus.
    if (drawerQuery.matches) closeDrawer();
    if (item.matches('a')) {
      sidebar.querySelectorAll('a.nav-item').forEach(link => {
        link.classList.toggle('active',link === item);
        if (link === item) link.setAttribute('aria-current','location');
        else link.removeAttribute('aria-current');
      });
    }
  },true);
  document.addEventListener('keydown',event => {
    if (!drawerQuery.matches || !drawerOpen) return;
    if (event.key === 'Escape') { event.preventDefault(); closeDrawer(); }
    if (event.key !== 'Tab') return;
    const focusable = [...sidebar.querySelectorAll('a[href],button')].filter(el => !el.disabled && el.getClientRects().length);
    const first = focusable[0], last = focusable.at(-1);
    if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
    else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
  });
  drawerQuery.addEventListener('change',()=>{drawerOpen=false;renderNavigation();});

  function renderFilters() {
    controls.hidden = filterQuery.matches && !filtersOpen;
    filterToggle.setAttribute('aria-expanded',String(!filterQuery.matches || filtersOpen));
    filterToggle.querySelector('.filters-toggle-label').textContent = filtersOpen ? 'Hide filters & locations' : 'Filters & locations';
  }
  filterToggle.addEventListener('click',()=>{filtersOpen=!filtersOpen;renderFilters();});
  document.querySelector('#filters-done').addEventListener('click',()=>{
    filtersOpen=false; renderFilters(); filterToggle.focus({preventScroll:true});
    document.querySelector('#network-explorer').scrollIntoView({block:'start',behavior:'instant'});
  });
  filterQuery.addEventListener('change',renderFilters);
  const legendQuery = matchMedia('(max-width: 640px)');
  const legendToggle = document.querySelector('#legend-toggle');
  let legendExpanded = false;
  function renderLegend() {
    const expanded = !legendQuery.matches || legendExpanded;
    document.querySelector('#legend-body').hidden = !expanded;
    legendToggle.setAttribute('aria-expanded',String(expanded));
    body.classList.toggle('map-legend-expanded',expanded);
  }
  legendToggle.addEventListener('click',()=>{legendExpanded=!legendExpanded;renderLegend();});
  legendQuery.addEventListener('change',renderLegend);
  renderNavigation();
  renderFilters();
  renderLegend();
}
