/* Display-only localization for the classic-script admin application. */
(() => {
  'use strict';
  const catalog = window.ADMIN_I18N_CATALOG;
  const languages = ['zh-Hant', 'zh-Hans', 'ja', 'en'];
  const locales = { 'zh-Hant': 'zh-TW', 'zh-Hans': 'zh-CN', ja: 'ja-JP', en: 'en-US' };
  const storageKey = 'kimono_admin_lang';
  const sourceTitle = document.title;
  let language = 'zh-Hant';
  try {
    const saved = localStorage.getItem(storageKey) || localStorage.getItem('kimono_lang');
    if (languages.includes(saved)) language = saved;
  } catch (_) { /* Private browsing may disable storage. */ }
  const textRecords = new WeakMap();
  const staticText = new WeakSet();
  const attributeRecords = new WeakMap();
  const attributes = ['placeholder', 'title', 'aria-label', 'alt'];
  const excluded = 'script,style,[contenteditable], [data-i18n-ignore], [translate="no"],#nav-agent,#cust-modal-name,#store-info-id,#e-name-display,#store-view-store-note';
  // Textarea values are customer/staff data and must stay untouched, while
  // their placeholder/title/aria-label attributes are normal interface copy.
  const textExcluded = 'textarea,' + excluded;
  const escapeRegExp = value => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const phrasePattern = new RegExp(Object.keys(catalog).filter(key => key.length > 1).sort((a, b) => b.length - a.length).map(escapeRegExp).join('|'), 'g');
  let privateValues = new Set();
  function refreshPrivateValues() {
    privateValues = new Set();
    if (typeof allOrders === 'undefined') return;
    for (const order of allOrders) {
      for (const field of ['name', 'email', 'phone', 'note', 'notes', 'remark', 'remarks', 'storeNote', 'storeNotes', 'staffNote', 'customerNote', 'refundReason', 'bankAccount', 'bankHolder']) {
        if (typeof order[field] === 'string' && order[field].trim()) privateValues.add(order[field].trim());
      }
    }
  }
  function t(value) {
    const source = String(value ?? '');
    if (language === 'zh-Hant') return source;
    const column = languages.indexOf(language) - 1;
    if (catalog[source]) return catalog[source][column];
    const decorated = source.match(/^([^\p{L}\p{N}]*)([\p{Script=Han}]+)([^\p{L}\p{N}]*)$/u);
    if (decorated && catalog[decorated[2]]) return decorated[1] + catalog[decorated[2]][column] + decorated[3];
    const duration = source.match(/^(\d+) 步 · 約 (\d+) 分$/);
    if (duration) return [duration[1] + ' 步 · 约 ' + duration[2] + ' 分钟', duration[1] + ' ステップ・約' + duration[2] + '分', duration[1] + ' step · about ' + duration[2] + ' min'][column];
    const latest = source.match(/^最近 (\d+) 筆$/);
    if (latest) return ['最近 ' + latest[1] + ' 笔', '直近 ' + latest[1] + ' 件', 'Latest ' + latest[1] + ' records'][column];
    const monthTitle = source.match(/^(\d{4}) 年 (\d{1,2}) 月$/);
    if (monthTitle) return new Intl.DateTimeFormat(locales[language], { year: 'numeric', month: 'long', timeZone: 'UTC' }).format(new Date(Date.UTC(+monthTitle[1], +monthTitle[2] - 1, 1)));
    const monthLabel = source.match(/^(\d{1,2})月$/);
    if (monthLabel) return new Intl.DateTimeFormat(locales[language], { month: 'short', timeZone: 'UTC' }).format(new Date(Date.UTC(2026, +monthLabel[1] - 1, 1)));
    const count = source.match(/^(\d+)\s*(筆|組|項|人|天|小時)$/);
    if (count) {
      const units = { 筆: ['笔', '件', 'orders'], 組: ['组', '組', 'groups'], 項: ['项', '項目', 'items'], 人: ['人', '名', 'guests'], 天: ['天', '日', 'days'], 小時: ['小时', '時間', 'hours'] };
      return count[1] + ' ' + units[count[2]][column];
    }
    const guests = source.match(/^(?:\d+[男女大小])+$/);
    if (guests) return source.replace(/(\d+)([男女大小])/g, (_, n, kind) => n + ' ' + ({ 男: ['男', '男性', 'men'], 女: ['女', '女性', 'women'], 大: ['成人', '大人', 'adults'], 小: ['儿童', '子ども', 'children'] })[kind][column] + ' ').trim();
    const discount = source.match(/^(\d+(?:\.\d+)?) 折$/);
    if (discount) {
      const rate = +discount[1] > 10 ? +discount[1] / 10 : +discount[1];
      const off = Number((100 - rate * 10).toFixed(2));
      return [source, off + '%引き', off + '% off'][column];
    }
    const step = source.match(/^第 (\d+) \/ (\d+) 步$/);
    if (step) return [source, 'ステップ ' + step[1] + ' / ' + step[2], 'Step ' + step[1] + ' / ' + step[2]][column];
    // Replace only once against the source: translated Japanese can contain Chinese keys.
    return source.replace(phrasePattern, key => catalog[key][column]);
  }
  function text(node) {
    const parent = node.parentElement;
    if (!parent || parent.closest(textExcluded) || !node.nodeValue.trim()) return;
    const current = node.nodeValue;
    const previous = textRecords.get(node);
    const source = previous && current === previous.rendered ? previous.source : current;
    if (privateValues.has(source.trim()) && !staticText.has(node) && !parent.closest('button,label,th,option,.badge,.nav-tab,.tab-btn,.section-label')) {
      if (current !== source) node.nodeValue = source;
      return;
    }
    // Options without explicit values derive their submitted value from their label.
    // Freeze that original value before translating the display label.
    if (parent.tagName === 'OPTION' && !parent.hasAttribute('value')) parent.setAttribute('value', parent.value);
    const rendered = source.replace(source.trim(), t(source.trim()));
    if (rendered !== current) node.nodeValue = rendered;
    textRecords.set(node, { source, rendered });
  }
  function translate(root) {
    if (!root) return;
    if (root.nodeType === Node.TEXT_NODE) { text(root); return; }
    if (root.nodeType !== Node.ELEMENT_NODE || root.closest(excluded)) return;
    const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
    while (walker.nextNode()) text(walker.currentNode);
    const selector = attributes.map(name => `[${name}]`).join(',');
    const elements = [...(root.matches(selector) ? [root] : []), ...root.querySelectorAll(selector)];
    for (const element of elements) {
      if (element.closest(excluded)) continue;
      const records = attributeRecords.get(element) || {};
      for (const name of attributes) {
        if (!element.hasAttribute(name)) { delete records[name]; continue; }
        const current = element.getAttribute(name);
        const previous = records[name];
        const source = previous && current === previous.rendered ? previous.source : current;
        const rendered = privateValues.has(source.trim()) ? source : t(source);
        if (current !== rendered) element.setAttribute(name, rendered);
        records[name] = { source, rendered };
      }
      attributeRecords.set(element, records);
    }
  }
  let observer;
  function observe() {
    if (!document?.body) return;
    observer.observe(document.body, { subtree: true, childList: true, characterData: true, attributes: true, attributeFilter: attributes });
  }
  function updateCharts() {
    if (!window.Chart || typeof Chart.getChart !== 'function') return;
    document.querySelectorAll('canvas').forEach(canvas => {
      const chart = Chart.getChart(canvas);
      if (!chart) return;
      const localize = (object, key) => {
        const recordKey = '__adminI18n_' + key;
        const previous = object[recordKey];
        const current = object[key];
        const source = previous && JSON.stringify(current) === JSON.stringify(previous.rendered) ? previous.source : current;
        if (source == null) return;
        const rendered = Array.isArray(source) ? source.map(t) : t(source);
        object[recordKey] = { source, rendered };
        object[key] = rendered;
      };
      localize(chart.data, 'labels');
      chart.data.datasets.forEach(dataset => localize(dataset, 'label'));
      chart.update('none');
    });
  }
  function setLanguage(next) {
    if (!languages.includes(next)) return;
    language = next;
    try { localStorage.setItem(storageKey, language); } catch (_) {}
    document.documentElement.lang = language;
    document.querySelectorAll('[data-admin-language]').forEach(select => { select.value = language; });
    document.title = t(sourceTitle);
    observer?.disconnect();
    refreshPrivateValues();
    translate(document.body);
    const date = document.getElementById('dash-date');
    if (date && date.textContent) date.textContent = new Intl.DateTimeFormat(locales[language], { timeZone: 'Asia/Tokyo', year: 'numeric', month: 'long', day: 'numeric', weekday: 'long' }).format(new Date()) + (typeof currentAgent !== 'undefined' && currentAgent ? ' · ' + currentAgent : '');
    updateCharts();
    if (observer) observe();
    window.dispatchEvent(new CustomEvent('adminlanguagechange', { detail: { language } }));
  }
  window.AdminI18n = { t, setLanguage, translate, updateCharts, get language() { return language; }, get locale() { return locales[language]; } };
  window.adminT = t;
  window.adminAlert = message => window.alert(t(message));
  window.adminConfirm = message => window.confirm(t(message));
  window.adminPrompt = (message, initial) => window.prompt(t(message), initial);
  document.addEventListener('DOMContentLoaded', () => {
    const initial = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
    while (initial.nextNode()) staticText.add(initial.currentNode);
    observer = new MutationObserver(records => {
      observer.disconnect();
      refreshPrivateValues();
      const roots = new Set();
      records.forEach(record => {
        if (record.type === 'childList') record.addedNodes.forEach(node => roots.add(node));
        else roots.add(record.target);
      });
      roots.forEach(translate);
      observe();
    });
    document.querySelectorAll('[data-admin-language]').forEach(select => select.addEventListener('change', event => setLanguage(event.target.value)));
    document.querySelectorAll('[data-admin-language-button]').forEach(button => button.addEventListener('click', event => {
      event.stopPropagation();
      button.parentElement.querySelector('[data-admin-language-menu]')?.classList.toggle('hidden');
    }));
    document.querySelectorAll('[data-admin-language-option]').forEach(button => button.addEventListener('click', () => {
      setLanguage(button.dataset.adminLanguageOption);
      button.closest('[data-admin-language-menu]')?.classList.add('hidden');
    }));
    document.addEventListener('click', () => document.querySelectorAll('[data-admin-language-menu]').forEach(menu => menu.classList.add('hidden')));
    setLanguage(language);
  });
})();
