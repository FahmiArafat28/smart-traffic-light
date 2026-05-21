# 🚦 Smart Traffic Light — Fuzzy Logic

## Struktur Project

```
smart_traffic/
├── app.py                         ← Flask backend + fuzzy logic
├── requirements.txt
├── data/
│   └── dataset_kendaraan.csv      ← Dataset 180 record (7 hari)
├── static/
│   ├── css/
│   │   └── main.css               ← Semua styling
│   └── js/
│       └── main.js                ← Semua interaksi JS
└── templates/
    └── index.html                 ← HTML murni (tanpa inline CSS/JS)
```

## Cara Menjalankan

```bash
# 1. Install dependencies
pip install -r requirements.txt

# 2. Jalankan
python app.py

# 3. Buka browser
http://127.0.0.1:5000
```

## Fitur

| Tab | Keterangan |
|---|---|
| **Simulasi** | Input manual via slider, animasi lampu lalu lintas |
| **Dataset** | Tampilkan 180 data kendaraan + statistik |
| **Batch Fuzzy** | Proses fuzzy untuk semua data sekaligus |
| **Aturan Fuzzy** | Lihat membership function & 9 rules |

## API Endpoints

| Method | Endpoint | Keterangan |
|---|---|---|
| POST | `/hitung` | Hitung fuzzy 1 data |
| GET | `/dataset` | Ambil semua dataset (JSON) |
| GET | `/dataset/stats` | Statistik dataset |
| POST | `/dataset/batch` | Hitung fuzzy semua dataset |
