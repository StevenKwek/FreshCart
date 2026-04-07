# FreshCart

FreshCart adalah aplikasi web grocery berbasis React yang berjalan sepenuhnya secara lokal. Aplikasi ini menampilkan alur belanja sederhana mulai dari login, melihat produk, menyimpan wishlist, mengatur cart, hingga checkout dengan penyimpanan data di `localStorage`.

## Ringkasan

- Nama project: `FreshCart`
- Tipe project: frontend-only web app
- Penyimpanan data: `localStorage`
- Tujuan penggunaan: simulasi belanja grocery untuk penggunaan lokal

## Fitur

- Landing page dengan tampilan grocery app modern
- Login, register, dan forgot password dengan validasi sederhana
- Katalog produk dengan pencarian dan filter kategori
- Detail produk dengan informasi stok
- Wishlist untuk menyimpan produk favorit
- Cart dengan pengaturan jumlah produk
- Checkout sederhana dengan pilihan metode pembayaran Indonesia
- Profile page dengan ringkasan akun
- Toast notification untuk aksi penting
- Dark mode
- Responsive layout untuk mobile, tablet, dan desktop

## Tech Stack

- React
- JavaScript
- Vite
- CSS custom
- React Hooks

## Menjalankan Secara Lokal

1. Clone repository ini
2. Install dependency
3. Jalankan development server

```bash
npm install
npm run dev
```

Setelah itu buka URL yang tampil di terminal, biasanya:

```bash
http://localhost:5173
```

## Script

```bash
npm run dev
npm run build
npm run preview
```

## Penyimpanan Data

FreshCart tidak menggunakan backend atau database. Data seperti user, cart, wishlist, metode pembayaran, dan tema disimpan langsung di browser menggunakan `localStorage`.

## Struktur Folder

```text
FreshCart/
├── src/
│   ├── components/
│   │   ├── AppIcon.jsx
│   │   ├── AuthForm.jsx
│   │   ├── Navbar.jsx
│   │   ├── ProductCard.jsx
│   │   └── Toast.jsx
│   ├── constants/
│   │   └── paymentMethods.js
│   ├── data/
│   │   └── products.js
│   ├── utils/
│   │   ├── appState.js
│   │   └── stock.js
│   ├── App.jsx
│   ├── main.jsx
│   └── styles.css
├── index.html
├── package.json
├── package-lock.json
├── vite.config.js
└── README.md
```

## Catatan

- Project ini dirancang untuk penggunaan lokal
- Authentication masih berupa alur sederhana di sisi frontend
- Seluruh data bergantung pada penyimpanan browser

## Author

Dibuat oleh Steven Kwek.
