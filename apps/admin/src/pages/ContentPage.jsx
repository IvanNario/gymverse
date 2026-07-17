import React, { useMemo, useState } from "react";
import { ArchiveRestore, FileText, Pencil, Plus, Save, Search, Trash2, X } from "lucide-react";
import { ConfirmDialog } from "../components/ConfirmDialog.jsx";
import { PaginationControls, usePagedItems } from "../components/PaginationControls.jsx";

const emptyPost = {
  title: "",
  slug: "",
  summary: "",
  body: "",
  type: "training",
  level: "beginner",
  readMinutes: 4,
  tags: [],
  imageUrl: "",
  featured: false,
  status: "draft",
  relatedProducts: [],
};

const typeLabels = {
  training: "Entrenamiento",
  nutrition: "Nutrición",
  recovery: "Recuperación",
  lifestyle: "Hábitos",
};

const levelLabels = {
  beginner: "Inicial",
  intermediate: "Intermedio",
  advanced: "Avanzado",
};

function tagsToText(tags = []) {
  return Array.isArray(tags) ? tags.join(", ") : String(tags || "");
}

function normalizeForm(post) {
  return {
    ...emptyPost,
    ...post,
    tags: tagsToText(post.tags),
    relatedProducts: (post.relatedProducts || []).map((product) => product._id || product),
  };
}

export function ContentPage({ posts = [], archivedPosts = [], products = [], onSave, onDelete, onRestore }) {
  const [tab, setTab] = useState("list");
  const [query, setQuery] = useState("");
  const [form, setForm] = useState(emptyPost);
  const [confirm, setConfirm] = useState(null);

  const filtered = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    if (!normalized) return posts;
    return posts.filter((post) =>
      [post.title, post.summary, post.type, post.level, ...(post.tags || [])]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(normalized))
    );
  }, [posts, query]);
  const postsPager = usePagedItems(filtered);
  const archivedPager = usePagedItems(archivedPosts);
  const relatedProductsPager = usePagedItems(products);

  function startNew() {
    setForm(emptyPost);
    setTab("form");
  }

  function startEdit(post) {
    setForm(normalizeForm(post));
    setTab("form");
  }

  function toggleRelated(productId) {
    const current = form.relatedProducts || [];
    setForm({
      ...form,
      relatedProducts: current.includes(productId) ? current.filter((id) => id !== productId) : [...current, productId],
    });
  }

  async function submit(event) {
    event.preventDefault();
    await onSave({
      ...form,
      tags: String(form.tags || "")
        .split(",")
        .map((tag) => tag.trim())
        .filter(Boolean),
    });
    setForm(emptyPost);
    setTab("list");
  }

  function confirmArchive(post) {
    setConfirm({
      title: "Archivar guía",
      message: `La guía "${post.title}" saldrá del listado principal, pero quedará guardada en la pestaña Archivadas.`,
      confirmLabel: "Archivar",
      onConfirm: async () => {
        await onDelete(post._id);
        setConfirm(null);
      },
    });
  }

  function confirmRestore(post) {
    setConfirm({
      title: "Restaurar guía",
      message: `La guía "${post.title}" volverá al gestor como borrador para que puedas revisarla antes de publicarla.`,
      confirmLabel: "Restaurar",
      danger: false,
      onConfirm: async () => {
        await onRestore(post._id);
        setConfirm(null);
      },
    });
  }

  return (
    <section className="page">
      <div className="pageHeader">
        <div>
          <span>Contenido fitness</span>
          <h1>Guías y consejos</h1>
        </div>
      </div>

      <div className="pageTabs" role="tablist" aria-label="Contenido fitness">
        <button className={tab === "list" ? "active" : ""} onClick={() => setTab("list")} type="button">
          {tab === "form" ? "Volver a guías" : "Guías"}
        </button>
        <button className={tab === "archived" ? "active" : ""} onClick={() => setTab("archived")} type="button">
          Archivadas
        </button>
        <button className="primaryButton compact" onClick={startNew} type="button">
          <Plus size={17} />
          Nueva guía
        </button>
      </div>

      {tab === "form" ? (
        <form className="editorPanel contentEditor" onSubmit={submit}>
          <div className="editorTitle">
            <div>
              <span>{form._id ? "Editando" : "Nuevo contenido"}</span>
              <h2>{form._id ? form.title : "Crear guía fitness"}</h2>
            </div>
            <button type="button" className="ghostIcon" onClick={() => setTab("list")} aria-label="Cerrar">
              <X size={18} />
            </button>
          </div>
          <div className="formGrid">
            <label>
              <span>Título</span>
              <input value={form.title} onChange={(event) => setForm({ ...form, title: event.target.value })} required />
            </label>
            <label>
              <span>Slug</span>
              <input value={form.slug || ""} onChange={(event) => setForm({ ...form, slug: event.target.value })} placeholder="rutina-fuerza-3-dias" />
            </label>
            <label>
              <span>Tipo</span>
              <select value={form.type} onChange={(event) => setForm({ ...form, type: event.target.value })}>
                <option value="training">Entrenamiento</option>
                <option value="nutrition">Nutrición</option>
                <option value="recovery">Recuperación</option>
                <option value="lifestyle">Hábitos</option>
              </select>
            </label>
            <label>
              <span>Nivel</span>
              <select value={form.level} onChange={(event) => setForm({ ...form, level: event.target.value })}>
                <option value="beginner">Inicial</option>
                <option value="intermediate">Intermedio</option>
                <option value="advanced">Avanzado</option>
              </select>
            </label>
            <label>
              <span>Lectura min.</span>
              <input type="number" min="1" value={form.readMinutes} onChange={(event) => setForm({ ...form, readMinutes: event.target.value })} />
            </label>
            <label>
              <span>Estado</span>
              <select value={form.status} onChange={(event) => setForm({ ...form, status: event.target.value })}>
                <option value="draft">Borrador</option>
                <option value="published">Publicado</option>
              </select>
            </label>
            <label>
              <span>Tags</span>
              <input value={form.tags || ""} onChange={(event) => setForm({ ...form, tags: event.target.value })} placeholder="fuerza, proteína, principiante" />
            </label>
            <label>
              <span>Imagen URL</span>
              <input value={form.imageUrl || ""} onChange={(event) => setForm({ ...form, imageUrl: event.target.value })} />
            </label>
          </div>
          <label className="checkRow">
            <input type="checkbox" checked={form.featured} onChange={(event) => setForm({ ...form, featured: event.target.checked })} />
            <span>Destacar esta guía</span>
          </label>
          <label>
            <span>Resumen</span>
            <textarea value={form.summary} onChange={(event) => setForm({ ...form, summary: event.target.value })} required />
          </label>
          <label>
            <span>Contenido</span>
            <textarea className="contentBodyInput" value={form.body} onChange={(event) => setForm({ ...form, body: event.target.value })} required />
          </label>

          <section className="relatedProductPicker">
            <div className="editorTitle small">
              <h3>Productos relacionados</h3>
              <span>{form.relatedProducts?.length || 0} seleccionado(s)</span>
            </div>
            <div className="relatedProductGrid">
              {relatedProductsPager.pagedItems.map((product) => (
                <label className="checkRow relatedProductOption" key={product._id}>
                  <input
                    type="checkbox"
                    checked={(form.relatedProducts || []).includes(product._id)}
                    onChange={() => toggleRelated(product._id)}
                  />
                  <span>{product.name}</span>
                </label>
              ))}
            </div>
            <PaginationControls {...relatedProductsPager} />
          </section>

          <button className="primaryButton">
            <Save size={18} />
            Guardar guía
          </button>
        </form>
      ) : tab === "archived" ? (
        <>
          <div className="resultMeta">Aquí se archivan las guías y consejos que salen del contenido activo.</div>
          <div className="promoGrid">
            {archivedPosts.length === 0 && <div className="emptyState">No hay guías o consejos archivados.</div>}
            {archivedPager.pagedItems.map((post) => (
              <article className="promoCard" key={post._id}>
                <div className="promoCardTop">
                  <span className="pill mutedPill">Archivada</span>
                  <FileText size={18} />
                </div>
                <h2>{post.title}</h2>
                <p>{post.summary}</p>
                <div className="promoStats">
                  <div><span>Tipo</span><strong>{typeLabels[post.type]}</strong></div>
                  <div><span>Nivel</span><strong>{levelLabels[post.level]}</strong></div>
                  <div><span>Lectura</span><strong>{post.readMinutes} min</strong></div>
                  <div><span>Productos</span><strong>{post.relatedProducts?.length || 0}</strong></div>
                </div>
                <div className="entityActions">
                  <button className="ghostButton" onClick={() => confirmRestore(post)}><ArchiveRestore size={16} />Restaurar</button>
                </div>
              </article>
            ))}
          </div>
          <PaginationControls {...archivedPager} />
        </>
      ) : (
        <>
          <label className="searchField">
            <Search size={17} />
            <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Buscar por título, tipo, nivel o tag" />
          </label>
          <div className="promoGrid">
            {filtered.length === 0 && <div className="emptyState">No hay guías para mostrar.</div>}
            {postsPager.pagedItems.map((post) => (
              <article className="promoCard" key={post._id}>
                <div className="promoCardTop">
                  <span className={`pill ${post.status === "published" ? "" : "mutedPill"}`}>{post.status === "published" ? "Publicada" : "Borrador"}</span>
                  <FileText size={18} />
                </div>
                <h2>{post.title}</h2>
                <p>{post.summary}</p>
                <div className="promoStats">
                  <div><span>Tipo</span><strong>{typeLabels[post.type]}</strong></div>
                  <div><span>Nivel</span><strong>{levelLabels[post.level]}</strong></div>
                  <div><span>Lectura</span><strong>{post.readMinutes} min</strong></div>
                  <div><span>Productos</span><strong>{post.relatedProducts?.length || 0}</strong></div>
                </div>
                <div className="entityActions">
                  <button className="ghostButton" onClick={() => startEdit(post)}><Pencil size={16} />Editar</button>
                  <button className="dangerButtonInline" onClick={() => confirmArchive(post)}><Trash2 size={16} />Archivar</button>
                </div>
              </article>
            ))}
          </div>
          <PaginationControls {...postsPager} />
        </>
      )}
      <ConfirmDialog open={Boolean(confirm)} {...(confirm || {})} onCancel={() => setConfirm(null)} />
    </section>
  );
}
