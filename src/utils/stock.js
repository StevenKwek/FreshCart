export const getStockStatus = (stock) => {
  if (stock <= 0) {
    return {
      label: 'Stok habis',
      className: 'empty',
    };
  }

  if (stock <= 4) {
    return {
      label: 'Stok hampir habis',
      className: 'low',
    };
  }

  return {
    label: 'Stok tersedia',
    className: 'available',
  };
};
