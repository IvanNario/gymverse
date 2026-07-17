import React, { useMemo, useState } from "react";
import { ImagePlus, Minus, Pencil, Plus, Save, Search, Trash2, X } from "lucide-react";
import { ConfirmDialog } from "../components/ConfirmDialog.jsx";
import { PaginationControls, usePagedItems } from "../components/PaginationControls.jsx";
import { money } from "../services/api.js";

const emptyProduct = {
  name: "",
  slug: "",
  category: "",
  supplier: "",
  description: "",
  imageUrl: "",
  tags: "",
  status: "active",
  pointsEarned: 0,
  variants: [{ sku: "", label: "", price: 0, cost: 0, stock: 0, attributes: {} }],
};

function slugify(value) {
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

function toForm(product) {
  if (!product) return emptyProduct;
  return {
    _id: product._id,
    name: product.name || "",
    slug: product.slug || "",
    category: product.category?._id || product.category || "",
    supplier: product.supplier?._id || product.supplier || "",
    description: product.description || "",
    imageUrl: product.imageUrl || "",
    tags: (product.tags || []).join(", "),
    status: product.status || "active",
    pointsEarned: product.pointsEarned || 0,
    variants: product.variants?.length ? product.variants.map((variant) => ({ ...variant })) : emptyProduct.variants,
  };
}

function categoryMatches(productCategory, selected) {
  if (selected === "all") return true;
  return [productCategory?._id, productCategory?.slug, productCategory?.name]
    .filter(Boolean)
    .some((value) => String(value).toLowerCase() === String(selected).toLowerCase());
}

export function InventoryPage({ products, categories, suppliers, onSave, onDelete, onStock, onUploadImage }) {
  const [tab, setTab] = useState("list");
  const [form, setForm] = useState(emptyProduct);
  const [editingId, setEditingId] = useState("");
  const [query, setQuery] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [supplierFilter, setSupplierFilter] = useState("all");
  const [stockFilter, setStockFilter] = useState("all");
  const [uploadingImage, setUploadingImage] = useState(false);
  const [confirm, setConfirm] = useState(null);

  const totalValue = useMemo(
    () => products.reduce((sum, product) => sum + product.variants.reduce((inner, variant) => inner + variant.price * variant.stock, 0), 0),
    [products]
  );

  const filteredProducts = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    return products.filter((product) => {
      const matchesQuery =
        !normalized ||
        [product.name, product.slug, product.category?.name, product.supplier?.name, ...(product.tags || [])]
          .filter(Boolean)
          .some((value) => String(value).toLowerCase().includes(normalized)) ||
        product.variants.some((variant) =>
          [variant.sku, variant.label].filter(Boolean).some((value) => String(value).toLowerCase().includes(normalized))
        );
      const matchesCategory = categoryMatches(product.category, categoryFilter);
      const matchesSupplier = supplierFilter === "all" || product.supplier?._id === supplierFilter;
      const hasLowStock = product.variants.some((variant) => variant.stock < 10);
      const matchesStock = stockFilter === "all" || (stockFilter === "low" ? hasLowStock : !hasLowStock);
      return matchesQuery && matchesCategory && matchesSupplier && matchesStock;
    });
  }, [categoryFilter, products, query, stockFilter, supplierFilter]);
  const productsPager = usePagedItems(filteredProducts);

  function updateVariant(index, patch) {
    setForm((current) => ({
      ...current,
      variants: current.variants.map((variant, itemIndex) => (itemIndex === index ? { ...variant, ...patch } : variant)),
    }));
  }

  function startNewProduct() {
    setForm(emptyProduct);
    setEditingId("");
    setTab("form");
  }

  function startEditProduct(product) {
    setForm(toForm(product));
    setEditingId(product._id);
    setTab("form");
  }

  function closeForm() {
    setForm(emptyProduct);
    setEditingId("");
    setTab("list");
  }

  async function submit(event) {
    event.preventDefault();
    const body = {
      ...form,
      slug: form.slug || slugify(form.name),
      pointsEarned: Number(form.pointsEarned || 0),
      tags: form.tags.split(",").map((tag) => tag.trim()).filter(Boolean),
      variants: form.variants.map((variant) => ({
        sku: variant.sku,
        label: variant.label,
        price: Number(variant.price),
        cost: Number(variant.cost || 0),
        stock: Number(variant.stock),
        attributes: variant.attributes || {},
      })),
    };
    await onSave(body);
    closeForm();
  }

  async function handleImageUpload(event) {
    const file = event.target.files?.[0];
    if (!file) return;
    setUploadingImage(true);
    try {
      const url = await onUploadImage(file);
      setForm((current) => ({ ...current, imageUrl: url }));
    } finally {
      setUploadingImage(false);
      event.target.value = "";
    }
  }

  function confirmRemoveVariant(index, variant) {
    setConfirm({
      title: "Eliminar variante",
      message: `Se quitará la variante "${variant.label || variant.sku || "sin nombre"}" del formulario. Revisa antes de guardar el producto.`,
      confirmLabel: "Eliminar",
      onConfirm: () => {
        setForm((current) => ({ ...current, variants: current.variants.filter((_, itemIndex) => itemIndex !== index) }));
        setConfirm(null);
      },
    });
  }

  function confirmDeleteProduct(product) {
    setConfirm({
      title: "Eliminar producto",
      message: `El producto "${product.name}" dejará de estar disponible en el catálogo. Esta acción puede afectar pedidos, recompensas o reabastecimientos relacionados.`,
      confirmLabel: "Eliminar",
      onConfirm: async () => {
        await onDelete(product._id);
        setConfirm(null);
      },
    });
  }

  return (
    <section className="page">
      <div className="pageHeader">
        <div>
          <span>Catálogo</span>
          <h1>Inventario</h1>
        </div>
        <div className="headerActions">
          <span className="summaryPill">{products.length} productos</span>
          <span className="summaryPill">{money(totalValue)} en stock</span>
        </div>
      </div>

      <div className="pageTabs" role="tablist" aria-label="Inventario">
        <button className={tab === "list" ? "active" : ""} onClick={() => setTab("list")} type="button">
          {tab === "form" ? "Volver al inventario" : "Inventario"}
        </button>
        <button className="primaryButton compact" onClick={startNewProduct} type="button">
          <Plus size={17} />
          Nuevo producto
        </button>
      </div>

      {tab === "form" ? (
        <form className="editorPanel" onSubmit={submit}>
          <div className="editorTitle">
            <div>
              <span>{editingId ? "Editando" : "Nuevo producto"}</span>
              <h2>{editingId ? form.name : "Agregar producto"}</h2>
            </div>
            {editingId && (
              <button type="button" className="ghostIcon" onClick={closeForm} aria-label="Cancelar edición">
                <X size={18} />
              </button>
            )}
          </div>

          <div className="formGrid">
            <label>
              <span>Nombre</span>
              <input
                value={form.name}
                onChange={(event) => setForm({ ...form, name: event.target.value, slug: form.slug || slugify(event.target.value) })}
                placeholder="Ej. Whey Elite 2 lb"
                required
              />
              <small className="formHint">Nombre visible en la tienda y en el inventario.</small>
            </label>
            <label>
              <span>Slug</span>
              <input value={form.slug} onChange={(event) => setForm({ ...form, slug: event.target.value })} placeholder="whey-elite-2lb" required />
              <small className="formHint">Identificador para URL, sin espacios ni acentos.</small>
            </label>
            <label>
              <span>Categoría</span>
              <select value={form.category} onChange={(event) => setForm({ ...form, category: event.target.value })} required>
                <option value="">Seleccionar</option>
                {categories.map((category) => (
                  <option key={category._id} value={category._id}>
                    {category.name}
                  </option>
                ))}
              </select>
              <small className="formHint">Se usa para filtrar el catálogo del cliente.</small>
            </label>
            <label>
              <span>Proveedor</span>
              <select value={form.supplier} onChange={(event) => setForm({ ...form, supplier: event.target.value })} required>
                <option value="">Seleccionar</option>
                {suppliers.map((supplier) => (
                  <option key={supplier._id} value={supplier._id}>
                    {supplier.name}
                  </option>
                ))}
              </select>
              <small className="formHint">Proveedor responsable del producto.</small>
            </label>
            <label>
              <span>Puntos por compra</span>
              <input
                type="number"
                min="0"
                value={form.pointsEarned}
                onChange={(event) => setForm({ ...form, pointsEarned: event.target.value })}
                placeholder="Ej. 75"
              />
              <small className="formHint">Puntos que gana el cliente por cada pieza comprada.</small>
            </label>
          </div>

          <label>
            <span>Descripción</span>
            <textarea
              value={form.description}
              onChange={(event) => setForm({ ...form, description: event.target.value })}
              placeholder="Describe beneficios, uso y detalles importantes para el cliente."
              required
            />
            <small className="formHint">Texto mostrado en la vista de detalle del producto.</small>
          </label>

          <div className="imageUploadGrid">
            <div className="imagePreviewFrame">
              {form.imageUrl ? <img src={form.imageUrl} alt="Vista previa del producto" /> : <ImagePlus size={30} />}
            </div>
            <label className="fileUploadBox">
              <span>Foto del producto</span>
              <input type="file" accept="image/png,image/jpeg,image/webp" onChange={handleImageUpload} required={!form.imageUrl} />
              <strong>{uploadingImage ? "Subiendo imagen..." : "Seleccionar archivo"}</strong>
              <small className="formHint">PNG, JPG o WebP. Máximo 4 MB. Se guarda en almacenamiento externo, no en el servidor.</small>
            </label>
          </div>

          <label>
            <span>Etiquetas</span>
            <input value={form.tags} onChange={(event) => setForm({ ...form, tags: event.target.value })} placeholder="proteina, fuerza, nuevo" />
            <small className="formHint">Separa cada etiqueta con coma para búsquedas internas.</small>
          </label>

          <div className="variantEditor">
            <div className="editorTitle small">
              <h3>Variantes</h3>
              <button
                type="button"
                className="ghostButton"
                onClick={() => setForm({ ...form, variants: [...form.variants, { sku: "", label: "", price: 0, cost: 0, stock: 0, attributes: {} }] })}
              >
                <Plus size={16} />
                Variante
              </button>
            </div>
            {form.variants.map((variant, index) => (
              <div className="variantRow" key={`${variant.sku}-${index}`}>
                <label>
                  <span>SKU</span>
                  <input placeholder="WHEY-VAN-2LB" value={variant.sku} onChange={(event) => updateVariant(index, { sku: event.target.value })} required />
                </label>
                <label>
                  <span>Etiqueta</span>
                  <input placeholder="Vainilla 2 lb" value={variant.label} onChange={(event) => updateVariant(index, { label: event.target.value })} required />
                </label>
                <label>
                  <span>Precio venta</span>
                  <input type="number" min="0" step="0.01" placeholder="749.00" value={variant.price} onChange={(event) => updateVariant(index, { price: event.target.value })} required />
                </label>
                <label>
                  <span>Costo</span>
                  <input type="number" min="0" step="0.01" placeholder="520.00" value={variant.cost || 0} onChange={(event) => updateVariant(index, { cost: event.target.value })} />
                </label>
                <label>
                  <span>Stock inicial</span>
                  <input type="number" min="0" placeholder="24" value={variant.stock} onChange={(event) => updateVariant(index, { stock: event.target.value })} required />
                </label>
                <button
                  type="button"
                  className="dangerIcon"
                  onClick={() => confirmRemoveVariant(index, variant)}
                  aria-label="Eliminar variante"
                  disabled={form.variants.length === 1}
                >
                  <Trash2 size={16} />
                </button>
              </div>
            ))}
          </div>

          <button className="primaryButton">
            <Save size={18} />
            {editingId ? "Guardar cambios" : "Crear producto"}
          </button>
        </form>
      ) : (
        <>
          <section className="filterPanel">
            <label className="searchField">
              <Search size={17} />
              <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Buscar por producto, SKU, proveedor o etiqueta" />
            </label>
            <label>
              <span>Categoría</span>
              <select value={categoryFilter} onChange={(event) => setCategoryFilter(event.target.value)}>
                <option value="all">Todas</option>
                {categories.map((category) => (
                  <option key={category._id} value={category.slug || category._id}>{category.name}</option>
                ))}
              </select>
            </label>
            <label>
              <span>Proveedor</span>
              <select value={supplierFilter} onChange={(event) => setSupplierFilter(event.target.value)}>
                <option value="all">Todos</option>
                {suppliers.map((supplier) => (
                  <option key={supplier._id} value={supplier._id}>{supplier.name}</option>
                ))}
              </select>
            </label>
            <label>
              <span>Stock</span>
              <select value={stockFilter} onChange={(event) => setStockFilter(event.target.value)}>
                <option value="all">Todo</option>
                <option value="low">Bajo stock</option>
                <option value="ok">Stock suficiente</option>
              </select>
            </label>
          </section>
          <div className="resultMeta">{filteredProducts.length} producto(s) encontrados</div>
          <div className="inventoryList">
          {productsPager.pagedItems.map((product) => (
            <article className="inventoryCard" key={product._id}>
              <div className="productPreview">
                {product.imageUrl ? <img src={product.imageUrl} alt="" /> : <ImagePlus size={24} />}
              </div>
              <div className="inventoryMain">
                <div className="inventoryHead">
                  <div>
                    <span>{product.category?.name} · {product.supplier?.name || "Sin proveedor"}</span>
                    <h2>{product.name}</h2>
                  </div>
                  <div className="rowActions">
                    <button className="ghostIcon" onClick={() => startEditProduct(product)} aria-label="Editar producto">
                      <Pencil size={17} />
                    </button>
                    <button className="dangerIcon" onClick={() => confirmDeleteProduct(product)} aria-label="Eliminar producto">
                      <Trash2 size={17} />
                    </button>
                  </div>
                </div>
                <div className="stockGrid">
                  {product.variants.map((variant) => (
                    <div className="stockRow" key={variant.sku}>
                      <div>
                        <strong>{variant.label}</strong>
                        <span>{variant.sku} · Venta {money(variant.price)} · Costo {money(variant.cost)} · {product.pointsEarned || 0} pts</span>
                      </div>
                      <div className="stockControls">
                        <button onClick={() => onStock(product._id, variant.sku, -5)} aria-label="Quitar cinco">
                          <Minus size={14} />5
                        </button>
                        <button onClick={() => onStock(product._id, variant.sku, -1)} aria-label="Quitar uno">
                          <Minus size={14} />
                        </button>
                        <b className={variant.stock < 10 ? "lowStock" : ""}>{variant.stock}</b>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </article>
          ))}
          {filteredProducts.length === 0 && <div className="emptyState">No hay productos que coincidan con la búsqueda.</div>}
        </div>
        <PaginationControls {...productsPager} />
        </>
      )}
      <ConfirmDialog open={Boolean(confirm)} {...(confirm || {})} onCancel={() => setConfirm(null)} />
    </section>
  );
}
