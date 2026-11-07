/**
 * 文内引用标记：把正文里的 [@key] 换成指向文末参考文献的上标。
 *
 * 之所以放在客户端而不是 rehype 插件：references 来自 frontmatter，
 * 插件拿不到当前文章的 data；这里直接以服务端渲染出的 <li data-ref-key>
 * 为准，编号天然一致，且无 JS 时正文仍保留可读的 [@key] 原文。
 */

function replaceMarkers() {
  const list = document.getElementById('references-list');
  const prose = document.querySelector('article .prose');
  if (!list || !prose) return;

  const order = new Map<string, number>();
  list.querySelectorAll<HTMLElement>('[data-ref-key]').forEach((li, index) => {
    if (li.dataset.refKey) order.set(li.dataset.refKey, index + 1);
  });
  if (!order.size) return;

  const walker = document.createTreeWalker(prose, NodeFilter.SHOW_TEXT);
  const targets: Text[] = [];
  while (walker.nextNode()) {
    const node = walker.currentNode as Text;
    if (!/\[@[^\]]+\]/.test(node.nodeValue || '')) continue;
    // 代码块、链接、已有上标里的文本不动
    if (node.parentElement?.closest('code, pre, a, sup, script, style, katex')) continue;
    targets.push(node);
  }

  for (const node of targets) {
    const text = node.nodeValue || '';
    const frag = document.createDocumentFragment();
    const pattern = /\[@([A-Za-z0-9_:-]+)\]/g;
    let last = 0;
    let match: RegExpExecArray | null;
    let changed = false;
    while ((match = pattern.exec(text))) {
      const number = order.get(match[1]);
      if (!number) continue;
      if (match.index > last) frag.append(document.createTextNode(text.slice(last, match.index)));
      const sup = document.createElement('sup');
      sup.className = 'cite-ref';
      const link = document.createElement('a');
      link.href = `#ref-${match[1]}`;
      link.textContent = `[${number}]`;
      link.title = '跳到参考文献';
      sup.append(link);
      frag.append(sup);
      last = match.index + match[0].length;
      changed = true;
    }
    if (!changed) continue;
    frag.append(document.createTextNode(text.slice(last)));
    node.replaceWith(frag);
  }
}

function bindBibtexButtons() {
  document.querySelectorAll<HTMLButtonElement>('.ref-bib').forEach((btn) => {
    btn.addEventListener('click', async () => {
      const bib = btn.dataset.bib || '';
      if (!bib) return;
      try {
        await navigator.clipboard.writeText(bib);
        btn.textContent = '已复制';
      } catch {
        btn.textContent = '复制失败';
      }
      setTimeout(() => { btn.textContent = '复制 BibTeX'; }, 1600);
    });
  });
}

function init() {
  replaceMarkers();
  bindBibtexButtons();
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init, { once: true });
} else {
  init();
}
