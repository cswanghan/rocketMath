/** Android-only presentation for the shared offline language modules. */
export function adaptEmbeddedPage() {
  const page = location.pathname;
  const kind = page.includes('vocab.html') ? 'vocab' : page.includes('chinese-characters') ? 'characters' : page.includes('chinese-reading') ? 'reading' : null;
  if (!kind) return;
  document.body.dataset.aPage = kind;
  document.addEventListener('click', event => {
    const anchor = (event.target as Element).closest<HTMLAnchorElement>('a[href]');
    if (anchor && new URL(anchor.href).pathname === '/login.html' && window.parent !== window) {
      event.preventDefault();
      window.parent.postMessage({ source: 'xingya-android', type: 'account' }, location.origin);
    }
  });
  if (kind === 'vocab') {
    const sidebar = document.querySelector<HTMLElement>('.sidebar');
    const content = document.querySelector<HTMLElement>('main.content');
    if (!sidebar || !content) return;
    const dialog = document.createElement('dialog');
    dialog.className = 'a-sheet a-vocab-settings';
    dialog.setAttribute('aria-label', '词汇设置');
    const panel = document.createElement('div');
    panel.className = 'a-sheet-content';
    panel.innerHTML = '<div class="a-sheet-handle"></div><header><h2>词汇设置</h2><button class="a-text-button" type="button">完成</button></header>';
    panel.append(sidebar);
    const hero = document.querySelector('.hero');
    const definitions = document.querySelector('.def-bar');
    if (hero) sidebar.prepend(hero);
    if (definitions) sidebar.prepend(definitions);
    dialog.append(panel); document.body.append(dialog);
    const toolbar = document.createElement('div');
    toolbar.className = 'a-vocab-toolbar';
    toolbar.innerHTML = '<span>每天练一点，单词记得牢</span><button class="a-outlined" type="button" aria-haspopup="dialog">词汇设置</button>';
    content.prepend(toolbar);
    const opener = toolbar.querySelector('button')!;
    opener.addEventListener('click', () => dialog.showModal());
    panel.querySelector('header button')!.addEventListener('click', () => dialog.close());
    dialog.addEventListener('click', event => { if (event.target === dialog) dialog.close(); });
    dialog.addEventListener('close', () => opener.focus());
    // Keep the complete pool accessible without pushing the current word down.
    const preview = document.querySelector('.preview');
    if (preview) {
      const details = document.createElement('details'); details.className = 'a-pool';
      const summary = document.createElement('summary'); summary.textContent = '查看当前词库';
      preview.before(details); details.append(summary, preview);
    }
    for (const [id, label] of [['onlyUnmasteredToggle', '只看未掌握'], ['randomOrderToggle', '随机顺序'], ['audioOnlyToggle', '纯听模式']]) document.getElementById(id)?.setAttribute('aria-label', label);
    document.getElementById('feedbackBox')?.setAttribute('aria-live', 'polite');
  }
  if (kind === 'characters') {
    ['学一学', '闯一闯', '生字本'].forEach((label, index) => {
      const button = document.querySelectorAll('.tabs button')[index]; if (button) button.textContent = label;
    });
    document.getElementById('nb-word')?.setAttribute('aria-label', '生字或词语');
    document.getElementById('nb-note')?.setAttribute('aria-label', '补充说明');
    document.getElementById('q-feedback')?.setAttribute('aria-live', 'polite');
    const picker = document.querySelector('.picker-col');
    const lesson = document.querySelector('.detail-col');
    if (picker && lesson) {
      const details = document.createElement('details'); details.className = 'a-character-picker';
      const summary = document.createElement('summary'); summary.textContent = '选择生字';
      lesson.prepend(details); details.append(summary, picker);
      picker.addEventListener('click', event => { if ((event.target as Element).closest('.chip')) details.open = false; });
    }
  }
  if (kind === 'reading') {
    const box = document.querySelector('.input-box');
    const hint = box?.nextElementSibling;
    const library = document.querySelector('.reading-library');
    if (box && library) {
      const details = document.createElement('details'); details.className = 'a-custom-reading';
      const summary = document.createElement('summary'); summary.textContent = '用自己的文章练习';
      box.before(details); details.append(summary, box);
      if (hint?.classList.contains('hint-text')) details.append(hint);
      details.before(library);
    }
    document.getElementById('articleInput')?.setAttribute('aria-label', '自己的文章');
    const libraryTitle = library?.querySelector('h2'); if (libraryTitle) libraryTitle.textContent = '选择一篇短文';
  }
  // The shared character renderer uses clickable divs; expose equivalent
  // keyboard and accessibility semantics without changing its learning logic.
  const enhanceTargets = () => {
    document.querySelectorAll<HTMLElement>('div[onclick], .word-chip, ruby.hw').forEach(element => {
      if (element.matches('.overlay, .detail-overlay')) return;
      element.tabIndex = 0; element.setAttribute('role', 'button');
    });
    document.getElementById('answerInput')?.setAttribute('aria-label', '英文答案');
    const subline = document.querySelector('.subline');
    if (subline?.textContent?.includes('British audio ready')) subline.textContent = subline.textContent.replace('British audio ready', '系统朗读');
  };
  enhanceTargets();
  new MutationObserver(enhanceTargets).observe(document.body, { childList: true, subtree: true });
  document.addEventListener('keydown', event => {
    const target = event.target as HTMLElement;
    if (target.matches('[role=button]:not(button)') && (event.key === 'Enter' || event.key === ' ')) { event.preventDefault(); target.click(); }
  });
}
