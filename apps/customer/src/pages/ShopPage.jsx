import React from "react";
import { Gift, Heart, Percent, Search, SlidersHorizontal } from "lucide-react";
import { PaginationControls, usePagedItems } from "../components/PaginationControls.jsx";
import { money } from "../services/api.js";

export function ShopPage({
  categories,
  products,
  selectedCategory,
  onCategory,
  search,
  onSearch,
  drop,
  promotions = [],
  user,
  favorites = [],
  onToggleFavorite,
  onRedeem,
  onUsePromotion,
  onOpenProduct,
}) {
  const productsPager = usePagedItems(products);
  const activeDropItems = drop?.items?.filter((item) => item.active) || [];
  const rewardsPager = usePagedItems(activeDropItems);
  const promotionsPager = usePagedItems(promotions);

  return (
    <section className="screen">
      <header className="appHeader">
        <div>
          <span>Tienda fitness</span>
          <h1>GymVerse</h1>
        </div>
        <img src="/logo-white-bg.png" alt="GymVerse" />
      </header>

      <div className={`heroCard ${drop ? "rewardHero" : ""}`}>
        <div>
          <span>{drop ? drop.bannerText || "Drop semanal" : "Drop semanal"}</span>
          <h2>{drop ? drop.title : "Equipa tu siguiente entrenamiento"}</h2>
          {drop?.subtitle && <p>{drop.subtitle}</p>}
        </div>
      </div>

      {activeDropItems.length > 0 && (
        <div className="rewardStrip">
          <div className="rewardStripTop">
            <span>{user.points || 0} pts disponibles</span>
            <Gift size={18} />
          </div>
          <div className="rewardItems">
            {rewardsPager.pagedItems.map((item) => {
              const variant = item.product?.variants?.find((entry) => entry.sku === item.sku);
              const disabled = (user.points || 0) < item.pointsCost || item.stock <= 0;
              return (
                <button key={item._id} className="rewardRedeemCard" onClick={() => onRedeem(item)} disabled={disabled}>
                  <span>{item.product?.name}</span>
                  <strong>{item.pointsCost} pts</strong>
                  <small>{variant?.label || item.sku} · Disponible: {item.stock} pz</small>
                </button>
              );
            })}
          </div>
          <PaginationControls {...rewardsPager} />
        </div>
      )}

      {promotions.length > 0 && (
        <div className="promoStripCustomer">
          <div className="rewardStripTop">
            <span>Promociones activas</span>
            <Percent size={18} />
          </div>
          <div className="promoCustomerList">
            {promotionsPager.pagedItems.map((promo) => (
              <button key={promo._id} className="promoCustomerCard" onClick={() => onUsePromotion(promo.code)}>
                <strong>{promo.title || promo.code}</strong>
                <span>{promo.description}</span>
                <small>Usar {promo.code}</small>
              </button>
            ))}
          </div>
          <PaginationControls {...promotionsPager} />
        </div>
      )}

      <div className="searchBar">
        <Search size={18} />
        <input value={search} placeholder="proteina, straps, playera" onChange={(event) => onSearch(event.target.value)} />
        <SlidersHorizontal size={18} />
      </div>

      <div className="chips">
        <button className={selectedCategory === "all" ? "active" : ""} onClick={() => onCategory("all")}>
          Todo
        </button>
        <button className={selectedCategory === "favorites" ? "active" : ""} onClick={() => onCategory("favorites")}>
          Favoritos
        </button>
        {categories.map((category) => {
          const categoryKey = category.slug || category._id;
          return (
          <button
            key={category._id}
            className={selectedCategory === categoryKey ? "active" : ""}
            onClick={() => onCategory(categoryKey)}
          >
            {category.name}
          </button>
          );
        })}
      </div>

      <div className="productGrid">
        {products.length === 0 && <div className="emptyCard productGridEmpty">No hay productos para mostrar.</div>}
        {productsPager.pagedItems.map((product) => {
          const price = product.variants?.[0]?.price;
          const isFavorite = favorites.includes(product._id);
          return (
            <button key={product._id} className="productCard" onClick={() => onOpenProduct(product)}>
              <span
                className={`favoriteButton ${isFavorite ? "active" : ""}`}
                role="button"
                tabIndex={0}
                onClick={(event) => {
                  event.stopPropagation();
                  onToggleFavorite(product._id);
                }}
                onKeyDown={(event) => {
                  if (event.key === "Enter" || event.key === " ") {
                    event.preventDefault();
                    event.stopPropagation();
                    onToggleFavorite(product._id);
                  }
                }}
                aria-label={isFavorite ? "Quitar de favoritos" : "Agregar a favoritos"}
              >
                <Heart size={16} fill={isFavorite ? "currentColor" : "none"} />
              </span>
              <div className="productArt" data-kind={product.category?.slug}>
                {product.imageUrl && <img src={product.imageUrl} alt="" />}
              </div>
              <div className="productInfo">
                <span>{product.category?.name}</span>
                <h3>{product.name}</h3>
                <p>{product.supplier?.name}</p>
                <strong>{money(price)}</strong>
              </div>
            </button>
          );
        })}
      </div>
      <PaginationControls {...productsPager} />
    </section>
  );
}
