const express = require("express");
const router = express.Router();

const fs = require("fs");
const path = require("path");
const multer = require("multer");
const cloudinary = require("cloudinary").v2;

const Settings = require("../models/Settings");
const { verifyToken, requireRole } = require("../middleware/auth");

const MANAGE_DIR = path.join(__dirname,"../public/manage");

// إنشاء المجلد إذا لم يكن موجوداً
if(!fs.existsSync(MANAGE_DIR)){
    fs.mkdirSync(MANAGE_DIR,{recursive:true});
}

/*
  ==============================================================
  This file manager now supports TWO backends:

  - LOCAL: manages public/manage on this server's own disk
    (original behavior, unchanged).
  - CLOUDINARY: when Admin -> Website Settings -> Storage Type is
    set to "Cloudinary", this manages the SAME "extrashope" folder
    on Cloudinary that product photo uploads already go to (see
    uploadRoutes.js) — so the File Manager shows the actual place
    your images are really being stored, instead of an empty local
    folder nobody is uploading into anymore.

  Which backend is used is decided automatically per-request by
  checking Settings.storageSettings.storageType — nothing needs to
  be configured here separately, and local-storage sites keep
  working exactly as before with zero behavior change.

  SECURITY: this is still a full file manager — every route below
  requires admin login, dangerous file extensions are still
  blocked on upload, and local-disk paths are still sandboxed
  against "../" traversal (see resolveSafePath) exactly as before.
  ==============================================================
*/

router.use(verifyToken, requireRole("admin"));

const DANGEROUS_EXTENSIONS = [
    ".php", ".php3", ".php4", ".php5", ".php7", ".phtml", ".phar",
    ".exe", ".sh", ".bat", ".cmd", ".com", ".msi", ".dll",
    ".js", ".mjs", ".cjs", ".py", ".pl", ".cgi", ".asp", ".aspx",
    ".jsp", ".jspx", ".vbs", ".ps1", ".htaccess", ".config"
];

const CLOUDINARY_ROOT = "extrashope"; // same folder uploadRoutes.js uploads product photos into

async function getStorageMode() {

    const settings = await Settings.findOne();

    if (settings?.storageSettings?.storageType === "cloudinary" &&
        settings.storageSettings.cloudName &&
        settings.storageSettings.cloudApiKey &&
        settings.storageSettings.cloudApiSecret) {

        cloudinary.config({
            cloud_name: settings.storageSettings.cloudName,
            api_key: settings.storageSettings.cloudApiKey,
            api_secret: settings.storageSettings.cloudApiSecret
        });

        return "cloudinary";

    }

    return "local";

}

/*
  Resolves a user-supplied relative path (which may contain
  subfolders, e.g. "photos/2024") safely against MANAGE_DIR.
  Throws if the result would escape MANAGE_DIR in any way —
  this is what makes folder support safe against "../../etc"
  style attacks. (Local mode only — Cloudinary has no local
  filesystem to escape.)
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

// Cloudinary organizes uploads by public_id path — this builds
// "extrashope/subfolder/name" consistently from a dir+name pair,
// stripping any empty segments.
function cloudinaryPath(...segments) {

    return segments
        .filter(Boolean)
        .join("/")
        .split("/")
        .filter(Boolean)
        .join("/");

}

// ===============================
// Upload (optionally into a subfolder via ?dir=)
// ===============================

const localStorage_ = multer.diskStorage({

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

const memStorage = multer.memoryStorage();

function fileFilterFn(req, file, cb) {

    const ext = path.extname(file.originalname).toLowerCase();

    if (DANGEROUS_EXTENSIONS.includes(ext)) {

        return cb(new Error(`File type "${ext}" is not allowed for security reasons.`));

    }

    cb(null, true);

}

const uploadLocal = multer({
    storage: localStorage_,
    limits: { fileSize: 25 * 1024 * 1024 },
    fileFilter: fileFilterFn
});

const uploadMemory = multer({
    storage: memStorage,
    limits: { fileSize: 25 * 1024 * 1024 },
    fileFilter: fileFilterFn
});

router.post("/upload", async (req, res, next) => {

    const mode = await getStorageMode();

    if (mode === "cloudinary") {
        return uploadMemory.single("file")(req, res, next);
    }

    return uploadLocal.single("file")(req, res, next);

}, async (req, res) => {

if (!req.file) {
    return res.status(400).json({ success:false, message: "Upload rejected." });
}

const mode = await getStorageMode();

if (mode === "cloudinary") {

    try {

        const folder = cloudinaryPath(CLOUDINARY_ROOT, req.query.dir || "");

        const safeOriginal = path.basename(req.file.originalname).replace(/\.[^.]+$/, "");

        const uploaded = await new Promise((resolve, reject) => {

            const stream = cloudinary.uploader.upload_stream(
                { folder, public_id: Date.now() + "-" + safeOriginal, resource_type: "auto" },
                (err, result) => err ? reject(err) : resolve(result)
            );

            stream.end(req.file.buffer);

        });

        return res.json({
            success: true,
            url: uploaded.secure_url,
            name: uploaded.public_id.split("/").pop()
        });

    } catch (e) {

        return res.status(400).json({ success:false, message: e.message });

    }

}

const dirPrefix = req.query.dir ? req.query.dir.replace(/\/+$/,"") + "/" : "";

res.json({

success:true,

url:"/manage/" + dirPrefix + req.file.filename,

name:req.file.filename

});

});

router.use((err, req, res, next) => {
    res.status(400).json({ success:false, message: err.message || "Upload Error" });
});

// ===============================
// List Files & Folders (?dir=subfolder)
// ===============================

router.get("/files", async (req,res)=>{

const mode = await getStorageMode();

if (mode === "cloudinary") {

    try {

        const prefix = cloudinaryPath(CLOUDINARY_ROOT, req.query.dir || "") + "/";

        const [foldersResult, filesResult] = await Promise.all([

            cloudinary.api.sub_folders(prefix.slice(0, -1)).catch(() => ({ folders: [] })),

            cloudinary.api.resources({
                type: "upload",
                prefix,
                max_results: 500
            }).catch(() => ({ resources: [] }))

        ]);

        const folders = (foldersResult.folders || []).map(f => ({
            name: f.name,
            type: "folder",
            url: null,
            size: null,
            created: null
        }));

        // only show files directly inside this folder, not ones in
        // deeper subfolders (Cloudinary's prefix search is recursive)
        const files = (filesResult.resources || [])
            .filter(r => {
                const rest = r.public_id.slice(prefix.length);
                return rest.length > 0 && !rest.includes("/");
            })
            .map(r => ({
                name: r.public_id.split("/").pop() + (r.format ? "." + r.format : ""),
                type: "file",
                url: r.secure_url,
                size: r.bytes,
                created: r.created_at
            }));

        return res.json([...folders, ...files]);

    } catch (e) {

        return res.status(400).json({ message: e.message });

    }

}

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

router.post("/folder", async (req,res)=>{

const mode = await getStorageMode();

const { dir, name } = req.body;

if (!name || /[\/\\]/.test(name)) {
    return res.status(400).json({ success:false, message:"Invalid folder name" });
}

if (mode === "cloudinary") {

    try {

        const folderPath = cloudinaryPath(CLOUDINARY_ROOT, dir || "", name);

        await cloudinary.api.create_folder(folderPath);

        return res.json({ success:true });

    } catch (e) {

        return res.status(400).json({ success:false, message: e.message });

    }

}

try {

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

router.put("/rename", async (req,res)=>{

const mode = await getStorageMode();

const { dir, oldName, newName } = req.body;

if (!newName || /[\/\\]/.test(newName)) {
    return res.status(400).json({ success:false, message:"Invalid new name" });
}

if (mode === "cloudinary") {

    try {

        const parent = cloudinaryPath(CLOUDINARY_ROOT, dir || "");

        // strip extension for the public_id side, Cloudinary keeps
        // the file's original format regardless
        const oldBase = (oldName || "").replace(/\.[^.]+$/, "");
        const newBase = newName.replace(/\.[^.]+$/, "");

        const fromId = cloudinaryPath(parent, oldBase);
        const toId = cloudinaryPath(parent, newBase);

        await cloudinary.uploader.rename(fromId, toId);

        return res.json({ success:true });

    } catch (e) {

        return res.status(400).json({ success:false, message: e.message });

    }

}

try {

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

router.put("/move", async (req,res)=>{

const mode = await getStorageMode();

const { sourceDir, name, targetDir } = req.body;

if (mode === "cloudinary") {

    try {

        const base = (name || "").replace(/\.[^.]+$/, "");

        const fromId = cloudinaryPath(CLOUDINARY_ROOT, sourceDir || "", base);
        const toId = cloudinaryPath(CLOUDINARY_ROOT, targetDir || "", base);

        await cloudinary.uploader.rename(fromId, toId);

        return res.json({ success:true });

    } catch (e) {

        return res.status(400).json({ success:false, message: e.message });

    }

}

try {

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

router.delete("/files/:name", async (req,res)=>{

const mode = await getStorageMode();

if (mode === "cloudinary") {

    try {

        const base = path.basename(req.params.name).replace(/\.[^.]+$/, "");
        const publicId = cloudinaryPath(CLOUDINARY_ROOT, req.query.dir || "", base);

        await cloudinary.uploader.destroy(publicId).catch(() => {});

        // in case it was actually a folder, not a file
        await cloudinary.api.delete_folder(publicId).catch(() => {});

        return res.json({ success:true });

    } catch (e) {

        return res.status(400).json({ success:false, message: e.message });

    }

}

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

router.post("/delete-bulk", async (req,res)=>{

const mode = await getStorageMode();

const { dir, names } = req.body;

if (!Array.isArray(names) || names.length === 0) {
    return res.status(400).json({ success:false, message:"No items selected" });
}

if (mode === "cloudinary") {

    try {

        const publicIds = names.map(name => {
            const base = path.basename(name).replace(/\.[^.]+$/, "");
            return cloudinaryPath(CLOUDINARY_ROOT, dir || "", base);
        });

        await cloudinary.api.delete_resources(publicIds).catch(() => {});

        for (const id of publicIds) {
            await cloudinary.api.delete_folder(id).catch(() => {});
        }

        return res.json({ success:true, deleted: names.length });

    } catch (e) {

        return res.status(400).json({ success:false, message: e.message });

    }

}

try {

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
