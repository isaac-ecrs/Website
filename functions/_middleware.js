// Cloudflare Pages Function — runs at the edge on every request.
//
// Detects the visitor's country and stamps `data-consent-region="true|false"`
// onto the <html> element so the client-side consent script knows whether GA4
// must be gated behind a banner. Policy: gate everywhere EXCEPT the US.
// (Unknown/empty country is treated as gated — the privacy-safe default.)
//
// Cloudflare Web Analytics is unaffected — it is cookieless and loads everywhere.

/* global HTMLRewriter */

export const onRequest = async (context) => {
  const response = await context.next();

  // Only rewrite HTML documents; pass assets straight through.
  const contentType = response.headers.get('content-type') || '';
  if (!contentType.includes('text/html')) return response;

  const country = context.request.headers.get('cf-ipcountry') || context.request.cf?.country || '';
  const consentRequired = country === 'US' ? 'false' : 'true';

  const rewritten = new HTMLRewriter()
    .on('html', {
      element(el) {
        el.setAttribute('data-consent-region', consentRequired);
      },
    })
    .transform(response);

  // Prevent shared/CDN caches from serving one country's variant to another.
  // `private` keeps it out of shared caches; `no-cache` forces revalidation.
  rewritten.headers.set('Cache-Control', 'private, no-cache');
  return rewritten;
};
