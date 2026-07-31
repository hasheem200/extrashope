const express = require("express");
const router = express.Router();

const Settings = require("../models/Settings");
const Product = require("../models/Product");
const User = require("../models/User");

router.get("/", async (req, res) => {

try{

const settings =
await Settings.findOne();

const siteUrl =
(settings?.siteSettings?.siteUrl || "http://localhost:5001")
.replace(/\/$/,"");

const products =
await Product.find();

const sellers =
await User.find({
role:"seller"
});

let xml = `<?xml version="1.0" encoding="UTF-8"?>

<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">

<url>
<loc>${siteUrl}/</loc>
</url>

`;

products.forEach(product=>{

xml += `

<url>
<loc>${siteUrl}/product.html?id=${product.id}</loc>
</url>

`;

});

sellers.forEach(seller=>{

xml += `

<url>
<loc>${siteUrl}/store.html?seller=${encodeURIComponent(seller.nickname)}</loc>
</url>

`;

});

xml += `

</urlset>

`;

res.header("Content-Type","application/xml");

res.send(xml);

}catch(err){

console.log(err);

res.status(500).send("Sitemap Error");

}

});

module.exports = router;