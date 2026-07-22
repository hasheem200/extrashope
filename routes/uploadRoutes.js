const express = require("express");

const router = express.Router();

const multer = require("multer");

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
(req,res)=>{

console.log(req.file);

res.json({
image:
"/uploads/" + req.file.filename
});

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

module.exports = router;