
import { pool } from "../db/pool.js";
import { transaksi } from "../db/transaksi.js";
import { HttpError, metaHalaman } from "../lib/api.js";
import sharp from "sharp";
import { createHash } from "node:crypto";

const kolom = `p.id, p.penyedia_id, py.nama_usaha AS penyedia,
p.nama, p.kategori, p.harga_normal, p.harga_penawaran,
p.stok, p.satuan, p.status, p.berakhir_pada, p.dibuat_pada,
p.foto, p.foto_hash, p.foto_tipe, p.versi`;

const gabung = `FROM penawaran p JOIN penyedia py ON py.id=p.penyedia_id
JOIN pengguna pemilik ON pemilik.id=py.pengguna_id`;

async function prosesFoto(foto) {
  if (foto === undefined || foto === null) {
    return null;
  }

  if (typeof foto !== "string") {
    throw new HttpError(400, "INVALID_PHOTO", "Format foto tidak valid.");
  }

  const cocok = foto.match(/^data:image\/(jpeg|png|webp);base64,(.+)$/);

  if (!cocok) {
    throw new HttpError(400, "INVALID_PHOTO", "Foto harus berupa JPEG, PNG, atau WebP.");
  }

  const buffer = Buffer.from(cocok[2], "base64");

  if (!buffer.length || buffer.length > 2 * 1024 * 1024) {
    throw new HttpError(400, "INVALID_PHOTO", "Ukuran foto maksimal 2 MB.");
  }

  try {
    const webp = await sharp(buffer)
      .rotate()
      .resize(1200, 1200, {
        fit: "inside",
        withoutEnlargement: true,
      })
      .webp({ quality: 80 })
      .toBuffer();

    if (webp.length > 409600) {
      throw new HttpError(400, "PHOTO_TOO_LARGE", "Ukuran foto WebP maksimal 400 KB.");
    }

    const hash = createHash("sha256").update(webp).digest("hex");

    return {
      foto: webp,
      fotoHash: hash,
      fotoTipe: "image/webp",
    };
  } catch (error) {
    if (error instanceof HttpError) throw error;

    throw new HttpError(400, "INVALID_PHOTO", "Foto tidak dapat diproses.");
  }
}


export function kePenawaran(row) {
  return {
    id: String(row.id),
    penyediaId: String(row.penyedia_id),
    penyedia: row.penyedia,
    nama: row.nama,
    kategori: row.kategori,
    hargaNormal: Number(row.harga_normal),
    hargaPenawaran: Number(row.harga_penawaran),
    stok: row.stok,
    satuan: row.satuan,
    status: row.status,
    berakhirPada: new Date(row.berakhir_pada).toISOString(),
    dibuatPada: new Date(row.dibuat_pada).toISOString(),
    fotoUrl: row.foto
      ? `/api/penawaran/${row.id}/foto`
      : null,
    fotoHash: row.foto_hash,
    versi: String(row.versi),
  };
}


export async function bacaPenawaran(id, db = pool, publik = false) {
  const hasil = await db.query(
    `SELECT ${kolom} ${gabung} WHERE p.id=$1
    AND (NOT $2::boolean OR (p.status='aktif' AND p.stok>0
    AND p.berakhir_pada>CURRENT_TIMESTAMP AND pemilik.aktif=TRUE
    AND pemilik.peran='penyedia' AND
    py.status_verifikasi='terverifikasi'))`,
    [id, publik],
  );

  if (!hasil.rowCount) {
    throw new HttpError(404, "OFFER_NOT_FOUND", "Penawaran tidak ditemukan.");
  }

  return kePenawaran(hasil.rows[0]);
}

export function daftarPenawaran(filter, paging, pemilikId = null) {
  return transaksi(async (client) => {
    const where = `WHERE ($1::text = '' OR
    POSITION(LOWER($1) IN LOWER(p.nama || ' ' || py.nama_usaha)) > 0)
    AND ($2::text = '' OR p.kategori = $2)
    AND ($3::text = '' OR p.status = $3)
    AND (NOT $4::boolean OR (p.status = 'aktif' AND p.stok > 0
    AND p.berakhir_pada>CURRENT_TIMESTAMP AND pemilik.aktif=TRUE
    AND pemilik.peran='penyedia' AND
    py.status_verifikasi='terverifikasi'))
    AND ($5::bigint IS NULL OR p.penyedia_id=$5)`;

    const nilai = [
      filter.q,
      filter.kategori,
      filter.status,
      filter.tersedia,
      pemilikId,
    ];

    const count = await client.query(
      `SELECT COUNT(*)::int AS jumlah ${gabung} ${where}`,
      nilai,
    );

    const hasil = await client.query(
      `SELECT ${kolom} ${gabung} ${where}
      ORDER BY p.id DESC LIMIT $6 OFFSET $7`,
      [...nilai, paging.limit, paging.offset],
    );

    return {
      data: hasil.rows.map(kePenawaran),
      meta: { ...metaHalaman(count.rows[0].jumlah, paging), ...filter },
    };
  }, true);
}

export async function simpanPenawaran(data, id = null) {
  return transaksi(async (client) => {
    let fotoLama = null;

    if (id !== null) {
      const lama = await client.query(
        `SELECT penyedia_id, foto, foto_hash, foto_tipe
        FROM penawaran
        WHERE id=$1 AND penyedia_id=$2 FOR UPDATE`,
        [id, data.penyediaId],
      );

      if (!lama.rowCount) {
        throw new HttpError(404, "OFFER_NOT_FOUND", "Penawaran tidak ditemukan.");
      }

      if (String(lama.rows[0].penyedia_id) !== data.penyediaId) {
        throw new HttpError(409, "PROVIDER_IMMUTABLE", "Penyedia tidak boleh diganti.");
      }

      fotoLama = lama.rows[0];
    }

    const penyedia = await client.query(
      `SELECT py.id FROM penyedia py JOIN pengguna u ON u.id = py.pengguna_id
      WHERE py.id=$1 AND u.peran='penyedia' AND u.aktif=TRUE
      AND py.status_verifikasi='terverifikasi'`,
      [data.penyediaId],
    );

    if (!penyedia.rowCount) {
      throw new HttpError(404, "PROVIDER_NOT_FOUND", "Penyedia aktif tidak ditemukan.");
    }

    let fotoBaru = fotoLama
      ? {
          foto: fotoLama.foto,
          fotoHash: fotoLama.foto_hash,
          fotoTipe: fotoLama.foto_tipe,
        }
      : { foto: null, fotoHash: null, fotoTipe: null };

    if (Object.hasOwn(data, "foto")) {
      if (data.foto === null) {
        fotoBaru = { foto: null, fotoHash: null, fotoTipe: null };
      } else {
        fotoBaru = await prosesFoto(data.foto);
      }
    }

    const nilai = [
      data.penyediaId,
      data.nama,
      data.kategori,
      data.hargaNormal,
      data.hargaPenawaran,
      data.stok,
      data.satuan,
      data.status,
      data.berakhirPada,
      fotoBaru.foto,
      fotoBaru.fotoHash,
      fotoBaru.fotoTipe,
    ];

    const hasil =
      id === null
        ? await client.query(
            `INSERT INTO penawaran (
              penyedia_id, nama, kategori, harga_normal,
              harga_penawaran, stok, satuan, status, berakhir_pada,
              foto, foto_hash, foto_tipe
            )
            VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)
            RETURNING id`,
            nilai,
          )
        : await client.query(
            `UPDATE penawaran SET
              nama=$2, kategori=$3, harga_normal=$4,
              harga_penawaran=$5, stok=$6, satuan=$7,
              status=$8, berakhir_pada=$9,
              foto=$10, foto_hash=$11, foto_tipe=$12
            WHERE id=$13 AND penyedia_id=$1
            RETURNING id`,
            [...nilai, id],
          );

    return bacaPenawaran(hasil.rows[0].id, client);
  });
}

export async function hapusPenawaran(id, penyediaId) {
  const hasil = await pool.query(
    "DELETE FROM penawaran WHERE id=$1 AND penyedia_id=$2 RETURNING id",
    [id, penyediaId],
  );

  if (!hasil.rowCount) {
    throw new HttpError(404, "OFFER_NOT_FOUND", "Penawaran tidak ditemukan.");
  }
}
