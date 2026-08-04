const express = require("express");
const router = express.Router();

const fs = require("fs");
const path = require("path");
const multer = require("multer");
const cloudinary = require("cloudinary").v2;
const streamifier = require("streamifier");
const Settings = require("../models/Settings");

const { verifyToken, requireRole } = require("../middleware/auth");

const MANAGE_DIR = path.join(__dirname,"../public/manage");

// إنشاء المجلد إذا لم يكن موجوداً
if(!fs.existsSync(MANAGE_DIR)){
    fs.mkdirSync(MANAGE_DIR,{recursive:true});
}

/*
  SECURITY: this is a full cPanel-style file manager with zero
  authentication — anyone on the internet could upload ANY file
  type (including .php, .exe, .js, server scripts) directly into
  a folder served by the site, list every file, and delete any of
  them. This is one of the most dangerous endpoints in the whole
  project. Fixed by:
  1) Requiring admin login for every route in this file.
  2) Blocking dangerous/executable file extensions on upload.
  3) Sanitizing every path so "../" can never escape MANAGE_DIR,
     even now that subfolders are supported (see resolveSafePath).
*/

router.use(verifyToken, requireRole("admin"));

const DANGEROUS_EXTENSIONS = [
    ".php", ".php3", ".php4", ".php5", ".php7", ".phtml", ".phar",
    ".exe", ".sh", ".bat", ".cmd", ".com", ".msi", ".dll",
    ".js", ".mjs", ".cjs", ".py", ".pl", ".cgi", ".asp", ".aspx",
    ".jsp", ".jspx", ".vbs", ".ps1", ".htaccess", ".config"
];

/*
  Resolves a user-supplied relative path (which may contain
  subfolders, e.g. "photos/2024") safely against MANAGE_DIR.
  Throws if the result would escape MANAGE_DIR in any way —
  this is what makes folder support safe against "../../etc"
  style attacks.
*/
function resolveSafePath(relativePath) {

    const cleanRelative = (relativePath || "")
        .split("/")
        .filter(seg => seg && seg !== "." && seg !== "..")
        .join("/");

    const resolved = path.resolve(MANAGE_DIR, cleanRelative);

    if (resolved !== MANAGE_DIR && !resolved.startsWith(MANAGE_DIR + path.sep)) {
        throw new Error("Invalid path");
    }

    return resolved;

}

// ===============================
// Upload (optionally into a subfolder via ?dir=)
// ===============================

const storage = multer.diskStorage({

destination:(req,file,cb)=>{

try {

    const dir = resolveSafePath(req.query.dir || "");
    cb(null, dir);

} catch (e) {

    cb(e);

}

},

filename:(req,file,cb)=>{

const safeOriginal = path.basename(file.originalname);

cb(
null,
Date.now() + "-" + safeOriginal
);

}

});

const upload = multer({

storage,

limits: {
    fileSize: 25 * 1024 * 1024 // 25MB
},

fileFilter: (req, file, cb) => {

    const ext = path.extname(file.originalname).toLowerCase();

    if (DANGEROUS_EXTENSIONS.includes(ext)) {

        return cb(new Error(`File type "${ext}" is not allowed for security reasons.`));

    }

    cb(null, true);

}

});

router.post("/upload", upload.single("file"), async (req,res)=>{

try{

    if(!req.file){
        return res.status(400).json({
            success:false,
            message:"No file uploaded"
        });
    }

    const settings = await Settings.findOne();

    // ======================
    // CLOUDINARY
    // ======================

    if(settings?.storageSettings?.storageType==="cloudinary"){

        cloudinary.config({

            cloud_name:settings.storageSettings.cloudName,

            api_key:settings.storageSettings.cloudApiKey,

            api_secret:settings.storageSettings.cloudApiSecret

        });

        const uploaded = await new Promise((resolve,reject)=>{

            const stream = cloudinary.uploader.upload_stream({

                folder:"extrashope"

            },(err,result)=>{

                if(err) return reject(err);

                resolve(result);

            });

            streamifier
            .createReadStream(req.file.buffer)
            .pipe(stream);

        });

        return res.json({

            success:true,

            url:uploaded.secure_url,

            name:uploaded.public_id

        });

    }

    // ======================
    // LOCAL
    // ======================

    const dirPrefix =
    req.query.dir
    ? req.query.dir.replace(/\/+$/,"")+"/"
    : "";

    return res.json({

        success:true,

        url:"/manage/"+dirPrefix+req.file.filename,

        name:req.file.filename

    });

}catch(err){

    console.log(err);

    res.status(500).json({

        success:false,

        message:err.message

    });

}

});

// ===============================
// List Files & Folders (?dir=subfolder)
// ===============================

router.get("/files",(req,res)=>{

try {

    const dirPath = resolveSafePath(req.query.dir || "");

    if (!fs.existsSync(dirPath)) {
        return res.json([]);
    }

    const entries = fs.readdirSync(dirPath, { withFileTypes: true });

    const list = entries.map(entry => {

        const fullPath = path.join(dirPath, entry.name);
        const stat = fs.statSync(fullPath);

        return {

            name: entry.name,

            type: entry.isDirectory() ? "folder" : "file",

            url: entry.isDirectory() ? null : "/manage/" + (req.query.dir ? req.query.dir + "/" : "") + entry.name,

            size: entry.isDirectory() ? null : stat.size,

            created: stat.birthtime

        };

    });

    res.json(list);

} catch (e) {

    res.status(400).json({ message: e.message });

}

});

// ===============================
// Create Folder
// ===============================

router.post("/folder",(req,res)=>{

try {

    const { dir, name } = req.body;

    if (!name || /[\/\\]/.test(name)) {
        return res.status(400).json({ success:false, message:"Invalid folder name" });
    }

    const parentPath = resolveSafePath(dir || "");
    const newFolderPath = path.join(parentPath, name);

    if (fs.existsSync(newFolderPath)) {
        return res.status(400).json({ success:false, message:"A file or folder with that name already exists" });
    }

    fs.mkdirSync(newFolderPath);

    res.json({ success:true });

} catch (e) {

    res.status(400).json({ success:false, message: e.message });

}

});

// ===============================
// Rename a file or folder
// ===============================

router.put("/rename",(req,res)=>{

try {

    const { dir, oldName, newName } = req.body;

    if (!newName || /[\/\\]/.test(newName)) {
        return res.status(400).json({ success:false, message:"Invalid new name" });
    }

    const parentPath = resolveSafePath(dir || "");
    const oldPath = path.join(parentPath, path.basename(oldName || ""));
    const newPath = path.join(parentPath, newName);

    if (!fs.existsSync(oldPath)) {
        return res.status(404).json({ success:false, message:"Not found" });
    }

    if (fs.existsSync(newPath)) {
        return res.status(400).json({ success:false, message:"A file or folder with that name already exists" });
    }

    fs.renameSync(oldPath, newPath);

    res.json({ success:true });

} catch (e) {

    res.status(400).json({ success:false, message: e.message });

}

});

// ===============================
// Move a file or folder to a different directory
// ===============================

router.put("/move",(req,res)=>{

try {

    const { sourceDir, name, targetDir } = req.body;

    const sourceParent = resolveSafePath(sourceDir || "");
    const targetParent = resolveSafePath(targetDir || "");

    const sourcePath = path.join(sourceParent, path.basename(name || ""));
    const destPath = path.join(targetParent, path.basename(name || ""));

    if (!fs.existsSync(sourcePath)) {
        return res.status(404).json({ success:false, message:"Not found" });
    }

    if (fs.existsSync(destPath)) {
        return res.status(400).json({ success:false, message:"A file or folder with that name already exists in the target folder" });
    }

    fs.renameSync(sourcePath, destPath);

    res.json({ success:true });

} catch (e) {

    res.status(400).json({ success:false, message: e.message });

}

});

// ===============================
// Delete a single file/folder (kept for backward compatibility)
// ===============================

router.delete("/files/:name",(req,res)=>{

try {

    const dirPath = resolveSafePath(req.query.dir || "");

    const safeName = path.basename(req.params.name);

    const target = path.join(dirPath, safeName);

    if(fs.existsSync(target)){

        fs.rmSync(target, { recursive:true, force:true });

    }

    res.json({ success:true });

} catch (e) {

    res.status(400).json({ success:false, message: e.message });

}

});

// ===============================
// Bulk delete
// ===============================

router.post("/delete-bulk",(req,res)=>{

try {

    const { dir, names } = req.body;

    if (!Array.isArray(names) || names.length === 0) {
        return res.status(400).json({ success:false, message:"No items selected" });
    }

    const dirPath = resolveSafePath(dir || "");

    let deleted = 0;

    for (const name of names) {

        const safeName = path.basename(name);
        const target = path.join(dirPath, safeName);

        if (fs.existsSync(target)) {
            fs.rmSync(target, { recursive:true, force:true });
            deleted++;
        }

    }

    res.json({ success:true, deleted });

} catch (e) {

    res.status(400).json({ success:false, message: e.message });

}

});

module.exports = router;
