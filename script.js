/* ════════════════════════════════════════════════════
   FinSpace — script.js
   Features: Transactions, Wallets, Smart Insights,
             Saving Goals, Budget, Analytics, Charts
   ════════════════════════════════════════════════════ */
'use strict';

const SK = { TXN:'FinSpace_txns', BUDGETS:'FinSpace_budgets', WALLETS:'FinSpace_wallets', GOALS:'FinSpace_goals', THEME:'FinSpace_theme' };

const CATS = {
  expense: [
    { id:'food',          label:'Food & Dining',    icon:'🍔', color:'#ff7043' },
    { id:'transport',     label:'Transport',         icon:'🚗', color:'#42a5f5' },
    { id:'shopping',      label:'Shopping',          icon:'🛍️', color:'#ec407a' },
    { id:'bills',         label:'Bills & Utilities', icon:'⚡', color:'#ffa726' },
    { id:'health',        label:'Health',            icon:'💊', color:'#66bb6a' },
    { id:'entertainment', label:'Entertainment',     icon:'🎬', color:'#ab47bc' },
    { id:'education',     label:'Education',         icon:'📚', color:'#26c6da' },
    { id:'travel',        label:'Travel',            icon:'✈️', color:'#5c6bc0' },
    { id:'rent',          label:'Rent & Housing',    icon:'🏠', color:'#8d6e63' },
    { id:'emi',           label:'EMI / Loan',        icon:'🏦', color:'#ef5350' },
    { id:'other_exp',     label:'Other',             icon:'📌', color:'#78909c' },
  ],
  income: [
    { id:'salary',     label:'Salary',       icon:'💼', color:'#22d3a0' },
    { id:'freelance',  label:'Freelance',    icon:'💻', color:'#26c6da' },
    { id:'investment', label:'Investment',   icon:'📈', color:'#9ccc65' },
    { id:'business',   label:'Business',     icon:'🏢', color:'#ffa726' },
    { id:'gift',       label:'Gift',         icon:'🎁', color:'#ec407a' },
    { id:'other_inc',  label:'Other Income', icon:'💰', color:'#78909c' },
  ],
};
const ALL_CATS = [...CATS.expense, ...CATS.income];

const S = {
  txns:[], budgets:[], wallets:[], goals:[],
  view:'dashboard',
  editTxnId:null, editWalletId:null, editGoalId:null, depositGoalId:null,
  txnType:'expense',
  analyticsMonth: new Date(),
  charts:{},
  filters:{ q:'', type:'', cat:'', month:'' },
};

const load = (key, fallback=[]) => { try { return JSON.parse(localStorage.getItem(key)) ?? fallback; } catch { return fallback; } };
const save = (key, val) => { try { localStorage.setItem(key, JSON.stringify(val)); } catch(e) { console.warn(e); } };

/* ════ BOOTSTRAP ════ */
document.addEventListener('DOMContentLoaded', () => {
  S.txns    = load(SK.TXN,     []);
  S.budgets = load(SK.BUDGETS, []);
  S.wallets = load(SK.WALLETS, makeDefaultWallets());
  S.goals   = load(SK.GOALS,   []);
  initTheme();
  bindAllEvents();
  populateStaticSelects();
  setDefaultDate();
  renderAll();
});

function makeDefaultWallets() {
  return [
    { id:uid(), name:'Cash Wallet',     icon:'💵', color:'#2563EB', balance:5250 },
    { id:uid(), name:'HDFC Bank',       icon:'🏦', color:'#3B82F6', balance:85000 },
    { id:uid(), name:'Savings Account', icon:'💳', color:'#22d3a0', balance:150000 },
    { id:uid(), name:'GPay / UPI',      icon:'📱', color:'#f0a830', balance:12400 },
  ];
}

/* ════ THEME ════ */
function initTheme() {
  const saved = localStorage.getItem(SK.THEME);
  const sysDark = window.matchMedia('(prefers-color-scheme:dark)').matches;
  applyTheme(saved ?? (sysDark ? 'dark' : 'light'));
}
function applyTheme(t) {
  document.documentElement.setAttribute('data-theme', t);
  const ico = document.getElementById('themeIcoWrap');
  const lbl = document.getElementById('themeBtnLabel');
  if (ico) ico.textContent = t === 'dark' ? '◑' : '○';
  if (lbl) lbl.textContent = t === 'dark' ? 'Light Mode' : 'Dark Mode';
  localStorage.setItem(SK.THEME, t);
}
function toggleTheme() {
  applyTheme(document.documentElement.getAttribute('data-theme') === 'dark' ? 'light' : 'dark');
  setTimeout(renderAllCharts, 60);
}

/* ════ EVENTS ════ */
function bindAllEvents() {
  document.getElementById('themeToggleBtn').onclick = toggleTheme;

  const sidebar  = document.getElementById('sidebar');
  const backdrop = document.getElementById('sidebarBackdrop');
  const hamBtn   = document.getElementById('hamburgerBtn');

  function openSidebar() {
    sidebar.classList.add('sidebar-open');
    backdrop.classList.add('visible');
    hamBtn.classList.add('is-open');
    hamBtn.setAttribute('aria-expanded','true');
    document.body.style.overflow = 'hidden';
  }
  function closeSidebar() {
    sidebar.classList.remove('sidebar-open');
    backdrop.classList.remove('visible');
    hamBtn.classList.remove('is-open');
    hamBtn.setAttribute('aria-expanded','false');
    document.body.style.overflow = '';
  }

  hamBtn.onclick = openSidebar;
  document.getElementById('sidebarCloseBtn').onclick = closeSidebar;
  backdrop.onclick = closeSidebar;

  /* Swipe left on sidebar to close */
  let tx = 0;
  sidebar.addEventListener('touchstart', e => { tx = e.touches[0].clientX; }, { passive:true });
  sidebar.addEventListener('touchend',   e => { if (tx - e.changedTouches[0].clientX > 60) closeSidebar(); }, { passive:true });

  document.querySelectorAll('.nav-btn').forEach(btn =>
    btn.addEventListener('click', () => { switchView(btn.dataset.view); closeSidebar(); })
  );
  document.querySelectorAll('[data-view]').forEach(el => {
    if (el.classList.contains('nav-btn')) return;
    el.addEventListener('click', () => switchView(el.dataset.view));
  });

  /* Transaction modal */
  document.getElementById('openAddTxnBtn').onclick = openAddTxnModal;
  document.getElementById('emptyAddTxnBtn')?.addEventListener('click', openAddTxnModal);
  document.getElementById('closeTxnModalBtn').onclick = closeTxnModal;
  document.getElementById('cancelTxnBtn').onclick     = closeTxnModal;
  document.getElementById('txnModal').addEventListener('click', e => { if (e.target === e.currentTarget) closeTxnModal(); });
  document.querySelectorAll('.type-switch-btn').forEach(btn => btn.onclick = () => {
    document.querySelectorAll('.type-switch-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active'); S.txnType = btn.dataset.type; populateTxnCategories(S.txnType);
  });
  document.getElementById('saveTxnBtn').onclick = saveTxn;

  /* Budget modal */
  document.getElementById('openBudgetModalBtn').onclick = openBudgetModal;
  document.getElementById('emptyBudgetBtn')?.addEventListener('click', openBudgetModal);
  document.getElementById('closeBudgetModalBtn').onclick = closeBudgetModal;
  document.getElementById('cancelBudgetBtn').onclick     = closeBudgetModal;
  document.getElementById('budgetModal').addEventListener('click', e => { if (e.target === e.currentTarget) closeBudgetModal(); });
  document.getElementById('saveBudgetBtn').onclick = saveBudget;

  /* Wallet modal */
  document.getElementById('closeWalletModalBtn').onclick = closeWalletModal;
  document.getElementById('cancelWalletBtn').onclick     = closeWalletModal;
  document.getElementById('walletModal').addEventListener('click', e => { if (e.target === e.currentTarget) closeWalletModal(); });
  document.getElementById('saveWalletBtn').onclick = saveWallet;
  bindPickerGroup('#walletEmojiPicker','.ep-opt');
  bindPickerGroup('#walletColorPicker','.cp-opt');

  /* Goal modal */
  document.getElementById('openGoalModalBtn').onclick = openGoalModal;
  document.getElementById('emptyGoalBtn')?.addEventListener('click', openGoalModal);
  document.getElementById('closeGoalModalBtn').onclick = closeGoalModal;
  document.getElementById('cancelGoalBtn').onclick     = closeGoalModal;
  document.getElementById('goalModal').addEventListener('click', e => { if (e.target === e.currentTarget) closeGoalModal(); });
  document.getElementById('saveGoalBtn').onclick = saveGoal;
  bindPickerGroup('#goalEmojiPicker','.ep-opt');
  bindPickerGroup('#goalColorPicker','.cp-opt');

  /* Deposit modal */
  document.getElementById('closeDepositModalBtn').onclick = closeDepositModal;
  document.getElementById('cancelDepositBtn').onclick     = closeDepositModal;
  document.getElementById('depositModal').addEventListener('click', e => { if (e.target === e.currentTarget) closeDepositModal(); });
  document.getElementById('saveDepositBtn').onclick = saveDeposit;

  /* Filters */
  document.getElementById('searchInp').addEventListener('input', debounce(applyFilters, 250));
  document.getElementById('fltType').onchange  = applyFilters;
  document.getElementById('fltCat').onchange   = applyFilters;
  document.getElementById('fltMonth').onchange = applyFilters;
  document.getElementById('clearFiltersBtn').onclick = clearFilters;

  document.getElementById('cashFlowPeriod').onchange = renderAllCharts;
  document.getElementById('prevMonthBtn').onclick    = () => stepAnalyticsMonth(-1);
  document.getElementById('nextMonthBtn').onclick    = () => stepAnalyticsMonth(1);

  document.getElementById('topbarExportBtn').onclick = exportCSV;
  document.getElementById('exportJsonBtn').onclick   = exportJSON;
  document.getElementById('exportCsvBtn').onclick    = exportCSV;
  document.getElementById('importFileInp').onchange  = importData;

  document.addEventListener('keydown', e => {
    if (e.key === 'Escape') { closeTxnModal(); closeBudgetModal(); closeWalletModal(); closeGoalModal(); closeDepositModal(); }
  });
}

function bindPickerGroup(containerSel, itemSel) {
  document.querySelectorAll(`${containerSel} ${itemSel}`).forEach(el =>
    el.addEventListener('click', () => {
      document.querySelectorAll(`${containerSel} ${itemSel}`).forEach(x => x.classList.remove('selected'));
      el.classList.add('selected');
    })
  );
}

/* ════ NAVIGATION ════ */
function switchView(viewName) {
  if (!viewName) return;
  S.view = viewName;
  document.querySelectorAll('.view').forEach(v => v.classList.remove('active'));
  document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active'));
  document.getElementById('view-' + viewName)?.classList.add('active');
  document.querySelector(`.nav-btn[data-view="${viewName}"]`)?.classList.add('active');
  const titles = { dashboard:'Dashboard', transactions:'Transactions', analytics:'Analytics', wallets:'Wallets', goals:'Saving Goals', budget:'Budget' };
  document.getElementById('topbarTitle').textContent = titles[viewName] || '';
  window.scrollTo(0, 0);
  if (viewName === 'analytics') renderAnalytics();
  if (viewName === 'budget')    renderBudget();
  if (viewName === 'wallets')   renderWalletsPage();
  if (viewName === 'goals')     renderGoals();
}

/* ════ SELECTS / DATES ════ */
function populateStaticSelects() {
  populateTxnCategories('expense');
  const bs = document.getElementById('budgetCatSel'); bs.innerHTML = '';
  CATS.expense.forEach(c => { const o = document.createElement('option'); o.value=c.id; o.textContent=c.icon+'  '+c.label; bs.appendChild(o); });
  const fc = document.getElementById('fltCat'); fc.innerHTML = '<option value="">All Categories</option>';
  ALL_CATS.forEach(c => { const o = document.createElement('option'); o.value=c.id; o.textContent=c.label; fc.appendChild(o); });
}
function populateTxnCategories(type) {
  const sel = document.getElementById('txnCatSel'); sel.innerHTML = '';
  CATS[type].forEach(c => { const o = document.createElement('option'); o.value=c.id; o.textContent=c.icon+'  '+c.label; sel.appendChild(o); });
}
function setDefaultDate() {
  document.getElementById('txnDateInp').value = todayStr();
  const now = new Date();
  document.getElementById('fltMonth').value = now.getFullYear() + '-' + pad(now.getMonth() + 1);
}

/* ════ RENDER ALL ════ */
function renderAll() {
  renderStats(); renderRecentTxns(); renderTxnListView();
  renderAllCharts(); renderDashWallets(); renderSmartInsights();
  if (S.view === 'analytics') renderAnalytics();
  if (S.view === 'budget')    renderBudget();
  if (S.view === 'wallets')   renderWalletsPage();
  if (S.view === 'goals')     renderGoals();
}

/* ════ STATS ════ */
function renderStats() {
  const m = curMonth(), mt = S.txns.filter(t => getYM(t.date) === m);
  const tot = S.txns.reduce((s,t) => t.type==='income' ? s+t.amount : s-t.amount, 0);
  const inc = mt.filter(t=>t.type==='income').reduce((s,t)=>s+t.amount,0);
  const exp = mt.filter(t=>t.type==='expense').reduce((s,t)=>s+t.amount,0);
  animNumber('statTotalBalance', tot); animNumber('statMonthIncome', inc);
  animNumber('statMonthExpense', exp); animNumber('statMonthSavings', inc-exp);
  const ml = new Date().toLocaleDateString('en-IN', { month:'long', year:'numeric' });
  setText('statIncomeHint', ml); setText('statExpenseHint', ml);
  setText('statSavingsHint', (inc > 0 ? Math.round(((inc-exp)/inc)*100) : 0) + '% of income');
}

function animNumber(id, target) {
  const el = document.getElementById(id); if (!el) return;
  const from = parseFloat(el.dataset.v || 0); el.dataset.v = target;
  const t0 = performance.now(), dur = 580;
  (function step(now) {
    const p = Math.min((now-t0)/dur, 1);
    el.textContent = fmtCur(from + (target-from) * (1 - Math.pow(1-p,3)));
    if (p < 1) requestAnimationFrame(step); else el.textContent = fmtCur(target);
  })(performance.now());
}

/* ════ TXN ITEM ════ */
function txnItemHTML(t) {
  const cat = getCat(t.category), sign = t.type === 'income' ? '+' : '-';
  return `<div class="txn-item">
    <div class="txn-category-ico ${t.type}">${cat.icon}</div>
    <div class="txn-info">
      <div class="txn-cat-name">${cat.label}</div>
      <div class="txn-note-text">${t.notes || '—'}</div>
    </div>
    <div class="txn-date-text">${fmtDate(t.date)}</div>
    <div class="txn-amount-text ${t.type}">${sign}${fmtCur(t.amount)}</div>
    <div class="txn-action-btns">
      <button class="action-icon-btn" onclick="openEditTxnModal('${t.id}')" title="Edit">✎</button>
      <button class="action-icon-btn del" onclick="deleteTxn('${t.id}')" title="Delete">✕</button>
    </div>
  </div>`;
}
function renderRecentTxns() {
  const el = document.getElementById('recentTxnList');
  const r = S.txns.slice(0, 8);
  el.innerHTML = r.length ? r.map(txnItemHTML).join('') : '<div class="empty-state"><div class="empty-ico">⊘</div><p>No transactions yet — add one!</p></div>';
}
function renderTxnListView() {
  const filtered = filteredTxns(), listEl = document.getElementById('allTxnList'), emptyEl = document.getElementById('txnsEmpty');
  if (!filtered.length) { listEl.innerHTML = ''; emptyEl.style.display = 'block'; }
  else { emptyEl.style.display = 'none'; listEl.innerHTML = filtered.map(txnItemHTML).join(''); }
}

/* ════ FILTERS ════ */
function applyFilters() {
  S.filters = { q:document.getElementById('searchInp').value.toLowerCase().trim(), type:document.getElementById('fltType').value, cat:document.getElementById('fltCat').value, month:document.getElementById('fltMonth').value };
  renderTxnListView();
}
function clearFilters() {
  ['searchInp','fltType','fltCat','fltMonth'].forEach(id => { const el = document.getElementById(id); if (el) el.value = ''; });
  S.filters = { q:'', type:'', cat:'', month:'' }; renderTxnListView();
}
function filteredTxns() {
  return S.txns.filter(t => {
    if (S.filters.q) { const hay = [getCat(t.category).label, t.notes||'', String(t.amount)].join(' ').toLowerCase(); if (!hay.includes(S.filters.q)) return false; }
    if (S.filters.type  && t.type !== S.filters.type)  return false;
    if (S.filters.cat   && t.category !== S.filters.cat) return false;
    if (S.filters.month && getYM(t.date) !== S.filters.month) return false;
    return true;
  });
}

/* ════ TXN MODAL ════ */
function openAddTxnModal() {
  S.editTxnId = null; setText('txnModalTitle','New Transaction');
  document.getElementById('txnAmtInp').value = document.getElementById('txnNotesInp').value = '';
  document.getElementById('txnDateInp').value = todayStr();
  document.querySelectorAll('.type-switch-btn').forEach(b => b.classList.remove('active'));
  document.querySelector('.type-switch-btn[data-type="expense"]').classList.add('active');
  S.txnType = 'expense'; populateTxnCategories('expense');
  openModal('txnModal'); setTimeout(() => document.getElementById('txnAmtInp').focus(), 120);
}
function openEditTxnModal(id) {
  const t = S.txns.find(x => x.id === id); if (!t) return;
  S.editTxnId = id; S.txnType = t.type; setText('txnModalTitle','Edit Transaction');
  document.getElementById('txnAmtInp').value = t.amount; document.getElementById('txnNotesInp').value = t.notes||''; document.getElementById('txnDateInp').value = t.date;
  document.querySelectorAll('.type-switch-btn').forEach(b => b.classList.toggle('active', b.dataset.type === t.type));
  populateTxnCategories(t.type); document.getElementById('txnCatSel').value = t.category; openModal('txnModal');
}
function closeTxnModal() { closeModal('txnModal'); S.editTxnId = null; }
function saveTxn() {
  const amount = parseFloat(document.getElementById('txnAmtInp').value);
  const category = document.getElementById('txnCatSel').value;
  const date = document.getElementById('txnDateInp').value;
  const notes = document.getElementById('txnNotesInp').value.trim();
  if (!amount || amount <= 0) { toast('Enter a valid amount','error'); return; }
  if (!date) { toast('Select a date','error'); return; }
  if (S.editTxnId) {
    S.txns = S.txns.map(t => t.id === S.editTxnId ? {...t, amount, category, date, notes, type:S.txnType} : t);
    toast('Transaction updated ✓','success');
  } else {
    const txn = { id:uid(), amount, category, date, notes, type:S.txnType, createdAt:Date.now() };
    S.txns.unshift(txn); toast('Transaction added ✓','success'); checkBudgetAlert(txn);
  }
  save(SK.TXN, S.txns); closeTxnModal(); renderAll();
}
function deleteTxn(id) { S.txns = S.txns.filter(t => t.id !== id); save(SK.TXN, S.txns); renderAll(); toast('Transaction deleted','info'); }
function checkBudgetAlert(txn) {
  if (txn.type !== 'expense') return;
  const budget = S.budgets.find(b => b.category === txn.category); if (!budget) return;
  const spent = monthExpByCat(curMonth(), txn.category), pct = (spent/budget.limit)*100;
  if (pct >= 100) toast(`⚠ ${getCat(txn.category).label} budget exceeded!`,'error');
  else if (pct >= 80) toast(`⚠ ${getCat(txn.category).label} at ${Math.round(pct)}% of budget`,'warn');
}

/* ════ BUDGET ════ */
function openBudgetModal() { document.getElementById('budgetLimitInp').value = ''; openModal('budgetModal'); }
function closeBudgetModal() { closeModal('budgetModal'); }
function saveBudget() {
  const cat = document.getElementById('budgetCatSel').value, limit = parseFloat(document.getElementById('budgetLimitInp').value);
  if (!limit || limit <= 0) { toast('Enter a valid limit','error'); return; }
  const idx = S.budgets.findIndex(b => b.category === cat);
  if (idx >= 0) S.budgets[idx].limit = limit; else S.budgets.push({ id:uid(), category:cat, limit });
  save(SK.BUDGETS, S.budgets); closeBudgetModal(); renderBudget(); toast('Budget saved ✓','success');
}
function deleteBudget(id) { S.budgets = S.budgets.filter(b => b.id !== id); save(SK.BUDGETS, S.budgets); renderBudget(); toast('Budget removed','info'); }
function monthExpByCat(ym, cat) { return S.txns.filter(t => t.type==='expense' && t.category===cat && getYM(t.date)===ym).reduce((s,t)=>s+t.amount,0); }
function renderBudget() {
  const listEl = document.getElementById('budgetList'), emptyEl = document.getElementById('budgetEmpty'), ym = curMonth();
  if (!S.budgets.length) { listEl.innerHTML = ''; emptyEl.style.display = 'block'; return; }
  emptyEl.style.display = 'none';
  listEl.innerHTML = S.budgets.map(b => {
    const cat = getCat(b.category), spent = monthExpByCat(ym, b.category);
    const pct = Math.min((spent/b.limit)*100, 100), cls = pct>=100?'danger':pct>=80?'warn':'safe';
    const warn = pct>=100 ? '<div class="bi-warn-msg">⚠ Budget exceeded!</div>' : pct>=80 ? '<div class="bi-warn-msg" style="color:var(--amber)">⚠ Approaching limit</div>' : '';
    return `<div class="budget-item"><div class="bi-top"><div class="bi-name">${cat.icon} ${cat.label}</div><div class="bi-right"><div class="bi-amounts">${fmtCur(spent)} / <strong>${fmtCur(b.limit)}</strong></div><button class="bi-del-btn" onclick="deleteBudget('${b.id}')">✕</button></div></div><div class="bi-bar-track"><div class="bi-bar-fill ${cls}" style="width:${pct}%"></div></div><div class="bi-used-txt">${Math.round(pct)}% used</div>${warn}</div>`;
  }).join('');
}

/* ════ WALLETS ════ */
function openWalletModal(id) {
  S.editWalletId = id||null; const w = id ? S.wallets.find(x => x.id===id) : null;
  setText('walletModalTitle', w ? 'Edit Wallet' : 'Add Wallet');
  document.getElementById('walletNameInp').value = w ? w.name : '';
  document.getElementById('walletBalInp').value  = w ? w.balance : '';
  setPickerSel('#walletEmojiPicker','.ep-opt','data-emoji', w ? w.icon : '💳');
  setPickerSel('#walletColorPicker','.cp-opt','data-color', w ? w.color : '#2563EB');
  openModal('walletModal'); setTimeout(() => document.getElementById('walletNameInp').focus(), 120);
}
function closeWalletModal() { closeModal('walletModal'); S.editWalletId = null; }
function saveWallet() {
  const name = document.getElementById('walletNameInp').value.trim();
  const balance = parseFloat(document.getElementById('walletBalInp').value)||0;
  const icon  = document.querySelector('#walletEmojiPicker .ep-opt.selected')?.dataset.emoji || '💳';
  const color = document.querySelector('#walletColorPicker .cp-opt.selected')?.dataset.color || '#2563EB';
  if (!name) { toast('Enter a wallet name','error'); return; }
  if (S.editWalletId) { S.wallets = S.wallets.map(w => w.id===S.editWalletId ? {...w,name,balance,icon,color} : w); toast('Wallet updated ✓','success'); }
  else { S.wallets.push({ id:uid(), name, icon, color, balance }); toast('Wallet added ✓','success'); }
  save(SK.WALLETS, S.wallets); closeWalletModal(); renderDashWallets(); renderWalletsPage(); renderSmartInsights();
}
function deleteWallet(id) { S.wallets = S.wallets.filter(w => w.id!==id); save(SK.WALLETS, S.wallets); renderDashWallets(); renderWalletsPage(); renderSmartInsights(); toast('Wallet removed','info'); }

function renderDashWallets() {
  const el = document.getElementById('dashWalletList');
  if (!S.wallets.length) { el.innerHTML = '<div class="widget-placeholder">No wallets yet — add one below</div>'; return; }
  const total = S.wallets.reduce((s,w)=>s+w.balance, 0);
  el.innerHTML = S.wallets.slice(0,4).map(w => {
    const pct = total > 0 ? Math.round((w.balance/total)*100) : 0;
    return `<div class="wallet-mini-row"><div class="wallet-mini-top"><div class="wallet-mini-ico" style="background:${w.color}22">${w.icon}</div><div class="wallet-mini-name">${w.name}</div><div class="wallet-mini-bal" style="color:${w.color}">${fmtCur(w.balance)}</div></div><div class="wallet-progress-track"><div class="wallet-progress-fill" style="width:${pct}%;background:${w.color}"></div></div></div>`;
  }).join('');
}
function renderWalletsPage() {
  const total = S.wallets.reduce((s,w)=>s+w.balance, 0);
  setText('walletsTotalAmt', fmtCur(total));
  setText('walletsTotalSub', S.wallets.length + ' wallet' + (S.wallets.length!==1?'s':''));
  const grid = document.getElementById('walletsGrid');
  if (!S.wallets.length) { grid.innerHTML = '<div class="empty-state" style="grid-column:1/-1"><div class="empty-ico">💳</div><p>No wallets yet</p><button class="btn-primary" onclick="openWalletModal()">Add Wallet</button></div>'; return; }
  grid.innerHTML = S.wallets.map(w => {
    const pct = total > 0 ? Math.round((w.balance/total)*100) : 0;
    return `<div class="wallet-full-card"><div class="wfc-top"><div class="wfc-ico" style="background:${w.color}22">${w.icon}</div><div class="wfc-act-btns"><button class="action-icon-btn" onclick="openWalletModal('${w.id}')" title="Edit">✎</button><button class="action-icon-btn del" onclick="deleteWallet('${w.id}')" title="Delete">✕</button></div></div><div class="wfc-name">${w.name}</div><div class="wfc-type">Personal Wallet</div><div class="wfc-balance" style="color:${w.color}">${fmtCur(w.balance)}</div><div class="wfc-bar-track"><div class="wfc-bar-fill" style="width:${pct}%;background:${w.color}"></div></div><div class="wfc-pct">${pct}% of total assets</div></div>`;
  }).join('');
}

/* ════ SAVING GOALS ════ */
function openGoalModal(id) {
  S.editGoalId = id||null; const g = id ? S.goals.find(x=>x.id===id) : null;
  setText('goalModalTitle', g ? 'Edit Goal' : 'New Saving Goal');
  document.getElementById('goalNameInp').value     = g ? g.name     : '';
  document.getElementById('goalTargetInp').value   = g ? g.target   : '';
  document.getElementById('goalSavedInp').value    = g ? g.saved    : '';
  document.getElementById('goalDeadlineInp').value = g ? g.deadline||'' : '';
  setPickerSel('#goalEmojiPicker','.ep-opt','data-emoji', g ? g.icon : '🎯');
  setPickerSel('#goalColorPicker','.cp-opt','data-color', g ? g.color : '#2563EB');
  openModal('goalModal'); setTimeout(() => document.getElementById('goalNameInp').focus(), 120);
}
function closeGoalModal() { closeModal('goalModal'); S.editGoalId = null; }
function saveGoal() {
  const name = document.getElementById('goalNameInp').value.trim();
  const target = parseFloat(document.getElementById('goalTargetInp').value);
  const saved  = parseFloat(document.getElementById('goalSavedInp').value)||0;
  const deadline = document.getElementById('goalDeadlineInp').value||null;
  const icon  = document.querySelector('#goalEmojiPicker .ep-opt.selected')?.dataset.emoji||'🎯';
  const color = document.querySelector('#goalColorPicker .cp-opt.selected')?.dataset.color||'#2563EB';
  if (!name) { toast('Enter a goal name','error'); return; }
  if (!target||target<=0) { toast('Enter a valid target amount','error'); return; }
  if (S.editGoalId) { S.goals = S.goals.map(g => g.id===S.editGoalId ? {...g,name,target,saved,deadline,icon,color} : g); toast('Goal updated ✓','success'); }
  else { S.goals.push({ id:uid(), name, target, saved, deadline, icon, color, createdAt:Date.now() }); toast('Goal created 🎯','success'); }
  save(SK.GOALS, S.goals); closeGoalModal(); renderGoals(); renderSmartInsights();
}
function deleteGoal(id) { S.goals = S.goals.filter(g => g.id!==id); save(SK.GOALS, S.goals); renderGoals(); renderSmartInsights(); toast('Goal removed','info'); }

function openDepositModal(id) {
  S.depositGoalId = id; const g = S.goals.find(x=>x.id===id);
  document.getElementById('depositAmtInp').value = '';
  document.getElementById('depositGoalInfo').textContent = g ? `${g.icon} ${g.name} — ${fmtCur(g.saved)} saved of ${fmtCur(g.target)}` : '';
  openModal('depositModal'); setTimeout(() => document.getElementById('depositAmtInp').focus(), 120);
}
function closeDepositModal() { closeModal('depositModal'); S.depositGoalId = null; }
function saveDeposit() {
  const amt = parseFloat(document.getElementById('depositAmtInp').value);
  if (!amt||amt<=0) { toast('Enter a valid amount','error'); return; }
  let justCompleted = false, goalName = '';
  S.goals = S.goals.map(g => {
    if (g.id !== S.depositGoalId) return g;
    goalName = g.name;
    const newSaved = Math.min(+(g.saved+amt).toFixed(2), g.target);
    if (g.saved < g.target && newSaved >= g.target) justCompleted = true;
    return {...g, saved:newSaved};
  });
  save(SK.GOALS, S.goals); closeDepositModal(); renderGoals(); renderSmartInsights(); toast('Funds added ✓','success');
  if (justCompleted) setTimeout(() => toast(`🎉 "${goalName}" goal completed!`,'success'), 400);
}

function renderGoals() {
  const grid = document.getElementById('goalsGrid'), emptyEl = document.getElementById('goalsEmpty');
  if (!S.goals.length) { grid.innerHTML = ''; emptyEl.style.display = 'block'; return; }
  emptyEl.style.display = 'none';
  grid.innerHTML = S.goals.map(g => {
    const pct = Math.min(Math.round((g.saved/g.target)*100), 100), done = pct>=100, rem = g.target-g.saved;
    let dl = '';
    if (g.deadline) { const days = Math.ceil((new Date(g.deadline+'T23:59') - new Date())/864e5); dl = done ? '🎉 Completed!' : days<0 ? `⚠️ Overdue by ${Math.abs(days)}d` : `${days}d left`; }
    return `<div class="goal-card" style="border-top:2px solid ${g.color}">
      <div class="gc-top"><div class="gc-ico" style="background:${g.color}22">${g.icon}</div><div class="gc-act-btns"><button class="action-icon-btn" onclick="openGoalModal('${g.id}')" title="Edit">✎</button><button class="action-icon-btn del" onclick="deleteGoal('${g.id}')" title="Delete">✕</button></div></div>
      <div class="gc-name">${g.name}</div>
      ${dl ? `<div class="gc-deadline">${dl}</div>` : ''}
      <div class="gc-amounts"><div class="gc-saved" style="color:${g.color}">${fmtCur(g.saved)}</div><div class="gc-target-txt">/ ${fmtCur(g.target)}</div></div>
      <div class="gc-bar-track"><div class="gc-bar-fill" style="width:${pct}%;background:${g.color}"></div></div>
      <div class="gc-footer"><div class="gc-pct-txt" style="color:${g.color}">${pct}%</div>${done ? '<span class="gc-done-tag">✓ Completed</span>' : `<div class="gc-remaining">${fmtCur(rem)} to go</div>`}</div>
      ${!done ? `<button class="gc-add-funds-btn" onclick="openDepositModal('${g.id}')">+ Add Funds</button>` : ''}
    </div>`;
  }).join('');
}

/* ════ SMART INSIGHTS ════ */
function renderSmartInsights() {
  const m = curMonth(), mt = S.txns.filter(t => getYM(t.date)===m);
  const inc = mt.filter(t=>t.type==='income').reduce((s,t)=>s+t.amount,0);
  const exp = mt.filter(t=>t.type==='expense').reduce((s,t)=>s+t.amount,0);
  const sav = inc-exp, savRate = inc>0 ? ((sav/inc)*100).toFixed(1) : null;

  const catMap = {}; mt.filter(t=>t.type==='expense').forEach(t=>{catMap[t.category]=(catMap[t.category]||0)+t.amount;});
  const topEntry = Object.entries(catMap).sort((a,b)=>b[1]-a[1])[0];
  const topCat = topEntry ? getCat(topEntry[0]) : null, vol = mt.length;

  const now = new Date(), isTM = (now.getFullYear()+'-'+pad(now.getMonth()+1))===m;
  const dEl = isTM ? now.getDate() : new Date(m.split('-')[0], parseInt(m.split('-')[1]),0).getDate();
  const avgD = dEl>0 ? exp/dEl : 0;

  const pm = new Date(now.getFullYear(), now.getMonth()-1, 1);
  const pmStr = pm.getFullYear()+'-'+pad(pm.getMonth()+1);
  const pmExp = S.txns.filter(t=>t.type==='expense'&&getYM(t.date)===pmStr).reduce((s,t)=>s+t.amount,0);
  const mom = pmExp>0 ? (((exp-pmExp)/pmExp)*100).toFixed(1) : null;
  const big = [...mt].filter(t=>t.type==='expense').sort((a,b)=>b.amount-a.amount)[0];
  const near = [...S.goals].filter(g=>g.saved<g.target&&(g.saved/g.target)>=0.7).sort((a,b)=>(b.saved/b.target)-(a.saved/a.target))[0];
  const wTotal = S.wallets.reduce((s,w)=>s+w.balance,0);

  const blocks = [];
  const sr = savRate !== null ? parseFloat(savRate) : null;
  blocks.push({ label:'Savings Rate', value:sr!==null?sr+'%':'—', desc:sr===null?'Add income to calculate.':sr>=50?'Excellent! Over half saved.':sr>=30?'Good savings discipline.':sr>=0?'Try to save a bit more.':'Spending exceeds income!', cls:sr===null?'neu':sr>=30?'pos':sr>=0?'neu':'neg' });
  blocks.push({ label:'Top Category', value:topCat?`${topCat.icon} ${topCat.label}`:'—', desc:topCat?'Highest expense area this month.':'No expenses this month.', cls:'neu' });
  blocks.push({ label:'Transaction Volume', value:String(vol), desc:'Transactions this month.', cls:'neu' });
  if (exp>0) blocks.push({ label:'Avg Daily Spend', value:fmtCur(avgD), desc:`Over ${dEl} day${dEl!==1?'s':''} so far.`, cls:'neu' });
  if (mom!==null) { const up=parseFloat(mom)>0; blocks.push({ label:'vs Last Month', value:(up?'▲ +':'▼ ')+Math.abs(mom)+'%', desc:up?'Expenses up from last month.':'Spending down — great job!', cls:up?'neg':'pos' }); }
  if (big) blocks.push({ label:'Biggest Expense', value:fmtCur(big.amount), desc:getCat(big.category).label+(big.notes?' · '+big.notes.slice(0,22):''), cls:'neu' });
  if (near) blocks.push({ label:'Goal Progress', value:`${near.icon} ${Math.round((near.saved/near.target)*100)}%`, desc:near.name+' — almost there!', cls:'pos' });
  if (S.wallets.length>0) blocks.push({ label:'Total in Wallets', value:fmtCur(wTotal), desc:S.wallets.length+' wallet'+(S.wallets.length!==1?'s':'')+' tracked.', cls:'neu' });

  const c = document.getElementById('insightsBlocks');
  c.innerHTML = blocks.length ? blocks.map(b=>`<div class="insight-block"><div class="insight-lbl">${b.label}</div><div class="insight-val ${b.cls}">${b.value}</div><div class="insight-desc">${b.desc}</div></div>`).join('') : '<div class="widget-placeholder">Add transactions to see insights.</div>';
}

/* ════ CHARTS ════ */
function chartColors() {
  const dark = document.documentElement.getAttribute('data-theme')==='dark';
  return { grid:dark?'rgba(255,255,255,0.05)':'rgba(0,0,0,0.06)', text:dark?'#94A3B8':'#475569', income:'#22d3a0', expense:'#f05070' };
}
function destroyChart(key) { if (S.charts[key]) { S.charts[key].destroy(); delete S.charts[key]; } }
function renderAllCharts() { renderCashFlowChart(); renderCategoryDonut(); }

function renderCashFlowChart() {
  destroyChart('cf');
  const months = parseInt(document.getElementById('cashFlowPeriod').value)||6;
  const labels=[], inc=[], exp=[];
  for (let i=months-1; i>=0; i--) {
    const d=new Date(); d.setDate(1); d.setMonth(d.getMonth()-i);
    const ym=d.getFullYear()+'-'+pad(d.getMonth()+1);
    labels.push(d.toLocaleDateString('en-IN',{month:'short',year:'2-digit'}));
    const mt=S.txns.filter(t=>getYM(t.date)===ym);
    inc.push(mt.filter(t=>t.type==='income').reduce((s,t)=>s+t.amount,0));
    exp.push(mt.filter(t=>t.type==='expense').reduce((s,t)=>s+t.amount,0));
  }
  const c=chartColors();
  S.charts.cf = new Chart(document.getElementById('cashFlowChart').getContext('2d'), {
    type:'bar',
    data:{ labels, datasets:[
      { label:'Income',   data:inc, backgroundColor:c.income+'33', borderColor:c.income,  borderWidth:1.5, borderRadius:4 },
      { label:'Expenses', data:exp, backgroundColor:c.expense+'33', borderColor:c.expense, borderWidth:1.5, borderRadius:4 },
    ]},
    options:{
      responsive:true, maintainAspectRatio:false,
      interaction:{ mode:'index', intersect:false },
      plugins:{ legend:{ labels:{ color:c.text, font:{ family:'Poppins', size:10 }, boxWidth:10 } }, tooltip:{ callbacks:{ label:x=>'  ₹'+x.raw.toLocaleString('en-IN') } } },
      scales:{
        x:{ ticks:{ color:c.text, font:{ family:'Poppins', size:10 }, maxRotation:0 }, grid:{ color:c.grid } },
        y:{ ticks:{ color:c.text, font:{ family:'Poppins', size:10 }, callback:v=>'₹'+(v>=1000?(v/1000).toFixed(1)+'k':v) }, grid:{ color:c.grid } },
      },
    },
  });
}

function renderCategoryDonut() {
  destroyChart('cd');
  const m=curMonth(), exps=S.txns.filter(t=>t.type==='expense'&&getYM(t.date)===m);
  const cMap={}; exps.forEach(t=>{cMap[t.category]=(cMap[t.category]||0)+t.amount;});
  const entries=Object.entries(cMap).sort((a,b)=>b[1]-a[1]).slice(0,6);
  if (!entries.length) { renderEmptyDonut(); return; }
  const cats=entries.map(([id])=>getCat(id)), data=entries.map(([,v])=>v), total=data.reduce((a,b)=>a+b,0);
  S.charts.cd = new Chart(document.getElementById('categoryChart').getContext('2d'), {
    type:'doughnut',
    data:{ labels:cats.map(c=>c.label), datasets:[{ data, backgroundColor:cats.map(c=>c.color), borderWidth:0, hoverOffset:5 }] },
    options:{ responsive:true, maintainAspectRatio:false, cutout:'68%',
      plugins:{ legend:{ display:false }, tooltip:{ callbacks:{ label:x=>'  ₹'+x.raw.toLocaleString('en-IN')+' ('+Math.round(x.parsed/total*100)+'%)' } } } },
  });
  document.getElementById('donutLegend').innerHTML = cats.map(c=>`<div class="legend-dot-item"><div class="legend-dot" style="background:${c.color}"></div><span>${c.label}</span></div>`).join('');
}
function renderEmptyDonut() {
  destroyChart('cd');
  S.charts.cd = new Chart(document.getElementById('categoryChart').getContext('2d'), {
    type:'doughnut',
    data:{ labels:['No data'], datasets:[{ data:[1], backgroundColor:['rgba(37,99,235,0.08)'], borderWidth:0 }] },
    options:{ responsive:true, maintainAspectRatio:false, cutout:'68%', plugins:{ legend:{ display:false }, tooltip:{ enabled:false } } },
  });
  document.getElementById('donutLegend').innerHTML = '<div class="legend-dot-item" style="color:var(--text-3)">No expenses this month</div>';
}

/* ════ ANALYTICS ════ */
function stepAnalyticsMonth(d) {
  const nd=new Date(S.analyticsMonth); nd.setMonth(nd.getMonth()+d);
  if (nd > new Date()) return; S.analyticsMonth=nd; renderAnalytics();
}
function renderAnalytics() {
  const d=S.analyticsMonth, ym=d.getFullYear()+'-'+pad(d.getMonth()+1);
  setText('analyticsMonthLabel', d.toLocaleDateString('en-IN',{month:'long',year:'numeric'}));
  const mt=S.txns.filter(t=>getYM(t.date)===ym);
  const inc=mt.filter(t=>t.type==='income').reduce((s,t)=>s+t.amount,0);
  const exp=mt.filter(t=>t.type==='expense').reduce((s,t)=>s+t.amount,0);
  setText('aIncome',fmtCur(inc)); setText('aExpense',fmtCur(exp)); setText('aSavings',fmtCur(inc-exp));
  renderDailyChart(ym,d); renderCompareChart(ym); renderCatBars(ym);
}
function renderDailyChart(ym,d) {
  destroyChart('dl');
  const days=new Date(d.getFullYear(),d.getMonth()+1,0).getDate();
  const labels=Array.from({length:days},(_,i)=>i+1);
  const data=labels.map(day=>S.txns.filter(t=>t.date===ym+'-'+pad(day)&&t.type==='expense').reduce((s,t)=>s+t.amount,0));
  const c=chartColors();
  S.charts.dl = new Chart(document.getElementById('dailyChart').getContext('2d'), {
    type:'line',
    data:{ labels, datasets:[{ label:'Spending', data, borderColor:c.expense, backgroundColor:c.expense+'22', fill:true, tension:0.4, pointRadius:2, pointHoverRadius:5, borderWidth:2 }] },
    options:{ responsive:true, maintainAspectRatio:false, plugins:{ legend:{ display:false }, tooltip:{ callbacks:{ label:x=>'  ₹'+x.raw.toLocaleString('en-IN') } } }, scales:{ x:{ ticks:{ color:c.text, font:{ family:'Poppins', size:10 }, maxRotation:0 }, grid:{ color:c.grid } }, y:{ ticks:{ color:c.text, font:{ family:'Poppins', size:10 }, callback:v=>'₹'+(v>=1000?(v/1000).toFixed(1)+'k':v) }, grid:{ color:c.grid } } } },
  });
}
function renderCompareChart(ym) {
  destroyChart('cmp');
  const t=S.txns.filter(x=>getYM(x.date)===ym);
  const inc=t.filter(x=>x.type==='income').reduce((s,x)=>s+x.amount,0);
  const exp=t.filter(x=>x.type==='expense').reduce((s,x)=>s+x.amount,0);
  const c=chartColors();
  S.charts.cmp = new Chart(document.getElementById('compareChart').getContext('2d'), {
    type:'bar',
    data:{ labels:['Income','Expense'], datasets:[{ data:[inc,exp], backgroundColor:[c.income+'44',c.expense+'44'], borderColor:[c.income,c.expense], borderWidth:2, borderRadius:6 }] },
    options:{ responsive:true, maintainAspectRatio:false, indexAxis:'y', plugins:{ legend:{ display:false }, tooltip:{ callbacks:{ label:x=>'  ₹'+x.raw.toLocaleString('en-IN') } } }, scales:{ x:{ ticks:{ color:c.text, font:{ family:'Poppins', size:10 }, callback:v=>'₹'+(v>=1000?(v/1000).toFixed(1)+'k':v) }, grid:{ color:c.grid } }, y:{ ticks:{ color:c.text, font:{ family:'Poppins', size:10 } }, grid:{ display:false } } } },
  });
}
function renderCatBars(ym) {
  const exps=S.txns.filter(t=>t.type==='expense'&&getYM(t.date)===ym);
  const cMap={}; exps.forEach(t=>{cMap[t.category]=(cMap[t.category]||0)+t.amount;});
  const entries=Object.entries(cMap).sort((a,b)=>b[1]-a[1]), max=entries[0]?.[1]||1;
  const el=document.getElementById('catBarsList');
  if (!entries.length) { el.innerHTML='<div class="empty-state" style="padding:1.5rem"><div class="empty-ico">⊘</div><p>No expense data</p></div>'; return; }
  el.innerHTML = entries.map(([id,amt])=>{
    const cat=getCat(id), pct=Math.round((amt/max)*100);
    return `<div class="cat-bar-item"><div class="cat-bar-header"><span class="cat-bar-name">${cat.icon} ${cat.label}</span><span class="cat-bar-amt">${fmtCur(amt)}</span></div><div class="cat-bar-track"><div class="cat-bar-fill" style="width:${pct}%;background:${cat.color}"></div></div></div>`;
  }).join('');
}

/* ════ EXPORT / IMPORT ════ */
function exportJSON() { const d=JSON.stringify({transactions:S.txns,budgets:S.budgets,wallets:S.wallets,goals:S.goals,exportedAt:new Date().toISOString()},null,2); dlFile('FinSpace-export.json',d,'application/json'); toast('Exported as JSON','success'); }
function exportCSV()  { const h='ID,Type,Category,Amount,Date,Notes', r=S.txns.map(t=>[t.id,t.type,getCat(t.category).label,t.amount,t.date,`"${(t.notes||'').replace(/"/g,'""')}"`].join(',')); dlFile('FinSpace-export.csv',[h,...r].join('\n'),'text/csv'); toast('Exported as CSV','success'); }
function dlFile(name,content,type) { const b=new Blob([content],{type}),url=URL.createObjectURL(b),a=document.createElement('a'); a.href=url; a.download=name; a.click(); URL.revokeObjectURL(url); }
function importData(e) {
  const file=e.target.files[0]; if(!file) return;
  const r=new FileReader();
  r.onload=ev=>{ try {
    const d=JSON.parse(ev.target.result); let n=0;
    if(Array.isArray(d.transactions)){const ids=new Set(S.txns.map(t=>t.id));d.transactions.forEach(t=>{if(!ids.has(t.id)){S.txns.unshift(t);n++;}});save(SK.TXN,S.txns);}
    if(Array.isArray(d.wallets)){const ids=new Set(S.wallets.map(w=>w.id));d.wallets.forEach(w=>{if(!ids.has(w.id))S.wallets.push(w);});save(SK.WALLETS,S.wallets);}
    if(Array.isArray(d.goals)){const ids=new Set(S.goals.map(g=>g.id));d.goals.forEach(g=>{if(!ids.has(g.id))S.goals.push(g);});save(SK.GOALS,S.goals);}
    renderAll(); toast(`Imported ${n} transactions`,'success');
  } catch { toast('Import failed — invalid file','error'); } };
  r.readAsText(file); e.target.value='';
}

/* ════ TOAST ════ */
function toast(message, type='info') {
  const c=document.getElementById('toastContainer'), el=document.createElement('div');
  const icons={success:'✓',error:'⚠',info:'ℹ',warn:'⚡'};
  el.className=`toast-item ${type}`;
  el.innerHTML=`<span>${icons[type]||'ℹ'}</span><span>${message}</span>`;
  c.appendChild(el);
  setTimeout(()=>{ el.style.animation='toastOut 0.28s ease forwards'; setTimeout(()=>el.remove(),300); }, 3200);
}

/* ════ MODAL HELPERS ════ */
function openModal(id)  { document.getElementById(id).classList.add('open'); document.body.style.overflow='hidden'; }
function closeModal(id) { document.getElementById(id).classList.remove('open'); if(!document.querySelector('.modal-overlay.open')) document.body.style.overflow=''; }
function setPickerSel(containerSel, itemSel, attr, value) {
  document.querySelectorAll(`${containerSel} ${itemSel}`).forEach(el => el.classList.toggle('selected', el.getAttribute(attr)===value));
}

/* ════ UTILS ════ */
const uid      = () => Date.now().toString(36) + Math.random().toString(36).slice(2,7);
const debounce = (fn,d) => { let t; return (...a) => { clearTimeout(t); t=setTimeout(()=>fn(...a),d); }; };
const pad      = n => String(n).padStart(2,'0');
const todayStr = () => { const d=new Date(); return `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}`; };
const curMonth = () => { const d=new Date(); return `${d.getFullYear()}-${pad(d.getMonth()+1)}`; };
const getYM    = s => s ? s.substring(0,7) : '';
const getCat   = id => ALL_CATS.find(c=>c.id===id)||{ label:id, icon:'📌', color:'#78909c' };
const setText  = (id,txt) => { const el=document.getElementById(id); if(el) el.textContent=txt; };
const fmtDate  = s => { if(!s)return''; const d=new Date(s+'T00:00:00'); return d.toLocaleDateString('en-IN',{day:'numeric',month:'short',year:'numeric'}); };
const fmtCur   = n => '₹'+Math.abs(n).toLocaleString('en-IN',{minimumFractionDigits:2,maximumFractionDigits:2});

Object.assign(window, { openEditTxnModal, deleteTxn, deleteBudget, openWalletModal, deleteWallet, openGoalModal, deleteGoal, openDepositModal, switchView });
