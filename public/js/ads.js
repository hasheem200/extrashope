let mobileAds = [];
let mobileIndex = 0;
let mobileTimer = null;

async function loadMobileAds(){

    const res = await fetch("/api/ads/live");
    const ads = await res.json();

    mobileAds = ads.filter(
        ad => ad.bannerType === "mobile"
    );

    if(mobileAds.length===0){

        document.getElementById("mobileBanner").innerHTML="";

        return;

    }

    showMobileBanner();

    if(mobileTimer){

        clearInterval(mobileTimer);

    }

    if(mobileAds.length>1){

        mobileTimer =
        setInterval(showMobileBanner,5000);

    }

}function showMobileBanner(){

    const ad = mobileAds[mobileIndex];

    const html = ad.website
    ? `
    <a href="${ad.website}" target="_blank">
        <img
        src="${ad.bannerImage}"
        style="
        width:320px;
        height:50px;
        border-radius:8px;
        object-fit:cover;
        ">
    </a>
    `
    :
    `
    <img
    src="${ad.bannerImage}"
    style="
    width:320px;
    height:50px;
    border-radius:8px;
    object-fit:cover;
    ">
    `;

    document.getElementById("mobileBanner").innerHTML = html;

    mobileIndex++;

    if(mobileIndex>=mobileAds.length){

        mobileIndex=0;

    }

}

let longRightAds = [];
let longLeftAds = [];

let longRightIndex = 0;
let longLeftIndex = 0;

let longRightTimer = null;
let longLeftTimer = null;

async function loadLongAds(){

    const res = await fetch("/api/ads/live");

    const ads = await res.json();

    const longs = ads.filter(
        ad => ad.bannerType === "long"
    );

    longRightAds = [];
    longLeftAds = [];

    longs.forEach((ad,index)=>{

        if(index % 2 === 0){

            longRightAds.push(ad);

        }else{

            longLeftAds.push(ad);

        }

    });

    showRightLong();
    showLeftLong();

    if(longRightTimer) clearInterval(longRightTimer);
    if(longLeftTimer) clearInterval(longLeftTimer);

    if(longRightAds.length>1){

        longRightTimer =
        setInterval(showRightLong,5000);

    }

    if(longLeftAds.length>1){

        longLeftTimer =
        setInterval(showLeftLong,5000);

    }

}

function showRightLong(){

    if(longRightAds.length===0) return;

    const ad = longRightAds[longRightIndex];

    document.getElementById("longRight").innerHTML=`

    <a href="${ad.website}" target="_blank">

    <img
    src="${ad.bannerImage}"
    style="
    width:200px;
    height:600px;
    border-radius:10px;
    object-fit:cover;
    ">

    </a>

    `;

    longRightIndex++;

    if(longRightIndex>=longRightAds.length){

        longRightIndex=0;

    }

}

function showLeftLong(){

    if(longLeftAds.length===0) return;

    const ad = longLeftAds[longLeftIndex];

    document.getElementById("longLeft").innerHTML=`

    

    <a href="${ad.website}" target="_blank">

    <img
    src="${ad.bannerImage}"
    style="
    width:200px;
    height:600px;
    border-radius:10px;
    object-fit:cover;
    ">

    </a>


    `;

    longLeftIndex++;

    if(longLeftIndex>=longLeftAds.length){

        longLeftIndex=0;

    }

}



let rightAds = [];
let leftAds = [];

let rightIndex = 0;
let leftIndex = 0;

let rightTimer = null;
let leftTimer = null;

async function loadRectangleAds(){

    const res = await fetch("/api/ads/live");
    const ads = await res.json();

    const rectangles =
    ads.filter(ad=>ad.bannerType==="rectangle");

    rightAds = [];
    leftAds = [];

    rectangles.forEach((ad,index)=>{

        if(index % 2 === 0){

            rightAds.push(ad);

        }else{

            leftAds.push(ad);

        }

    });

    showRightRectangle();
    showLeftRectangle();

    if(rightTimer) clearInterval(rightTimer);
    if(leftTimer) clearInterval(leftTimer);

    if(rightAds.length>1){

        rightTimer =
        setInterval(showRightRectangle,5000);

    }

    if(leftAds.length>1){

        leftTimer =
        setInterval(showLeftRectangle,5000);

    }

}

function showRightRectangle(){

    if(rightAds.length===0) return;

    const ad = rightAds[rightIndex];

    document.getElementById("rectangleRight").innerHTML=`

    <a href="${ad.website}" target="_blank">

    <img
    src="${ad.bannerImage}"
    style="
    width:190px;
    height:280px;
    border-radius:10px;
    object-fit:cover;
    ">

    </a>

    `;

    rightIndex++;

    if(rightIndex>=rightAds.length){

        rightIndex=0;

    }

}

function showLeftRectangle(){

    if(leftAds.length===0) return;

    const ad = leftAds[leftIndex];

    document.getElementById("rectangleLeft").innerHTML=`

    <a href="${ad.website}" target="_blank">

    <img
    src="${ad.bannerImage}"
    style="
    width:190px;
    height:280px;
    border-radius:10px;
    object-fit:cover;
    ">

    </a>

    `;

    leftIndex++;

    if(leftIndex>=leftAds.length){

        leftIndex=0;

    }

}

async function loadPromotionHero(){

    const products = await fetch("/api/products")
    .then(r => r.json());

    const now = Date.now();

    const promoted = products.filter(p =>
        p.promotedUntil &&
        new Date(p.promotedUntil).getTime() > now
    );

    const box = document.getElementById("promotionHero");

    if(promoted.length > 0){

        const item = promoted[0];

        box.innerHTML = `
        <div class="hero-banner">
            <a href="product.html?id=${item.productId}">
                <img src="${item.cover}" alt="${item.name}">
            </a>
        </div>
        `;

    }else{

        box.innerHTML = `
        <div class="hero-banner advertise-banner">
            <a href="promotions.html">
                <img src="/images/promotion-banner.png" alt="Advertise">
            </a>
        </div>
        `;

    }

}



/* ===========================
   LIVE ADS
=========================== */

let topAds = [];
let topIndex = 0;
let topTimer = null;

async function loadTopAds(){

    const res = await fetch("/api/ads/live");
    const ads = await res.json();

    topAds = ads.filter(ad => ad.bannerType === "top");

    if(topAds.length === 0){

        document.getElementById("topLeaderboard").innerHTML = "";
        return;

    }

    showTopBanner();

    if(topTimer){

        clearInterval(topTimer);

    }

    topTimer = setInterval(showTopBanner,6000);

}

function showTopBanner(){

    if(topAds.length===0) return;

    const box = document.getElementById("topLeaderboard");

    box.style.opacity = "0";

    setTimeout(()=>{

        const ad = topAds[topIndex];

        box.innerHTML = `
        <a href="${ad.website}" target="_blank">
            <img
            src="${ad.bannerImage}"
            style="
            width:728px;
            height:150px;
            object-fit:cover;
            border-radius:10px;
            ">
        </a>
        `;

        box.style.opacity = "1";

        topIndex++;

        if(topIndex >= topAds.length){

            topIndex = 0;

        }

    },400);

}

// ============================================
// تحميل إعدادات الموقع وتطبيقها على الصفحة
// ============================================
async function applySiteSettings() {
    try {
        const res = await fetch("/api/settings");
        const data = await res.json();
        const s = data.siteSettings || {};

        // ---------- 1. Site Name & Title ----------
        if (s.siteTitle) {
            document.title = s.siteTitle;
        }

        if (s.siteName) {
            // تغيير اسم الموقع في الهيدر
            const logoEl = document.querySelector(".logo");
            if (logoEl) {
                // إذا كان هناك صورة شعار نعدل الصورة
                const img = logoEl.querySelector("img");
                if (img && s.logo) {
                    img.src = s.logo;
                    img.alt = s.siteName;
                } else {
                    // وإلا نعدل النص
                    logoEl.textContent = s.siteName;
                }
            }
        }

        // ---------- 2. Logo & Icons ----------
        // تغيير الفافيكون
        if (s.favicon) {
            const faviconLink = document.querySelector('link[rel="icon"]');
            if (faviconLink) {
                faviconLink.href = s.favicon;
            } else {
                const link = document.createElement('link');
                link.rel = 'icon';
                link.href = s.favicon;
                document.head.appendChild(link);
            }
        }

        // Apple Touch Icon
        if (s.appleIcon) {
            const appleLink = document.querySelector('link[rel="apple-touch-icon"]');
            if (appleLink) {
                appleLink.href = s.appleIcon;
            } else {
                const link = document.createElement('link');
                link.rel = 'apple-touch-icon';
                link.href = s.appleIcon;
                document.head.appendChild(link);
            }
        }

        // MS Tile Image
        if (s.tileImage) {
            const tileMeta = document.querySelector('meta[name="msapplication-TileImage"]');
            if (tileMeta) {
                tileMeta.content = s.tileImage;
            } else {
                const meta = document.createElement('meta');
                meta.name = 'msapplication-TileImage';
                meta.content = s.tileImage;
                document.head.appendChild(meta);
            }
        }

        // ---------- 3. SEO (Meta Tags) ----------
        if (s.metaDescription) {
            let metaDesc = document.querySelector('meta[name="description"]');
            if (!metaDesc) {
                metaDesc = document.createElement('meta');
                metaDesc.name = 'description';
                document.head.appendChild(metaDesc);
            }
            metaDesc.content = s.metaDescription;
        }

        if (s.metaKeywords) {
            let metaKeywords = document.querySelector('meta[name="keywords"]');
            if (!metaKeywords) {
                metaKeywords = document.createElement('meta');
                metaKeywords.name = 'keywords';
                document.head.appendChild(metaKeywords);
            }
            metaKeywords.content = s.metaKeywords;
        }

        // ---------- 4. Google AdSense ----------
        if (s.adsense) {
            // إزالة أي سكربت AdSense قديم
            document.querySelectorAll('script[src*="pagead2.googlesyndication.com"]')
                .forEach(el => el.remove());

            const script = document.createElement('script');
            script.src = `https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${s.adsense}`;
            script.async = true;
            script.crossOrigin = 'anonymous';
            document.head.appendChild(script);
        }

        // ---------- 5. Google Analytics ----------
        if (s.analytics) {
            // إزالة أي سكربت Analytics قديم
            document.querySelectorAll('script[src*="googletagmanager.com"], script[src*="google-analytics.com"]')
                .forEach(el => el.remove());

            // Google Analytics 4 (GA4)
            const script1 = document.createElement('script');
            script1.async = true;
            script1.src = `https://www.googletagmanager.com/gtag/js?id=${s.analytics}`;
            document.head.appendChild(script1);

            const script2 = document.createElement('script');
            script2.innerHTML = `
                window.dataLayer = window.dataLayer || [];
                function gtag(){dataLayer.push(arguments);}
                gtag('js', new Date());
                gtag('config', '${s.analytics}');
            `;
            document.head.appendChild(script2);
        }

        // ---------- 6. Custom HTML (Head) ----------
       document.querySelectorAll(".dynamic-head-html").forEach(e => e.remove());

if (s.headHtml) {

    const wrapper = document.createElement("div");
    wrapper.innerHTML = s.headHtml;

    [...wrapper.children].forEach(el => {

        el.classList.add("dynamic-head-html");

        document.head.appendChild(el);

    });

}
// تطبيق الأيقونة واسم الموقع
if (s.siteIcon) {
    const iconEl = document.getElementById('siteIconDisplay');
    if (iconEl) {
        // إذا كان رابط صورة
        if (s.siteIcon.startsWith('http') || s.siteIcon.startsWith('/')) {
            iconEl.innerHTML = `<img src="${s.siteIcon}" style="height:24px;width:24px;vertical-align:middle;">`;
        } else {
            iconEl.textContent = s.siteIcon; // إيموجي
        }
    }
}

if (s.siteName) {
    const nameEl = document.getElementById('siteNameDisplay');
    if (nameEl) {
        nameEl.textContent = s.siteName;
    }
}
        // ---------- 7. Custom HTML (Footer) ----------
        if (s.footerHtml) {
            // إزالة أي كود مخصص سابق
            document.querySelectorAll('.custom-footer-html').forEach(el => el.remove());

            // إيجاد الـ footer أو body
            const footer = document.querySelector('footer') || document.body;

            const div = document.createElement('div');
            div.className = 'custom-footer-html';
            div.innerHTML = s.footerHtml;

            // إضافة العناصر مباشرة
            while (div.children.length > 0) {
                footer.appendChild(div.children[0]);
            }
            div.remove();
        }

        // ---------- 8. SMTP Settings (للإيميل) ----------
        // تخزين في localStorage للاستخدام في صفحات أخرى
        if (s.smtpUser) localStorage.setItem('smtpUser', s.smtpUser);
        if (s.senderName) localStorage.setItem('senderName', s.senderName);

        console.log('✅ Website settings applied successfully');

    } catch (error) {
        console.error('❌ Failed to load website settings:', error);
    }
}







applySiteSettings()
// تنفيذ الدالة عند تحميل الصفحة
document.addEventListener('DOMContentLoaded', applySiteSettings);

loadTopAds();

loadRectangleAds();

loadPromotionHero();

loadLongAds();

loadMobileAds();
