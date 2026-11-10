SisaBaik — Integrasi Full-Stack Chapter 10

1. Deskripsi Proyek

SisaBaik merupakan aplikasi berbasis web untuk mengelola penawaran makanan berlebih agar dapat dimanfaatkan oleh pembeli. Aplikasi ini dikembangkan menggunakan Vue.js sebagai frontend, Express dan Node.js sebagai backend, serta PostgreSQL sebagai database.

2. Teknologi yang Digunakan

Node.js dan npm

Vue.js 3

Vite

Vue Router

Express.js

PostgreSQL

Git dan GitHub

3. Fitur Aplikasi

Autentikasi dan Pengguna

Pendaftaran akun sebagai pembeli atau penyedia.

Login dan logout.

Pengelolaan profil penyedia.

Verifikasi usaha oleh sistem sesuai aturan backend.

Pengelolaan Penawaran

Menambahkan penawaran makanan.

Mengubah informasi penawaran.

Mengelola harga dan stok.

Mengunggah foto makanan secara opsional.

Melihat katalog penawaran.

Pengelolaan Pesanan

Melakukan pemesanan makanan.

Melihat detail pesanan.

Membatalkan pesanan sesuai status.

Penyedia dapat menolak, mengonfirmasi, dan menyiapkan pesanan.

Proses serah terima dan pembayaran di tempat.

Dashboard

Menampilkan ringkasan transaksi.

Menampilkan data belanja dan pendapatan.

Menampilkan diskon dan unit makanan yang tersalurkan sesuai status transaksi.

4. Integrasi Frontend dan Backend

Frontend Vue berkomunikasi dengan backend Express melalui REST API menggunakan endpoint dengan awalan /api.

Pada lingkungan pengembangan, Vite menggunakan proxy /api untuk meneruskan request ke backend. Proxy tidak mengubah path endpoint.

Backend memproses request, melakukan validasi dan pemeriksaan hak akses, kemudian berkomunikasi dengan PostgreSQL untuk menyimpan atau mengambil data.

5. Aturan dan Proses Bisnis

Pengguna mendaftar menggunakan data akun dan kata sandi sendiri.

Akun penyedia mengikuti proses peninjauan dan verifikasi usaha.

Akses fitur dibatasi berdasarkan peran dan status akun.

Penawaran memiliki data harga, stok, foto opsional, dan versi data.

Perubahan penawaran menggunakan versi untuk membantu mencegah perubahan data yang bertabrakan.

Pemesanan melakukan reservasi stok.

Pembatalan atau penolakan pesanan dapat mengembalikan stok sesuai aturan status transaksi.

Pembayaran dilakukan secara langsung saat pengambilan pesanan.

6. Dashboard dan Definisi Metrik

Dashboard mengambil data melalui agregasi backend dengan memperhatikan cakupan akun dan status transaksi.

Belanja: nilai transaksi pembeli yang telah memenuhi status perhitungan.

Pendapatan: nilai pembayaran dari transaksi yang telah selesai sesuai aturan backend.

Diskon: selisih harga normal dan harga penawaran pada transaksi yang memenuhi ketentuan perhitungan.

Unit tersalurkan: jumlah unit makanan dari transaksi yang telah selesai atau diambil sesuai aturan backend.

Reservasi yang belum selesai tidak langsung dihitung sebagai pendapatan atau makanan tersalurkan. Pesanan yang dibatalkan juga tidak boleh dihitung sebagai transaksi selesai.

7. Cara Menjalankan Proyek

Persyaratan

Node.js

npm

PostgreSQL

A. Menjalankan Backend

Dari folder root sisabaik-api:

npm run dev

B. Menjalankan Frontend

Buka terminal baru:

cd frontend
npm run dev

Akses aplikasi melalui alamat lokal yang ditampilkan Vite, biasanya:

http://localhost:5173

C. Build dan Preview Frontend

Dari folder frontend:

npm run build
npm run preview

Preview dapat diakses melalui:

http://127.0.0.1:4173

D. Build dan Menjalankan Aplikasi Lokal

Kembali ke folder root sisabaik-api:

npm run build
npm run start:local

Aplikasi dapat diakses melalui:

http://127.0.0.1:3000

Script start:local menggunakan konfigurasi .env.

8. Hasil Pengujian dan Troubleshooting

Pengujian dilakukan terhadap beberapa alur aplikasi, meliputi autentikasi, pengelolaan penawaran, reservasi stok, pembatalan, penolakan pesanan, pembayaran, dan perhitungan dashboard.

Beberapa kendala yang ditemukan selama pengembangan:

400 VALIDATION_ERROR: terjadi ketika payload mengandung kolom yang tidak didukung validator backend.

502 NON_JSON: dapat terjadi ketika koneksi ke backend terputus atau server tidak berjalan.

Error impor modul: terjadi ketika nama fungsi yang diimpor tidak sesuai dengan ekspor pada file sumber.

Perbaikan dilakukan dengan menyesuaikan payload, memeriksa koneksi backend, dan menyelaraskan nama fungsi impor dan ekspor.

Catatan: pengujian edit penawaran masih perlu diperiksa kembali karena sebelumnya ditemukan respons 400 VALIDATION_ERROR.

9. Keterbatasan Aplikasi

Beberapa keterbatasan implementasi saat ini:

Sesi login disimpan di memori sehingga dapat hilang ketika halaman di-refresh.

Belum menggunakan payment gateway.

Belum tersedia fitur reset kata sandi.

Belum tersedia verifikasi email.

Belum menerapkan idempotency key untuk seluruh request transaksi.

Belum menggunakan pembaruan data secara real-time.

Penghematan biaya penjual belum dapat dihitung secara akurat hanya berdasarkan harga normal makanan.

10. Catatan Keamanan dan Pengembangan

File .env berisi konfigurasi rahasia dan tidak boleh dimasukkan ke repositori publik.

Folder node_modules dan dist tidak perlu dimasukkan ke Git.

Jangan menyertakan kata sandi, token, atau data pribadi dalam dokumentasi.

Perubahan source code dan konfigurasi perlu diperiksa sebelum commit.