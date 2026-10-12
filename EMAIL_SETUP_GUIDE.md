# 📧 Panduan Setup Email Resmi (Custom Domain) - GESIT ERP

Panduan ini ditujukan untuk **Administrator IT** atau pemegang akses **DNS Domain `gesit.co.id`** untuk mengaktifkan fitur pengiriman email otomatis dari aplikasi GESIT WORK.

## 🔗 Mengapa Ini Diperlukan?
Agar aplikasi bisa mengirimkan notifikasi jatuh tempo aset (Overdue reminders) ke **seluruh jenis email** (Gmail, Yahoo, dll) tanpa dianggap spam dan tanpa batasan "Onboarding".

---

## 🚀 Langkah 1: Registrasi & Setup di Resend.com
1. Login ke [Resend.com](https://resend.com/domains) menggunakan akun perusahaan.
2. Klik **"Add Domain"**.
3. Masukkan domain utama: `gesit.co.id`.
4. Resend akan memunculkan daftar **DNS Records** (biasanya 3-5 baris berisi TXT, CNAME, atau MX).

---

## 🌐 Langkah 2: Konfigurasi DNS (Google Workspace/Cloudflare/Niagahoster)
Tim IT harus memasukkan kode-kode dari Resend tadi ke panel DNS domain:
*   **TXT Record**: Digunakan untuk verifikasi (`resend-verification=...`).
*   **CNAME Records**: Digunakan untuk **DKIM** agar email tidak dianggap spam oleh server luar.
*   **SPF (Jika perlu)**: Menambahkan `include:resend.com` ke record SPF yang sudah ada.

*Catatan: Jika domain menggunakan Google Workspace, pastikan records Google (MX) tetap ada dan tidak dihapus.*

---

## 🔑 Langkah 3: Update API Key (Jika Menggunakan Akun Resend Baru)
Jika Tim IT membuat akun Resend baru untuk perusahaan, sertakan **API Key (re_...)** yang baru ke dalam Supabase:

1. Buka Terminal/PowerShell di folder proyek.
2. Jalankan perintah:
   ```powershell
   supabase secrets set RESEND_API_KEY=re_API_KEY_BARU_BAPAK
   ```
3. Deploy ulang fungsinya (Opsional jika sudah pernah):
   ```powershell
   supabase functions deploy send-overdue-alert
   ```

---

## ✅ Langkah 4: Verifikasi & Testing
1. Klik tombol **"Verify"** di dashboard Resend sampai status domain menjadi **"Verified"** (Hijau).
2. Lakukan pengetesan di aplikasi GESIT:
   - Buat loan baru dengan email peminjam berupa **@gmail.com**.
   - Set overdue (tanggal balik masa lalu).
   - Refresh aplikasi dan cek Inbox Gmail tersebut.

---

**Butuh Bantuan?**
Jika mengalami kendala saat setting DNS, silakan hubungi tim IT Support Resend atau konsultasikan kembali ke kami.

*Tertanda,*
**Sistem GESIT IT Support**
