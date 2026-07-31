const express = require("express");
const router = express.Router();

const fs = require("fs");
const path = require("path");
const multer = require("multer");

const MANAGE_DIR = path.join(__dirname,"../public/manage");

// إنشاء المجلد إذا لم يكن موجوداً
if(!fs.existsSync(MANAGE_DIR)){
    fs.mkdirSync(MANAGE_DIR,{recursive:true});
}

// ===============================
// Upload
// ===============================

const storage = multer.diskStorage({

destination:(req,file,cb)=>{

cb(null,MANAGE_DIR);

},

filename:(req,file,cb)=>{

cb(
null,
Date.now() + "-" + file.originalname
);

}

});

const upload = multer({storage});

// رفع ملف

router.post("/upload",upload.single("file"),(req,res)=>{

res.json({

success:true,

url:"/manage/" + req.file.filename,

name:req.file.filename

});

});

// ===============================
// List Files
// ===============================

router.get("/files",(req,res)=>{

const files =
fs.readdirSync(MANAGE_DIR);

const list = files.map(file=>{

const stat =
fs.statSync(path.join(MANAGE_DIR,file));

return{

name:file,

url:"/manage/"+file,

size:stat.size,

created:stat.birthtime

};

});

res.json(list);

});

// ===============================
// Delete
// ===============================

router.delete("/files/:name",(req,res)=>{

const file =
path.join(MANAGE_DIR,req.params.name);

if(fs.existsSync(file)){

fs.unlinkSync(file);

}

res.json({

success:true

});

});

module.exports = router;