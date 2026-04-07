export const paymentMethods = [
  {
    group: 'E-Wallet',
    options: [
      {
        id: 'gopay',
        label: 'GoPay',
        note: 'Pembayaran instan via aplikasi GoJek',
        logoText: 'GP',
        brandClass: 'gopay',
      },
      {
        id: 'ovo',
        label: 'OVO',
        note: 'Cocok untuk transaksi harian yang cepat',
        logoText: 'OVO',
        brandClass: 'ovo',
      },
      {
        id: 'dana',
        label: 'DANA',
        note: 'Transfer cepat dengan saldo e-wallet',
        logoText: 'DANA',
        brandClass: 'dana',
      },
      {
        id: 'shopeepay',
        label: 'ShopeePay',
        note: 'Praktis untuk pembayaran mobile',
        logoText: 'SP',
        brandClass: 'shopeepay',
      },
    ],
  },
  {
    group: 'Bank Transfer',
    options: [
      {
        id: 'bca-va',
        label: 'BCA',
        note: 'Transfer via m-BCA atau ATM',
        logoText: 'BCA',
        brandClass: 'bca',
      },
      {
        id: 'mandiri-va',
        label: 'Mandiri',
        note: 'Pembayaran mudah via Livin',
        logoText: 'MDR',
        brandClass: 'mandiri',
      },
      {
        id: 'bni-va',
        label: 'BNI',
        note: 'Transfer cepat dari BNI Mobile',
        logoText: 'BNI',
        brandClass: 'bni',
      },
      {
        id: 'bri-va',
        label: 'BRI',
        note: 'Pembayaran lewat BRImo atau ATM',
        logoText: 'BRI',
        brandClass: 'bri',
      },
    ],
  },
];
