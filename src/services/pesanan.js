
import { pool } from "../db/pool.js";
import { transaksi } from "../db/transaksi.js";
import { HttpError, metaHalaman } from "../lib/api.js";

const headerSql = `SELECT ps.*, u.nama_lengkap AS nama_pemesan,
py.nama_usaha AS penyedia FROM pesanan ps
JOIN pengguna u ON u.id=ps.pembeli_id
JOIN penyedia py ON py.id=ps.penyedia_id`;

function aksiDiizinkan(status, pengguna) {
  if (pengguna.peran === "pembeli") {
    return status === "menunggu-konfirmasi" ? ["batal"] : [];
  }

  if (pengguna.peran === "penyedia") {
    if (status === "menunggu-konfirmasi") {
      return ["konfirmasi", "tolak"];
    }
    if (status === "dikonfirmasi") return ["siap"];
    if (status === "siap-diambil") return ["selesai"];
  }

  return [];
}

function peranAksiDiizinkan(aksi, peran) {
  const hakAksi = {
    batal: ["pembeli", "penyedia"],
    konfirmasi: ["penyedia"],
    tolak: ["penyedia"],
    siap: ["penyedia"],
    selesai: ["penyedia"],
  };

  return hakAksi[aksi]?.includes(peran) ?? false;
}



async function buatPengambilan(client, pesananId) {
  // Mengunci tabel agar proses pengambilan tidak bentrok.
  await client.query(
    "LOCK TABLE pengambilan IN EXCLUSIVE MODE",
  );

  // Meminta PostgreSQL membuat ID otomatis.
  const hasil = await client.query(
    `SELECT nextval(
      pg_get_serial_sequence('pengambilan', 'id')
    ) AS id`,
  );

  const id = Number(hasil.rows[0].id);
  const kode = `AMBIL-${String(id).padStart(4, "0")}`;

  // Mengizinkan penggunaan ID dari sequence identity.
  await client.query(
    `INSERT INTO pengambilan (id, pesanan_id, kode, jadwal_pada)
     OVERRIDING SYSTEM VALUE
     VALUES ($1, $2, $3, CURRENT_TIMESTAMP)`,
    [id, pesananId, kode],
  );
}



function keHeader(row, pengguna) {
  return {
    id: String(row.id),
    pembeliId: String(row.pembeli_id),
    penyediaId: String(row.penyedia_id),
    penyedia: row.penyedia,
    namaPemesan: row.nama_pemesan,
    status: row.status,
    statusPembayaran: row.status_pembayaran,
    metodePembayaran: row.metode_pembayaran,
    alasanPembatalan: row.alasan_pembatalan,
    jenisPembatalan: row.jenis_pembatalan,
    total: Number(row.total_transaksi),
    nilaiStokTerselamatkan: Number(row.nilai_stok_terselamatkan),
    dibuatPada: new Date(row.dibuat_pada).toISOString(),

    // Waktu pembayaran diterima
    dibayarPada: row.dibayar_pada
      ? new Date(row.dibayar_pada).toISOString()
      : null,

    bolehAksi: aksiDiizinkan(row.status, pengguna),
  };
}


function cakupan(pengguna) {
  if (pengguna.peran === "pembeli") {
    return { kolom: "ps.pembeli_id", id: pengguna.id };
  }

  if (pengguna.peran === "penyedia" && pengguna.penyediaId) {
    return { kolom: "ps.penyedia_id", id: pengguna.penyediaId };
  }

  throw new HttpError(
    403,
    "ROLE_FORBIDDEN",
    "Profil atau peran tidak diizinkan.",
  );
}



async function bacaDetail(id, client, pengguna) {
  const scope = cakupan(pengguna);

  const header = await client.query(
    `${headerSql} WHERE ps.id=$1 AND ${scope.kolom}=$2`,
    [id, scope.id],
  );

  if (!header.rowCount) {
    throw new HttpError(404, "ORDER_NOT_FOUND", "Pesanan tidak ditemukan.");
  }

  const detail = await client.query(
    `SELECT dp.*, COALESCE(dp.nama_penawaran, p.nama) AS nama
    FROM detail_pesanan dp
    JOIN penawaran p ON p.id=dp.penawaran_id
    WHERE dp.pesanan_id=$1 ORDER BY dp.penawaran_id`,
    [id],
  );

  // Mengambil data pengambilan pesanan
  const pengambilan = await client.query(
    `SELECT kode, jadwal_pada, diambil_pada, status
     FROM pengambilan
     WHERE pesanan_id=$1`,
    [id],
  );

  return {
    ...keHeader(header.rows[0], pengguna),

    // Menampilkan informasi pengambilan
    pengambilan: pengambilan.rowCount
      ? {
          kode: pengambilan.rows[0].kode,
          jadwalPada: new Date(
            pengambilan.rows[0].jadwal_pada,
          ).toISOString(),
          diambilPada: pengambilan.rows[0].diambil_pada
            ? new Date(
                pengambilan.rows[0].diambil_pada,
              ).toISOString()
            : null,
          status: pengambilan.rows[0].status,
        }
      : null,

    items: detail.rows.map((row) => ({
      penawaranId: String(row.penawaran_id),
      nama: row.nama,
      kuantitas: row.kuantitas,
      satuan: row.satuan,
      hargaSatuan: Number(row.harga_penawaran_satuan),
      subtotal: Number(row.subtotal),
      nilaiStokTerselamatkan: Number(row.nilai_stok),
    })),
  };
}


export function detailPesanan(id, pengguna) {
  return transaksi((client) => bacaDetail(id, client, pengguna), true);
}

export function daftarPesanan(paging, pengguna) {
  const scope = cakupan(pengguna);

  return transaksi(async (client) => {
    const count = await client.query(
      `SELECT COUNT(*)::int AS jumlah
      FROM pesanan ps WHERE ${scope.kolom}=$1`,
      [scope.id],
    );

    const hasil = await client.query(
      `${headerSql} WHERE ${scope.kolom}=$1
      ORDER BY ps.id DESC LIMIT $2 OFFSET $3`,
      [scope.id, paging.limit, paging.offset],
    );

    return {
      data: hasil.rows.map((row) => keHeader(row, pengguna)),
      meta: metaHalaman(count.rows[0].jumlah, paging),
    };
  }, true);
}

export function buatPesanan(data, pengguna) {
  return transaksi(async (client) => {
    const pembeli = await client.query(
      `SELECT id FROM pengguna WHERE id=$1
      AND peran='pembeli' AND aktif=TRUE`,
      [data.pembeliId],
    );

    if (!pembeli.rowCount) {
      throw new HttpError(
        404,
        "BUYER_NOT_FOUND",
        "Pembeli aktif tidak ditemukan.",
      );
    }

    const detail = [];
    let penyediaId;
    let totalNormal = 0n;

    for (const baris of data.items) {
      const hasil = await client.query(
        `SELECT p.* FROM penawaran p
        JOIN penyedia py ON py.id=p.penyedia_id
        JOIN pengguna u ON u.id=py.pengguna_id
        WHERE p.id=$1 AND u.peran='penyedia'
        AND u.aktif=TRUE
        AND py.status_verifikasi='terverifikasi'
        FOR UPDATE OF p`,
        [baris.penawaranId],
      );

      if (!hasil.rowCount) {
        throw new HttpError(
          404,
          "OFFER_NOT_FOUND",
          "Penawaran tidak ditemukan.",
        );
      }

      const item = hasil.rows[0];

      const waktu = await client.query(
        `SELECT $1::timestamptz > clock_timestamp() AS belum_berakhir`,
        [item.berakhir_pada],
      );

      if (item.status !== "aktif" || !waktu.rows[0].belum_berakhir) {
        throw new HttpError(
          409,
          "OFFER_UNAVAILABLE",
          "Penawaran tidak tersedia.",
        );
      }

      if (item.stok < baris.kuantitas) {
        throw new HttpError(
          409,
          "INSUFFICIENT_STOCK",
          `Stok ${item.nama} tidak mencukupi.`,
        );
      }

      penyediaId ??= String(item.penyedia_id);

      if (penyediaId !== String(item.penyedia_id)) {
        throw new HttpError(
          409,
          "MIXED_PROVIDER",
          "Satu pesanan harus dari satu penyedia.",
        );
      }

      totalNormal += BigInt(item.harga_normal) * BigInt(baris.kuantitas);

      if (totalNormal > 999999999999n) {
        throw new HttpError(
          409,
          "ORDER_TOTAL_LIMIT",
          "Total melampaui kapasitas skema.",
        );
      }

      detail.push({ ...baris, item });
    }

    const pesanan = await client.query(
      `INSERT INTO pesanan (pembeli_id, penyedia_id)
      VALUES ($1,$2) RETURNING id`,
      [pembeli.rows[0].id, penyediaId],
    );

    const id = pesanan.rows[0].id;

    for (const { item, kuantitas } of detail) {
      await client.query(
        `INSERT INTO detail_pesanan (
          pesanan_id, penawaran_id, penyedia_id,
          kuantitas, harga_normal_satuan, harga_penawaran_satuan,
          nama_penawaran, satuan
        )
        VALUES ($1,$2,$3,$4,$5,$6,$7,$8)`,
        [
          id,
          item.id,
          penyediaId,
          kuantitas,
          item.harga_normal,
          item.harga_penawaran,
          item.nama,
          item.satuan,
        ],
      );

      await client.query(
        `UPDATE penawaran SET
          stok=stok-$1,
          status=CASE WHEN stok-$1=0 THEN 'habis' ELSE status END,
          versi=versi+1
        WHERE id=$2`,
        [kuantitas, item.id],
      );
    }

    await client.query(
      `UPDATE pesanan ps
      SET total_transaksi=r.total,
      nilai_stok_terselamatkan=r.nilai_stok
      FROM (
        SELECT SUM(subtotal) AS total,
        SUM(nilai_stok) AS nilai_stok
        FROM detail_pesanan WHERE pesanan_id=$1
      ) r
      WHERE ps.id=$1`,
      [id],
    );

    return bacaDetail(id, client, pengguna);
  });
}

export function aksiPesanan(id, data, pengguna) {
  return transaksi(async (client) => {
    const scope = cakupan(pengguna);

    const header = await client.query(
      `${headerSql}
      WHERE ps.id=$1 AND ${scope.kolom}=$2
      FOR UPDATE OF ps`,
      [id, scope.id],
    );

    if (!header.rowCount) {
      throw new HttpError(404, "ORDER_NOT_FOUND", "Pesanan tidak ditemukan.");
    }

    const pesanan = header.rows[0];
    const aksi = data?.aksi;

if (!peranAksiDiizinkan(aksi, pengguna.peran)) {
  throw new HttpError(
    403,
    "ACTION_FORBIDDEN",
    "Peran Anda tidak diizinkan melakukan tindakan ini.",
  );
}

const diizinkan = aksiDiizinkan(pesanan.status, pengguna);

if (!diizinkan.includes(aksi)) {
  throw new HttpError(
    409,
    "ACTION_NOT_ALLOWED",
    "Tindakan tidak tersedia untuk status pesanan ini.",
  );
}

    if (["batal", "tolak"].includes(aksi)) {
      const alasan = typeof data.alasan === "string"
        ? data.alasan.trim()
        : "";

      if (alasan.length < 3 || alasan.length > 500) {
        throw new HttpError(
          400,
          "INVALID_REASON",
          "Alasan harus berisi 3 sampai 500 karakter.",
        );
      }

      const detail = await client.query(
        `SELECT penawaran_id, penyedia_id, kuantitas
        FROM detail_pesanan
        WHERE pesanan_id=$1
        ORDER BY penawaran_id
        FOR UPDATE`,
        [id],
      );

      for (const item of detail.rows) {
        await client.query(
          `UPDATE penawaran SET
            stok=stok+$1,
            status=CASE
              WHEN berakhir_pada <= CURRENT_TIMESTAMP THEN 'kedaluwarsa'
              WHEN status='habis' THEN 'aktif'
              ELSE status
            END,
            versi=versi+1
          WHERE id=$2 AND penyedia_id=$3`,
          [item.kuantitas, item.penawaran_id, item.penyedia_id],
        );
      }

      await client.query(
        `UPDATE pesanan SET
          status='dibatalkan',
          jenis_pembatalan=$1,
          alasan_pembatalan=$2,
          dibatalkan_pada=CURRENT_TIMESTAMP
        WHERE id=$3`,
        [
          aksi === "tolak" ? "ditolak-penyedia" : "pembeli",
          alasan,
          id,
        ],
      );
    } else if (aksi === "konfirmasi") {
      await client.query(
        `UPDATE pesanan SET
          status='dikonfirmasi',
          dikonfirmasi_pada=CURRENT_TIMESTAMP
        WHERE id=$1`,
        [id],
      );
    } else if (aksi === "siap") {
  await buatPengambilan(client, id);

  await client.query(
    `UPDATE pesanan SET
      status='siap-diambil',
      siap_pada=CURRENT_TIMESTAMP
    WHERE id=$1`,
    [id],
  );

    } else if (aksi === "selesai") {
      if (data.makananDiserahkan !== true) {
        throw new HttpError(
          400,
          "HANDOVER_NOT_CONFIRMED",
          "Pastikan makanan sudah diserahkan kepada pembeli.",
        );
      }

      const berbayar = Number(pesanan.total_transaksi) > 0;

      if (berbayar && data.pembayaranDiterima !== true) {
        throw new HttpError(
          400,
          "PAYMENT_NOT_CONFIRMED",
          "Pembayaran harus diterima sebelum pesanan diselesaikan.",
        );
      }

      await client.query(
        `UPDATE pesanan SET
          status='selesai',
          status_pembayaran=CASE
            WHEN total_transaksi=0 THEN 'gratis'
            ELSE 'dibayar'
          END,
          dibayar_pada=CASE
            WHEN total_transaksi=0 THEN dibayar_pada
            ELSE CURRENT_TIMESTAMP
          END,
          selesai_pada=CURRENT_TIMESTAMP
        WHERE id=$1`,
        [id],
      );
      await client.query(
  `UPDATE pengambilan SET
    status='diambil',
    diambil_pada=GREATEST(CURRENT_TIMESTAMP, jadwal_pada)
   WHERE pesanan_id=$1`,
  [id],
);
    }
    

    return bacaDetail(id, client, pengguna);
  });
}
