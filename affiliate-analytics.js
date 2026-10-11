(() => {
  'use strict';

  // Register once, even if this script is accidentally loaded again.
  if (window.__affiliateAnalyticsInitialized) return;
  window.__affiliateAnalyticsInitialized = true;
  const handledEvents = new WeakSet();

  function trackAffiliateClick(event) {
    if (event.defaultPrevented || handledEvents.has(event)) return;
    if (event.type === 'auxclick' && event.button !== 1) return;
    if (event.type === 'click' && event.button !== 0) return;

    const link = event.target instanceof Element ? event.target.closest('a[href]') : null;
    if (!link) return;
    const work = link.closest('[data-work-id][data-work-title]');
    const product = link.closest('[data-product-type]');
    if (!work || !product || !work.contains(product)) return;
    if (!['paper', 'ebook'].includes(product.dataset.productType)) return;

    try {
      if (new URL(link.href).hostname !== 'hb.afl.rakuten.co.jp') return;
      if (typeof window.gtag !== 'function') return;
      handledEvents.add(event);
      window.gtag('event', 'affiliate_click', {
        work_id: work.dataset.workId,
        work_title: work.dataset.workTitle,
        product_type: product.dataset.productType
      });
    } catch {
      // Analytics must never interrupt the link's normal navigation.
    }
  }

  // One delegated handler covers images, titles, logos and purchase buttons.
  // Keyboard activation also produces click; middle-button activation uses auxclick.
  document.addEventListener('click', trackAffiliateClick);
  document.addEventListener('auxclick', trackAffiliateClick);
})();
