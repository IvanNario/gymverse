import React, { useEffect, useState } from "react";
import { Dumbbell, Home, LockKeyhole, Minus, Plus, ShieldCheck, Tag, WalletCards, X } from "lucide-react";
import { ConfirmDialog } from "../components/ConfirmDialog.jsx";
import { PaginationControls, usePagedItems } from "../components/PaginationControls.jsx";
import { money } from "../services/api.js";

export function CartPage({
  cart,
  gyms,
  localGymStock = [],
  delivery,
  setDelivery,
  setPickupGym,
  pickupGym,
  paymentMethod,
  setPaymentMethod,
  onQty,
  onCheckout,
  couponQuote,
  suggestedCoupon,
  onApplyCoupon,
  onRemoveCoupon,
  user,
  isCheckingOut,
  onManageGyms,
}) {
  const [couponCode, setCouponCode] = useState("");
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [couponConfirm, setCouponConfirm] = useState(null);
  const cartPager = usePagedItems(cart);
  const subtotal = cart.reduce((sum, item) => sum + item.variant.price * item.quantity, 0);
  const baseShipping = delivery === "home" ? 79 : 0;
  const shipping = couponQuote ? couponQuote.shippingFee : baseShipping;
  const discount = couponQuote?.discount || 0;
  const address = user?.addresses?.[0];
  const localStockByItem = new Map(localGymStock.map((item) => [`${item.product}:${item.sku}`, Number(item.quantity || 0)]));
  const stockIssues =
    delivery === "pickup"
      ? cart
          .map((item) => {
            const available = localStockByItem.get(`${item.product._id}:${item.variant.sku}`) || 0;
            return available < item.quantity ? { item, available } : null;
          })
          .filter(Boolean)
      : [];

  useEffect(() => {
    if (suggestedCoupon && !couponCode) setCouponCode(suggestedCoupon);
  }, [suggestedCoupon, couponCode]);

  async function applyCoupon(event) {
    event.preventDefault();
    try {
      const applied = await onApplyCoupon(couponCode);
      setCouponCode(applied.code);
    } catch (error) {
      setCouponCode("");
    }
  }

  function selectedGymName() {
    return gyms.find((gym) => gym._id === pickupGym)?.name || "Gimnasio afiliado";
  }

  function openConfirmation() {
    if (cart.length === 0 || isCheckingOut || stockIssues.length) return;
    setShowConfirmation(true);
  }

  async function confirmCheckout() {
    setShowConfirmation(false);
    await onCheckout();
  }

  function confirmRemoveCoupon() {
    setCouponConfirm({
      title: "Quitar cupón",
      message: `Se quitará el cupón ${couponQuote?.code || "aplicado"} y el total se recalculará sin descuento.`,
      confirmLabel: "Quitar",
      onConfirm: () => {
        onRemoveCoupon();
        setCouponConfirm(null);
      },
    });
  }

  return (
    <section className="screen cartScreen">
      <div className="sectionTop">
        <div>
          <span>Checkout</span>
          <h1>Carrito</h1>
        </div>
      </div>
      <div className="cartList">
        {cart.length === 0 && <div className="emptyCard">Tu carrito está vacío</div>}
        {cartPager.pagedItems.map((item) => (
          <article className="cartItem" key={`${item.product._id}-${item.variant.sku}`}>
            <div className="cartThumb">{item.product.imageUrl && <img src={item.product.imageUrl} alt="" />}</div>
            <div>
              <h3>{item.product.name}</h3>
              <p>{item.variant.label}</p>
              <strong>{money(item.variant.price)}</strong>
            </div>
            <div className="stepper">
              <button onClick={() => onQty(item.variant.sku, -1)} aria-label="Restar">
                <Minus size={15} />
              </button>
              <span>{item.quantity}</span>
              <button onClick={() => onQty(item.variant.sku, 1)} aria-label="Sumar">
                <Plus size={15} />
              </button>
            </div>
          </article>
        ))}
      </div>
      <PaginationControls {...cartPager} />

      <section className="checkoutCard">
        <div className="segmented">
          <button className={delivery === "pickup" ? "active" : ""} onClick={() => setDelivery("pickup")}>
            Recoger
          </button>
          <button
            className={delivery === "home" ? "active" : ""}
            onClick={() => {
              setDelivery("home");
              setPaymentMethod("mercado_pago");
            }}
          >
            Domicilio
          </button>
        </div>
        {delivery === "pickup" && (
          gyms.length ? (
            <label className="field">
              <span>Gimnasio afiliado</span>
              <select value={pickupGym} onChange={(event) => setPickupGym(event.target.value)}>
                {gyms.map((gym) => (
                  <option key={gym._id} value={gym._id}>
                    {gym.name}
                  </option>
                ))}
              </select>
            </label>
          ) : (
            <div className="pickupEmptyState">
              <Dumbbell size={20} />
              <div>
                <strong>Afiliación requerida</strong>
                <p>Busca y asigna tu gimnasio para poder recoger pedidos en sucursal.</p>
              </div>
              <button className="iconTextButton compact" type="button" onClick={onManageGyms}>
                Afiliar
              </button>
            </div>
          )
        )}
        {delivery === "home" && (
          <div className="addressPreview">
            <Home size={18} />
            <div>
              <strong>{address?.label || "Sin dirección"}</strong>
              <p>{address ? `${address.street}, ${address.city}, ${address.state}, ${address.zip}` : "Agrega una dirección desde Perfil"}</p>
            </div>
          </div>
        )}
        {stockIssues.length > 0 && (
          <div className="stockWarning">
            <strong>Stock insuficiente en este gimnasio</strong>
            {stockIssues.map(({ item, available }) => (
              <span key={`${item.product._id}-${item.variant.sku}`}>
                {item.product.name} · {item.variant.label}: {available} disponible(s)
              </span>
            ))}
          </div>
        )}
        <form className="couponBox" onSubmit={applyCoupon}>
          <label className="paymentField">
            <span>Cupón</span>
            <div className="inputWithIcon">
              <Tag size={16} />
              <input value={couponCode} onChange={(event) => setCouponCode(event.target.value.toUpperCase())} placeholder="GYM10" />
            </div>
          </label>
          <button className="iconTextButton" disabled={cart.length === 0 || !couponCode.trim()}>
            Aplicar
          </button>
          {couponQuote && (
            <div className="couponApplied">
              <div>
                <strong>{couponQuote.code}</strong>
                <span>{couponQuote.description}</span>
              </div>
              <button type="button" onClick={confirmRemoveCoupon} aria-label="Quitar cupón">
                <X size={16} />
              </button>
            </div>
          )}
        </form>
        <div className="paymentGateway">
          <aside className="paymentInfoPanel">
            <div>
              <span>Checkout</span>
              <h2>Un paso más para entrenar</h2>
            </div>
            <ol>
              <li>Confirma entrega y pago antes de finalizar.</li>
              <li>Mercado Pago procesa tarjetas, saldo y medios disponibles.</li>
              <li>También puedes pagar al recoger si eliges un gimnasio.</li>
            </ol>
            <div className="acceptedCards" aria-label="Medios aceptados">
              <span>VISA</span>
              <span>MC</span>
              <span>AMEX</span>
              <span>DISC</span>
            </div>
            <small>¿Necesitas ayuda? Contacta a soporte GymVerse.</small>
          </aside>

          <section className="paymentFormPanel">
            <div className="segmented paymentModes">
              <button className={paymentMethod === "mercado_pago" ? "active" : ""} onClick={() => setPaymentMethod("mercado_pago")}>
                Mercado Pago
              </button>
              <button
                className={paymentMethod === "pickup" ? "active" : ""}
                onClick={() => setPaymentMethod("pickup")}
                disabled={delivery !== "pickup"}
              >
                Pago al recoger
              </button>
            </div>

            {paymentMethod === "mercado_pago" ? (
              <div className="pickupPaymentNotice mercadoPagoNotice">
                <WalletCards size={22} />
                <div>
                  <strong>Pago seguro con Mercado Pago</strong>
                  <p>Al confirmar, te llevaremos a Mercado Pago para pagar con tarjeta, saldo u otros medios disponibles.</p>
                </div>
              </div>
            ) : (
              <div className="pickupPaymentNotice">
                <ShieldCheck size={22} />
                <div>
                  <strong>Pago al recoger</strong>
                  <p>El pedido quedará pendiente de pago hasta que el cliente lo recoja en el gimnasio seleccionado.</p>
                </div>
              </div>
            )}
          </section>
        </div>
        <div className="totals">
          <span>Subtotal</span>
          <strong>{money(subtotal)}</strong>
          <span>Entrega</span>
          <strong>{money(shipping)}</strong>
          {discount > 0 && (
            <>
              <span>Descuento</span>
              <strong>-{money(discount)}</strong>
            </>
          )}
          <span>Total</span>
          <strong>{money(Math.max(0, subtotal + shipping - discount))}</strong>
        </div>
        {isCheckingOut && (
          <div className="checkoutLoading" role="status" aria-live="polite">
            <span className="loadingSpinner" />
            <div>
              <strong>{paymentMethod === "pickup" ? "Confirmando pedido" : "Procesando pago"}</strong>
              <p>Estamos validando la compra.</p>
            </div>
          </div>
        )}
        <button className="primaryButton" onClick={openConfirmation} disabled={isCheckingOut || cart.length === 0 || (delivery === "pickup" && (!pickupGym || stockIssues.length > 0))}>
          {isCheckingOut ? (
            <>
              <span className="buttonSpinner" />
              {paymentMethod === "pickup" ? "Confirmando" : "Procesando pago"}
            </>
          ) : (
            <>
              <LockKeyhole size={18} />
              {paymentMethod === "mercado_pago" ? "Ir a Mercado Pago" : "Confirmar pedido"}
            </>
          )}
        </button>
      </section>

      {showConfirmation && (
        <div className="confirmOverlay" role="dialog" aria-modal="true" aria-labelledby="checkoutConfirmTitle">
          <section className="confirmPanel">
            <div>
              <span>Confirmación</span>
              <h2 id="checkoutConfirmTitle">Revisa tu pedido</h2>
              <p>Después de confirmar se apartará inventario y se generará el pedido.</p>
            </div>
            <div className="confirmSummary">
              <div>
                <span>Productos</span>
                <strong>{cart.reduce((sum, item) => sum + item.quantity, 0)}</strong>
              </div>
              <div>
                <span>Entrega</span>
                <strong>{delivery === "pickup" ? selectedGymName() : address?.label || "Domicilio"}</strong>
              </div>
              <div>
                <span>Pago</span>
                <strong>{paymentMethod === "mercado_pago" ? "Mercado Pago" : "Al recoger"}</strong>
              </div>
              <div>
                <span>Total</span>
                <strong>{money(Math.max(0, subtotal + shipping - discount))}</strong>
              </div>
            </div>
            <div className="confirmActions">
              <button className="iconTextButton" type="button" onClick={() => setShowConfirmation(false)}>
                Revisar
              </button>
              <button className="primaryButton" type="button" onClick={confirmCheckout}>
                <LockKeyhole size={18} />
                {paymentMethod === "mercado_pago" ? "Confirmar y pagar" : "Confirmar pedido"}
              </button>
            </div>
          </section>
        </div>
      )}
      <ConfirmDialog open={Boolean(couponConfirm)} {...(couponConfirm || {})} onCancel={() => setCouponConfirm(null)} />
    </section>
  );
}
