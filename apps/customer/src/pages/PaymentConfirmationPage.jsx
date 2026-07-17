import React from "react";
import { CheckCircle2, CreditCard, PackageCheck, ShoppingBag } from "lucide-react";
import { money } from "../services/api.js";

export function PaymentConfirmationPage({ order, onViewOrders, onBackToShop }) {
  const paid = order?.paymentStatus === "paid";
  const paymentLabel =
    order?.paymentMethod === "pickup"
      ? "Pago al recoger"
      : "Mercado Pago";

  return (
    <section className="screen confirmationScreen">
      <article className="paymentConfirmation">
        <div className="successPulse">
          <CheckCircle2 size={42} />
        </div>
        <span>{paid ? "Pago aprobado" : "Pedido confirmado"}</span>
        <h1>{paid ? "Tu compra está pagada" : "Te esperamos para completar el pago"}</h1>
        <p>
          {paid
            ? "Recibimos el pago y tu pedido ya está en preparación."
            : "Tu pedido quedó reservado y el pago se realizará al recogerlo."}
        </p>

        <div className="confirmationSummary">
          <div>
            <PackageCheck size={18} />
            <span>Pedido</span>
            <strong>{order?.orderNumber || "Sin folio"}</strong>
          </div>
          <div>
            <CreditCard size={18} />
            <span>Método</span>
            <strong>{paymentLabel}</strong>
          </div>
          <div>
            <ShoppingBag size={18} />
            <span>Total</span>
            <strong>{money(order?.total || 0)}</strong>
          </div>
          {order?.pickupCode && (
            <div>
              <PackageCheck size={18} />
              <span>Código de retiro</span>
              <strong>{order.pickupCode}</strong>
            </div>
          )}
        </div>

        <div className="confirmationActions">
          <button className="primaryButton" onClick={onViewOrders}>
            Ver pedidos
          </button>
          <button className="iconTextButton" onClick={onBackToShop}>
            Seguir comprando
          </button>
        </div>
      </article>
    </section>
  );
}
