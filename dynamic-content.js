let dynamicContent = null;

function replaceInNode(node, source) {
  const walker = document.createTreeWalker(
    node,
    NodeFilter.SHOW_TEXT,
    null
  );

  const nodesToReplace = [];
  let textNode;
  while ((textNode = walker.nextNode())) {
    if (textNode.textContent.includes('((')) {
      nodesToReplace.push(textNode);
    }
  }

  nodesToReplace.forEach((textNode) => {
    const text = textNode.textContent;
    const pattern = /\(\((\w+)\)\)/g;
    let match;
    let hasHtmlReplacement = false;

    while ((match = pattern.exec(text)) !== null) {
      const replacement = source[match[1]];
      if (replacement && replacement.includes('<')) {
        hasHtmlReplacement = true;
        break;
      }
    }

    if (hasHtmlReplacement) {
      const newContent = text.replace(pattern, (m, name) => source[name] ?? m);
      const wrapper = document.createElement('span');
      wrapper.innerHTML = newContent;

      const parent = textNode.parentNode;
      while (wrapper.firstChild) {
        parent.insertBefore(wrapper.firstChild, textNode);
      }
      parent.removeChild(textNode);
    } else {
      textNode.textContent = text.replace(pattern, (m, name) => source[name] ?? m);
    }
  });
}

function setupMutationObserver(source) {
  const observer = new MutationObserver((mutations) => {
    mutations.forEach((mutation) => {
      mutation.addedNodes.forEach((node) => {
        if (node.nodeType === Node.ELEMENT_NODE) {
          replaceInNode(node, source);
        } else if (node.nodeType === Node.TEXT_NODE && node.textContent.includes('((')) {
          replaceInNode(node.parentNode, source);
        }
      });
    });
  });

  observer.observe(document.body, {
    childList: true,
    subtree: true
  });
}

function init(source) {
  dynamicContent = source;

  const run = () => {
    replaceInNode(document.body, source);
    setupMutationObserver(source);
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', run);
  } else {
    run();
  }
}

fetch(`/api/docs-dynamic-content`).then(async res => {
  if (!res.ok) {
    console.error('Failed to load dynamic content', res.status);
    return;
  }

  const content = await res.json();
  init(content);
});
