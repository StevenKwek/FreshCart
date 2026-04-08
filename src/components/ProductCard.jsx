import { getStockStatus } from '../utils/stock';

function ProductCard({
  product,
  isWishlisted,
  onToggleWishlist,
  onViewDetail,
  onAddToCart,
  variant = 'default',
}) {
  const isOutOfStock = product.stock === 0;
  const stockStatus = getStockStatus(product.stock);
  const isWishlistVariant = variant === 'wishlist';

  return (
    <article className={`product-card ${isWishlistVariant ? 'wishlist-card' : ''}`}>
      <button
        className={`wishlist-button ${isWishlisted ? 'active' : ''}`}
        onClick={() => onToggleWishlist(product.id)}
        aria-label="Toggle wishlist"
      >
        {isWishlisted ? '♥' : '♡'}
      </button>

      <div
        className={`product-image-wrap ${isWishlistVariant ? 'wishlist-image-wrap' : ''}`}
        onClick={() => onViewDetail(product)}
      >
        <img src={product.image} alt={product.name} className="product-image" />
      </div>

      <div className={`product-body ${isWishlistVariant ? 'wishlist-body' : ''}`}>
        <div className="product-meta">
          <span className="category-pill">{product.category}</span>
          <span className="rating-pill">★ {product.rating}</span>
        </div>

        <button className="product-title" onClick={() => onViewDetail(product)}>
          {product.name}
        </button>

        <p className="product-description">{product.description}</p>

        <div className={`product-footer ${isWishlistVariant ? 'wishlist-footer' : ''}`}>
          <div className="product-price-block">
            <p className="price-label">Rp {product.price.toLocaleString('id-ID')}</p>
            <p className={`stock-label ${stockStatus.className}`}>{stockStatus.label}</p>
          </div>
          <button
            className={`primary-button product-add-button ${
              isWishlistVariant ? 'wishlist-add-button' : ''
            }`}
            onClick={() => onAddToCart(product.id)}
            disabled={isOutOfStock}
          >
            Add to Cart
          </button>
        </div>
      </div>
    </article>
  );
}

export default ProductCard;
