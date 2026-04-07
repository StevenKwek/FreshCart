# FreshCart

FreshCart adalah aplikasi web Smart Grocery berbasis React yang dibuat untuk menampilkan kemampuan dasar frontend seperti membangun UI modern, mengelola state dengan React Hooks, membuat komponen reusable, dan menangani alur belanja sederhana tanpa backend.

Project ini cocok dijadikan portfolio frontend pemula karena mencakup flow yang cukup lengkap: landing page, authentication UI, katalog produk, detail produk, wishlist, cart, checkout, profile, dark mode, dan penyimpanan data sederhana dengan `localStorage`.

## Preview

- Nama project: `FreshCart`
- Tipe project: Frontend-only web app
- Target user: pekerja sibuk, keluarga, dan mahasiswa
- Tema visual: modern, clean, minimalis dengan dominasi hijau, putih, dan abu-abu muda

## Fitur Utama

- Landing page dengan value utama: belanja mudah, hemat waktu, dan rekomendasi pintar
- Login, register, dan forgot password dengan validasi sederhana
- Home page dengan product grid, search, dan filter kategori
- Product detail dengan status stok dan tombol `Add to Cart`
- Cart dengan update quantity `+ / -`
- Wishlist untuk menyimpan produk favorit
- Checkout sederhana dengan pilihan metode pembayaran Indonesia
- Profile page dengan ringkasan akun dan total belanja aktif
- Toast notification untuk aksi penting
- Dark mode
- Responsive layout untuk mobile, tablet, dan desktop
- Penyimpanan data user, cart, wishlist, payment method, dan theme menggunakan `localStorage`

## Tech Stack

- React.js
- JavaScript
- React Hooks (`useState`, `useEffect`, `useLayoutEffect`)
- CSS custom
- Vite

## Cara Menjalankan Project

1. Clone repository ini
2. Install dependency
3. Jalankan development server

```bash
npm install
npm run dev
```

Lalu buka URL yang muncul di terminal, biasanya:

```bash
http://localhost:5173
```

## Build Production

```bash
npm run build
```

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

## Penjelasan Struktur

- `components/`
  Berisi komponen UI reusable seperti navbar, form auth, card produk, toast, dan icon app.
- `constants/`
  Berisi data statis yang dipakai lintas halaman, seperti daftar metode pembayaran.
- `data/`
  Berisi dummy data produk untuk kebutuhan demo frontend.
- `utils/`
  Berisi helper logic seperti sinkronisasi `localStorage`, normalisasi user, dan status stok.
- `App.jsx`
  Menjadi pusat flow aplikasi, state utama, dan perpindahan tampilan.
- `styles.css`
  Menyimpan seluruh styling utama, termasuk responsive layout dan dark mode.

## Highlight Portfolio

- UI grocery app modern dengan flow end-to-end
- State management sederhana tapi realistis
- Struktur komponen yang mudah dibaca
- Local persistence tanpa backend
- Cocok untuk ditampilkan sebagai project React pemula hingga junior

## Catatan

- Project ini belum menggunakan backend atau database
- Authentication masih berupa simple logic / dummy flow
- Data disimpan di browser melalui `localStorage`

## Ide Pengembangan Selanjutnya

- Integrasi backend atau database seperti Firebase / Supabase
- Sistem autentikasi nyata
- Riwayat pesanan
- Banner promo dan rekomendasi produk
- Upload gambar lokal untuk katalog
- Deployment ke Vercel atau Netlify

## Author

Dibuat oleh Steven Kwek untuk portfolio frontend project.
