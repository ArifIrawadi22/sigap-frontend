let lokasiLat = null;
let lokasiLng = null;
let lokasiNama = ""; // nama lokasi hasil deteksi otomatis dari GPS

// PAGE NAVIGATION
function showPage(name) {
  document
    .querySelectorAll(".page")
    .forEach((p) => p.classList.remove("active"));

  document
    .querySelectorAll(".nav-btn")
    .forEach((b) => b.classList.remove("active"));

  document.getElementById("page-" + name).classList.add("active");

  // Aktifkan tombol nav yang sesuai (kalau tombolnya ada di navbar)
  document.querySelectorAll(".nav-btn").forEach((btn) => {
    if (btn.getAttribute("onclick") === `showPage('${name}')`) {
      btn.classList.add("active");
    }
  });

  if (name === "peta") setTimeout(initMap, 100);
}

// KATEGORI FORM
let selectedKat = "";
function selectKat(kat) {
  selectedKat = kat;
  document
    .querySelectorAll(".kategori-option")
    .forEach((el) => el.classList.remove("selected"));
  document.getElementById("kat-" + kat).classList.add("selected");
}
function pilihKategori(kat) {
  showPage("laporan");
  setTimeout(() => selectKat(kat), 100);
}

// FOTO PREVIEW
function previewFoto(input) {
  if (input.files && input.files[0]) {
    const reader = new FileReader();
    reader.onload = (e) => {
      document.getElementById("foto-img").src = e.target.result;
      document.getElementById("foto-upload").style.display = "none";
      document.getElementById("foto-preview").style.display = "block";
    };
    reader.readAsDataURL(input.files[0]);
  }
}

// GPS
function getGPS() {
  const btn = document.getElementById("gps-btn");
  const res = document.getElementById("gps-result");
  btn.textContent = "⏳ Mengambil lokasi...";
  btn.disabled = true;

  if (!navigator.geolocation) {
    // Fallback kalau browser tidak support GPS
    lokasiLat = -3.7928;
    lokasiLng = 102.2608;
    selesaikanGPS(btn, res, lokasiLat, lokasiLng, 9999);
    return;
  }

  navigator.geolocation.getCurrentPosition(
    (pos) => {
      lokasiLat = pos.coords.latitude;
      lokasiLng = pos.coords.longitude;
      selesaikanGPS(
        btn,
        res,
        lokasiLat,
        lokasiLng,
        Math.round(pos.coords.accuracy),
      );
    },
    () => {
      // Kalau ditolak izin GPS, pakai titik tengah Kota Bengkulu sebagai default
      lokasiLat = -3.7928;
      lokasiLng = 102.2608;
      selesaikanGPS(btn, res, lokasiLat, lokasiLng, 9999);
    },
  );
}

// Jalan setelah koordinat didapat — sekaligus cari nama lokasinya (reverse geocoding)
async function selesaikanGPS(btn, res, lat, lng, akurasi) {
  res.textContent = "📍 Koordinat didapat, mencari nama lokasi...";
  await cariNamaLokasi(lat, lng);
  tampilkanHasilGPS(btn, res, lat, lng, akurasi);
}

// Ubah koordinat (lat, lng) menjadi alamat asli yang mudah dibaca
// Contoh hasil: "Jl. Kampung Bali No. 12, Kampung Bali, Kota Bengkulu"
// Pakai Nominatim (OpenStreetMap) — gratis, tanpa API key
async function cariNamaLokasi(lat, lng) {
  try {
    var url = `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=18&addressdetails=1`;
    var response = await fetch(url, {
      headers: { Accept: "application/json" },
    });
    var data = await response.json();
    var a = data.address || {};

    // Nama jalan (kalau ada)
    var jalan = a.road || a.pedestrian || a.footway || a.residential || "";
    var noRumah = a.house_number || "";

    // Nama kelurahan/desa/lingkungan sekitar
    var area =
      a.suburb || a.village || a.neighbourhood || a.city_district || "";

    // Nama kota/kabupaten
    var kota = a.city || a.town || a.county || "";

    var bagian = [];
    if (jalan) {
      bagian.push(noRumah ? `Jl. ${jalan} No. ${noRumah}` : `Jl. ${jalan}`);
    }
    if (area) bagian.push(area);
    if (kota) bagian.push(kota);

    // Kalau semua field detail kosong, fallback ke alamat lengkap bawaan Nominatim
    lokasiNama =
      bagian.length > 0 ? bagian.join(", ") : data.display_name || "";
  } catch (error) {
    // Kalau gagal (misal tidak ada internet), biarkan kosong —
    // nanti tetap bisa diisi manual lewat dropdown kelurahan
    lokasiNama = "";
  }
}

function tampilkanHasilGPS(btn, res, lat, lng, akurasi) {
  btn.textContent = "✅ Lokasi Berhasil Diambil";
  btn.style.background = "var(--hijau-muda)";
  btn.style.borderColor = "var(--hijau)";
  btn.style.color = "var(--hijau)";

  if (lokasiNama) {
    // Tampilkan alamat lengkap sebagai info utama, koordinat sebagai detail kecil
    res.innerHTML = `📍 <strong>${lokasiNama}</strong><br /><span style="font-size:11px;color:var(--abu-gelap)">Koordinat: ${lat.toFixed(4)}°, ${lng.toFixed(4)}° (akurasi ±${akurasi}m)</span>`;
  } else {
    res.innerHTML = `📍 Nama lokasi tidak terdeteksi, isi manual di bawah<br /><span style="font-size:11px;color:var(--abu-gelap)">Koordinat: ${lat.toFixed(4)}°, ${lng.toFixed(4)}° (akurasi ±${akurasi}m)</span>`;
  }
}

// SUBMIT LAPORAN
async function submitLaporan() {
  const judul = document.getElementById("inp-judul").value.trim();
  const nama = document.getElementById("inp-nama").value.trim();
  const wa = document.getElementById("inp-wa").value.trim();

  if (!selectedKat || !judul || !nama) {
    alert("Harap isi kategori, judul, dan nama pelapor terlebih dahulu!");
    return;
  }

  // 🆕 Cek dulu apakah GPS sudah diambil. Kalau belum, ingatkan user
  // supaya lokasinya tidak kosong di dashboard nanti.
  if (lokasiLat === null || lokasiLng === null) {
    var lanjutTanpaGPS = confirm(
      "⚠️ Kamu belum klik 'Ambil Lokasi Otomatis'!\n\n" +
        "Klik Cancel untuk kembali mengisi lokasi, atau klik OK untuk tetap kirim tanpa lokasi GPS.",
    );
    if (!lanjutTanpaGPS) return; // user pilih Cancel → batalkan kirim, biar isi GPS dulu
  }

  // 🆕 Fallback: kalau nama lokasi gagal terdeteksi tapi koordinat ADA,
  // tetap kirim koordinatnya dalam bentuk teks supaya kolom Lokasi tidak kosong
  var lokasiFallback =
    lokasiLat !== null && lokasiLng !== null
      ? `Koordinat ${lokasiLat.toFixed(4)}, ${lokasiLng.toFixed(4)}`
      : "";

  try {
    var response = await fetch("http://localhost:8000/api/laporan", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        kategori: selectedKat,
        judul: judul,
        deskripsi: document.getElementById("inp-desc").value,
        // Urutan prioritas: nama alamat dari GPS → koordinat mentah → dropdown manual
        kecamatan:
          lokasiNama ||
          lokasiFallback ||
          (document.getElementById("inp-kelurahan")
            ? document.getElementById("inp-kelurahan").value
            : "") ||
          "",
        nama_pelapor: nama,
        no_wa: wa || "0",
        keparahan: "sedang",
        latitude: lokasiLat,
        longitude: lokasiLng,
      }),
    });

    var hasil = await response.json();

    if (hasil.success) {
      document.getElementById("success-id").textContent =
        "SGL-" + hasil.data.id;
      document.getElementById("success-modal").classList.add("show");
    } else {
      alert("Gagal kirim: " + hasil.message);
    }
  } catch (error) {
    alert("Koneksi gagal! Pastikan Laravel sudah dijalankan di terminal.");
  }
}

function closeModal() {
  document.getElementById("success-modal").classList.remove("show");
  showPage("tracking");
}

// UPVOTE
function upvote(btn) {
  const span = btn.querySelector("span");
  let n = parseInt(span.textContent);
  span.textContent = n + 1;
  btn.style.background = "var(--hijau-muda)";
  btn.style.color = "var(--hijau)";
  btn.disabled = true;
}

// TRACKING
async function cariLaporan() {
  var inputVal = document.getElementById("track-input").value.trim();
  var id = inputVal.replace(/[^0-9]/g, ""); // ambil angka saja dari "SGL-5"

  if (!id) {
    alert("Masukkan ID laporan yang valid, contoh: SGL-5");
    return;
  }

  try {
    var response = await fetch("http://localhost:8000/api/laporan/" + id);
    var hasil = await response.json();

    if (!hasil.success) {
      alert("Laporan tidak ditemukan!");
      document.getElementById("tracking-result").style.display = "none";
      return;
    }

    var laporan = hasil.data;
    var hasilDiv = document.getElementById("tracking-result");

    var statusMap = {
      menunggu: '<span class="laporan-status status-baru">Menunggu</span>',
      diproses: '<span class="laporan-status status-proses">Diproses</span>',
      selesai: '<span class="laporan-status status-selesai">Selesai ✓</span>',
    };

    var timelineHtml = `
      <div class="timeline-item">
        <div class="timeline-dot dot-done">✓</div>
        <div class="timeline-content">
          <div class="timeline-label">Laporan Diterima</div>
          <div class="timeline-date">${laporan.created_at}</div>
          <div class="timeline-note">Laporan masuk ke sistem dan menunggu ditindaklanjuti.</div>
        </div>
      </div>
    `;

    if (laporan.status_history && laporan.status_history.length > 0) {
      laporan.status_history.forEach(function (h, index) {
        var isLast = index === laporan.status_history.length - 1;
        timelineHtml += `
          <div class="timeline-item">
            <div class="timeline-dot ${isLast ? "dot-active" : "dot-done"}">${isLast ? "🔄" : "✓"}</div>
            <div class="timeline-content">
              <div class="timeline-label" ${isLast ? 'style="color:var(--hijau)"' : ""}>${h.status_baru}</div>
              <div class="timeline-date">${h.created_at}</div>
              <div class="timeline-note">${h.catatan || ""}</div>
            </div>
          </div>
        `;
      });
    }

    if (laporan.status !== "selesai") {
      timelineHtml += `
        <div class="timeline-item">
          <div class="timeline-dot dot-wait">⏳</div>
          <div class="timeline-content">
            <div class="timeline-label" style="color:var(--abu-gelap)">Selesai</div>
            <div class="timeline-date">Menunggu</div>
          </div>
        </div>
      `;
    }

    hasilDiv.innerHTML = `
      <div class="tracking-header">
        <div class="tracking-id">ID: SGL-${laporan.id}</div>
        <div class="tracking-title">${laporan.judul}</div>
        <div class="tracking-meta">
          📍 ${laporan.kecamatan || "Bengkulu"} · ${laporan.created_at} · ${laporan.kategori}
          &nbsp;&nbsp;${statusMap[laporan.status] || ""}
        </div>
      </div>
      <div class="timeline">${timelineHtml}</div>
    `;
    hasilDiv.style.display = "block";
  } catch (error) {
    alert("Gagal ambil data. Pastikan Laravel sedang berjalan!");
  }
}

// PETA
let mapInstance = null;
let markerLayer = null;

async function initMap() {
  if (!mapInstance) {
    mapInstance = L.map("map").setView([-3.7928, 102.2608], 13);
    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution: "© OpenStreetMap",
    }).addTo(mapInstance);
    markerLayer = L.layerGroup().addTo(mapInstance);
  }

  markerLayer.clearLayers();

  try {
    var response = await fetch("http://localhost:8000/api/laporan");
    var hasil = await response.json();
    if (!hasil.success) return;

    var ikonMap = { banjir: "🌊", sampah: "🗑️", lampu: "💡", jalan: "🚧" };

    // Warna sekarang ikut STATUS, bukan kategori
    var colorStatusMap = {
      menunggu: "#F59E0B", // orange
      diproses: "#3B82F6", // biru
      selesai: "#16A34A", // hijau
    };
    var statusTeks = {
      menunggu: "Menunggu",
      diproses: "Diproses",
      selesai: "Selesai",
    };

    hasil.data.forEach((l) => {
      if (!l.latitude || !l.longitude) return;

      var warnaMarker = colorStatusMap[l.status] || "#999";
      var ikonBencana = ikonMap[l.kategori] || "📋";

      const icon = L.divIcon({
        html: `<div style="width:36px;height:36px;background:${warnaMarker};border:3px solid white;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:15px;box-shadow:0 2px 8px rgba(0,0,0,.3);">${ikonBencana}</div>`,
        className: "",
        iconSize: [36, 36],
        iconAnchor: [18, 18],
      });

      L.marker([l.latitude, l.longitude], { icon })
        .addTo(markerLayer)
        .bindPopup(
          `<b>${l.judul}</b><br>📍 ${l.kecamatan || "Bengkulu"}<br>Status: <b>${statusTeks[l.status] || l.status}</b>`,
        );
    });
  } catch (error) {
    console.log("Gagal ambil data peta, pastikan Laravel jalan");
  }
}

// FILTER PETA
function filterPeta(btn, kat) {
  document
    .querySelectorAll(".filter-chip")
    .forEach((c) => c.classList.remove("active"));
  btn.classList.add("active");
}

// TRACKING AUTO SEARCH
document.addEventListener("DOMContentLoaded", () => {
  const input = document.getElementById("track-input");
  if (input)
    input.addEventListener("keypress", (e) => {
      if (e.key === "Enter") cariLaporan();
    });
});

// =============================================
// AMBIL LAPORAN DARI DATABASE
// =============================================
async function ambilLaporanDariDB() {
  try {
    var response = await fetch("http://localhost:8000/api/laporan");
    var hasil = await response.json();

    if (hasil.success && hasil.data.length > 0) {
      var listEl = document.querySelector(".laporan-list");
      if (!listEl) return;

      listEl.innerHTML = "";

      var warnaMap = {
        banjir: "#dbeafe",
        sampah: "#fef3c7",
        lampu: "#fef9c3",
        jalan: "#ffe4e6",
      };
      var ikonMap = { banjir: "🌊", sampah: "🗑️", lampu: "💡", jalan: "🚧" };
      var statusMap = {
        menunggu: '<span class="laporan-status status-baru">Menunggu</span>',
        diproses: '<span class="laporan-status status-proses">Diproses</span>',
        selesai: '<span class="laporan-status status-selesai">Selesai ✓</span>',
      };

      hasil.data.forEach(function (laporan) {
        listEl.innerHTML += `
          <div class="laporan-item">
            <div class="laporan-cat" style="background:${warnaMap[laporan.kategori] || "#f1f5f9"}">${ikonMap[laporan.kategori] || "📋"}</div>
            <div class="laporan-info">
              <div class="laporan-title">${laporan.judul}</div>
              <div class="laporan-meta">📍 ${laporan.kecamatan || "Bengkulu"}</div>
            </div>
            ${statusMap[laporan.status] || ""}
            <button class="upvote-btn" onclick="upvote(this)">
              👍 <span>${laporan.upvote_count || 0}</span>
            </button>
          </div>
        `;
      });
    }
  } catch (error) {
    console.log("Server tidak aktif, tampilkan data default");
  }
}

// Panggil saat halaman dibuka
ambilLaporanDariDB();
