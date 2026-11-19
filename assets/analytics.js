// Conversion events for Google Analytics (GA4). The Google tag itself is in partials/head.html.
// Form submissions are reported from assets/contact-form.js as "generate_lead".
(function () {
  function send(name, params) {
    if (typeof window.gtag === 'function') window.gtag('event', name, params || {});
  }
  window.skTrack = send;

  document.addEventListener('click', function (e) {
    var a = e.target && e.target.closest ? e.target.closest('a[href]') : null;
    if (!a) return;
    var href = a.getAttribute('href') || '';
    var params = { link_url: href, link_text: (a.textContent || '').trim().slice(0, 80), page_path: location.pathname };
    if (href.indexOf('mailto:') === 0) send('email_click', params);
    else if (href.indexOf('tel:') === 0) send('phone_click', params);
    else if (href.indexOf('sms:') === 0) send('sms_click', params);
    else if (/^https:\/\/(wa\.me|api\.whatsapp\.com)\//.test(href)) send('whatsapp_click', params);
    else if (/(^|\/)#contact$|^\/free-consultation(#.*)?$/.test(href)) send('consultation_click', params);
  });
})();
