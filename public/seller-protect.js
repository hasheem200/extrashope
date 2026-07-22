const user =
JSON.parse(localStorage.getItem("user"));

if(!user){

window.location.href =
"login.html";

}

if(

user.role !== "seller" &&

user.role !== "admin"

){

alert("Seller Access Only ❌");

window.location.href = "/";

}