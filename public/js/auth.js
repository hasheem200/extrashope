const user =
JSON.parse(
localStorage.getItem("user")
);

if(!user){

window.location.href =
"login.html";

}

function requireRole(role){

if(!user){

window.location.href =
"login.html";
return;

}

if(user.role !== role){

if(user.role === "buyer"){

window.location.href =
"index.html";

}
else if(user.role === "seller"){

window.location.href =
"seller-dashboard.html";

}
else if(user.role === "admin"){

window.location.href =
"admin.html";

}

}

}