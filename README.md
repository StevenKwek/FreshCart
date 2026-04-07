# FreshCart

FreshCart adalah aplikasi web grocery berbasis React dengan Firebase Auth, Cloud Firestore, dan checkout API sederhana. User bisa login dari device lain, menyimpan cart dan wishlist, lalu menyelesaikan checkout dengan data yang tersinkron ke database.

## Ringkasan

- Nama project: `FreshCart`
- Frontend: React + Vite
- Auth: Firebase Authentication
- Database: Cloud Firestore
- Checkout API: Vercel Serverless Function (`/api/checkout`)

## Fitur

- Login, register, dan reset password dengan Firebase Auth
- Katalog produk dengan search dan filter kategori
- Wishlist, cart, metode pembayaran, dan riwayat pembelian tersimpan per user
- Checkout dengan API server-side untuk membuat order dan mengurangi stok
- Profile page dengan ringkasan akun dan order
- Dark mode
- Responsive layout untuk mobile, tablet, dan desktop

## Tech Stack

- React
- JavaScript
- Vite
- Firebase Auth
- Cloud Firestore
- Firebase Admin SDK
- Vercel Functions

## Menjalankan Secara Lokal

1. Install dependency
2. Copy `.env.example` menjadi `.env.local`
3. Isi semua variabel Firebase client dan admin
4. Seed produk ke Firestore
5. Jalankan app

```bash
npm install
npm run seed:products
npm run dev
```

Untuk checkout API di local, ada dua opsi:

```bash
# Opsi cepat: fallback ke Firestore transaction langsung dari client
npm run dev

# Opsi lengkap: jalankan seperti environment Vercel
npx vercel dev
```

## Environment Variables

Client SDK:

```bash
VITE_FIREBASE_API_KEY=
VITE_FIREBASE_AUTH_DOMAIN=
VITE_FIREBASE_PROJECT_ID=
VITE_FIREBASE_STORAGE_BUCKET=
VITE_FIREBASE_MESSAGING_SENDER_ID=
VITE_FIREBASE_APP_ID=
VITE_CHECKOUT_API_URL=/api/checkout
```

Admin SDK:

```bash
FIREBASE_ADMIN_PROJECT_ID=
FIREBASE_ADMIN_CLIENT_EMAIL=
FIREBASE_ADMIN_PRIVATE_KEY=
```

Alternatif admin config:

```bash
FIREBASE_ADMIN_SERVICE_ACCOUNT_JSON=
```

## Setup Firebase Step-by-Step

1. Buat project baru di Firebase Console
2. Tambahkan Web App dan ambil config Firebase
3. Aktifkan `Authentication > Sign-in method > Email/Password`
4. Aktifkan `Cloud Firestore`
5. Masukkan semua env ke `.env.local`
6. Deploy rules dari `firestore.rules`
7. Jalankan seed produk:

```bash
npm run seed:products
```

## Struktur Data Firestore

- `products/{productId}`
- `users/{uid}`

Field penting user:

- `name`
- `username`
- `email`
- `wishlist`
- `cart`
- `selectedPaymentMethod`
- `spendingTotal`
- `purchaseHistory`

## Script

```bash
npm run dev
npm run build
npm run preview
npm run seed:products
```

## Deploy ke Vercel

1. Push repo ke GitHub
2. Import project ke Vercel
3. Isi semua env Firebase client dan admin di dashboard Vercel
4. Deploy

Checkout API menggunakan file `api/checkout.js`, jadi env admin wajib tersedia di Vercel.

## Catatan

- Kalau env Firebase belum diisi, app masih punya fallback lokal untuk pengembangan
- Untuk sinkronisasi stok antar device, Firestore products harus sudah di-seed
- Rule Firestore yang ada masih versi dasar dan bisa diperketat lagi sesuai kebutuhan produksi

## Author

Dibuat oleh Steven Kwek.
