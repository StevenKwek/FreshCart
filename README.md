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
- Login bisa menggunakan username atau email
- Katalog produk dengan search, filter kategori, dan detail produk
- Wishlist, cart, metode pembayaran, dan riwayat pembelian tersimpan per user di Firestore
- Checkout dengan API server-side untuk membuat order, mengurangi stok, dan menyimpan status pesanan
- Profile page dengan ringkasan akun, order history, dan status order
- Panel admin sederhana untuk melihat order masuk dan mengubah status menjadi `accepted`, `processing`, `completed`, atau `cancelled`
- Footer informatif dan layout responsif untuk mobile, tablet, dan desktop
- Dark mode

## Integrasi Backend

- Firebase Authentication untuk register, login, logout, dan reset password
- Cloud Firestore untuk menyimpan user profile, inventory produk, wishlist, cart, payment method, spending total, dan order history
- Firebase Admin SDK untuk proses server-side yang butuh akses aman ke Firestore
- Vercel Functions:
  - `api/checkout.js` untuk checkout, pengurangan stok, dan pembuatan order
  - `api/orders.js` untuk mengambil daftar order admin dan update status order
- Firestore Rules untuk membatasi akses data user dan inventory dari client

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
npx vercel dev
```

Catatan local:

- `npm run dev` cukup untuk melihat frontend dan auth flow
- `npx vercel dev` dipakai untuk test full flow termasuk checkout API dan admin order endpoint

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
- `usernames/{username}`
- `orders/{orderId}`

Field penting user:

- `name`
- `username`
- `email`
- `wishlist`
- `cart`
- `selectedPaymentMethod`
- `spendingTotal`
- `purchaseHistory`

Field penting order:

- `id`
- `userId`
- `userEmail`
- `paymentMethod`
- `status`
- `totalItems`
- `totalPrice`
- `items`
- `createdAt`

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

Checkout API dan admin order endpoint menggunakan file `api/checkout.js` dan `api/orders.js`, jadi env admin wajib tersedia di Vercel.

## Catatan

- Untuk sinkronisasi stok dan data user antar device, Firestore products harus sudah di-seed
- Agar checkout dan panel admin berjalan di local, gunakan `npx vercel dev`
- Admin saat ini ditentukan dari akun yang memiliki username `admin`
- Rule Firestore yang ada masih versi dasar dan bisa diperketat lagi sesuai kebutuhan produksi

## Author

Dibuat oleh Steven Kwek.
