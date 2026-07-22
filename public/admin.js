async function loadAdsRevenue(){

    const res = await fetch("/api/settings");

    const settings = await res.json();

    document.getElementById("adsRevenue").innerText =
        "$" + Number(settings.adsRevenue || 0).toFixed(2);

}

loadAdsRevenue();