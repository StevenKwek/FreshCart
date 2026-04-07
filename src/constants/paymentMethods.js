export const paymentMethods = [
  {
    group: 'E-Wallet',
    options: [
      {
        id: 'gopay',
        label: 'GoPay',
        note: 'Pembayaran instan via aplikasi GoJek',
      },
      {
        id: 'ovo',
        label: 'OVO',
        note: 'Cocok untuk transaksi harian yang cepat',
      },
      {
        id: 'dana',
        label: 'DANA',
        note: 'Transfer cepat dengan saldo e-wallet',
      },
      {
        id: 'shopeepay',
        label: 'ShopeePay',
        note: 'Praktis untuk pembayaran mobile',
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
      },
      {
        id: 'mandiri-va',
        label: 'Mandiri',
        note: 'Pembayaran mudah via Livin',
      },
      {
        id: 'bni-va',
        label: 'BNI',
        note: 'Transfer cepat dari BNI Mobile',
      },
      {
        id: 'bri-va',
        label: 'BRI',
        note: 'Pembayaran lewat BRImo atau ATM',
      },
    ],
  },
];
