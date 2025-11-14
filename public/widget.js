/**
 * Closelook SDK - Embeddable Widget Script
 * This script can be embedded in any e-commerce site
 */

(function() {
  'use strict';

  // Configuration
  const CONFIG = {
    apiUrl: window.CLOSELOOK_API_URL || 'https://your-domain.com',
    shopDomain: window.location.hostname,
    sessionId: null,
    widgetId: 'closelook-widget',
  };

  // Generate session ID
  function generateSessionId() {
    return 'session_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
  }

  // Initialize session
  function initSession() {
    let sessionId = localStorage.getItem('closelook_session_id');
    if (!sessionId) {
      sessionId = generateSessionId();
      localStorage.setItem('closelook_session_id', sessionId);
    }
    CONFIG.sessionId = sessionId;
  }

  // Get current product from page
  function getCurrentProduct() {
    // Try to extract product info from common e-commerce patterns
    const product = {
      id: null,
      title: null,
      price: null,
      image: null,
      category: null,
    };

    // Try meta tags
    const metaTitle = document.querySelector('meta[property="og:title"]');
    if (metaTitle) {
      product.title = metaTitle.getAttribute('content');
    }

    const metaPrice = document.querySelector('meta[property="product:price:amount"]');
    if (metaPrice) {
      product.price = parseFloat(metaPrice.getAttribute('content')) * 100; // Convert to cents
    }

    const metaImage = document.querySelector('meta[property="og:image"]');
    if (metaImage) {
      product.image = metaImage.getAttribute('content');
    }

    // Try structured data (JSON-LD)
    const jsonLd = document.querySelector('script[type="application/ld+json"]');
    if (jsonLd) {
      try {
        const data = JSON.parse(jsonLd.textContent);
        if (data['@type'] === 'Product' || data['@type'] === 'http://schema.org/Product') {
          product.id = data.sku || data.productID || null;
          product.title = product.title || data.name || null;
          product.price = product.price || (data.offers?.price ? parseFloat(data.offers.price) * 100 : null);
          product.image = product.image || (data.image?.[0] || data.image || null);
          product.category = data.category || null;
        }
      } catch (e) {
        console.warn('Failed to parse JSON-LD:', e);
      }
    }

    // Try common class/ID patterns
    const priceElement = document.querySelector('[class*="price"], [id*="price"], [data-price]');
    if (priceElement && !product.price) {
      const priceText = priceElement.textContent || priceElement.getAttribute('data-price');
      const priceMatch = priceText?.match(/[\d.]+/);
      if (priceMatch) {
        product.price = parseFloat(priceMatch[0]) * 100;
      }
    }

    const titleElement = document.querySelector('h1[class*="product"], h1[class*="title"]');
    if (titleElement && !product.title) {
      product.title = titleElement.textContent?.trim() || null;
    }

    return product;
  }

  // Create widget container
  function createWidget() {
    // Check if widget already exists
    if (document.getElementById(CONFIG.widgetId)) {
      return;
    }

    // Create container
    const container = document.createElement('div');
    container.id = CONFIG.widgetId;
    container.style.cssText = 'position: fixed; bottom: 20px; right: 20px; z-index: 9999;';

    // Create button
    const button = document.createElement('button');
    button.innerHTML = '💬 Chat';
    button.style.cssText = `
      background: rgba(255, 255, 255, 0.1);
      backdrop-filter: blur(20px);
      border: 1px solid rgba(255, 255, 255, 0.2);
      border-radius: 50px;
      padding: 12px 24px;
      color: white;
      font-size: 16px;
      font-weight: 600;
      cursor: pointer;
      box-shadow: 0 8px 32px rgba(0, 0, 0, 0.1);
      transition: all 0.3s ease;
    `;

    button.addEventListener('mouseenter', () => {
      button.style.transform = 'scale(1.05)';
      button.style.boxShadow = '0 12px 40px rgba(0, 0, 0, 0.15)';
    });

    button.addEventListener('mouseleave', () => {
      button.style.transform = 'scale(1)';
      button.style.boxShadow = '0 8px 32px rgba(0, 0, 0, 0.1)';
    });

    button.addEventListener('click', () => {
      openChatWidget();
    });

    container.appendChild(button);
    document.body.appendChild(container);
  }

  // Open chat widget
  function openChatWidget() {
    // Create iframe for chat widget
    const iframeId = 'closelook-chat-iframe';
    let iframe = document.getElementById(iframeId);

    if (!iframe) {
      iframe = document.createElement('iframe');
      iframe.id = iframeId;
      iframe.src = `${CONFIG.apiUrl}/widget?sessionId=${CONFIG.sessionId}&shopDomain=${CONFIG.shopDomain}`;
      iframe.style.cssText = `
        position: fixed;
        bottom: 20px;
        right: 20px;
        width: 400px;
        height: 600px;
        border: none;
        border-radius: 16px;
        box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
        z-index: 10000;
        background: white;
      `;
      document.body.appendChild(iframe);
    } else {
      iframe.style.display = iframe.style.display === 'none' ? 'block' : 'none';
    }
  }

  // Notify iframe of product change
  function notifyProductChange() {
    const iframe = document.getElementById('closelook-chat-iframe');
    if (iframe && iframe.contentWindow) {
      try {
        iframe.contentWindow.postMessage({
          type: 'PRODUCT_CHANGED',
          product: getCurrentProduct()
        }, '*');
      } catch (e) {
        // Cross-origin restrictions
      }
    }
  }

  // Initialize
  function init() {
    initSession();
    createWidget();

    // Track URL changes for SPA navigation
    let lastUrl = location.href;
    let lastProduct = null;

    // Function to check for product changes
    function checkProductChange() {
      const currentUrl = location.href;
      const currentProduct = getCurrentProduct();
      
      // Check if URL changed or product data changed
      if (currentUrl !== lastUrl || JSON.stringify(currentProduct) !== JSON.stringify(lastProduct)) {
        lastUrl = currentUrl;
        lastProduct = currentProduct;
        notifyProductChange();
      }
    }

    // Listen for URL changes (for SPA navigation)
    let urlCheckInterval = setInterval(checkProductChange, 1000);
    
    // Also listen for popstate (browser back/forward)
    window.addEventListener('popstate', checkProductChange);
    
    // Listen for DOM changes that might indicate product page changes
    const observer = new MutationObserver(() => {
      checkProductChange();
    });
    
    observer.observe(document.body, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ['content', 'property']
    });

    // Initial product check
    checkProductChange();
  }

  // Auto-initialize when DOM is ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

  // Export API
  window.Closelook = {
    open: openChatWidget,
    getSessionId: () => CONFIG.sessionId,
    getCurrentProduct: getCurrentProduct,
  };
})();

