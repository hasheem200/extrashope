/*
  ==============================================================
  Page Access Control — actual enforcement.

  Admin -> Page Access Control lets an admin decide which roles
  (Visitor / Buyer / Seller / Admin) may view each page. That page
  already existed but had NO backend and NO enforcement anywhere —
  saving a change did nothing, and every page was reachable by
  everyone regardless of what was configured. This is what makes
  it actually work.

  Runs on every page (loaded right after auth-fetch.js, before any
  page-specific script) and, if the current page isn't allowed for
  the current visitor's role, redirects them away immediately.

  Design notes:
  - A page with NO matching rule is allowed by default (open
    unless the admin explicitly restricts it) — this is what keeps
    every page working exactly as before until an admin actually
    configures a restriction, instead of silently locking
    everything down the moment this script is added everywhere.
  - This is a client-side gate, same as the existing requireRole()
    pattern already used across the site (js/auth.js) — the real
    security boundary is still the server-side auth middleware on
    every API route, which nothing here changes or weakens. This
    adds the missing "don't even show the page" layer on top.
  ==============================================================
*/

(function () {

    async function enforcePageAccess() {

        try {

            const res = await fetch("/api/page-access");

            if (!res.ok) return; // fail open — don't lock the site out if the check itself fails

            const rules = await res.json();

            if (!Array.isArray(rules) || rules.length === 0) return;

            // normalize the current path the same way the admin
            // panel stores it: no trailing slash (except root),
            // no ".html" (the site uses clean URLs everywhere)
            function normalizePath(p) {

                let x = (p || "")
                    .replace(/\/+$/, "")
                    .replace(/\.html$/, "");

                // the homepage is reachable as "/", "/index" and
                // "/index.html" depending on whether the value came
                // from window.location.pathname or from a saved
                // admin rule — treat them all as the same page.
                if (x === "" || x === "/index") x = "/";

                return x;

            }

            let currentPath = normalizePath(window.location.pathname);

            const rule = rules.find(r => normalizePath(r.path) === currentPath);

            if (!rule) {
                sessionStorage.removeItem("__pageAccessRedirect");
                return; // no rule configured for this page — allow it
            }

            const user = JSON.parse(localStorage.getItem("user") || "null");

            const role = user && user.role ? user.role : "visitor";

            const allowed = rule[role] === true;

            if (allowed) {
                // clear any stale marker from a previous redirect —
                // reaching an allowed page means we're not mid-loop
                sessionStorage.removeItem("__pageAccessRedirect");
                return;
            }

            // SAFETY NET: if the admin's own configuration creates
            // a cycle (e.g. they accidentally block "seller" from
            // /seller-dashboard itself, which is exactly where a
            // blocked seller would normally be sent), don't loop
            // forever — detect a redirect that just happened back
            // to the same page+role and fail open instead.
            const redirectMarker = `${currentPath}->${role}`;
            const lastRedirect = sessionStorage.getItem("__pageAccessRedirect");

            if (lastRedirect === redirectMarker) {
                console.log("Page access: redirect loop detected, allowing through instead of looping forever.");
                sessionStorage.removeItem("__pageAccessRedirect");
                return;
            }

            sessionStorage.setItem("__pageAccessRedirect", redirectMarker);

            // Blocked — send them somewhere sensible instead of a
            // blank/broken page.
            if (!user) {

                window.location.href = "/login";

            } else if (user.role === "seller") {

                window.location.href = "/seller-dashboard";

            } else if (user.role === "admin") {

                window.location.href = "/admin";

            } else {

                window.location.href = "/";

            }

        } catch (err) {

            // fail open — a network hiccup here should never trap
            // someone out of a page they're actually allowed to see
            console.log("Page access check failed:", err.message);

        }

    }

    enforcePageAccess();

})();
