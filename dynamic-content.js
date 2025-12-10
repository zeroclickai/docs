function replaceContent(source) {
    const replace = () => {
      const walker = document.createTreeWalker(
        document.body,
        NodeFilter.SHOW_TEXT,
        null
      );

      let node;
      while ((node = walker.nextNode())) {
        if (node.textContent.includes('((')) {
          node.textContent = node.textContent.replace(
            /\(\((\w+)\)\)/g,
            (match, name) => source[name] ?? match
          );
        }
      }
    };

    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', replace);
    } else {
      replace();
    }
}

fetch('/api/docs-dynamic-content', { credentials: 'include' }).then(async res => {
  if (!res.ok) {
    console.error('Failed to load dynamic content', res.status);
  }

  const content = await res.json();

  replaceContent(content);
});

