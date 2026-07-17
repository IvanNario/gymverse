import React, { useEffect, useState } from "react";
import { AdminUsersPage } from "./pages/AdminUsersPage.jsx";
import { AuditPage } from "./pages/AuditPage.jsx";
import { Sidebar } from "./components/Sidebar.jsx";
import { FinancePage } from "./pages/FinancePage.jsx";
import { GymsPage } from "./pages/GymsPage.jsx";
import { InventoryPage } from "./pages/InventoryPage.jsx";
import { LegalManagerPage } from "./pages/LegalManagerPage.jsx";
import { LoginPage } from "./pages/LoginPage.jsx";
import { GymPortalPage } from "./pages/GymPortalPage.jsx";
import { OrdersPage } from "./pages/OrdersPage.jsx";
import { OverviewPage } from "./pages/OverviewPage.jsx";
import { ReportsPage } from "./pages/ReportsPage.jsx";
import { ReturnsPage } from "./pages/ReturnsPage.jsx";
import { RestockGuidePage } from "./pages/RestockGuidePage.jsx";
import { RewardsPage } from "./pages/RewardsPage.jsx";
import { NotificationsPage } from "./pages/NotificationsPage.jsx";
import { SupportPage } from "./pages/SupportPage.jsx";
import { CouponsPage } from "./pages/CouponsPage.jsx";
import { SuppliersPage } from "./pages/SuppliersPage.jsx";
import { AutomationsPage } from "./pages/AutomationsPage.jsx";
import { ContentPage } from "./pages/ContentPage.jsx";
import { canAccess, ROLE_PRESETS } from "./permissions.js";
import { api, downloadApiFile, getToken, setToken, uploadImage } from "./services/api.js";

const emptyStats = {
  revenue: 0,
  profit: 0,
  currentProfit: 0,
  previousProfit: 0,
  profitDelta: 0,
  restockSpend: 0,
  activeOrders: 0,
  completedOrders: 0,
  customers: 0,
  products: 0,
  lowStock: 0,
  gyms: 0,
  activeGyms: 0,
  inactiveGyms: 0,
  activeSuppliers: 0,
  inactiveSuppliers: 0,
  pendingOrderPayments: 0,
  paidOrderPayments: 0,
  pendingGymPayments: 0,
  paidGymPayments: 0,
  rewardOrders: 0,
};

const emptyAnalytics = {
  summary: {
    totalRevenue: 0,
    totalCost: 0,
    totalProfit: 0,
    totalDiscount: 0,
    orders: 0,
    averageTicket: 0,
  },
  topProducts: [],
  topCustomers: [],
  deliveryChannels: [],
  couponPerformance: [],
  monthlySales: [],
  lowStockProducts: [],
};

const emptyAutomations = {
  rules: [],
  metrics: {
    expiredCoupons: 0,
    lowStockItems: 0,
    pendingPayments: 0,
    overdueGyms: 0,
  },
  lowStockPreview: [],
  runs: [],
};

const emptyFinance = {
  summary: {},
  monthly: [],
  pendingPayments: [],
};

const adminViewOrder = [
  "overview",
  "orders",
  "archivedOrders",
  "notifications",
  "support",
  "returns",
  "inventory",
  "restock",
  "gyms",
  "suppliers",
  "coupons",
  "rewards",
  "content",
  "automations",
  "finance",
  "audit",
  "legal",
  "reports",
];

export function App() {
  const [user, setUser] = useState(null);
  const [isBooting, setIsBooting] = useState(() => Boolean(getToken()));
  const [view, setView] = useState("overview");
  const [stats, setStats] = useState(emptyStats);
  const [analytics, setAnalytics] = useState(emptyAnalytics);
  const [orders, setOrders] = useState([]);
  const [archivedOrders, setArchivedOrders] = useState([]);
  const [products, setProducts] = useState([]);
  const [gyms, setGyms] = useState([]);
  const [suppliers, setSuppliers] = useState([]);
  const [categories, setCategories] = useState([]);
  const [restocks, setRestocks] = useState([]);
  const [restockGuides, setRestockGuides] = useState([]);
  const [gymStock, setGymStock] = useState([]);
  const [gymRestockRequests, setGymRestockRequests] = useState([]);
  const [rewardDrops, setRewardDrops] = useState([]);
  const [rewardOrders, setRewardOrders] = useState([]);
  const [returnRequests, setReturnRequests] = useState([]);
  const [coupons, setCoupons] = useState([]);
  const [contentPosts, setContentPosts] = useState([]);
  const [archivedContentPosts, setArchivedContentPosts] = useState([]);
  const [automations, setAutomations] = useState(emptyAutomations);
  const [finance, setFinance] = useState(emptyFinance);
  const [auditLogs, setAuditLogs] = useState([]);
  const [supportTickets, setSupportTickets] = useState([]);
  const [legalDocuments, setLegalDocuments] = useState([]);
  const [notifications, setNotifications] = useState([]);
  const [unreadNotifications, setUnreadNotifications] = useState(0);
  const [adminUsers, setAdminUsers] = useState([]);
  const [rolePresets, setRolePresets] = useState(ROLE_PRESETS);
  const [notice, setNotice] = useState("");

  useEffect(() => {
    if (!getToken()) {
      setIsBooting(false);
      return;
    }
    api("/auth/me")
      .then((data) => {
        if (!["admin", "staff", "gym"].includes(data.user.role)) throw new Error("Permisos insuficientes");
        setUser(data.user);
      })
      .catch(() => setToken(null))
      .finally(() => setIsBooting(false));
  }, []);

  useEffect(() => {
    if (["admin", "staff"].includes(user?.role)) loadAdminData();
    if (user?.role === "gym") loadGymData();
  }, [user]);

  useEffect(() => {
    if (user?.role !== "gym") return undefined;
    const timer = window.setInterval(() => {
      loadGymData();
    }, 15000);
    return () => window.clearInterval(timer);
  }, [user]);

  useEffect(() => {
    if (!["admin", "staff"].includes(user?.role)) return;
    const allowedViews = adminViewOrder.filter((entry) => canAccess(user, entry === "archivedOrders" ? "orders" : entry));
    const canManageUsers = user.role === "admin";
    const currentAllowed = view === "users" ? canManageUsers : allowedViews.includes(view);
    if (!currentAllowed) setView(allowedViews[0] || "overview");
  }, [user, view]);

  function showNotice(message) {
    setNotice(message);
    window.setTimeout(() => setNotice(""), 2400);
  }

  async function loadAdminData() {
    try {
      const canModule = (permission) => user?.role === "admin" || canAccess(user, permission);
      const load = async (key, condition, path) => [key, condition ? await api(path) : null];
      const data = Object.fromEntries(
        await Promise.all([
          load("stats", canModule("overview"), "/admin/stats"),
          load("analytics", canModule("overview") || canModule("reports"), "/admin/analytics"),
          load("orders", canModule("orders"), "/orders"),
          load("archivedOrders", canModule("orders"), "/orders?archived=1"),
          load("inventory", canModule("inventory") || canModule("restock") || canModule("rewards") || canModule("content"), "/admin/inventory"),
          load("gyms", canModule("gyms"), "/admin/gyms"),
          load("suppliers", canModule("suppliers") || canModule("inventory") || canModule("restock"), "/admin/suppliers"),
          load("categories", canModule("inventory"), "/admin/categories"),
          load("restocks", canModule("restock") || canModule("overview"), "/admin/restocks"),
          load("restockGuides", canModule("restock"), "/admin/restock-guides"),
          load("gymStock", canModule("restock") || canModule("gyms"), "/admin/gym-stock"),
          load("gymRestockRequests", canModule("restock") || canModule("gyms"), "/admin/gym-restock-requests"),
          load("drops", canModule("rewards"), "/admin/reward-drops"),
          load("rewardOrders", canModule("rewards"), "/admin/reward-orders"),
          load("returns", canModule("returns"), "/admin/returns"),
          load("coupons", canModule("coupons"), "/admin/coupons"),
          load("content", canModule("content"), "/admin/content"),
          load("archivedContent", canModule("content"), "/admin/content?archived=1"),
          load("automations", canModule("automations"), "/admin/automations"),
          load("finance", canModule("finance") || canModule("reports"), "/admin/finance"),
          load("audit", canModule("audit"), "/admin/audit-logs"),
          load("support", canModule("support"), "/admin/support"),
          load("legal", canModule("legal"), "/admin/legal-documents"),
          load("notifications", canModule("notifications"), "/notifications"),
          load("adminUsers", user?.role === "admin", "/admin/users"),
        ])
      );
      setStats(data.stats?.stats || emptyStats);
      setAnalytics(data.analytics?.analytics || emptyAnalytics);
      setOrders(data.orders?.orders || []);
      setArchivedOrders(data.archivedOrders?.orders || []);
      setProducts(data.inventory?.products || []);
      setGyms(data.gyms?.gyms || []);
      setSuppliers(data.suppliers?.suppliers || []);
      setCategories(data.categories?.categories || []);
      setRestocks(data.restocks?.restocks || []);
      setRestockGuides(data.restockGuides?.restockGuides || []);
      setGymStock(data.gymStock?.stock || []);
      setGymRestockRequests(data.gymRestockRequests?.requests || []);
      setRewardDrops(data.drops?.drops || []);
      setRewardOrders(data.rewardOrders?.rewardOrders || []);
      setReturnRequests(data.returns?.returnRequests || []);
      setCoupons(data.coupons?.coupons || []);
      setContentPosts(data.content?.posts || []);
      setArchivedContentPosts(data.archivedContent?.posts || []);
      setAutomations(data.automations?.automations || emptyAutomations);
      setFinance(data.finance?.finance || emptyFinance);
      setAuditLogs(data.audit?.logs || []);
      setSupportTickets(data.support?.tickets || []);
      setLegalDocuments(data.legal?.documents || []);
      setNotifications(data.notifications?.notifications || []);
      setUnreadNotifications(data.notifications?.unread || 0);
      setAdminUsers(data.adminUsers?.users || []);
      setRolePresets(data.adminUsers?.rolePresets || ROLE_PRESETS);
    } catch (error) {
      showNotice(error.message);
    }
  }

  async function loadGymData() {
    try {
      const [ordersData, stockData, requestsData, productsData] = await Promise.all([
        api("/orders"),
        api("/orders/gym-stock"),
        api("/orders/gym-restock-requests"),
        api("/catalog/products?category=all"),
      ]);
      setOrders(ordersData.orders);
      setGymStock(stockData.stock || []);
      setGymRestockRequests(requestsData.requests || []);
      setProducts(productsData.products || []);
    } catch (error) {
      showNotice(error.message);
    }
  }

  async function saveProduct(product) {
    const path = product._id ? `/admin/products/${product._id}` : "/admin/products";
    const method = product._id ? "PATCH" : "POST";
    await api(path, { method, body: product });
    await loadAdminData();
    showNotice(product._id ? "Producto actualizado" : "Producto creado");
  }

  async function uploadProductImage(file) {
    const data = await uploadImage(file);
    showNotice("Imagen cargada");
    return data.url;
  }

  async function deleteProduct(id) {
    await api(`/admin/products/${id}`, { method: "DELETE" });
    await loadAdminData();
    showNotice("Producto eliminado del catálogo");
  }

  async function adjustStock(productId, sku, delta, unitCost = 0, note = "") {
    await api(`/admin/products/${productId}/stock`, { method: "PATCH", body: { sku, delta, unitCost, note } });
    await loadAdminData();
    showNotice(delta > 0 ? "Stock agregado" : "Stock descontado");
  }

  async function downloadShippingGuide(order) {
    await downloadApiFile(`/orders/${order._id}/shipping-guide.pdf`, `${order.orderNumber}-guia.pdf`);
    showNotice("Guía descargada");
  }

  async function downloadRestockGuide(items) {
    await downloadApiFile("/admin/restock-guides/pdf", `gymverse-reabastecimiento-${Date.now()}.pdf`, { body: { items } });
    await loadAdminData();
    showNotice("Guía PDF descargada");
  }

  async function downloadSavedRestockGuide(guide) {
    await downloadApiFile(`/admin/restock-guides/${guide._id}/pdf`, `${guide.guideNumber}.pdf`);
    showNotice("Guía PDF descargada");
  }

  async function downloadReport(kind) {
    await downloadApiFile(`/admin/reports/${kind}.pdf`, `gymverse-${kind}.pdf`);
    showNotice("Reporte PDF descargado");
  }

  async function downloadReportCsv(kind) {
    await downloadApiFile(`/admin/reports/${kind}.csv`, `gymverse-${kind}.csv`);
    showNotice("Reporte CSV descargado");
  }

  async function downloadRewardGuide(order) {
    await downloadApiFile(`/admin/reward-orders/${order._id}/guide.pdf`, `${order.rewardNumber}-guia.pdf`);
    showNotice("Guía de recompensa descargada");
  }

  async function saveGym(gym) {
    const path = gym._id ? `/admin/gyms/${gym._id}` : "/admin/gyms";
    const method = gym._id ? "PATCH" : "POST";
    await api(path, { method, body: gym });
    await loadAdminData();
    showNotice(gym._id ? "Gimnasio actualizado" : "Gimnasio registrado");
  }

  async function saveGymAccess(gymId, access) {
    const hasAccess = gyms.find((gym) => gym._id === gymId)?.accessUser;
    const path = `/admin/gyms/${gymId}/access`;
    const method = hasAccess ? "PATCH" : "POST";
    await api(path, { method, body: access });
    await loadAdminData();
    showNotice(hasAccess ? "Acceso actualizado" : "Acceso creado");
  }

  async function updateGymAccessStatus(gymId, status) {
    await api(`/admin/gyms/${gymId}/access`, { method: "PATCH", body: { status } });
    await loadAdminData();
    showNotice(status === "active" ? "Acceso reactivado" : "Acceso desactivado");
  }

  async function markGymPayment(id) {
    await api(`/admin/gyms/${id}/payment`, { method: "PATCH" });
    await loadAdminData();
    showNotice("Pago mensual registrado");
  }

  async function deleteGym(id) {
    await api(`/admin/gyms/${id}`, { method: "DELETE" });
    await loadAdminData();
    showNotice("Gimnasio eliminado");
  }

  async function saveSupplier(supplier) {
    const path = supplier._id ? `/admin/suppliers/${supplier._id}` : "/admin/suppliers";
    const method = supplier._id ? "PATCH" : "POST";
    await api(path, { method, body: supplier });
    await loadAdminData();
    showNotice(supplier._id ? "Proveedor actualizado" : "Proveedor creado");
  }

  async function deleteSupplier(id) {
    await api(`/admin/suppliers/${id}`, { method: "DELETE" });
    await loadAdminData();
    showNotice("Proveedor eliminado");
  }

  async function updateOrderStatus(id, status) {
    await api(`/orders/${id}/status`, { method: "PATCH", body: { status } });
    if (user.role === "gym") await loadGymData();
    else await loadAdminData();
    showNotice("Pedido actualizado");
  }

  async function updateOrderPayment(id, paymentStatus) {
    await api(`/orders/${id}/payment`, { method: "PATCH", body: { paymentStatus } });
    if (user.role === "gym") await loadGymData();
    else await loadAdminData();
    showNotice("Pago actualizado");
  }

  async function archiveOrder(id) {
    await api(`/orders/${id}/archive`, { method: "PATCH" });
    await loadAdminData();
    showNotice("Pedido archivado");
  }

  async function restoreArchivedOrder(id) {
    await api(`/orders/${id}/unarchive`, { method: "PATCH" });
    await loadAdminData();
    showNotice("Pedido restaurado");
  }

  async function confirmPickup(id, pickupCode) {
    await api(`/orders/${id}/pickup-confirm`, { method: "POST", body: { pickupCode } });
    await loadGymData();
    showNotice("Entrega confirmada");
  }

  async function createGymRestockRequest(payload) {
    await api("/orders/gym-restock-requests", { method: "POST", body: payload });
    await loadGymData();
    showNotice("Guía enviada al administrador");
  }

  async function confirmGymRestockRequest(id) {
    await api(`/admin/gym-restock-requests/${id}/confirm`, { method: "PATCH", body: {} });
    await loadAdminData();
    showNotice("Traslado confirmado");
  }

  async function cancelGymRestockRequest(id) {
    await api(`/admin/gym-restock-requests/${id}/cancel`, { method: "PATCH", body: {} });
    await loadAdminData();
    showNotice("Solicitud cancelada");
  }

  async function saveRewardDrop(drop) {
    const path = drop._id ? `/admin/reward-drops/${drop._id}` : "/admin/reward-drops";
    const method = drop._id ? "PATCH" : "POST";
    await api(path, { method, body: drop });
    await loadAdminData();
    showNotice(drop._id ? "Drop actualizado" : "Drop creado");
  }

  async function updateRewardStatus(id, status) {
    await api(`/admin/reward-orders/${id}/status`, { method: "PATCH", body: { status } });
    await loadAdminData();
    showNotice("Pedido de recompensa actualizado");
  }

  async function updateReturn(id, status, resolutionNote = "") {
    await api(`/admin/returns/${id}`, { method: "PATCH", body: { status, resolutionNote } });
    await loadAdminData();
    showNotice("Devolución actualizada");
  }

  async function saveCoupon(coupon) {
    const path = coupon._id ? `/admin/coupons/${coupon._id}` : "/admin/coupons";
    const method = coupon._id ? "PATCH" : "POST";
    await api(path, { method, body: coupon });
    await loadAdminData();
    showNotice(coupon._id ? "Promoción actualizada" : "Promoción creada");
  }

  async function toggleCoupon(id, active) {
    await api(`/admin/coupons/${id}/status`, { method: "PATCH", body: { active } });
    await loadAdminData();
    showNotice(active ? "Promoción activada" : "Promoción pausada");
  }

  async function saveContent(post) {
    const path = post._id ? `/admin/content/${post._id}` : "/admin/content";
    const method = post._id ? "PATCH" : "POST";
    await api(path, { method, body: post });
    await loadAdminData();
    showNotice(post._id ? "Guía actualizada" : "Guía creada");
  }

  async function deleteContent(id) {
    await api(`/admin/content/${id}`, { method: "DELETE" });
    await loadAdminData();
    showNotice("Guía archivada");
  }

  async function restoreContent(id) {
    await api(`/admin/content/${id}/restore`, { method: "PATCH", body: {} });
    await loadAdminData();
    showNotice("Guía restaurada como borrador");
  }

  async function runAutomation(rule) {
    const data = await api("/admin/automations/run", { method: "POST", body: { rule } });
    setAutomations(data.automations);
    await loadAdminData();
    showNotice("Automatización ejecutada");
  }

  async function markNotificationsRead() {
    await api("/notifications/read-all", { method: "PATCH" });
    await loadAdminData();
    showNotice("Avisos marcados como leídos");
  }

  async function sendNotificationBroadcast(payload) {
    await api("/admin/notifications", { method: "POST", body: payload });
    await loadAdminData();
    showNotice("Aviso enviado");
  }

  async function updateSupportTicket(id, payload) {
    await api(`/admin/support/${id}`, { method: "PATCH", body: payload });
    await loadAdminData();
    showNotice("Ticket actualizado");
  }

  async function saveLegalDocument(document) {
    await api(`/admin/legal-documents/${document._id}`, { method: "PATCH", body: document });
    await loadAdminData();
    showNotice("Documento legal actualizado");
  }

  async function saveAdminUser(adminUser) {
    const path = adminUser._id ? `/admin/users/${adminUser._id}` : "/admin/users";
    const method = adminUser._id ? "PATCH" : "POST";
    await api(path, { method, body: adminUser });
    await loadAdminData();
    showNotice(adminUser._id ? "Usuario actualizado" : "Usuario creado");
  }

  async function toggleAdminUser(adminUser, status) {
    await api(`/admin/users/${adminUser._id}`, { method: "PATCH", body: { ...adminUser, status } });
    await loadAdminData();
    showNotice(status === "active" ? "Usuario reactivado" : "Usuario desactivado");
  }

  if (isBooting) {
    return (
      <main className="appLoadingScreen">
        <div className="loadingCard">
          <img src="/logo-yellow-bg.png" alt="GymVerse" />
          <div>
            <strong>Preparando administrador</strong>
            <span>Validando sesión y permisos</span>
          </div>
          <span className="loadingSpinner" aria-hidden="true" />
        </div>
      </main>
    );
  }

  if (!user) return <LoginPage onAuth={setUser} />;

  if (user.role === "gym") {
    return (
      <main className="gymShell">
        <GymPortalPage
          user={user}
          orders={orders}
          products={products}
          stock={gymStock}
          restockRequests={gymRestockRequests}
          onStatus={updateOrderStatus}
          onPayment={updateOrderPayment}
          onConfirmPickup={confirmPickup}
          onCreateRestockRequest={createGymRestockRequest}
          onLogout={() => {
            setToken(null);
            setUser(null);
          }}
        />
        {notice && <div className="toast">{notice}</div>}
      </main>
    );
  }

  const allowedViews = adminViewOrder.filter((entry) => canAccess(user, entry === "archivedOrders" ? "orders" : entry));
  const canManageUsers = user.role === "admin";

  return (
    <main className="adminShell">
      <Sidebar
        active={view}
        onChange={setView}
        unread={unreadNotifications}
        allowedViews={allowedViews}
        canManageUsers={canManageUsers}
        onLogout={() => {
          setToken(null);
          setUser(null);
        }}
      />
      <section className="workspace">
        {view === "overview" && canAccess(user, "overview") && <OverviewPage stats={stats} orders={orders} products={products} restocks={restocks} />}
        {view === "orders" && canAccess(user, "orders") && (
          <OrdersPage
            orders={orders}
            onStatus={updateOrderStatus}
            onPayment={updateOrderPayment}
            onDownloadGuide={downloadShippingGuide}
            onArchive={archiveOrder}
          />
        )}
        {view === "archivedOrders" && canAccess(user, "orders") && (
          <OrdersPage
            archived
            orders={archivedOrders}
            onDownloadGuide={downloadShippingGuide}
            onRestore={restoreArchivedOrder}
          />
        )}
        {view === "returns" && canAccess(user, "returns") && <ReturnsPage returnRequests={returnRequests} onUpdateReturn={updateReturn} />}
        {view === "coupons" && canAccess(user, "coupons") && <CouponsPage coupons={coupons} onSave={saveCoupon} onToggle={toggleCoupon} />}
        {view === "content" && canAccess(user, "content") && (
          <ContentPage
            posts={contentPosts}
            archivedPosts={archivedContentPosts}
            products={products}
            onSave={saveContent}
            onDelete={deleteContent}
            onRestore={restoreContent}
          />
        )}
        {view === "automations" && canAccess(user, "automations") && <AutomationsPage automations={automations} onRun={runAutomation} />}
        {view === "finance" && canAccess(user, "finance") && <FinancePage finance={finance} />}
        {view === "audit" && canAccess(user, "audit") && <AuditPage logs={auditLogs} />}
        {view === "support" && canAccess(user, "support") && <SupportPage tickets={supportTickets} onUpdate={updateSupportTicket} />}
        {view === "legal" && canAccess(user, "legal") && <LegalManagerPage documents={legalDocuments} onSave={saveLegalDocument} />}
        {view === "inventory" && canAccess(user, "inventory") && (
          <InventoryPage
            products={products}
            categories={categories}
            suppliers={suppliers}
            onSave={saveProduct}
            onDelete={deleteProduct}
            onStock={adjustStock}
            onUploadImage={uploadProductImage}
          />
        )}
        {view === "restock" && canAccess(user, "restock") && (
          <RestockGuidePage
            products={products}
            guides={restockGuides}
            gymRequests={gymRestockRequests}
            gymStock={gymStock}
            onDownload={downloadRestockGuide}
            onDownloadHistory={downloadSavedRestockGuide}
            onConfirmGymRequest={confirmGymRestockRequest}
            onCancelGymRequest={cancelGymRestockRequest}
          />
        )}
        {view === "rewards" && canAccess(user, "rewards") && (
          <RewardsPage
            drops={rewardDrops}
            rewardOrders={rewardOrders}
            products={products}
            onSaveDrop={saveRewardDrop}
            onRewardStatus={updateRewardStatus}
            onDownloadRewardGuide={downloadRewardGuide}
          />
        )}
        {view === "gyms" && canAccess(user, "gyms") && (
          <GymsPage
            gyms={gyms}
            onSave={saveGym}
            onDelete={deleteGym}
            onMarkPayment={markGymPayment}
            onSaveAccess={saveGymAccess}
            onAccessStatus={updateGymAccessStatus}
          />
        )}
        {view === "suppliers" && canAccess(user, "suppliers") && <SuppliersPage suppliers={suppliers} onSave={saveSupplier} onDelete={deleteSupplier} />}
        {view === "reports" && canAccess(user, "reports") && <ReportsPage analytics={analytics} onDownload={downloadReport} onDownloadCsv={downloadReportCsv} />}
        {view === "notifications" && canAccess(user, "notifications") && (
          <NotificationsPage notifications={notifications} unread={unreadNotifications} onReadAll={markNotificationsRead} onSend={sendNotificationBroadcast} />
        )}
        {view === "users" && canManageUsers && (
          <AdminUsersPage users={adminUsers} rolePresets={rolePresets} onSave={saveAdminUser} onToggle={toggleAdminUser} />
        )}
      </section>
      {notice && <div className="toast">{notice}</div>}
    </main>
  );
}
