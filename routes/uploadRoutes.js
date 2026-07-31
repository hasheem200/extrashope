const express = require("express");

const router = express.Router();

const multer = require("multer");

const Settings = require("../models/Settings");

const path = require("path");

const storage = multer.diskStorage({

destination:(req,file,cb)=>{

cb(null,"public/uploads");

},

filename:(req,file,cb)=>{

cb(
null,
Date.now() +
path.extname(file.originalname)
);

}

});

const upload = multer({
storage
});

router.post(
"/",
upload.single("image"),
async (req,res)=>{

try{

const settings = await Settings.findOne();

let imageUrl =
"/uploads/" + req.file.filename;

if(
settings &&
settings.siteSettings &&
settings.siteSettings.uploadsBaseUrl &&
settings.siteSettings.uploadsBaseUrl.trim() !== ""
){

let base =
settings.siteSettings.uploadsBaseUrl.trim();

if(!base.endsWith("/")){

base += "/";

}

imageUrl =
base + req.file.filename;

}

res.json({

image:imageUrl

});

}catch(err){

console.log(err);

res.status(500).json({

message:"Upload Error"

});

}

}
);

router.use((err,req,res,next)=>{

console.log("UPLOAD ERROR:");
console.log(err);

res.status(500).json({
message:"Upload Error",
error: err.message
});

});

const fs = require("fs");

// =====================================
// GET ALL UPLOAD FILES
// =====================================
router.get("/files", (req, res) => {

const dir = "public/uploads";

fs.readdir(dir, (err, files) => {

if (err) {

return res.status(500).json({
message: "Cannot read uploads folder"
});

}

const result = files.map(file => {

const stat = fs.statSync(`${dir}/${file}`);

return {

name: file,

url: "/uploads/" + file,

size: stat.size,

created: stat.birthtime

};

});

res.json(result);

});

});

// =====================================
// DELETE FILE
// =====================================

router.delete("/files/:name", (req,res)=>{

const fs = require("fs");

const filePath =
"public/uploads/" + req.params.name;

if(!fs.existsSync(filePath)){

return res.status(404).json({
message:"File not found"
});

}

fs.unlinkSync(filePath);

res.json({
message:"Deleted"
});

});
module.exports = router;