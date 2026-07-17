import React, { useEffect, useMemo, useState } from "react";
import { BottomNav } from "./components/BottomNav.jsx";
import { AuthPage } from "./pages/AuthPage.jsx";
import { CartPage } from "./pages/CartPage.jsx";
import { ContentPage } from "./pages/ContentPage.jsx";
import { LegalPage } from "./pages/LegalPage.jsx";
import { OrdersPage } from "./pages/OrdersPage.jsx";
import { NotificationsPage } from "./pages/NotificationsPage.jsx";
import { PaymentConfirmationPage } from "./pages/PaymentConfirmationPage.jsx";
import { ProductPage } from "./pages/ProductPage.jsx";
import { ProfilePage } from "./pages/ProfilePage.jsx";
import { ShopPage } from "./pages/ShopPage.jsx";
import { SupportPage } from "./pages/SupportPage.jsx";
import { api, getToken, setToken } from "./services/api.js";

function wait(ms) {
  return new Promise((resolve) => {
    window.setTimeout(resolve, ms);
  });
}

export function App() {
  const [user, setUser] = useState(null);
  const [isBooting, setIsBooting] = useState(() => Boolean(getToken()));
  const [view, setView] = useState("shop");
  const [profileTab, setProfileTab] = useState("summary");
  const [categories, setCategories] = useState([]);
  const [products, setProducts] = useState([]);
  const [gyms, setGyms] = useState([]);
  const [localGymStock, setLocalGymStock] = useState([]);
  const [gymSearchResults, setGymSearchResults] = useState([]);
  const [orders, setOrders] = useState([]);
  const [returnRequests, setReturnRequests] = useState([]);
  const [notifications, setNotifications] = useState([]);
  const [unreadNotifications, setUnreadNotifications] = useState(0);
  const [rewardOrders, setRewardOrders] = useState([]);
  const [drop, setDrop] = useState(null);
  const [promotions, setPromotions] = useState([]);
  const [contentPosts, setContentPosts] = useState([]);
  const [legalDocuments, setLegalDocuments] = useState([]);
  const [supportTickets, setSupportTickets] = useState([]);
  const [cart, setCart] = useState([]);
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [search, setSearch] = useState("");
  const [delivery, setDelivery] = useState("pickup");
  const [paymentMethod, setPaymentMethod] = useState("mercado_pago");
  const [couponQuote, setCouponQuote] = useState(null);
  const [suggestedCoupon, setSuggestedCoupon] = useState("");
  const [pickupGym, setPickupGym] = useState("");
  const [isCheckingOut, setIsCheckingOut] = useState(false);
  const [paymentResult, setPaymentResult] = useState(null);
  const [notice, setNotice] = useState("");
  const userId = user?.id || user?._id || "";

  const catalogQuery = useMemo(() => {
    const params = new URLSearchParams();
    params.set("category", selectedCategory === "favorites" ? "all" : selectedCategory);
    if (search) params.set("search", search);
    return params.toString();
  }, [selectedCategory, search]);

  const visibleProducts = useMemo(() => {
    if (selectedCategory !== "favorites") return products;
    const favorites = new Set(user?.favorites || []);
    return products.filter((product) => favorites.has(product._id));
  }, [products, selectedCategory, user]);

  useEffect(() => {
    if (!getToken()) {
      setIsBooting(false);
      return;
    }
    api("/auth/me")
      .then((data) => setUser(data.user))
      .catch(() => setToken(null))
      .finally(() => setIsBooting(false));
  }, []);

  useEffect(() => {
    let cancelled = false;
    Promise.all([
      api("/catalog/categories"),
      api(`/catalog/products?${catalogQuery}`),
      user ? api("/catalog/my-gyms") : Promise.resolve({ gyms: [] }),
      api("/catalog/reward-drop"),
      api("/catalog/promotions"),
      api("/catalog/content"),
      api("/catalog/legal"),
    ])
      .then(([categoryData, productData, gymData, dropData, promotionsData, contentData, legalData]) => {
        if (cancelled) return;
        setCategories(categoryData.categories);
        setProducts(productData.products);
        setGyms(gymData.gyms);
        setDrop(dropData.drop);
        setPromotions(promotionsData.promotions);
        setContentPosts(contentData.posts);
        setLegalDocuments(legalData.documents || []);
        setPickupGym((current) => current || gymData.gyms[0]?._id || "");
      })
      .catch((error) => showNotice(error.message));
    return () => {
      cancelled = true;
    };
  }, [catalogQuery, userId]);

  useEffect(() => {
    if (delivery !== "pickup") return;
    const validPickup = gyms.some((gym) => gym._id === pickupGym);
    if (!pickupGym || validPickup) return;
    setPickupGym(gyms[0]?._id || "");
  }, [delivery, gyms, pickupGym]);

  useEffect(() => {
    if (!user || delivery !== "pickup" || !pickupGym) {
      setLocalGymStock([]);
      return;
    }
    api(`/catalog/my-gyms/${pickupGym}/stock`)
      .then((data) => setLocalGymStock(data.stock || []))
      .catch(() => setLocalGymStock([]));
  }, [user, delivery, pickupGym]);

  useEffect(() => {
    if (selectedCategory === "all" || selectedCategory === "favorites") return;
    const exists = categories.some((category) => category.slug === selectedCategory || category._id === selectedCategory);
    if (categories.length && !exists) setSelectedCategory("all");
  }, [categories, selectedCategory]);

  useEffect(() => {
    if (!selectedProduct) return;
    const updated = products.find((product) => product._id === selectedProduct._id);
    if (updated && updated !== selectedProduct) setSelectedProduct(updated);
  }, [products, selectedProduct]);

  useEffect(() => {
    if (user) {
      loadOrders();
      loadRewardOrders();
      loadNotifications();
      loadSupportTickets();
    }
  }, [user]);

  useEffect(() => {
    if (!user) return undefined;
    const timer = window.setInterval(() => {
      loadNotifications({ silent: true });
    }, 45000);
    return () => window.clearInterval(timer);
  }, [user, unreadNotifications]);

  useEffect(() => {
    if (!user) return;
    const params = new URLSearchParams(window.location.search);
    const orderId = params.get("order") || params.get("external_reference");
    const paymentId = params.get("payment_id") || params.get("collection_id");
    const requestedView = params.get("view");
    if (requestedView) setView(requestedView);
    if (orderId && paymentId) {
      api(`/orders/${orderId}/payment-refresh`, { method: "POST", body: { paymentId } })
        .then(() => {
          showNotice("Pago sincronizado");
          loadOrders();
          loadNotifications();
        })
        .catch((error) => showNotice(error.message))
        .finally(() => {
          window.history.replaceState({}, "", window.location.pathname);
        });
    }
  }, [user]);

  useEffect(() => {
    setCouponQuote(null);
  }, [delivery]);

  function showNotice(message) {
    setNotice(message);
    window.setTimeout(() => setNotice(""), 2200);
  }

  async function loadOrders() {
    const [orderData, returnData] = await Promise.all([api("/orders/me"), api("/orders/me/returns")]);
    setOrders(orderData.orders);
    setReturnRequests(returnData.returnRequests);
  }

  async function loadRewardOrders() {
    const data = await api("/rewards/me");
    setRewardOrders(data.rewardOrders);
  }

  async function loadNotifications({ silent = false } = {}) {
    const data = await api("/notifications");
    if (silent && data.unread > unreadNotifications && "Notification" in window && Notification.permission === "granted") {
      const newest = data.notifications.find((notification) => !notification.readAt);
      if (newest) new Notification(`${newest.noticeCode || "Aviso"} · ${newest.title}`, { body: newest.message, icon: "/logo-yellow-bg.png" });
    }
    setNotifications(data.notifications);
    setUnreadNotifications(data.unread);
  }

  async function loadSupportTickets() {
    const data = await api("/support/me");
    setSupportTickets(data.tickets || []);
  }

  async function searchGyms(query) {
    const term = String(query || "").trim();
    if (term.length < 2) {
      setGymSearchResults([]);
      return [];
    }
    const data = await api(`/catalog/gyms/search?query=${encodeURIComponent(term)}`);
    setGymSearchResults(data.gyms || []);
    return data.gyms || [];
  }

  async function affiliateGym(id) {
    const data = await api(`/catalog/my-gyms/${id}`, { method: "POST" });
    setGyms(data.gyms || []);
    setUser(data.user);
    setPickupGym((current) => current || data.gyms?.[0]?._id || "");
    showNotice("Gimnasio afiliado");
  }

  async function removeAffiliatedGym(id) {
    const data = await api(`/catalog/my-gyms/${id}`, { method: "DELETE" });
      setGyms(data.gyms || []);
      setUser(data.user);
      if (pickupGym === id) setPickupGym(data.gyms?.[0]?._id || "");
      if (pickupGym === id) setLocalGymStock([]);
      showNotice("Gimnasio removido");
  }

  async function markNotificationsRead() {
    await api("/notifications/read-all", { method: "PATCH" });
    await loadNotifications();
  }

  async function clearNotifications() {
    await api("/notifications", { method: "DELETE" });
    setNotifications([]);
    setUnreadNotifications(0);
    showNotice("Avisos limpiados");
  }

  async function requestNotificationPermission() {
    if (!("Notification" in window)) return showNotice("Tu navegador no soporta avisos");
    const permission = await Notification.requestPermission();
    showNotice(permission === "granted" ? "Avisos activados" : "Avisos no activados");
  }

  async function createSupportTicket(payload) {
    const data = await api("/support", { method: "POST", body: payload });
    await loadSupportTickets();
    await loadNotifications();
    showNotice("Ticket enviado");
    return data.ticket;
  }

  async function replySupportTicket(id, message) {
    await api(`/support/${id}/messages`, { method: "POST", body: { message } });
    await loadSupportTickets();
    showNotice("Respuesta enviada");
  }

  async function closeSupportTicket(id) {
    await api(`/support/${id}/close`, { method: "PATCH" });
    await loadSupportTickets();
    showNotice("Ticket cerrado");
  }

  async function saveProfile(profile) {
    const data = await api("/auth/me", { method: "PATCH", body: profile });
    setUser(data.user);
    showNotice("Perfil actualizado");
  }

  async function changePassword(payload) {
    await api("/auth/me/password", { method: "PATCH", body: payload });
    showNotice("Contraseña actualizada");
  }

  function addToCart(product, variant) {
    setCart((current) => {
      const exists = current.find((item) => item.variant.sku === variant.sku);
      if (exists) {
        return current.map((item) => (item.variant.sku === variant.sku ? { ...item, quantity: item.quantity + 1 } : item));
      }
      return [...current, { product, variant, quantity: 1 }];
    });
    setCouponQuote(null);
    showNotice("Producto agregado");
    setView("cart");
  }

  function updateQty(sku, delta) {
    setCart((current) =>
      current
        .map((item) => (item.variant.sku === sku ? { ...item, quantity: item.quantity + delta } : item))
        .filter((item) => item.quantity > 0)
    );
    setCouponQuote(null);
  }

  async function applyCoupon(code) {
    const subtotal = cart.reduce((sum, item) => sum + item.variant.price * item.quantity, 0);
    try {
      const data = await api("/orders/coupon-preview", { method: "POST", body: { code, subtotal, deliveryMethod: delivery } });
      setCouponQuote(data.coupon);
      showNotice("Cupón aplicado");
      return data.coupon;
    } catch (error) {
      showNotice(error.message);
      throw error;
    }
  }

  function removeCoupon() {
    setCouponQuote(null);
    showNotice("Cupón removido");
  }

  function usePromotion(code) {
    setSuggestedCoupon(code);
    setView("cart");
    showNotice(`Cupón ${code} listo para usar`);
  }

  async function toggleFavorite(productId) {
    const isFavorite = user?.favorites?.includes(productId);
    const data = await api(`/auth/me/favorites/${productId}`, { method: isFavorite ? "DELETE" : "POST" });
    setUser(data.user);
    showNotice(isFavorite ? "Favorito removido" : "Favorito guardado");
  }

  async function checkout() {
    if (!user) return setView("profile");
    if (delivery === "home" && !user.addresses?.[0]) {
      showNotice("Agrega una dirección en tu perfil");
      setView("profile");
      return;
    }
    if (delivery === "pickup" && !pickupGym) {
      showNotice("Afilia un gimnasio desde tu perfil");
      setProfileTab("gyms");
      setView("profile");
      return;
    }
    if (delivery === "home" && paymentMethod === "pickup") {
      showNotice("El pago al recoger solo aplica para retiro en gimnasio");
      return;
    }
    const payload = {
      deliveryMethod: delivery,
      pickupGym,
      shippingAddress: user.addresses?.[0],
      paymentMethod,
      couponCode: couponQuote?.code,
      items: cart.map((item) => ({ productId: item.product._id, sku: item.variant.sku, quantity: item.quantity })),
    };
    setIsCheckingOut(true);
    try {
      await wait(750);
      const data = await api("/orders", { method: "POST", body: payload });
      const profile = await api("/auth/me");
      setUser(profile.user);
      setCart([]);
      setCouponQuote(null);
      await loadOrders();
      if (data.paymentUrl) {
        showNotice("Redirigiendo a Mercado Pago");
        window.location.href = data.paymentUrl;
        return;
      }
      setPaymentResult(data.order);
      setView("payment-confirmation");
      showNotice(data.order.paymentStatus === "paid" ? "Pago aprobado" : "Pedido confirmado");
    } catch (error) {
      showNotice(error.message);
    } finally {
      setIsCheckingOut(false);
    }
  }

  async function redeemReward(item) {
    if (!user) return setView("profile");
    const payload = {
      dropId: drop._id,
      itemId: item._id,
      quantity: 1,
      deliveryMethod: "pickup",
      pickupGym,
    };
    const data = await api("/rewards/redeem", { method: "POST", body: payload });
    setUser(data.user);
    await loadRewardOrders();
    const dropData = await api("/catalog/reward-drop");
    setDrop(dropData.drop);
    showNotice("Recompensa canjeada");
  }

  async function cancelOrder(id) {
    await api(`/orders/${id}/cancel`, { method: "PATCH" });
    await loadOrders();
    await loadNotifications();
    showNotice("Pedido cancelado");
  }

  async function payPendingOrder(id) {
    try {
      const data = await api(`/orders/${id}/pay`, { method: "POST" });
      await loadOrders();
      if (data.paymentUrl) {
        showNotice("Redirigiendo a Mercado Pago");
        window.location.href = data.paymentUrl;
      }
    } catch (error) {
      await loadOrders();
      showNotice(error.message);
    }
  }

  async function requestReturn(orderId, reason) {
    await api(`/orders/${orderId}/return`, { method: "POST", body: { reason } });
    await loadOrders();
    await loadNotifications();
    showNotice("Devolución solicitada");
  }

  async function clearOrderHistory(orderIds) {
    await api("/orders/me/history", { method: "DELETE", body: { orderIds } });
    await loadOrders();
    showNotice("Historial eliminado");
  }

  if (isBooting) {
    return (
      <main className="appLoadingScreen">
        <div className="loadingCard">
          <img src="/logo-yellow-bg.png" alt="GymVerse" />
          <div>
            <strong>Preparando GymVerse</strong>
            <span>Cargando tu sesión y catálogo</span>
          </div>
          <span className="loadingSpinner" aria-hidden="true" />
        </div>
      </main>
    );
  }

  if (!user) return <AuthPage onAuth={setUser} />;

  return (
    <main className="phoneShell">
      {view === "shop" && (
        <ShopPage
          categories={categories}
          products={visibleProducts}
          selectedCategory={selectedCategory}
          onCategory={setSelectedCategory}
          search={search}
          onSearch={setSearch}
          drop={drop}
          promotions={promotions}
          user={user}
          favorites={user?.favorites || []}
          onToggleFavorite={toggleFavorite}
          onRedeem={redeemReward}
          onUsePromotion={usePromotion}
          onOpenProduct={(product) => {
            setSelectedProduct(product);
            setView("product");
          }}
        />
      )}
      {view === "product" && selectedProduct && (
        <ProductPage
          product={selectedProduct}
          isFavorite={user?.favorites?.includes(selectedProduct._id)}
          onToggleFavorite={toggleFavorite}
          onBack={() => setView("shop")}
          onAdd={addToCart}
        />
      )}
      {view === "cart" && (
        <CartPage
          cart={cart}
          gyms={gyms}
          localGymStock={localGymStock}
          delivery={delivery}
          setDelivery={setDelivery}
          pickupGym={pickupGym}
          setPickupGym={setPickupGym}
          paymentMethod={paymentMethod}
          setPaymentMethod={setPaymentMethod}
          onQty={updateQty}
          onCheckout={checkout}
          couponQuote={couponQuote}
          suggestedCoupon={suggestedCoupon}
          onApplyCoupon={applyCoupon}
          onRemoveCoupon={removeCoupon}
          user={user}
          isCheckingOut={isCheckingOut}
          onManageGyms={() => {
            setProfileTab("gyms");
            setView("profile");
          }}
        />
      )}
      {view === "content" && (
        <ContentPage
          posts={contentPosts}
          onOpenProduct={(product) => {
            const currentProduct = products.find((entry) => entry._id === product._id) || product;
            setSelectedProduct(currentProduct);
            setView("product");
          }}
        />
      )}
      {view === "payment-confirmation" && (
        <PaymentConfirmationPage
          order={paymentResult}
          onViewOrders={() => setView("orders")}
          onBackToShop={() => setView("shop")}
        />
      )}
      {view === "orders" && (
        <OrdersPage
          orders={orders}
          rewardOrders={rewardOrders}
          returnRequests={returnRequests}
          onCancel={cancelOrder}
          onPay={payPendingOrder}
          onRequestReturn={requestReturn}
          onClearHistory={clearOrderHistory}
        />
      )}
      {view === "notifications" && (
        <NotificationsPage
          notifications={notifications}
          unread={unreadNotifications}
          onReadAll={markNotificationsRead}
          onClear={clearNotifications}
          onEnablePush={requestNotificationPermission}
        />
      )}
      {view === "profile" && (
        <ProfilePage
          user={user}
          orderCount={orders.length}
          onSave={saveProfile}
          onChangePassword={changePassword}
          gyms={gyms}
          gymSearchResults={gymSearchResults}
          onSearchGyms={searchGyms}
          onAffiliateGym={affiliateGym}
          onRemoveGym={removeAffiliatedGym}
          initialTab={profileTab}
          onTabChange={setProfileTab}
          onLegal={() => setView("legal")}
          onSupport={() => setView("support")}
          onLogout={() => {
            setToken(null);
            setUser(null);
            setGyms([]);
            setLocalGymStock([]);
            setGymSearchResults([]);
            setPickupGym("");
            setProfileTab("summary");
          }}
        />
      )}
      {view === "support" && (
        <SupportPage
          tickets={supportTickets}
          onCreate={createSupportTicket}
          onReply={replySupportTicket}
          onClose={closeSupportTicket}
          onBack={() => setView("profile")}
        />
      )}
      {view === "legal" && <LegalPage documents={legalDocuments} onBack={() => setView("profile")} />}
      {notice && <div className="toast">{notice}</div>}
      <div className="appVersionBadge">Versión 1.0</div>
      <BottomNav
        active={view === "product" ? "shop" : view === "payment-confirmation" ? "orders" : view === "legal" || view === "support" ? "profile" : view}
        onChange={setView}
        unread={unreadNotifications}
      />
    </main>
  );
}
