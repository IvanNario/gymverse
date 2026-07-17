import { ArrowLeft, Heart, ShoppingCart, Star } from "lucide-react";
import React, { useEffect, useState } from "react";
import { PaginationControls, usePagedItems } from "../components/PaginationControls.jsx";
import { api, money } from "../services/api.js";

export function ProductPage({ product, isFavorite, onToggleFavorite, onBack, onAdd }) {
  const [sku, setSku] = useState(product.variants?.[0]?.sku);
  const [reviews, setReviews] = useState([]);
  const [reviewSummary, setReviewSummary] = useState({ average: 0, total: 0 });
  const [reviewForm, setReviewForm] = useState({ rating: 5, comment: "" });
  const [reviewMessage, setReviewMessage] = useState("");
  const variant = product.variants.find((item) => item.sku === sku);
  const reviewsPager = usePagedItems(reviews);

  useEffect(() => {
    setSku(product.variants?.[0]?.sku);
    loadReviews();
  }, [product._id]);

  async function loadReviews() {
    const data = await api(`/catalog/products/${product._id}/reviews`);
    setReviews(data.reviews);
    setReviewSummary({ average: data.average, total: data.total });
  }

  async function submitReview(event) {
    event.preventDefault();
    setReviewMessage("");
    try {
      await api(`/catalog/products/${product._id}/reviews`, { method: "POST", body: reviewForm });
      setReviewForm({ rating: 5, comment: "" });
      setReviewMessage("Reseña guardada");
      await loadReviews();
    } catch (error) {
      setReviewMessage(error.message);
    }
  }

  return (
    <section className="screen productDetailScreen">
      <div className="detailTop">
        <button className="iconTextButton" onClick={onBack}>
          <ArrowLeft size={18} />
          Volver
        </button>
        <button className={`ghostRound ${isFavorite ? "activeFavorite" : ""}`} onClick={() => onToggleFavorite(product._id)} aria-label="Favorito">
          <Heart size={18} fill={isFavorite ? "currentColor" : "none"} />
        </button>
      </div>

      <div className="productDetailLayout">
        <div className="detailArt" data-kind={product.category?.slug}>
          {product.imageUrl && <img src={product.imageUrl} alt="" />}
        </div>

        <div className="productDetailInfo">
          <span className="overline">{product.category?.name}</span>
          <h1>{product.name}</h1>
          <p className="bodyText">{product.description}</p>
          <span className="pointsBadge">+{product.pointsEarned || 0} pts por compra</span>
          <div className="reviewSummary">
            <div>
              <Star size={18} fill="currentColor" />
              <strong>{reviewSummary.average || "Nuevo"}</strong>
              <span>{reviewSummary.total} reseña(s)</span>
            </div>
          </div>
          <div className="variantGrid">
            {product.variants.map((item) => (
              <button key={item.sku} className={sku === item.sku ? "active" : ""} onClick={() => setSku(item.sku)}>
                <span>{item.label}</span>
                <strong>{money(item.price)}</strong>
              </button>
            ))}
          </div>
          <div className="stickyAction">
            <div className="availabilityLine">
              <span>
                Disponible: <strong>{variant?.stock || 0} pz</strong>
              </span>
            </div>
            <button className="primaryButton" onClick={() => variant && onAdd(product, variant)} disabled={!variant || variant.stock <= 0}>
              <ShoppingCart size={18} />
              {variant?.stock > 0 ? "Agregar" : "Sin stock"}
            </button>
          </div>
        </div>
      </div>

      <section className="reviewsPanel">
        <div className="sectionTop compact">
          <div>
            <span>Opiniones</span>
            <h1>Reseñas</h1>
          </div>
        </div>
        <form className="reviewForm" onSubmit={submitReview}>
          <label>
            <span>Calificación</span>
            <select value={reviewForm.rating} onChange={(event) => setReviewForm({ ...reviewForm, rating: Number(event.target.value) })}>
              <option value={5}>5 estrellas</option>
              <option value={4}>4 estrellas</option>
              <option value={3}>3 estrellas</option>
              <option value={2}>2 estrellas</option>
              <option value={1}>1 estrella</option>
            </select>
          </label>
          <label>
            <span>Comentario</span>
            <textarea
              value={reviewForm.comment}
              onChange={(event) => setReviewForm({ ...reviewForm, comment: event.target.value })}
              placeholder="Cuenta cómo te funcionó este producto"
              required
            />
          </label>
          <button className="primaryButton">Publicar reseña</button>
          {reviewMessage && <small className="reviewMessage">{reviewMessage}</small>}
        </form>
        <div className="reviewList">
          {reviews.length === 0 && <div className="emptyCard">Este producto todavía no tiene reseñas.</div>}
          {reviewsPager.pagedItems.map((review) => (
            <article className="reviewCard" key={review._id}>
              <div>
                <strong>{review.customer?.name || "Cliente GymVerse"}</strong>
                {review.verifiedPurchase && <span>Compra verificada</span>}
              </div>
              <div className="stars" aria-label={`${review.rating} estrellas`}>
                {Array.from({ length: 5 }).map((_, index) => (
                  <Star key={index} size={15} fill={index < review.rating ? "currentColor" : "none"} />
                ))}
              </div>
              <p>{review.comment}</p>
            </article>
          ))}
        </div>
        <PaginationControls {...reviewsPager} />
      </section>
    </section>
  );
}
