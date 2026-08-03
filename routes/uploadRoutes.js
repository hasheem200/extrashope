const express = require("express");

const router = express.Router();

const multer = require("multer");

const sharp = require("sharp");

const cloudinary = require("cloudinary").v2;


const Settings = require("../models/Settings");

const path = require("path");

const fs = require("fs");

const { verifyToken, requireRole } = require("../middleware/auth");

/*
  SECURITY: the old uploader accepted ANY file with no type check
  at all — .php, .exe, .html, anything — straight into the public
  "public/uploads" folder, which is served statically (so whatever
  got uploaded became instantly and directly accessible on the
  live site). It also had zero authentication, so any anonymous
  visitor could upload arbitrary files or delete anyone else's.

  Fix: only real image files are accepted (checked by both
  extension AND mime type, not just one), a 5MB size limit is
  enforced, and only logged-in users can upload.

  PERFORMANCE: every uploaded image is also resized (max 1600px on
  the long edge — plenty for product photos/banners) and
  re-compressed with sharp. Product photos coming straight from a
  phone camera can be 4-8MB; this typically brings them down to a
  few hundred KB with no visible quality loss, which directly
  speeds up every page that displays them.
*/

const ALLOWED_IMAGE_EXTENSIONS = [".jpg", ".jpeg", ".png", ".gif", ".webp"];
const ALLOWED_IMAGE_MIMETYPES = ["image/jpeg", "image/png", "image/gif", "image/webp"];

// multer keeps the upload in memory first so sharp can process it
// before anything touches disk
const storage = multer.memoryStorage();

const upload = multer({

storage,

limits: {
    fileSize: 5 * 1024 * 1024 // 5MB
},

fileFilter: (req, file, cb) => {

    const ext = path.extname(file.originalname).toLowerCase();

    if (!ALLOWED_IMAGE_EXTENSIONS.includes(ext) || !ALLOWED_IMAGE_MIMETYPES.includes(file.mimetype)) {

        return cb(new Error("Only image files (jpg, jpeg, png, gif, webp) are allowed."));

    }

    cb(null, true);

}

});

router.post(
"/",
verifyToken,
upload.single("image"),
async (req,res)=>{

try{

if (!req.file) {
    return res.status(400).json({ message: "No valid image file was uploaded." });
}

const ext = path.extname(req.file.originalname).toLowerCase();

// GIFs can be animated — resizing with sharp would flatten them
// to a single frame, so those are saved as-is. Everything else
// gets resized + recompressed.
const filename = Date.now() + (ext === ".gif" ? ".gif" : ".jpg");

const outputPath = path.join("public/uploads", filename);

if (ext === ".gif") {

    fs.writeFileSync(outputPath, req.file.buffer);

} else {

    await sharp(req.file.buffer)
        .rotate() // auto-orient based on EXIF (phone photos)
        .resize({ width: 1600, height: 1600, fit: "inside", withoutEnlargement: true })
        .jpeg({ quality: 82 })
        .toFile(outputPath);

}

const settings = await Settings.findOne();

let imageUrl;

if (settings?.storageSettings?.storageType === "cloudinary") {

    cloudinary.config({
        cloud_name: settings.storageSettings.cloudName,
        api_key: settings.storageSettings.cloudApiKey,
        api_secret: settings.storageSettings.cloudApiSecret
    });

    const uploadOptions = {
        folder: "extrashope"
    };

    // Upload Preset is optional — only include it if the admin
    // actually set one. This was being saved in Settings but never
    // passed to Cloudinary, so it had no effect until now.
    if (settings.storageSettings.cloudPreset && settings.storageSettings.cloudPreset.trim() !== "") {
        uploadOptions.upload_preset = settings.storageSettings.cloudPreset.trim();
    }

    const uploaded = await cloudinary.uploader.upload(outputPath, uploadOptions);

    // حذف النسخة المحلية بعد نجاح الرفع
    fs.unlinkSync(outputPath);

    imageUrl = uploaded.secure_url;

} else {

    imageUrl = "/uploads/" + filename;

    if (
        settings?.siteSettings?.uploadsBaseUrl &&
        settings.siteSettings.uploadsBaseUrl.trim() !== ""
    ) {

        let base = settings.siteSettings.uploadsBaseUrl.trim();

        if (!base.endsWith("/")) {
            base += "/";
        }

        imageUrl = base + filename;
    }
}

res.json({
    image: imageUrl
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

res.status(400).json({
message: err.message || "Upload Error"
});

});

// =====================================
// GET ALL UPLOAD FILES — admin only (internal file listing)
// =====================================
router.get("/files", verifyToken, requireRole("admin"), (req, res) => {

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
// DELETE FILE — admin only, path-traversal safe
// =====================================

router.delete("/files/:name", verifyToken, requireRole("admin"), (req,res)=>{

// path.basename strips any "../" so this can never delete files
// outside the uploads folder, even if req.params.name is crafted
const safeName = path.basename(req.params.name);

const filePath =
path.join("public/uploads", safeName);

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

// NOTE: an unused "createStorage()" helper (built for
// multer-storage-cloudinary, never actually called by anything in
// this file or exported) used to sit here — removed as dead code.
// The real upload flow above already handles both local and
// Cloudinary storage directly.

module.exports = router;
