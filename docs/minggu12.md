# Dokumentasi Minggu 12 — Integrasi Full-Stack dan Deployment SisaBaik

## 1. Pendahuluan

Dokumentasi ini berisi rangkuman proses pengerjaan dan pengembangan aplikasi SisaBaik pada Chapter 11. Fokus pengerjaan meliputi pemeriksaan integrasi frontend dan backend, persiapan database cloud, konfigurasi lingkungan produksi, pengujian aplikasi, serta dokumentasi hasil pengembangan.

SisaBaik merupakan aplikasi berbasis web yang digunakan untuk mengelola penawaran makanan berlebih agar dapat dimanfaatkan oleh pembeli.

## 2. Struktur dan Teknologi Proyek

Aplikasi SisaBaik dikembangkan menggunakan beberapa teknologi berikut:

| Teknologi | Kegunaan |
|---|---|
| Node.js | Menjalankan backend |
| Express.js | Mengelola REST API |
| Vue.js 3 | Membangun antarmuka pengguna |
| Vite | Menjalankan dan membangun frontend |
| Vue Router | Mengatur navigasi halaman |
| PostgreSQL | Menyimpan data aplikasi |
| Neon | Menyediakan database PostgreSQL cloud |
| Git dan GitHub | Mengelola versi source code |

Frontend dan backend diintegrasikan melalui REST API dengan endpoint `/api`.

## 3. Integrasi Frontend dan Backend

Frontend menggunakan Vue.js untuk menampilkan halaman dan mengelola interaksi pengguna. Backend menggunakan Express.js untuk menerima request, melakukan validasi, memeriksa hak akses, serta mengelola komunikasi dengan database.

Pada lingkungan pengembangan, Vite menggunakan proxy untuk meneruskan request `/api` ke backend.

Pada lingkungan produksi, backend menyajikan hasil build frontend dari folder `frontend/dist`.

## 4. Konfigurasi Database Cloud

Database cloud menggunakan Neon PostgreSQL.

Konfigurasi koneksi database cloud disimpan dalam file `.env.cloud`, sedangkan `.env.cloud.example` digunakan sebagai contoh konfigurasi tanpa kredensial asli.

Inisialisasi database cloud dilakukan menggunakan perintah:

```bash
npm run db:init:cloud
```

Proses inisialisasi dilakukan tanpa seed data. Dengan demikian, database cloud dapat digunakan untuk proses pendaftaran akun melalui aplikasi.

Pemeriksaan struktur database dilakukan untuk memastikan tabel dan kolom yang diperlukan tersedia.

**Catatan keamanan:**
- Jangan memasukkan kredensial database ke repositori.
- Jangan membagikan isi `.env.cloud`.
- Gunakan koneksi SSL untuk database cloud.
- Jangan melakukan reset database tanpa memastikan kebutuhan dan keamanan data.

## 5. Konfigurasi Lingkungan Produksi

Persiapan lingkungan produksi mencakup beberapa konfigurasi:

- Menggunakan runtime Node.js.
- Mengatur variabel lingkungan untuk aplikasi.
- Mengatur koneksi database cloud.
- Menggunakan secret khusus untuk autentikasi.
- Memastikan frontend telah melalui proses build.
- Menjalankan aplikasi melalui perintah `npm start`.
- Memastikan server dapat menerima request melalui port yang disediakan lingkungan hosting.

Perintah untuk membangun frontend dari folder root:

```bash
npm run build
```

Perintah untuk menjalankan aplikasi:

```bash
npm start
```

## 6. Pengujian Aplikasi

### 6.1 Pengujian Deployment Lokal

Pengujian dilakukan menggunakan perintah:

```bash
npm run deploy:test -- http://127.0.0.1:3000
```

Hasil pengujian menunjukkan 10 pemeriksaan berhasil (`PASS`), yang meliputi:

- Health check.
- Pemeriksaan halaman HTML.
- Pemeriksaan file JavaScript dan CSS.
- Pemeriksaan respons halaman yang tidak ditemukan.
- Pemeriksaan perlindungan endpoint yang membutuhkan autentikasi.
- Pemeriksaan agar file konfigurasi rahasia tidak dapat diakses melalui HTTP.

### 6.2 Pengujian Workflow

Pengujian workflow mencakup beberapa proses aplikasi, seperti:

- Pengelolaan penawaran.
- Pemesanan makanan.
- Reservasi stok.
- Pembatalan pesanan.
- Penolakan pesanan.
- Proses transaksi.
- Perhitungan dashboard.

Ditemukan kendala pada pengujian edit penawaran, yaitu respons `400 VALIDATION_ERROR` karena payload mengandung kolom yang tidak didukung validator backend. Oleh karena itu, pengujian bagian edit penawaran masih memerlukan pemeriksaan lanjutan.

### 6.3 Pengujian Manual

Pengujian manual lokal dilakukan pada beberapa alur, antara lain:

- Pembuatan penawaran oleh penyedia.
- Pemesanan oleh pembeli.
- Konfirmasi pesanan.
- Persiapan pesanan.
- Pengambilan pesanan dan pembayaran.
- Pemeriksaan dashboard.

Pengujian ini digunakan untuk memastikan alur utama aplikasi dapat dijalankan sesuai aturan bisnis.

## 7. Aksesibilitas dan Performa

Pemeriksaan aksesibilitas dan performa dilakukan sebagai bagian dari evaluasi aplikasi.

Hasil pemeriksaan yang telah diperoleh:

- Skor aksesibilitas Lighthouse: 100.
- Pemeriksaan otomatis: 26 pemeriksaan berhasil.
- Pemeriksaan manual: masih terdapat beberapa item yang perlu diselesaikan.
- Pengukuran performa: belum memperoleh skor yang valid karena kendala `NO_NAVSTART`.

Pemeriksaan lanjutan masih diperlukan, terutama untuk pengujian navigasi keyboard, tampilan pada ukuran layar 320 piksel, dan pemeriksaan halaman secara menyeluruh.

## 8. Keamanan Aplikasi

Beberapa langkah keamanan yang diterapkan dalam pengembangan:

1. File konfigurasi rahasia tidak dimasukkan ke repositori Git.
2. File `.env.cloud.example` hanya berisi contoh konfigurasi.
3. Koneksi database cloud menggunakan SSL.
4. Endpoint tertentu dilindungi autentikasi dan pemeriksaan hak akses.
5. Akses fitur disesuaikan dengan peran pengguna.
6. Secret autentikasi produksi dipisahkan dari konfigurasi lokal.
7. Folder backup dan hasil build tidak dimasukkan ke repositori publik.

## 9. Kendala dan Penyelesaian

| Kendala | Penjelasan dan Penanganan |
|---|---|
| `400 VALIDATION_ERROR` | Payload edit penawaran mengandung kolom yang tidak didukung validator backend. Perlu pemeriksaan dan penyesuaian payload. |
| `502 NON_JSON` | Dapat terjadi ketika backend tidak berjalan atau koneksi terputus. Pemeriksaan dilakukan pada status server dan koneksi. |
| Error impor modul | Nama fungsi impor tidak sesuai dengan ekspor pada file sumber. Perbaikan dilakukan dengan menyelaraskan nama fungsi. |
| Koneksi database cloud | Konfigurasi koneksi dipisahkan dari database lokal dan menggunakan SSL. |

## 10. Evaluasi dan Pengembangan Selanjutnya

Berdasarkan proses pengerjaan, beberapa hal masih dapat dikembangkan:

- Memperbaiki dan melengkapi pengujian edit penawaran.
- Melengkapi pemeriksaan aksesibilitas secara manual.
- Mengulang pengukuran performa hingga memperoleh hasil yang valid.
- Menguji seluruh halaman dan alur aplikasi pada berbagai ukuran layar.
- Mengembangkan fitur reset kata sandi dan verifikasi email.
- Mengintegrasikan payment gateway.
- Mengembangkan pembaruan data secara real-time.

## 11. Dokumentasi dan Repositori

Source code aplikasi dikelola melalui GitHub.

- Repository: https://github.com/Faniya23/sisabaik-api
- Branch: `feature/deployment-sisabaik`

Dokumentasi Minggu 12 disimpan dalam folder `docs/minggu12/`.

## 12. Kesimpulan

Pengerjaan Chapter 11 berfokus pada persiapan integrasi full-stack dan lingkungan produksi aplikasi SisaBaik. Proses yang dilakukan meliputi pemeriksaan integrasi frontend dan backend, inisialisasi database cloud, pengaturan konfigurasi produksi, serta pengujian aplikasi.

Hasil pengujian menunjukkan bahwa beberapa pemeriksaan deployment lokal telah berhasil. Namun, masih terdapat bagian yang memerlukan perbaikan dan pengujian lanjutan, khususnya pada workflow edit penawaran, aksesibilitas manual, dan pengukuran performa.