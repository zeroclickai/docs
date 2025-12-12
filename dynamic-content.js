let dynamicContent = null;
let isProcessing = false;
let markedLoaded = false;

function loadMarked() {
  return new Promise((resolve, reject) => {
    if (window.marked) {
      resolve(window.marked);
      return;
    }

    const script = document.createElement('script');
    script.src = 'https://cdn.jsdelivr.net/npm/marked/marked.min.js';
    script.onload = () => resolve(window.marked);
    script.onerror = reject;
    document.head.appendChild(script);
  });
}

function replaceInNode(node, source, marked) {
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

    const hasMatch = pattern.test(text);
    if (!hasMatch) return;

    pattern.lastIndex = 0;

    const newContent = text.replace(pattern, (m, name) => {
      const replacement = source[name];
      if (replacement) {
        return marked.parse(replacement);
      }
      return m;
    });

    if (newContent !== text) {
      const wrapper = document.createElement('span');
      wrapper.innerHTML = newContent;

      const parent = textNode.parentNode;
      if (parent) {
        while (wrapper.firstChild) {
          parent.insertBefore(wrapper.firstChild, textNode);
        }
        parent.removeChild(textNode);
      }
    }
  });
}

function processDocument(source, marked) {
  if (isProcessing) return;
  isProcessing = true;

  requestAnimationFrame(() => {
    replaceInNode(document.body, source, marked);
    isProcessing = false;
  });
}

function setupMutationObserver(source, marked) {
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
      processDocument(source, marked);
    }
  });

  observer.observe(document.body, {
    childList: true,
    subtree: true,
    characterData: true
  });
}

async function init(source) {
  dynamicContent = source;

  const marked = await loadMarked();

  const run = () => {
    replaceInNode(document.body, source, marked);
    setupMutationObserver(source, marked);
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
