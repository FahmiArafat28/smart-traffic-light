/* ============================================================
   Smart Traffic Light — main.js
   ============================================================ */

const ARAH = ['utara', 'selatan', 'timur', 'barat'];
let animTimers         = [];
let countdownIntervals = {};
let simulasiJalan      = false;

// ---------- Init: reset semua slider ke 0 saat halaman load ----------
document.addEventListener('DOMContentLoaded', () => {
    ARAH.forEach(a => {
        const slider = document.getElementById(`k-${a}`);
        if (slider) {
            slider.value = 0;
            updateKendaraan(a, 0);
        }
    });
});

// ---------- Waktu tunggu otomatis ----------
function hitungWaktuAuto(k) {
    return Math.round((k / 50) * 60);
}

// ---------- Update slider ----------
function updateKendaraan(arah, val) {
    const k = parseInt(val);
    document.getElementById(`valK-${arah}`).textContent  = k;
    document.getElementById(`autoW-${arah}`).textContent = hitungWaktuAuto(k) + ' dtk';
}

// ---------- Tab Navigation ----------
function switchTab(tabId) {
    document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
    document.querySelectorAll('.tab-panel').forEach(p => p.classList.remove('active'));
    document.querySelector(`[data-tab="${tabId}"]`).classList.add('active');
    document.getElementById(tabId).classList.add('active');
    if (tabId === 'tab-dataset') loadDataset();
    if (tabId === 'tab-batch')   loadBatch();
}

// ---------- Utility ----------
function setStatus(msg, cls = '') {
    const el = document.getElementById('statusBar');
    el.className = 'status-bar ' + cls;
    el.innerHTML = msg;
}

function setLampWarna(arah, warna) {
    ['merah', 'kuning', 'hijau'].forEach(w => {
        document.getElementById(`lm-${arah}-${w}`).className = 'lamp-mini';
    });
    if (warna === 'merah')  document.getElementById(`lm-${arah}-merah`).className  = 'lamp-mini active-red';
    if (warna === 'kuning') document.getElementById(`lm-${arah}-kuning`).className = 'lamp-mini active-yellow';
    if (warna === 'hijau')  document.getElementById(`lm-${arah}-hijau`).className  = 'lamp-mini active-green';
}

function setBtnState(jalan) {
    document.getElementById('btnJalankan').disabled = jalan;
    document.getElementById('btnStop').disabled     = !jalan;
}

function clearAllAnim() {
    animTimers.forEach(t => clearTimeout(t));
    animTimers = [];
    ARAH.forEach(a => {
        if (countdownIntervals[a]) {
            clearInterval(countdownIntervals[a]);
            countdownIntervals[a] = null;
        }
    });
}

function resetVisual() {
    ARAH.forEach(a => {
        setLampWarna(a, 'merah');
        document.getElementById(`hb-${a}`).classList.remove('aktif');
        document.getElementById(`info-${a}`).textContent = '— dtk';
    });
}

// ---------- Stop Simulasi ----------
function stopSimulasi() {
    simulasiJalan = false;
    clearAllAnim();
    resetVisual();
    setBtnState(false);
    setStatus('⏹ Simulasi dihentikan', 'stopped');
}

// ---------- Hitung Perempatan ----------
async function hitungPerempatan() {
    clearAllAnim();
    simulasiJalan = true;
    setBtnState(true);
    setStatus('<span class="spinner"></span> Menghitung fuzzy untuk 4 simpang...', 'running');

    const hasil = {};

    try {
        for (const a of ARAH) {
            const k = parseInt(document.getElementById(`k-${a}`).value);
            const w = hitungWaktuAuto(k);

            const res  = await fetch('/hitung', {
                method:  'POST',
                headers: { 'Content-Type': 'application/json' },
                body:    JSON.stringify({ kendaraan: k, waktu: w })
            });
            const data = await res.json();
            if (data.error) { setStatus('⚠ ' + data.error); setBtnState(false); return; }
            hasil[a] = { ...data, waktu_auto: w };
        }
    } catch(e) {
        setStatus('⚠ Gagal terhubung ke server');
        setBtnState(false);
        return;
    }

    // Urutkan dari durasi terpanjang ke terpendek
    const urutan = [...ARAH].sort((a, b) => hasil[b].hasil - hasil[a].hasil);
    const kuningDetik = 3;

    // Hitung waktu tunggu akumulatif
    let akumulasi = 0;
    urutan.forEach((arah, idx) => {
        hasil[arah].waktu_tunggu_antri = idx === 0 ? 0 : akumulasi;
        akumulasi += Math.round(hasil[arah].hasil) + kuningDetik;
    });

    // Tampilkan hasil box
    document.getElementById('hasilGrid').style.display = 'grid';
    ARAH.forEach(a => {
        document.getElementById(`hd-${a}`).textContent = hasil[a].hasil + ' dtk';
        document.getElementById(`hk-${a}`).textContent = hasil[a].kat_lampu;
        document.getElementById(`hw-${a}`).textContent =
            hasil[a].waktu_tunggu_antri === 0
                ? 'tunggu: langsung (giliran pertama)'
                : `tunggu: ${hasil[a].waktu_tunggu_antri} dtk`;
        document.getElementById(`info-${a}`).textContent =
            hasil[a].waktu_tunggu_antri === 0
                ? hasil[a].hasil + ' dtk'
                : `⏳ ${hasil[a].waktu_tunggu_antri} dtk`;
    });

    setStatus('✓ Simulasi berjalan — lampu bergantian per simpang', 'done');
    jalankanSiklus(hasil, urutan);
}

// ---------- Siklus Bergantian ----------
function jalankanSiklus(hasil, urutan) {
    if (!simulasiJalan) return;

    const kuningDetik = 3;
    let offset = 0;

    urutan.forEach((arah, idx) => {
        const hijauMs  = hasil[arah].hasil * 1000;
        const kuningMs = kuningDetik * 1000;

        animTimers.push(setTimeout(() => {
            if (!simulasiJalan) return;

            ARAH.forEach(a => {
                if (countdownIntervals[a]) {
                    clearInterval(countdownIntervals[a]);
                    countdownIntervals[a] = null;
                }
                if (a !== arah) {
                    setLampWarna(a, 'merah');
                    document.getElementById(`hb-${a}`).classList.remove('aktif');
                    const idxA = urutan.indexOf(a);
                    if (idxA > idx) {
                        let sisaTunggu = 0;
                        for (let i = idx; i < idxA; i++) {
                            sisaTunggu += Math.round(hasil[urutan[i]].hasil) + kuningDetik;
                        }
                        document.getElementById(`info-${a}`).textContent = `⏳ ${sisaTunggu} dtk`;
                    } else if (idxA < idx) {
                        let sisaSiklus = 0;
                        for (let i = idx; i < urutan.length; i++) {
                            sisaSiklus += Math.round(hasil[urutan[i]].hasil) + kuningDetik;
                        }
                        for (let i = 0; i < idxA; i++) {
                            sisaSiklus += Math.round(hasil[urutan[i]].hasil) + kuningDetik;
                        }
                        document.getElementById(`info-${a}`).textContent = `⏳ ${sisaSiklus} dtk`;
                    }
                }
            });

            setLampWarna(arah, 'hijau');
            document.getElementById(`hb-${arah}`).classList.add('aktif');
            setStatus(`🟢 Simpang ${arah.charAt(0).toUpperCase() + arah.slice(1)} HIJAU — ${hasil[arah].hasil} detik`, 'done');

            let sisa = Math.round(hasil[arah].hasil);
            document.getElementById(`info-${arah}`).textContent = `${sisa} dtk`;

            countdownIntervals[arah] = setInterval(() => {
                if (!simulasiJalan) { clearInterval(countdownIntervals[arah]); return; }
                sisa--;

                ARAH.forEach(a => {
                    if (a !== arah) {
                        const idxA = urutan.indexOf(a);
                        if (idxA > idx) {
                            let sisaTunggu = sisa;
                            for (let i = idx + 1; i < idxA; i++) {
                                sisaTunggu += Math.round(hasil[urutan[i]].hasil) + kuningDetik;
                            }
                            sisaTunggu += kuningDetik;
                            if (sisaTunggu > 0) {
                                document.getElementById(`info-${a}`).textContent = `⏳ ${sisaTunggu} dtk`;
                            }
                        }
                    }
                });

                document.getElementById(`info-${arah}`).textContent = sisa > 0 ? `${sisa} dtk` : '0 dtk';
                if (sisa <= 0) { clearInterval(countdownIntervals[arah]); countdownIntervals[arah] = null; }
            }, 1000);

            animTimers.push(setTimeout(() => {
                if (!simulasiJalan) return;
                setLampWarna(arah, 'kuning');
                setStatus(`🟡 Simpang ${arah.charAt(0).toUpperCase() + arah.slice(1)} KUNING...`, 'running');
                document.getElementById(`info-${arah}`).textContent = '🟡 3 dtk';
            }, hijauMs));

        }, offset));

        offset += hijauMs + kuningMs;
    });

    animTimers.push(setTimeout(() => {
        if (!simulasiJalan) return;
        resetVisual();
        setStatus('🔄 Siklus selesai — mengulang...', '');

        urutan.forEach((arah, idx) => {
            let tungguAwal = 0;
            for (let i = 0; i < idx; i++) {
                tungguAwal += Math.round(hasil[urutan[i]].hasil) + kuningDetik;
            }
            document.getElementById(`info-${arah}`).textContent =
                idx === 0 ? hasil[arah].hasil + ' dtk' : `⏳ ${tungguAwal} dtk`;
        });

        animTimers.push(setTimeout(() => {
            if (simulasiJalan) jalankanSiklus(hasil, urutan);
        }, 2000));
    }, offset));
}

// ---------- Dataset ----------
let datasetLoaded = false;

async function loadDataset() {
    if (datasetLoaded) return;
    try {
        const res   = await fetch('/dataset/stats');
        const stats = await res.json();
        document.getElementById('statTotal').textContent     = stats.total_data;
        document.getElementById('statMaxKend').textContent   = stats.max_kendaraan;
        document.getElementById('statAvgKend').textContent   = stats.avg_kendaraan;
        document.getElementById('statHariSibuk').textContent = stats.hari_tersibuk;
    } catch(e) { console.error(e); }

    try {
        const res  = await fetch('/dataset');
        const rows = await res.json();
        const tbody = document.getElementById('dsTbody');
        tbody.innerHTML = '';
        rows.forEach(r => {
            const wAuto = hitungWaktuAuto(r.kendaraan_norm);
            const cc = { 'Cerah':'badge-cerah','Berawan':'badge-berawan','Hujan':'badge-hujan','Macet':'badge-macet' }[r.kondisi_cuaca] || '';
            tbody.innerHTML += `
                <tr>
                    <td>${r.id}</td><td>${r.hari}</td><td>${r.waktu}</td>
                    <td>${r.jumlah_kendaraan_asli.toLocaleString()}</td>
                    <td><strong>${r.kendaraan_norm}</strong></td>
                    <td style="color:var(--green)">${wAuto}</td>
                    <td class="${cc}">${r.kondisi_cuaca}</td>
                </tr>`;
        });
        datasetLoaded = true;
    } catch(e) {
        document.getElementById('dsTbody').innerHTML =
            '<tr><td colspan="7" style="text-align:center;color:var(--muted)">Gagal memuat</td></tr>';
    }
}

// ---------- Batch ----------
let batchLoaded = false;

async function loadBatch() {
    if (batchLoaded) return;
    runBatch();
}

async function runBatch() {
    batchLoaded = false;
    document.getElementById('batchTbody').innerHTML =
        '<tr><td colspan="7"><div class="loading-wrap"><span class="spinner"></span> Memproses...</div></td></tr>';
    try {
        const res     = await fetch('/dataset/batch', { method: 'POST' });
        const results = await res.json();
        const tbody   = document.getElementById('batchTbody');
        tbody.innerHTML = '';
        results.forEach(r => {
            const kc = { 'Cepat':'dot-green','Sedang':'dot-yellow','Lama':'dot-red' }[r.kategori] || '';
            tbody.innerHTML += `
                <tr>
                    <td>${r.id}</td><td>${r.hari}</td><td>${r.waktu}</td>
                    <td>${r.kendaraan}</td>
                    <td style="color:var(--green)">${r.waktu_tunggu}</td>
                    <td class="fuzzy-result">${r.hasil_fuzzy} dtk</td>
                    <td><span class="dot ${kc}"></span>${r.kategori}</td>
                </tr>`;
        });
        batchLoaded = true;
    } catch(e) {
        document.getElementById('batchTbody').innerHTML =
            '<tr><td colspan="7" style="text-align:center;color:var(--muted)">Gagal memproses</td></tr>';
    }
}
