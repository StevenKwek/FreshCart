export const defaultPaymentMethods = [
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
  {
    group: 'Online Payment',
    options: [
      {
        id: 'midtrans-snap',
        label: 'Midtrans',
        note: 'Bayar via kartu kredit, transfer bank, atau e-wallet lewat Midtrans',
      },
    ],
  },
];

const normalizeMethodOption = (option) => {
  if (!option || typeof option !== 'object') {
    return null;
  }

  const id = typeof option.id === 'string' ? option.id.trim() : '';
  const label = typeof option.label === 'string' ? option.label.trim() : '';
  const note = typeof option.note === 'string' ? option.note.trim() : '';

  if (!id || !label || !note) {
    return null;
  }

  return {
    id,
    label,
    note,
  };
};

export const normalizePaymentMethodsData = (value) => {
  if (!Array.isArray(value)) {
    return defaultPaymentMethods;
  }

  const normalized = value
    .map((group) => {
      if (!group || typeof group !== 'object') {
        return null;
      }

      const groupName = typeof group.group === 'string' ? group.group.trim() : '';
      const options = Array.isArray(group.options)
        ? group.options.map(normalizeMethodOption).filter(Boolean)
        : [];

      if (!groupName || options.length === 0) {
        return null;
      }

      return {
        group: groupName,
        options,
      };
    })
    .filter(Boolean);

  return normalized.length > 0 ? normalized : defaultPaymentMethods;
};
