const productsDiv =
document.getElementById("allProducts");

let allProducts = [];

let filteredProducts = [];

let currentPage = 1;
const productsPerPage = 32;




/* LOAD PRODUCTS */

async function loadProducts(){

try{

if (typeof showLoading === "function") showLoading();

const res = await fetch("/api/products");

const products = await res.json();

allProducts = products.sort(
(a,b)=>
new Date(b.createdAt) - new Date(a.createdAt)
);

filteredProducts = [...allProducts];

displayProducts(filteredProducts);

}catch(err){

console.log(err);

// previously this failed silently — the user just saw an
// empty page with no explanation of what went wrong
if (typeof toast === "function") {
    toast("Couldn't load products. Please check your connection and try again.", "error");
}

}finally{

if (typeof hideLoading === "function") hideLoading();

}

}

/* DISPLAY PRODUCTS */

function displayProducts(products){

productsDiv.innerHTML = "";

const start =
(currentPage - 1) * productsPerPage;

const end =
start + productsPerPage;

const pageProducts =
products.slice(start,end);


pageProducts.forEach(product => {

productsDiv.innerHTML += `

<div class="card">

<img loading="lazy" src="${product.image}">

<h4>
<a href="product.html?id=${product.id}">
${product.name}
</a>
</h4>

<p class="category">
📂 ${product.category || "General"}
</p>

<p class="price">
$${product.price}
</p>

<div class="buttons">

<button
onclick="window.location.href='product?id=${product.id}'">
🛒 Product Details
</button>

<button onclick='addToWishlist(${JSON.stringify(product)})'>
❤️
</button>

</div>

</div>

`;

});
renderPagination(products);
}

/* ADD TO CART */

function addToCart(id){

let cart =
JSON.parse(localStorage.getItem("cart")) || [];

const product =
allProducts.find(product => product.id == id);

if(!product){

toast("Product Not Found");

return;

}

cart.push(product);

localStorage.setItem(
"cart",
JSON.stringify(cart)
);

updateCartCount();

toast("Added To Cart 🛒");

}

/* WISHLIST */

function addToWishlist(product){

let wishlist =
JSON.parse(localStorage.getItem("wishlist")) || [];

wishlist.push(product);

localStorage.setItem(
"wishlist",
JSON.stringify(wishlist)
);

toast(product.name + " added to wishlist ❤️");

}

/* CART COUNT */

function updateCartCount(){

let cart =
JSON.parse(localStorage.getItem("cart")) || [];

document.getElementById("cart-count").innerText =
cart.length;

}

/* USER */

function loadUser(){

const userArea =
document.getElementById("userArea");

const welcomeText =
document.getElementById("welcomeText");

const userId =
document.getElementById("userId");

const loggedIn =
localStorage.getItem("loggedIn");

const user =
JSON.parse(localStorage.getItem("user"));

if(loggedIn === "true" && user){

welcomeText.innerHTML =
`Welcome, ${user.nickname}!`;

userId.innerHTML =
`🆔 ID: ${user.id || "0000"}`;

userArea.innerHTML = `

<a href="profile.html">
Profile
</a>

|

<a href="#"
onclick="logout()">
Logout
</a>

`;

}else{

welcomeText.innerHTML =
"Welcome, Guest";

userId.innerHTML = "";

userArea.innerHTML = `

<a href="login.html"
class="login-btn">
Login
</a>

`;

}

}

/* LOGOUT */

function logout() {

    // حذف حالة تسجيل الدخول القديمة
    localStorage.removeItem("loggedIn");

    // حذف بيانات المستخدم
    localStorage.removeItem("user");

    // حذف أي Token مستخدم
    localStorage.removeItem("token");
    localStorage.removeItem("authToken");

    // تنظيف Page Access redirect marker
    sessionStorage.removeItem("__pageAccessRedirect");

    // العودة للصفحة الرئيسية كـ Visitor
    window.location.replace("/index.html");
}

/* DARK MODE */

function toggleDarkMode(){

document.body.classList.toggle("dark");

if(document.body.classList.contains("dark")){

localStorage.setItem("darkMode", "on");

}else{

localStorage.setItem("darkMode", "off");

}

}

if(localStorage.getItem("darkMode") === "on"){

document.body.classList.add("dark");

}

/* SLIDER */

let currentSlide = 0;

const slides =
document.querySelectorAll(".slide");

function showSlide(index) {
    if (!slides || slides.length === 0) {
        return;
    }

    if (index < 0 || index >= slides.length) {
        return;
    }

    slides.forEach(slide => {
        slide.classList.remove("active");
    });

    slides[index].classList.add("active");
}

function nextSlide() {
    if (!slides || slides.length === 0) {
        return;
    }

    currentSlide++;

    if (currentSlide >= slides.length) {
        currentSlide = 0;
    }

    showSlide(currentSlide);
}

function prevSlide() {
    if (!slides || slides.length === 0) {
        return;
    }

    currentSlide--;

    if (currentSlide < 0) {
        currentSlide = slides.length - 1;
    }

    showSlide(currentSlide);
}

if (slides.length > 0) {
    showSlide(0);

    setInterval(() => {
        nextSlide();
    }, 4000);
}



document.getElementById("searchInput")
.addEventListener("keyup", applyFilters);

document.getElementById("searchInput")
.addEventListener("input", showSearchSuggestions);

document.addEventListener("click", (e) => {

    const box = document.getElementById("searchSuggestions");

    if (box && !e.target.closest(".search-box")) {
        box.classList.remove("suggestions-visible");
    }

});

function showSearchSuggestions(){

    const box = document.getElementById("searchSuggestions");

    if (!box) return;

    const query = document.getElementById("searchInput").value.trim().toLowerCase();

    if (query.length < 2) {
        box.classList.remove("suggestions-visible");
        box.innerHTML = "";
        return;
    }

    const matches = allProducts
        .filter(p => (p.name || "").toLowerCase().includes(query))
        .slice(0, 6);

    if (matches.length === 0) {
        box.classList.remove("suggestions-visible");
        box.innerHTML = "";
        return;
    }

    box.innerHTML = matches.map(p => `
        <div class="suggestion-item" onclick="window.location.href='product?id=${p.id}'">
            <img loading="lazy" src="${p.image}">
            <span>${p.name}</span>
        </div>
    `).join("");

    box.classList.add("suggestions-visible");

}

document.getElementById("filterCategory")
.addEventListener("change", applyFilters);

document.getElementById("filterType")
.addEventListener("change", applyFilters);

document.getElementById("sortPrice")
.addEventListener("change", applyFilters);

/* START */

updateCartCount();

async function loadPromotedProducts(){

try{

const res =
await fetch("/api/products/promoted/list");

const products =
await res.json();

console.log("PROMOTED:", products);

const container =
document.getElementById("promotedProducts");

console.log("CONTAINER:", container);

if(!container) return;

container.innerHTML = "";

products.forEach(product => {

container.innerHTML += `

<div class="promo-banner"
onclick="window.location.href='product?id=${product.id}'">

<img loading="lazy" src="${product.image}">

<div class="promo-info">

<h1>🔥 Sponsored Product</h1>

<h2>${product.name}</h2>

<p>
Only $${product.price}
</p>

<button>
🛒 View Product
</button>

</div>

</div>

`;

});

}catch(err){

console.log(err);

}

}


window.onload = function(){

loadUser();

updateCartCount();

loadProducts();

loadPromotedProducts();

// loadSidebarPromoted();

}

function addNotification(text){

let notifications =
JSON.parse(localStorage.getItem("notifications")) || [];

notifications.push({

text,

date:new Date().toLocaleString()

});

localStorage.setItem(

"notifications",

JSON.stringify(notifications)

);

}

addNotification(
"New Product Added ✅"
);

addNotification(
"New Order Created 🧾"
);




function renderPagination(products){

const totalPages =
Math.ceil(products.length / productsPerPage);

let html = "";

if(totalPages <= 1){

document.getElementById("pagination").innerHTML = "";

return;

}

html += `
<button
onclick="changePage(${currentPage - 1})"
${currentPage === 1 ? "disabled" : ""}

>

◀ Previous </button>
`;

for(let i=1;i<=totalPages;i++){

html += `
<button
onclick="changePage(${i})"
style="
margin:3px;
${currentPage === i ?
"background:#00c853;color:white;"
:
""}
"

>

${i} </button>
`;

}

html += `
<button
onclick="changePage(${currentPage + 1})"
${currentPage === totalPages ? "disabled" : ""}

>

Next ▶ </button>
`;

document.getElementById(
"pagination"
).innerHTML = html;

}

function changePage(page){

const totalPages =
Math.ceil(filteredProducts.length / productsPerPage);

if(page < 1) return;

if(page > totalPages) return;

currentPage = page;

displayProducts(filteredProducts);

renderPagination(filteredProducts);

window.scrollTo({
top:0,
behavior:"smooth"
});

}

function applyFilters(){

const category =
document.getElementById("filterCategory").value;

const type =
document.getElementById("filterType").value;

const sort =
document.getElementById("sortPrice").value;

const search =
document.getElementById("searchInput")
.value
.toLowerCase();

filteredProducts =
allProducts.filter(
p =>
!p.promoted ||
new Date(p.promotionEnd) < new Date()
);

if(category !== "all"){

filteredProducts =
filteredProducts.filter(product =>

(product.category || "") === category

);

}

if(type !== "all"){

filteredProducts =
filteredProducts.filter(product =>

(product.type || "") === type

);

}

if(search){

filteredProducts =
filteredProducts.filter(product =>

(product.name || "")
.toLowerCase()
.includes(search)

||

(product.category || "")
.toLowerCase()
.includes(search)

);

}

if(sort === "low"){

filteredProducts.sort(
(a,b)=>
Number(a.price) -
Number(b.price)
);

}

if(sort === "high"){

filteredProducts.sort(
(a,b)=>
Number(b.price) -
Number(a.price)
);

}

currentPage = 1;

displayProducts(filteredProducts);

}

/* ===========================
   HERO PROMOTION SLIDER
=========================== */

let heroIndex = 0;
let heroProducts = [];

async function loadHeroPromotions(){

    const res = await fetch("/api/products");

    const products = await res.json();

    heroProducts = products.filter(p =>

    p.promoted &&
    p.promotionEnd &&
    new Date(p.promotionEnd) > new Date()

);

    if(heroProducts.length === 0){

        document.querySelector(".hero-slider").style.display = "none";
        return;

    }

    renderHero();

    setInterval(nextHero,5000);

}

function renderHero(){

    const heroSlides =
    document.getElementById("heroSlides");

    const heroDots =
    document.getElementById("heroDots");

    heroSlides.innerHTML = "";
    heroDots.innerHTML = "";

    heroProducts.forEach((product,i)=>{

        heroSlides.innerHTML += `

<div class="heroItem ${i===heroIndex?"active":""}">

<img loading="lazy" src="${product.image}">

<div class="heroOverlay">

<div class="heroContent">

<h1>${product.name}</h1>

<p>${product.description || ""}</p>

<a href="product.html?id=${product.id}"
class="heroBtn">

🛒 View Product

</a>

</div>

</div>

</div>

`;

        heroDots.innerHTML += `
<span class="${i===heroIndex?"active":""}"></span>
`;

    });

}

function nextHero(){

    heroIndex++;

    if(heroIndex >= heroProducts.length){

        heroIndex = 0;

    }

    renderHero();

}

function prevHero(){

    heroIndex--;

    if(heroIndex < 0){

        heroIndex = heroProducts.length-1;

    }

    renderHero();

}

document.querySelector(".heroNext")
.onclick = nextHero;

document.querySelector(".heroPrev")
.onclick = prevHero;

loadHeroPromotions();