# SisaBaik — Integrasi Full-Stack dan Deployment (Chapter 11)

## 1. Deskripsi Proyek

SisaBaik merupakan aplikasi berbasis web untuk mengelola penawaran makanan berlebih agar dapat dimanfaatkan oleh pembeli. Aplikasi ini dikembangkan menggunakan Vue.js sebagai frontend, Express dan Node.js sebagai backend, serta PostgreSQL sebagai database.

Pengembangan aplikasi mencakup integrasi frontend dan backend, pengelolaan data menggunakan database PostgreSQL, serta persiapan konfigurasi aplikasi untuk lingkungan produksi.

## 2. Teknologi yang Digunakan

- Node.js dan npm
- Vue.js 3
- Vite
- Vue Router
- Express.js
- PostgreSQL
- Neon PostgreSQL sebagai database cloud
- Git dan GitHub
- REST API

## 3. Fitur Aplikasi

### Autentikasi dan Pengguna
- Pendaftaran akun sebagai pembeli atau penyedia.
- Login dan logout.
- Pengelolaan profil penyedia.
- Verifikasi usaha oleh sistem sesuai aturan backend.
- Pembatasan akses berdasarkan peran dan status akun.

### Pengelolaan Penawaran
- Menambahkan penawaran makanan.
- Mengubah informasi penawaran.
- Mengelola harga dan stok.
- Mengunggah foto makanan secara opsional.
- Melihat katalog penawaran.

### Pengelolaan Pesanan
- Melakukan pemesanan makanan.
- Melihat detail pesanan.
- Membatalkan pesanan sesuai status.
- Penyedia dapat menolak, mengonfirmasi, dan menyiapkan pesanan.
- Proses serah terima dan pembayaran di tempat.

### Dashboard
- Menampilkan ringkasan transaksi.
- Menampilkan data belanja dan pendapatan.
- Menampilkan diskon dan unit makanan yang tersalurkan sesuai status transaksi.

## 4. Integrasi Frontend dan Backend

Frontend Vue berkomunikasi dengan backend Express melalui REST API menggunakan endpoint dengan awalan `/api`.

Pada lingkungan pengembangan, Vite menggunakan proxy `/api` untuk meneruskan request ke backend. Proxy tidak mengubah path endpoint.

Backend memproses request, melakukan validasi dan pemeriksaan hak akses, kemudian berkomunikasi dengan PostgreSQL untuk menyimpan atau mengambil data.

Pada lingkungan produksi, backend juga berfungsi menyajikan hasil build frontend dari folder `frontend/dist`, sehingga frontend dan backend dapat diakses melalui satu aplikasi.

## 5. Aturan dan Proses Bisnis

- Pengguna mendaftar menggunakan data akun dan kata sandi sendiri.
- Akun penyedia mengikuti proses peninjauan dan verifikasi usaha.
- Akses fitur dibatasi berdasarkan peran dan status akun.
- Penawaran memiliki data harga, stok, foto opsional, dan versi data.
- Perubahan penawaran menggunakan versi untuk membantu mencegah perubahan data yang bertabrakan.
- Pemesanan melakukan reservasi stok.
- Pembatalan atau penolakan pesanan dapat mengembalikan stok sesuai aturan status transaksi.
- Pembayaran dilakukan secara langsung saat pengambilan pesanan.

## 6. Dashboard dan Definisi Metrik

Dashboard mengambil data melalui agregasi backend dengan memperhatikan cakupan akun dan status transaksi.

- **Belanja:** nilai transaksi pembeli yang telah memenuhi status perhitungan.
- **Pendapatan:** nilai pembayaran dari transaksi yang telah selesai sesuai aturan backend.
- **Diskon:** selisih harga normal dan harga penawaran pada transaksi yang memenuhi ketentuan perhitungan.
- **Unit tersalurkan:** jumlah unit makanan dari transaksi yang telah selesai atau diambil sesuai aturan backend.

Reservasi yang belum selesai tidak langsung dihitung sebagai pendapatan atau makanan tersalurkan. Pesanan yang dibatalkan juga tidak dihitung sebagai transaksi selesai.

## 7. Cara Menjalankan Proyek

### Persyaratan

- Node.js
- npm
- PostgreSQL

### A. Instalasi Backend

Dari folder root `sisabaik-api`, jalankan:

```bash
npm ci
```

### B. Instalasi Frontend

```bash
npm --prefix frontend ci --include=dev
```

### C. Menjalankan Backend Lokal

Dari folder root `sisabaik-api`:

```bash
npm run start:local
```

### D. Menjalankan Frontend

Buka terminal baru:

```bash
cd frontend
npm run dev
```

Akses aplikasi melalui alamat lokal yang ditampilkan Vite, biasanya:

```text
http://localhost:5173
```

### E. Build dan Preview Frontend

Dari folder root proyek:

```bash
npm run build
```

Untuk menjalankan preview frontend:

```bash
cd frontend
npm run preview
```

Preview dapat diakses melalui:

```text
http://127.0.0.1:4173
```

### F. Menjalankan Aplikasi dalam Mode Produksi Lokal

Kembali ke folder root `sisabaik-api`:

```bash
npm run build
npm start
```

Aplikasi dapat diakses melalui:

```text
http://127.0.0.1:3000
```

## 8. Database Cloud, Deployment, dan Hasil Pengujian

### A. Database Cloud

Database cloud menggunakan Neon PostgreSQL.

Konfigurasi koneksi database cloud disimpan secara terpisah melalui file `.env.cloud` agar tidak menggantikan konfigurasi database lokal.

File `.env.cloud.example` disediakan sebagai contoh konfigurasi tanpa menyertakan informasi rahasia.

Inisialisasi database cloud dilakukan menggunakan perintah:

```bash
npm run db:init:cloud
```

Inisialisasi dilakukan tanpa seed data sehingga pengguna dapat melakukan pendaftaran akun melalui aplikasi.

### B. GitHub

Source code proyek dikelola menggunakan Git dan GitHub.

- **Repository:** https://github.com/Faniya23/sisabaik-api
- **Branch:** `feature/deployment-sisabaik`

### C. Konfigurasi Deployment

Konfigurasi aplikasi untuk lingkungan produksi mencakup:

- Runtime Node.js.
- Instalasi dependensi backend dan frontend.
- Proses build frontend.
- Perintah menjalankan aplikasi menggunakan `npm start`.
- Pengaturan variabel lingkungan untuk koneksi database, autentikasi, dan konfigurasi server.
- Penggunaan koneksi SSL untuk database cloud.

### D. Hasil Pengujian

Pengujian dilakukan terhadap beberapa bagian aplikasi, meliputi:

- Pemeriksaan health check.
- Pemeriksaan halaman aplikasi.
- Pemeriksaan file JavaScript dan CSS.
- Pemeriksaan respons halaman yang tidak ditemukan.
- Pemeriksaan perlindungan endpoint yang membutuhkan autentikasi.
- Pemeriksaan agar file konfigurasi rahasia tidak dapat diakses melalui HTTP.

Pengujian deployment lokal menggunakan perintah:

```bash
npm run deploy:test -- http://127.0.0.1:3000
```

Hasil pengujian tersebut menunjukkan 10 pemeriksaan berhasil (`PASS`).

Pengujian workflow juga dilakukan untuk memeriksa alur pengelolaan penawaran, transaksi, stok, pembatalan, dan dashboard. Namun, pengujian edit penawaran masih memerlukan pemeriksaan lanjutan karena ditemukan respons `400 VALIDATION_ERROR` akibat payload yang mengandung kolom yang tidak didukung validator backend.

### E. Troubleshooting

Beberapa kendala yang ditemukan selama pengembangan:

- **400 VALIDATION_ERROR:** terjadi ketika payload mengandung kolom yang tidak didukung validator backend.
- **502 NON_JSON:** dapat terjadi ketika koneksi ke backend terputus atau server tidak berjalan.
- **Error impor modul:** terjadi ketika nama fungsi yang diimpor tidak sesuai dengan ekspor pada file sumber.

Perbaikan dilakukan dengan menyesuaikan payload, memeriksa koneksi backend, dan menyelaraskan nama fungsi impor dan ekspor.

## 9. Keterbatasan Aplikasi

Beberapa keterbatasan implementasi saat ini:

- Sesi login menggunakan penyimpanan di memori sehingga sesi dapat hilang ketika proses backend dimulai ulang.
- Belum menggunakan payment gateway.
- Belum tersedia fitur reset kata sandi.
- Belum tersedia verifikasi email.
- Belum menerapkan idempotency key untuk seluruh request transaksi.
- Belum menggunakan pembaruan data secara real-time.
- Penghematan biaya penjual belum dapat dihitung secara akurat hanya berdasarkan harga normal makanan.

## 10. Catatan Keamanan dan Pengembangan

- File `.env`, `.env.cloud`, dan file konfigurasi lain yang berisi informasi rahasia tidak boleh dimasukkan ke repositori publik.
- File `.env.cloud.example` hanya digunakan sebagai contoh konfigurasi dan tidak boleh berisi kredensial asli.
- Folder `node_modules`, `frontend/node_modules`, dan `frontend/dist` tidak perlu dimasukkan ke Git.
- Jangan menyertakan kata sandi, token, atau data pribadi dalam dokumentasi.
- Perubahan source code dan konfigurasi perlu diperiksa sebelum commit dan push.
- Database lokal dan database cloud menggunakan konfigurasi yang terpisah.
- Backup database disimpan secara lokal dan tidak dimasukkan ke repositori publik.
- Dokumentasi teknis dan hasil pengerjaan Chapter 11 disimpan pada folder `docs/minggu12/`.