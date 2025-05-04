const https = require('https');
const fs = require('fs');
const express = require('express');
const app = express();

app.use(express.json());

const keysDB = 'keys.json';

// Veritabanı dosyasını oluşturmazsa boş oluştur
if (!fs.existsSync(keysDB)) {
    fs.writeFileSync(keysDB, JSON.stringify({}));
}

// Yardımcı: JSON oku/yaz
function loadKeys() {
    return JSON.parse(fs.readFileSync(keysDB));
}
function saveKeys(data) {
    fs.writeFileSync(keysDB, JSON.stringify(data, null, 2));
}

// /connect → key doğrulama
app.post('/connect', (req, res) => {
    const { key, device } = req.body;
    const db = loadKeys();

    if (!db[key]) return res.json({ status: 'invalid_key' });

    const now = Date.now();
    const keyInfo = db[key];

    if (now > keyInfo.expire) return res.json({ status: 'expired' });

    if (!keyInfo.devices.includes(device)) {
        if (keyInfo.devices.length >= keyInfo.device_limit)
            return res.json({ status: 'device_limit' });

        keyInfo.devices.push(device);
        saveKeys(db);
    }

    res.json({ status: 'ok' });
});

// /create → key oluştur (sadece sen kullan)
app.post('/create', (req, res) => {
    const { key, duration, device_limit } = req.body;
    const db = loadKeys();

    db[key] = {
        expire: Date.now() + duration * 1000, // saniye cinsinden
        device_limit,
        devices: []
    };

    saveKeys(db);
    res.json({ status: 'created' });
});

// /delete → key sil
app.post('/delete', (req, res) => {
    const { key } = req.body;
    const db = loadKeys();
    delete db[key];
    saveKeys(db);
    res.json({ status: 'deleted' });
});

// HTTPS sunucusu başlat
https.createServer({
    key: fs.readFileSync("cert/key.pem"),
    cert: fs.readFileSync("cert/cert.pem")
}, app).listen(8443, () => {
    console.log("HTTPS Sunucu çalışıyor: https://localhost:8443/connect");
});
