let dynamicContent = null;
let isProcessing = false;

function replaceInNode(node, source) {
  if (!node || !source || !(node instanceof Node)) return;

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
      if (parent) {
        while (wrapper.firstChild) {
          parent.insertBefore(wrapper.firstChild, textNode);
        }
        parent.removeChild(textNode);
      }
    } else {
      textNode.textContent = text.replace(pattern, (m, name) => source[name] ?? m);
    }
  });
}

function processDocument(source) {
  if (isProcessing) return;
  isProcessing = true;

  requestAnimationFrame(() => {
    replaceInNode(document.body, source);
    isProcessing = false;
  });
}

function setupMutationObserver(source) {
  const observer = new MutationObserver((mutations) => {
    let needsProcessing = false;

    for (const mutation of mutations) {
      if (mutation.type === 'childList') {
        for (const node of mutation.addedNodes) {
          if (node.nodeType === Node.ELEMENT_NODE && node.textContent.includes('((')) {
            needsProcessing = true;
            break;
          } else if (node.nodeType === Node.TEXT_NODE && node.textContent.includes('((')) {
            needsProcessing = true;
            break;
          }
        }
      } else if (mutation.type === 'characterData') {
        if (mutation.target.textContent.includes('((')) {
          needsProcessing = true;
        }
      }

      if (needsProcessing) break;
    }

    if (needsProcessing) {
      processDocument(source);
    }
  });

  observer.observe(document.body, {
    childList: true,
    subtree: true,
    characterData: true
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
