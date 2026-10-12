
# Supabase Edge Function Deployment Guide

Untuk mengaktifkan pengiriman email otomatis menggunakan Supabase Edge Functions, ikuti langkah-langkah berikut:

### 1. Persiapan Akun Email (Resend)
1. Buat akun gratis di [Resend.com](https://resend.com).
2. Dapatkan **API Key** dari dashboard Resend.
3. Tambahkan API Key tersebut ke dalam **Supabase Secrets** dengan menjalankan perintah ini di terminal Anda:
   ```bash
   supabase secrets set RESEND_API_KEY=your_resend_api_key_here
   ```

### 2. Instalasi Supabase CLI
Jika belum ada, instal Supabase CLI di komputer Anda:
```bash
# Untuk Windows (menggunakan Scoop)
scoop bucket add supabase https://github.com/supabase/scoop-bucket.git
scoop install supabase

# Atau download library-nya di https://github.com/supabase/cli/releases
```

### 3. Login & Deploy
Jalankan perintah berikut di dalam folder root proyek Anda:
```bash
# Login ke akun Supabase Anda
supabase login

# Link ke proyek Anda (Anda butuh Project Reference ID dari Settings > General di dashboard Supabase)
supabase link --project-ref yihjfrxdrhkqfnjofvua

# Deploy fungsi pengiriman email
supabase functions deploy send-overdue-alert
```

### 4. Selesai!
Setelah dideploy, aplikasi akan secara otomatis memanggil fungsi ini setiap kali ada aset yang terdeteksi **Overdue** (saat Admin login).

---
**Catatan:**
Secara default, Resend versi gratis hanya bisa mengirim ke email Anda sendiri atau domain yang sudah diverifikasi. Untuk mengirim ke banyak email user, Anda perlu memverifikasi domain perusahaan Anda di dashboard Resend.
