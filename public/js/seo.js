/*
  ==============================================================
  Reusable SEO tag injector — meta description, Open Graph, and
  Twitter Card tags. Sitemap/robots.txt/page titles were already
  handled elsewhere; this fills in the remaining gap (this project
  had ZERO meta description, OG, or Twitter Card tags anywhere).

  Call setSeoTags({...}) from a page's existing settings-loading
  script once site/product/seller data is available. Any field
  can be omitted — sensible fallbacks are used.
  ==============================================================
*/

function setSeoTags(opts) {

    opts = opts || {};

    const title = opts.title || document.title;
    const description = opts.description || "";
    const image = opts.image || "";
    const url = opts.url || window.location.href;
    const siteName = opts.siteName || "";
    const type = opts.type || "website";

    function upsertMeta(attr, key, content) {

        if (!content) return;

        let el = document.querySelector(`meta[${attr}="${key}"]`);

        if (!el) {
            el = document.createElement("meta");
            el.setAttribute(attr, key);
            document.head.appendChild(el);
        }

        el.setAttribute("content", content);

    }

    // Standard meta description (what shows under the title in
    // Google search results)
    upsertMeta("name", "description", description);

    // Open Graph (Facebook, WhatsApp, LinkedIn, Discord previews)
    upsertMeta("property", "og:title", title);
    upsertMeta("property", "og:description", description);
    upsertMeta("property", "og:image", image);
    upsertMeta("property", "og:url", url);
    upsertMeta("property", "og:type", type);
    upsertMeta("property", "og:site_name", siteName);

    // Twitter Card
    upsertMeta("name", "twitter:card", image ? "summary_large_image" : "summary");
    upsertMeta("name", "twitter:title", title);
    upsertMeta("name", "twitter:description", description);
    upsertMeta("name", "twitter:image", image);

}
