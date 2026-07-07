/* ============================================================
   dashboard.js — Khusus untuk halaman Panel Petugas (dashboard.html)
   Terhubung ke API Laravel yang sama dengan website user
   ============================================================ */

let currentFilter = "all"; // filter sidebar yang sedang aktif
let dashboardDataCache = []; // data hasil filter sidebar (sebelum di-search)

// Judul tabel sesuai filter sidebar yang aktif
var judulFilterMap = {
  all: "Laporan Masuk",
  baru: "Laporan Baru (Menunggu)",
  proses: "Laporan Sedang Diproses",
  selesai: "Laporan Selesai",
  banjir: "Laporan Kategori Banjir",
  sampah: "Laporan Kategori Sampah",
  lampu: "Laporan Kategori Lampu Jalan",
  jalan: "Laporan Kategori Jalan Rusak",
};

// ------------------------------------------------------------
// KLIK MENU SIDEBAR
// ------------------------------------------------------------
function switchDash(el, type) {
  document
    .querySelectorAll(".sidebar-item")
    .forEach((i) => i.classList.remove("active"));
  el.classList.add("active");

  currentFilter = type;

  // Kosongkan kotak search setiap pindah menu, supaya tidak bingung
  var searchInput = document.getElementById("dash-search-input");
  if (searchInput) searchInput.value = "";

  loadDashboard(type);
}

// ------------------------------------------------------------
// AMBIL DATA DARI API + HITUNG METRIK + FILTER SESUAI SIDEBAR
// ------------------------------------------------------------
async function loadDashboard(filter) {
  filter = filter || currentFilter || "all";
  currentFilter = filter;

  try {
    var response = await fetch("mysql-production-3747.up.railway.app");
    var hasil = await response.json();
    if (!hasil.success) return;

    var semuaData = hasil.data;

    // === Metrik selalu dihitung dari SEMUA data (real-time, tidak ikut filter) ===
    var totalSemua = semuaData.length;
    var totalMenunggu = semuaData.filter((l) => l.status === "menunggu").length;
    var totalDiproses = semuaData.filter((l) => l.status === "diproses").length;
    var totalSelesai = semuaData.filter((l) => l.status === "selesai").length;

    setText("metric-total", totalSemua);
    setText("metric-menunggu", totalMenunggu);
    setText("metric-diproses", totalDiproses);
    setText("metric-selesai", totalSelesai);
    setText("badge-baru", totalMenunggu);

    // === Filter data sesuai menu sidebar yang diklik ===
    var statusFilterMap = {
      baru: "menunggu",
      proses: "diproses",
      selesai: "selesai",
    };
    var kategoriList = ["banjir", "sampah", "lampu", "jalan"];

    var dataTampil = semuaData;
    if (statusFilterMap[filter]) {
      dataTampil = semuaData.filter(
        (l) => l.status === statusFilterMap[filter],
      );
    } else if (kategoriList.includes(filter)) {
      dataTampil = semuaData.filter((l) => l.kategori === filter);
    }
    // filter === "all" → tampilkan semua

    // Simpan hasil filter sidebar ini ke cache, supaya kotak search bisa
    // mencari DI DALAM hasil filter ini tanpa fetch ulang ke server
    dashboardDataCache = dataTampil;

    var judulEl = document.getElementById("dash-table-title");
    if (judulEl)
      judulEl.textContent = judulFilterMap[filter] || "Laporan Masuk";

    renderDashboardTable(dataTampil);
  } catch (error) {
    console.log("Gagal load dashboard, pastikan Laravel jalan");
    var tbody = document.getElementById("dash-tbody");
    if (tbody) {
      tbody.innerHTML = `
        <tr>
          <td colspan="7" style="text-align:center;color:var(--merah);padding:24px;">
            ❌ Gagal terhubung ke server. Pastikan Laravel sedang berjalan (php artisan serve).
          </td>
        </tr>
      `;
    }
  }
}

// ------------------------------------------------------------
// KOTAK PENCARIAN — INI YANG SEBELUMNYA TIDAK BERFUNGSI
// Mencari di dalam data yang SUDAH difilter sidebar (dashboardDataCache)
// berdasarkan: judul, kategori, ATAU lokasi/kecamatan
// ------------------------------------------------------------
function searchDashboard(keyword) {
  keyword = (keyword || "").toLowerCase().trim();

  if (!keyword) {
    // Kalau kotak search dikosongkan, tampilkan lagi semua hasil filter sidebar
    renderDashboardTable(dashboardDataCache);
    return;
  }

  var hasilCari = dashboardDataCache.filter(function (l) {
    var judul = (l.judul || "").toLowerCase();
    var kategori = (l.kategori || "").toLowerCase();
    var lokasi = (l.kecamatan || "").toLowerCase();
    var deskripsi = (l.deskripsi || "").toLowerCase();

    return (
      judul.includes(keyword) ||
      kategori.includes(keyword) ||
      lokasi.includes(keyword) ||
      deskripsi.includes(keyword)
    );
  });

  renderDashboardTable(hasilCari);
}

// ------------------------------------------------------------
// RENDER TABEL — dipakai bersama oleh loadDashboard() & searchDashboard()
// ------------------------------------------------------------
function renderDashboardTable(dataTampil) {
  var tbody = document.getElementById("dash-tbody");
  if (!tbody) return;
  tbody.innerHTML = "";

  if (!dataTampil || dataTampil.length === 0) {
    tbody.innerHTML = `
      <tr>
        <td colspan="7" style="text-align:center;color:var(--abu-gelap);padding:24px;">
          Tidak ada laporan yang cocok.
        </td>
      </tr>
    `;
    return;
  }

  var ikonMap = { banjir: "🌊", sampah: "🗑️", lampu: "💡", jalan: "🚧" };
  var statusMap = {
    menunggu: '<span class="laporan-status status-baru">Menunggu</span>',
    diproses: '<span class="laporan-status status-proses">Diproses</span>',
    selesai: '<span class="laporan-status status-selesai">Selesai ✓</span>',
  };

  dataTampil.forEach(function (l) {
    tbody.innerHTML += `
      <tr>
        <td><span style="font-family:'DM Mono',monospace;font-size:11px;color:var(--abu-gelap);">SGL-${String(l.id).padStart(4, "0")}</span></td>
        <td>${ikonMap[l.kategori] || "📋"} ${l.kategori}</td>
        <td style="font-weight:600">${l.judul}</td>
        <td style="color:var(--abu-gelap)">${l.kecamatan || "-"}</td>
        <td><span style="font-weight:700;color:var(--hijau)">👍 ${l.upvote_count || 0}</span></td>
        <td>${statusMap[l.status] || ""}</td>
        <td>
          <select class="action-select" onchange="ubahStatusDB(this, ${l.id})">
            <option value="">Pilih Aksi</option>
            <option value="diproses">Proses</option>
            <option value="selesai">Selesai</option>
          </select>
        </td>
      </tr>
    `;
  });
}

// ------------------------------------------------------------
// UBAH STATUS LAPORAN (dropdown Aksi)
// ------------------------------------------------------------
async function ubahStatusDB(selectEl, id) {
  var status = selectEl.value;
  if (!status) return;

  try {
    var response = await fetch(
      "mysql-production-3747.up.railway.app" + id + "/status",
      {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: status }),
      },
    );
    var hasil = await response.json();
    if (hasil.success) {
      loadDashboard(currentFilter); // refresh dengan filter sidebar yang sama
    } else {
      alert("Gagal update status");
    }
  } catch (error) {
    alert("Koneksi gagal");
  }
}

// ------------------------------------------------------------
// Helper kecil
// ------------------------------------------------------------
function setText(id, value) {
  var el = document.getElementById(id);
  if (el) el.textContent = value;
}

// ------------------------------------------------------------
// Muat data begitu halaman dibuka
// ------------------------------------------------------------
document.addEventListener("DOMContentLoaded", () => {
  loadDashboard("all");
});
