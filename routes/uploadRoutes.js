const express = require("express");

const router = express.Router();

const multer = require("multer");

const sharp = require("sharp");

const cloudinary = require("cloudinary").v2;
const { CloudinaryStorage } = require("multer-storage-cloudinary");


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

    const uploaded = await cloudinary.uploader.upload(outputPath, {
        folder: "extrashope"
    });

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

/*
  ==============================================================
  DIGITAL DELIVERY FILE UPLOAD — for products sold as a downloadable
  file (e.g. a template's source code .zip), instead of/alongside
  login:password credentials. Used from the seller/admin product
  forms. Stores the file the same way images are stored (Local disk
  or Cloudinary, based on Storage Settings) and returns a URL that
  gets saved on the product's "download" field. When an order for
  that product is approved, that URL is what gets emailed to the
  buyer (see routes/orderRoutes.js).

  Disk-backed (not memory) since these files can be much larger
  than a product photo — buffering a big zip fully in RAM before
  writing it isn't a good idea on a small hosting instance.
  ==============================================================
*/

const ALLOWED_DOWNLOAD_EXTENSIONS = [".zip", ".rar", ".7z"];

const downloadFileStorage = multer.diskStorage({

    destination: (req, file, cb) => {
        cb(null, "public/uploads");
    },

    filename: (req, file, cb) => {
        const safeOriginal = path.basename(file.originalname);
        cb(null, Date.now() + "-" + safeOriginal);
    }

});

const uploadDownloadFile = multer({

    storage: downloadFileStorage,

    limits: {
        fileSize: 150 * 1024 * 1024 // 150MB — plenty for a source-code zip
    },

    fileFilter: (req, file, cb) => {

        const ext = path.extname(file.originalname).toLowerCase();

        if (!ALLOWED_DOWNLOAD_EXTENSIONS.includes(ext)) {
            return cb(new Error("Only .zip, .rar, or .7z files are allowed for downloadable products."));
        }

        cb(null, true);

    }

});

router.post(
"/download-file",
verifyToken,
uploadDownloadFile.single("file"),
async (req, res) => {

try {

    if (!req.file) {
        return res.status(400).json({ message: "No valid file was uploaded." });
    }

    const localPath = req.file.path;

    const settings = await Settings.findOne();

    let fileUrl;

    if (settings?.storageSettings?.storageType === "cloudinary") {

        cloudinary.config({
            cloud_name: settings.storageSettings.cloudName,
            api_key: settings.storageSettings.cloudApiKey,
            api_secret: settings.storageSettings.cloudApiSecret
        });

        const uploaded = await cloudinary.uploader.upload(localPath, {
            folder: "extrashope/downloads",
            resource_type: "raw" // not an image — Cloudinary needs this for zips/archives
        });

        fs.unlinkSync(localPath);

        fileUrl = uploaded.secure_url;

    } else {

        fileUrl = "/uploads/" + req.file.filename;

        if (
            settings?.siteSettings?.uploadsBaseUrl &&
            settings.siteSettings.uploadsBaseUrl.trim() !== ""
        ) {

            let base = settings.siteSettings.uploadsBaseUrl.trim();

            if (!base.endsWith("/")) base += "/";

            fileUrl = base + req.file.filename;

        }

    }

    res.json({ file: fileUrl });

} catch (err) {

    console.log(err);

    res.status(500).json({ message: "Upload Error" });

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

async function createStorage() {

    const settings = await Settings.findOne();

    // Local Uploads
    if (
        !settings ||
        !settings.storageSettings ||
        settings.storageSettings.storageType !== "cloudinary"
    ) {

        return multer.diskStorage({

            destination: function (req, file, cb) {

                cb(null, "public/uploads");

            },

            filename: function (req, file, cb) {

                cb(null, Date.now() + path.extname(file.originalname));

            }

        });

    }

    // Cloudinary

    cloudinary.config({

        cloud_name: settings.storageSettings.cloudName,

        api_key: settings.storageSettings.cloudApiKey,

        api_secret: settings.storageSettings.cloudApiSecret

    });

    return new CloudinaryStorage({

        cloudinary,

        params: {

            folder: "extrashope",

            resource_type: "image"

        }

    });

}
module.exports = router;
