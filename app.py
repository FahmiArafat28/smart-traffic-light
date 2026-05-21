from flask import Flask, render_template, request, jsonify
import numpy as np
import skfuzzy as fuzz
from skfuzzy import control as ctrl
import pandas as pd
import os

app = Flask(__name__)

# =============================================================
# LOAD DATASET
# =============================================================

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
DATASET_PATH = os.path.join(BASE_DIR, 'data', 'dataset_kendaraan.csv')

df_dataset = pd.read_csv(DATASET_PATH)

# =============================================================
# FUZZY LOGIC SETUP
# =============================================================

kendaraan = ctrl.Antecedent(np.arange(0, 51, 1), 'kendaraan')
waktu     = ctrl.Antecedent(np.arange(0, 61, 1), 'waktu')
lampu     = ctrl.Consequent(np.arange(0, 61, 1), 'lampu')

# --- Membership Functions ---
kendaraan['sedikit'] = fuzz.trimf(kendaraan.universe, [0,  0,  20])
kendaraan['sedang']  = fuzz.trimf(kendaraan.universe, [10, 25, 40])
kendaraan['banyak']  = fuzz.trimf(kendaraan.universe, [30, 50, 50])

waktu['sebentar'] = fuzz.trimf(waktu.universe, [0,  0,  20])
waktu['sedang']   = fuzz.trimf(waktu.universe, [10, 30, 50])
waktu['lama']     = fuzz.trimf(waktu.universe, [40, 60, 60])

lampu['cepat']  = fuzz.trimf(lampu.universe, [0,  0,  20])
lampu['sedang'] = fuzz.trimf(lampu.universe, [10, 30, 50])
lampu['lama']   = fuzz.trimf(lampu.universe, [40, 60, 60])

# --- Fuzzy Rules (9 rules) ---
rules = [
    ctrl.Rule(kendaraan['sedikit'] & waktu['sebentar'], lampu['cepat']),
    ctrl.Rule(kendaraan['sedikit'] & waktu['sedang'],   lampu['cepat']),
    ctrl.Rule(kendaraan['sedikit'] & waktu['lama'],     lampu['sedang']),
    ctrl.Rule(kendaraan['sedang']  & waktu['sebentar'], lampu['cepat']),
    ctrl.Rule(kendaraan['sedang']  & waktu['sedang'],   lampu['sedang']),
    ctrl.Rule(kendaraan['sedang']  & waktu['lama'],     lampu['lama']),
    ctrl.Rule(kendaraan['banyak']  & waktu['sebentar'], lampu['sedang']),
    ctrl.Rule(kendaraan['banyak']  & waktu['sedang'],   lampu['lama']),
    ctrl.Rule(kendaraan['banyak']  & waktu['lama'],     lampu['lama']),
]

fuzzy_system = ctrl.ControlSystem(rules)

# =============================================================
# HELPERS
# =============================================================

def get_kategori_kendaraan(k):
    if k <= 15:   return "Sedikit"
    elif k <= 35: return "Sedang"
    else:         return "Banyak"

def get_kategori_waktu(w):
    if w <= 15:   return "Sebentar"
    elif w <= 45: return "Sedang"
    else:         return "Lama"

def get_kategori_lampu(h):
    if h <= 20:   return "Cepat"
    elif h <= 40: return "Sedang"
    else:         return "Lama"

def hitung_fuzzy(k, w):
    sim = ctrl.ControlSystemSimulation(fuzzy_system)
    sim.input['kendaraan'] = k
    sim.input['waktu']     = w
    sim.compute()
    return round(sim.output['lampu'], 2)

# =============================================================
# ROUTES
# =============================================================

@app.route('/')
def index():
    return render_template('index.html')

@app.route('/hitung', methods=['POST'])
def hitung():
    try:
        data = request.get_json()
        k = int(data.get('kendaraan', 0))
        w = int(data.get('waktu', 0))

        if not (0 <= k <= 50):
            return jsonify({'error': 'Jumlah kendaraan harus antara 0–50'}), 400
        if not (0 <= w <= 60):
            return jsonify({'error': 'Waktu tunggu harus antara 0–60'}), 400

        hasil = hitung_fuzzy(k, w)

        return jsonify({
            'hasil':         hasil,
            'kat_kendaraan': get_kategori_kendaraan(k),
            'kat_waktu':     get_kategori_waktu(w),
            'kat_lampu':     get_kategori_lampu(hasil),
        })

    except Exception as e:
        return jsonify({'error': str(e)}), 500


@app.route('/dataset')
def dataset():
    records = df_dataset.to_dict(orient='records')
    return jsonify(records)


@app.route('/dataset/stats')
def dataset_stats():
    stats = {
        'total_data':    int(len(df_dataset)),
        'max_kendaraan': int(df_dataset['kendaraan_norm'].max()),
        'min_kendaraan': int(df_dataset['kendaraan_norm'].min()),
        'avg_kendaraan': round(float(df_dataset['kendaraan_norm'].mean()), 2),
        'max_waktu':     int(df_dataset['waktu_tunggu'].max()),
        'min_waktu':     int(df_dataset['waktu_tunggu'].min()),
        'avg_waktu':     round(float(df_dataset['waktu_tunggu'].mean()), 2),
        'hari_tersibuk': df_dataset.groupby('hari')['kendaraan_norm'].mean().idxmax(),
    }
    return jsonify(stats)


@app.route('/dataset/batch', methods=['POST'])
def batch_hitung():
    try:
        results = []
        for _, row in df_dataset.iterrows():
            k = int(row['kendaraan_norm'])
            w = int(row['waktu_tunggu'])
            hasil = hitung_fuzzy(k, w)
            results.append({
                'id':           int(row['id']),
                'waktu':        row['waktu'],
                'hari':         row['hari'],
                'kendaraan':    k,
                'waktu_tunggu': w,
                'hasil_fuzzy':  hasil,
                'kategori':     get_kategori_lampu(hasil),
            })
        return jsonify(results)
    except Exception as e:
        return jsonify({'error': str(e)}), 500


if __name__ == '__main__':
    app.run(debug=True)