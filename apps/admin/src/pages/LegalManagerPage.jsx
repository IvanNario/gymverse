import React, { useEffect, useState } from "react";
import { FileText, Plus, Save } from "lucide-react";
import { PaginationControls, usePagedItems } from "../components/PaginationControls.jsx";

function normalize(document) {
  return {
    ...document,
    blocks: document.blocks?.length ? document.blocks : [{ heading: "", text: "" }],
  };
}

export function LegalManagerPage({ documents = [], onSave }) {
  const [selectedId, setSelectedId] = useState(documents[0]?._id || "");
  const selected = documents.find((document) => document._id === selectedId) || documents[0];
  const [form, setForm] = useState(selected ? normalize(selected) : null);
  const documentsPager = usePagedItems(documents);

  useEffect(() => {
    if (!form && selected) setForm(normalize(selected));
    if (!selectedId && documents[0]?._id) setSelectedId(documents[0]._id);
  }, [documents, form, selected, selectedId]);

  function select(document) {
    setSelectedId(document._id);
    setForm(normalize(document));
  }

  function updateBlock(index, patch) {
    setForm({
      ...form,
      blocks: form.blocks.map((block, current) => (current === index ? { ...block, ...patch } : block)),
    });
  }

  async function submit(event) {
    event.preventDefault();
    await onSave(form);
  }

  return (
    <section className="page">
      <div className="pageHeader">
        <div>
          <span>Legal</span>
          <h1>Gestión legal editable</h1>
        </div>
      </div>

      <div className="legalAdminLayout">
        <aside className="panel legalDocList">
          {documentsPager.pagedItems.map((document) => (
            <button className={form?._id === document._id ? "active" : ""} key={document._id} onClick={() => select(document)}>
              <FileText size={16} />
              <span>{document.title}</span>
              <small>{document.status === "published" ? "Publicado" : "Borrador"}</small>
            </button>
          ))}
          <PaginationControls {...documentsPager} />
        </aside>

        {form && (
          <form className="editorPanel legalEditor" onSubmit={submit}>
            <div className="formGrid">
              <label>
                <span>Título</span>
                <input value={form.title} onChange={(event) => setForm({ ...form, title: event.target.value })} required />
              </label>
              <label>
                <span>Versión</span>
                <input value={form.versionLabel || ""} onChange={(event) => setForm({ ...form, versionLabel: event.target.value })} />
              </label>
              <label>
                <span>Estado</span>
                <select value={form.status} onChange={(event) => setForm({ ...form, status: event.target.value })}>
                  <option value="published">Publicado</option>
                  <option value="draft">Borrador</option>
                </select>
              </label>
              <label>
                <span>Orden</span>
                <input type="number" value={form.sortOrder || 0} onChange={(event) => setForm({ ...form, sortOrder: event.target.value })} />
              </label>
            </div>
            <label>
              <span>Introducción</span>
              <textarea value={form.intro} onChange={(event) => setForm({ ...form, intro: event.target.value })} required />
            </label>

            <div className="legalBlockEditor">
              {form.blocks.map((block, index) => (
                <article className="panel" key={`${form.key}-${index}`}>
                  <label>
                    <span>Encabezado</span>
                    <input value={block.heading} onChange={(event) => updateBlock(index, { heading: event.target.value })} required />
                  </label>
                  <label>
                    <span>Texto</span>
                    <textarea value={block.text} onChange={(event) => updateBlock(index, { text: event.target.value })} required />
                  </label>
                </article>
              ))}
            </div>
            <div className="entityActions">
              <button type="button" className="ghostButton" onClick={() => setForm({ ...form, blocks: [...form.blocks, { heading: "", text: "" }] })}>
                <Plus size={16} />
                Bloque
              </button>
              <button className="primaryButton">
                <Save size={18} />
                Guardar documento
              </button>
            </div>
          </form>
        )}
      </div>
    </section>
  );
}
