/*
  ==============================================================
  Small, dependency-free UI helpers used site-wide:
  - toast(message, type)   -> replaces jarring native alert()
  - showLoading()/hideLoading() -> visible feedback during fetch()

  Colors reuse what the site already uses elsewhere (green
  #00c853 for buttons/success, plain "red" for danger/errors,
  matching existing badge/button usage in style.css) — nothing
  new invented.
  ==============================================================
*/

(function () {

    function ensureContainer() {

        let container = document.getElementById("toast-container");

        if (!container) {

            container = document.createElement("div");
            container.id = "toast-container";
            document.body.appendChild(container);

        }

        return container;

    }

    window.toast = function (message, type) {

        type = type || "info";

        const container = ensureContainer();

        const el = document.createElement("div");
        el.className = "toast toast-" + type;
        el.textContent = message;

        container.appendChild(el);

        // trigger the slide-in transition
        requestAnimationFrame(() => el.classList.add("toast-show"));

        setTimeout(() => {

            el.classList.remove("toast-show");

            setTimeout(() => el.remove(), 300);

        }, 3500);

    };

    let loadingCount = 0;

    window.showLoading = function () {

        loadingCount++;

        let el = document.getElementById("global-loading");

        if (!el) {

            el = document.createElement("div");
            el.id = "global-loading";
            el.innerHTML = '<div class="spinner"></div>';
            document.body.appendChild(el);

        }

        el.classList.add("global-loading-visible");

    };

    window.hideLoading = function () {

        loadingCount = Math.max(0, loadingCount - 1);

        if (loadingCount === 0) {

            const el = document.getElementById("global-loading");

            if (el) el.classList.remove("global-loading-visible");

        }

    };

})();
