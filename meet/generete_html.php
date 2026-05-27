<?php
/**
 * generate_html.php
 * Letakkan file ini SEJAJAR dengan folder meet/ dan file admin.html, index_exam_new.html
 * 
 * Struktur folder sebelum dijalankan:
 *   project-lidan/
 *   ├── generate_html.php        ← file ini
 *   ├── admin.html               ← file sumber (template)
 *   ├── index_exam_new.html      ← file sumber (template)
 *   └── meet/                    ← hasil akan dibuat di sini
 *
 * Jalankan di browser: http://localhost/project-lidan/generate_html.php
 * atau terminal: php generate_html.php
 */

// =============================================
// DATA AKUN
// =============================================
$accounts = [
    'utama' => [
        'email'  => 'dumeiheri@gmail.com',
        'app_id' => 'vpaas-magic-cookie-6a0d4b63e58e420781a516524f2d3fd3',
    ],
    'psikologi' => [
        'email'  => 'lidanpsikologi@gmail.com',
        'app_id' => 'vpaas-magic-cookie-02a37da6b5fd47ec8e97d38b711f731b',
    ],
    'infolidan' => [
        'email'  => 'infolidan@gmail.com',
        'app_id' => 'vpaas-magic-cookie-49e5290787e944c9843ed26a54104799',
    ],
    'cipta' => [
        'email'  => 'ciptapersadatabi@gmail.com',
        'app_id' => 'vpaas-magic-cookie-e51678a69df34f089b9998edae9bf28b',
    ],
    'android' => [
        'email'  => 'dumei.android@gmail.com',
        'app_id' => 'vpaas-magic-cookie-071ffa2d64444c98a8ab00d04452e5cf',
    ],
    'brosur' => [
        'email'  => 'lidanindah.brosur@gmail.com',
        'app_id' => 'vpaas-magic-cookie-371ffe0989cf44f8bfc1ec78ffd8c5d4',
    ],
    'proposal' => [
        'email'  => 'lidanindah.proposal@gmail.com',
        'app_id' => 'vpaas-magic-cookie-a56106f2fccd4aba85b832528e53d48a',
    ],
    'produk' => [
        'email'  => 'lidanindah.produk@gmail.com',
        'app_id' => 'vpaas-magic-cookie-bf84a2fbefb44ff7a88d1488c5ed4990',
    ],
    'video' => [
        'email'  => 'lidanindah.video@gmail.com',
        'app_id' => 'vpaas-magic-cookie-65ad6387927d4d86ab9f57d0959c75af',
    ],
    'form' => [
        'email'  => 'lidanindah.form@gmail.com',
        'app_id' => 'vpaas-magic-cookie-efffd8e2b4ff4669aa591975f3aff0dc',
    ],
    'legal' => [
        'email'  => 'lidanindah.legal@gmail.com',
        'app_id' => 'vpaas-magic-cookie-a4535362bd274b5f831a3cfe20eafeca',
    ],
    'gambar' => [
        'email'  => 'lidanindah.gambar@gmail.com',
        'app_id' => 'vpaas-magic-cookie-60b8cdbd9e8446deb2c5a78a3f1b8f8f',
    ],
];

// =============================================
// KONFIGURASI
// =============================================
$BASE_DOMAIN   = 'https://tabi.my.id/api';   // domain baru sesuai permintaan
$SRC_ADMIN     = __DIR__ . '/admin.html';
$SRC_UJIAN     = __DIR__ . '/index_exam_new.html';
$OUTPUT_DIR    = __DIR__ . '/meet';

// =============================================
// CEK FILE SUMBER
// =============================================
$errors = [];
if (!file_exists($SRC_ADMIN)) {
    $errors[] = "❌ File sumber tidak ditemukan: admin.html — letakkan di folder yang sama dengan generate_html.php";
}
if (!file_exists($SRC_UJIAN)) {
    $errors[] = "❌ File sumber tidak ditemukan: index_exam_new.html — letakkan di folder yang sama dengan generate_html.php";
}

// Buat folder meet jika belum ada
if (!is_dir($OUTPUT_DIR)) {
    mkdir($OUTPUT_DIR, 0755, true);
}

// =============================================
// BACA FILE SUMBER
// =============================================
$templateAdmin = !empty($errors) ? '' : file_get_contents($SRC_ADMIN);
$templateUjian = !empty($errors) ? '' : file_get_contents($SRC_UJIAN);

// =============================================
// PROSES SETIAP AKUN
// =============================================
$log = [];
$ok  = 0;
$fail = 0;

if (empty($errors)) {
    foreach ($accounts as $nama => $akun) {
        $app_id   = $akun['app_id'];
        $base_api = $BASE_DOMAIN . '/' . $nama;

        // ── FILE ADMIN ──
        $contentAdmin = $templateAdmin;

        // Ganti BASE_API
        $contentAdmin = str_replace(
            "const BASE_API  = 'https://lidan.co.id/api';",
            "const BASE_API  = '{$base_api}';",
            $contentAdmin
        );
        // Kalau format tanpa spasi ganda juga
        $contentAdmin = str_replace(
            "const BASE_API = 'https://lidan.co.id/api';",
            "const BASE_API = '{$base_api}';",
            $contentAdmin
        );

        // Ganti external_api.js APP_ID (script src)
        $contentAdmin = preg_replace(
            '#https://8x8\.vc/vpaas-magic-cookie-[a-f0-9]+/external_api\.js#',
            "https://8x8.vc/{$app_id}/external_api.js",
            $contentAdmin
        );

        // Ganti title agar mudah dikenali
        $contentAdmin = str_replace(
            '<title>Lidan Meet — Dashboard Pengawas</title>',
            "<title>Lidan Meet — Pengawas [{$nama}]</title>",
            $contentAdmin
        );

        $fileAdmin = $OUTPUT_DIR . '/meet-admin-' . $nama . '.html';
        if (file_put_contents($fileAdmin, $contentAdmin) !== false) {
            $log[] = ['ok', "✅ meet/meet-admin-{$nama}.html  →  API: {$base_api}"];
            $ok++;
        } else {
            $log[] = ['fail', "❌ GAGAL menulis meet-admin-{$nama}.html"];
            $fail++;
        }

        // ── FILE UJIAN/PESERTA ──
        $contentUjian = $templateUjian;

        // Ganti BASE_API
        $contentUjian = str_replace(
            "const BASE_API = 'https://lidan.co.id/api';",
            "const BASE_API = '{$base_api}';",
            $contentUjian
        );
        $contentUjian = str_replace(
            "const BASE_API  = 'https://lidan.co.id/api';",
            "const BASE_API  = '{$base_api}';",
            $contentUjian
        );

        // Ganti external_api.js APP_ID (bisa di src= atau s.src=)
        $contentUjian = preg_replace(
            '#https://8x8\.vc/vpaas-magic-cookie-[a-f0-9]+/external_api\.js#',
            "https://8x8.vc/{$app_id}/external_api.js",
            $contentUjian
        );

        // Ganti title
        $contentUjian = str_replace(
            '<title>Lidan Meet — Ruang Ujian</title>',
            "<title>Lidan Meet — Ruang Ujian [{$nama}]</title>",
            $contentUjian
        );

        $fileUjian = $OUTPUT_DIR . '/meet-ujian-' . $nama . '.html';
        if (file_put_contents($fileUjian, $contentUjian) !== false) {
            $log[] = ['ok', "✅ meet/meet-ujian-{$nama}.html  →  API: {$base_api}"];
            $ok++;
        } else {
            $log[] = ['fail', "❌ GAGAL menulis meet-ujian-{$nama}.html"];
            $fail++;
        }
    }
}

// =============================================
// OUTPUT
// =============================================
$isCli = (php_sapi_name() === 'cli');

if ($isCli) {
    echo "\n=== LIDAN HTML GENERATOR ===\n\n";
    if (!empty($errors)) {
        foreach ($errors as $e) echo $e . "\n";
        exit(1);
    }
    foreach ($log as $item) {
        echo $item[1] . "\n";
    }
    echo "\n--- Selesai: {$ok} file berhasil, {$fail} gagal ---\n";
    echo "Lokasi output: {$OUTPUT_DIR}\n\n";

    echo "\n=== DAFTAR FILE YANG DIBUAT ===\n";
    foreach ($accounts as $nama => $akun) {
        echo "meet-admin-{$nama}.html  +  meet-ujian-{$nama}.html  ←  {$akun['email']}\n";
    }
    echo "\n";

} else {
?>
<!DOCTYPE html>
<html lang="id">
<head>
<meta charset="UTF-8">
<title>Lidan HTML Generator</title>
<style>
  body { font-family: monospace; background: #0b0f1a; color: #eee; padding: 30px; }
  h1 { color: #00d4ff; margin-bottom: 6px; }
  h2 { color: #aaa; margin-top: 30px; margin-bottom: 10px; }
  p  { color: #888; margin-bottom: 20px; font-size: 13px; }
  .ok   { color: #4cff91; margin: 3px 0; }
  .fail { color: #ff4c4c; margin: 3px 0; }
  .err  { color: #ff4c4c; background: #2a0a0a; padding: 12px; border-radius: 8px; margin: 10px 0; }
  .box  { background: #0f3460; padding: 15px 20px; border-radius: 8px; margin: 10px 0; }
  table { border-collapse: collapse; width: 100%; margin-top: 10px; }
  th, td { padding: 8px 14px; border: 1px solid #243047; text-align: left; font-size: 13px; }
  th { background: #0f3460; color: #00d4ff; }
  tr:nth-child(even) { background: #111827; }
  code { background: #1e2a40; padding: 2px 7px; border-radius: 4px; font-size: 12px; }
  .badge-ok   { color: #4cff91; font-weight: bold; }
  .badge-fail { color: #ff4c4c; font-weight: bold; }
</style>
</head>
<body>

<h1>🖼️ Lidan HTML Generator</h1>
<p>Membuat file HTML admin dan ujian untuk semua akun JaaS...</p>

<?php if (!empty($errors)): ?>
  <?php foreach ($errors as $e): ?>
    <div class="err"><?= htmlspecialchars($e) ?></div>
  <?php endforeach; ?>
  <p style="color:#ff4c4c">Perbaiki masalah di atas lalu jalankan ulang.</p>
<?php else: ?>

<div class="box">
<?php foreach ($log as $item): ?>
  <p class="<?= $item[0] ?>"><?= htmlspecialchars($item[1]) ?></p>
<?php endforeach; ?>
</div>

<p>
  Total: <span class="badge-ok"><?= $ok ?> file berhasil</span>
  <?= $fail ? " &nbsp; <span class='badge-fail'>{$fail} gagal</span>" : "" ?>
  &nbsp;|&nbsp; Lokasi: <code><?= htmlspecialchars($OUTPUT_DIR) ?></code>
</p>

<h2>📋 Daftar File yang Dibuat di folder <code>meet/</code></h2>
<table>
  <tr>
    <th>Akun</th>
    <th>Email</th>
    <th>File Admin (Pengawas)</th>
    <th>File Ujian (Peserta)</th>
    <th>BASE_API</th>
  </tr>
  <?php foreach ($accounts as $nama => $akun): ?>
  <tr>
    <td><?= $nama ?></td>
    <td><?= $akun['email'] ?></td>
    <td><code>meet-admin-<?= $nama ?>.html</code></td>
    <td><code>meet-ujian-<?= $nama ?>.html</code></td>
    <td><code><?= $BASE_DOMAIN . '/' . $nama ?></code></td>
  </tr>
  <?php endforeach; ?>
</table>

<h2>✅ Langkah Selanjutnya</h2>
<ol style="line-height:2;color:#aaa;font-size:13px;">
  <li>Upload seluruh folder <code>meet/</code> ke hosting <code>tabi.my.id</code></li>
  <li>Pastikan API di <code>tabi.my.id/api/[nama]/create-room</code> sudah aktif</li>
  <li>Akses admin lewat <code>https://tabi.my.id/meet/meet-admin-utama.html</code></li>
  <li>Peserta akses lewat <code>https://tabi.my.id/meet/meet-ujian-utama.html</code></li>
</ol>

<?php endif; ?>
</body>
</html>
<?php
}
?>