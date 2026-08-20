const multer = require('multer');
const path = require('path');
const fs = require('fs');

// Crear carpeta uploads si no existe
const uploadDir = path.join(__dirname, '..', 'uploads');
if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadDir),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    const name = `bet_${Date.now()}_${Math.random().toString(36).slice(2)}${ext}`;
    cb(null, name);
  },
});

const fileFilter = (req, file, cb) => {
  const allowed = /jpeg|jpg|png|gif|webp/;
  const ok = allowed.test(file.mimetype) && allowed.test(path.extname(file.originalname).toLowerCase());
  ok ? cb(null, true) : cb(new Error('Solo se permiten imágenes (jpg, png, gif, webp)'));
};

const upload = multer({ storage, fileFilter, limits: { fileSize: 5 * 1024 * 1024 } }); // 5MB

module.exports = upload;
