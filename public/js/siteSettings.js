let SITE_SETTINGS = {};

async function applySiteSettings() {

    try {

        const res = await fetch("/api/settings");
        const data = await res.json();

        SITE_SETTINGS = data.siteSettings || {};

        // ---------- Site Title ----------
        if (SITE_SETTINGS.siteTitle) {
            document.title = SITE_SETTINGS.siteTitle;
        }

        // ---------- Meta Description ----------
        if (SITE_SETTINGS.metaDescription) {

            let meta = document.querySelector('meta[name="description"]');

            if (!meta) {

                meta = document.createElement("meta");
                meta.name = "description";
                document.head.appendChild(meta);

            }

            meta.content = SITE_SETTINGS.metaDescription;

        }

        // ---------- Meta Keywords ----------
        if (SITE_SETTINGS.metaKeywords) {

            let meta = document.querySelector('meta[name="keywords"]');

            if (!meta) {

                meta = document.createElement("meta");
                meta.name = "keywords";
                document.head.appendChild(meta);

            }

            meta.content = SITE_SETTINGS.metaKeywords;

        }

        // ---------- Favicon ----------
        if (SITE_SETTINGS.favicon) {

            let icon = document.querySelector("link[rel='icon']");

            if (!icon) {

                icon = document.createElement("link");
                icon.rel = "icon";
                document.head.appendChild(icon);

            }

            icon.href = SITE_SETTINGS.favicon;

        }

        // ---------- Apple Icon ----------
        if (SITE_SETTINGS.appleIcon) {

            let apple = document.querySelector("link[rel='apple-touch-icon']");

            if (!apple) {

                apple = document.createElement("link");
                apple.rel = "apple-touch-icon";
                document.head.appendChild(apple);

            }

            apple.href = SITE_SETTINGS.appleIcon;

        }

        // ---------- MS Tile ----------
        if (SITE_SETTINGS.tileImage) {

            let tile = document.querySelector('meta[name="msapplication-TileImage"]');

            if (!tile) {

                tile = document.createElement("meta");
                tile.name = "msapplication-TileImage";
                document.head.appendChild(tile);

            }

            tile.content = SITE_SETTINGS.tileImage;

        }

        // ---------- Logo ----------
        const logo = document.querySelector(".logo img");

        if (logo && SITE_SETTINGS.logo) {

            logo.src = SITE_SETTINGS.logo;

        }

        console.log("✅ Site Settings Loaded");

    } catch (err) {

        console.log(err);

    }

}