/*
  ==============================================================
  Auto-attaches the logged-in user's JWT token to every same-origin
  /api/ request, site-wide — without needing every individual
  fetch() call across every page rewritten by hand.

  This MUST be loaded before any other script on the page (it's
  inserted right before </head> on every page) so it patches
  window.fetch before anything else starts making API calls.
  ==============================================================
*/
(function () {

    const originalFetch = window.fetch;

    window.fetch = function (input, init) {

        init = init || {};

        let url = "";

        if (typeof input === "string") {
            url = input;
        } else if (input && input.url) {
            url = input.url;
        }

        const isApiCall = url.startsWith("/api/") || url.includes(window.location.origin + "/api/");

        if (isApiCall) {

            const token = localStorage.getItem("token");

            if (token) {

                if (init.headers instanceof Headers) {

                    if (!init.headers.has("Authorization")) {
                        init.headers.set("Authorization", "Bearer " + token);
                    }

                } else {

                    init.headers = Object.assign(
                        { "Authorization": "Bearer " + token },
                        init.headers || {}
                    );

                }

            }

        }

        return originalFetch(input, init);

    };

})();
