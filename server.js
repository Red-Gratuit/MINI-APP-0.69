const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const app = express();
app.use(express.json({ limit: '100mb' }));
app.use(express.static('.'));

// Créer les dossiers s'ils n'existent pas
const uploadsDir = path.join(__dirname, 'uploads');
const videosDir = path.join(uploadsDir, 'videos');
const imagesDir = path.join(uploadsDir, 'images');

[uploadsDir, videosDir, imagesDir].forEach(dir => {
    if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
    }
});

// Configuration de Multer pour l'upload direct
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        const folder = file.mimetype.startsWith('video/') ? 'videos' : 'images';
        cb(null, path.join(__dirname, 'uploads', folder));
    },
    filename: function (req, file, cb) {
        // Nom unique avec timestamp
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
    }
});

const upload = multer({ 
    storage: storage,
    limits: {
        fileSize: 100 * 1024 * 1024 // 100MB max
    }
});

// ✅ UPLOAD direct sur le serveur Railway
app.post('/api/upload', upload.single('file'), async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ error: 'Fichier manquant' });
        }

        const file = req.file;
        const fileType = file.mimetype.startsWith('video/') ? 'video' : 'image';
        
        // Construire l'URL publique
        const publicUrl = `https://le-professeur-5962-production.up.railway.app/uploads/${fileType === 'video' ? 'videos' : 'images'}/${file.filename}`;
        
        console.log(`✅ ${fileType} uploadé: ${file.filename}`);
        console.log(`📡 URL publique: ${publicUrl}`);
        
        res.json({ 
            success: true, 
            url: publicUrl,
            filename: file.filename,
            size: file.size,
            type: fileType
        });
        
    } catch (error) {
        console.error('❌ Erreur upload:', error);
        res.status(500).json({ error: error.message });
    }
});

// Servir les fichiers uploadés statiquement
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// ✅ Fichier JSON local pour stocker les produits sur le serveur
const PRODUCTS_FILE = path.join(__dirname, 'products.json');

function loadProducts() {
    try {
        if (fs.existsSync(PRODUCTS_FILE)) {
            return JSON.parse(fs.readFileSync(PRODUCTS_FILE, 'utf8'));
        }
    } catch (e) {
        console.log('Erreur lecture products.json:', e.message);
    }
    return { stup: [], tabac: [], puff: [] };
}

function saveProducts(data) {
    fs.writeFileSync(PRODUCTS_FILE, JSON.stringify(data, null, 2), 'utf8');
}

// ✅ GET produits depuis le fichier local
app.get('/api/products', (req, res) => {
    res.json(loadProducts());
});

// ✅ POST produits dans le fichier local
app.post('/api/products', (req, res) => {
    try {
        saveProducts(req.body);
        console.log('✅ Produits sauvegardés dans products.json');
        res.json({ success: true });
    } catch (e) {
        console.log('ERREUR sauvegarde:', e.message);
        res.status(500).json({ error: e.message });
    }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server on port ${PORT}`));
