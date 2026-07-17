import React, { useMemo, useState } from "react";
import { ArrowLeft, BookOpen, Clock3, Dumbbell, Leaf, Moon, Sparkles } from "lucide-react";
import { PaginationControls, usePagedItems } from "../components/PaginationControls.jsx";
import { money } from "../services/api.js";

const typeLabels = {
  all: "Todo",
  training: "Entreno",
  nutrition: "Nutrición",
  recovery: "Recuperación",
  lifestyle: "Hábitos",
};

const levelLabels = {
  beginner: "Inicial",
  intermediate: "Intermedio",
  advanced: "Avanzado",
};

const typeIcons = {
  training: Dumbbell,
  nutrition: Leaf,
  recovery: Moon,
  lifestyle: Sparkles,
};

function postParagraphs(body = "") {
  return String(body)
    .split(/\n+/)
    .map((line) => line.trim())
    .filter(Boolean);
}

export function ContentPage({ posts = [], onOpenProduct }) {
  const [type, setType] = useState("all");
  const [selectedPost, setSelectedPost] = useState(null);

  const filtered = useMemo(() => (type === "all" ? posts : posts.filter((post) => post.type === type)), [posts, type]);
  const postsPager = usePagedItems(filtered);
  const relatedProductsPager = usePagedItems(selectedPost?.relatedProducts || []);

  if (selectedPost) {
    const Icon = typeIcons[selectedPost.type] || BookOpen;
    return (
      <section className="screen contentScreen">
        <div className="sectionTop">
          <div>
            <span>{typeLabels[selectedPost.type]}</span>
            <h1>{selectedPost.title}</h1>
          </div>
          <button className="ghostRound" onClick={() => setSelectedPost(null)} aria-label="Volver">
            <ArrowLeft size={18} />
          </button>
        </div>

        <article className="contentReader">
          <div className="contentReaderHero">
            <Icon size={24} />
            <span>{levelLabels[selectedPost.level]} · {selectedPost.readMinutes} min</span>
            <p>{selectedPost.summary}</p>
          </div>
          <div className="contentBody">
            {postParagraphs(selectedPost.body).map((paragraph, index) => (
              <p key={`${selectedPost._id}-${index}`}>{paragraph}</p>
            ))}
          </div>
        </article>

        {selectedPost.relatedProducts?.length > 0 && (
          <section className="contentRelated">
            <div className="sectionTop compact">
              <div>
                <span>Para esta guía</span>
                <h1>Productos relacionados</h1>
              </div>
            </div>
            <div className="contentProductList">
              {relatedProductsPager.pagedItems.map((product) => (
                <button className="contentProduct" key={product._id} onClick={() => onOpenProduct(product)}>
                  {product.imageUrl && <img src={product.imageUrl} alt="" />}
                  <div>
                    <strong>{product.name}</strong>
                    <span>{money(product.variants?.[0]?.price || 0)}</span>
                  </div>
                </button>
              ))}
            </div>
            <PaginationControls {...relatedProductsPager} />
          </section>
        )}
      </section>
    );
  }

  return (
    <section className="screen contentScreen">
      <header className="appHeader">
        <div>
          <span>Contenido fitness</span>
          <h1>Guías GymVerse</h1>
        </div>
        <BookOpen size={28} />
      </header>

      <div className="heroCard contentHero">
        <div>
          <span>Aprende y aplica</span>
          <h2>Entrena mejor, compra con más intención</h2>
          <p>Rutinas, nutrición y recuperación conectadas con tu experiencia en GymVerse.</p>
        </div>
      </div>

      <div className="chips">
        {Object.entries(typeLabels).map(([key, label]) => (
          <button className={type === key ? "active" : ""} key={key} onClick={() => setType(key)}>
            {label}
          </button>
        ))}
      </div>

      <div className="contentGrid">
        {filtered.length === 0 && <div className="emptyCard productGridEmpty">Aún no hay guías publicadas.</div>}
        {postsPager.pagedItems.map((post) => {
          const Icon = typeIcons[post.type] || BookOpen;
          return (
            <button className="contentCard" key={post._id} onClick={() => setSelectedPost(post)}>
              <div>
                <Icon size={18} />
                <span>{typeLabels[post.type]}</span>
              </div>
              <h2>{post.title}</h2>
              <p>{post.summary}</p>
              <small><Clock3 size={14} /> {levelLabels[post.level]} · {post.readMinutes} min</small>
            </button>
          );
        })}
      </div>
      <PaginationControls {...postsPager} />
    </section>
  );
}
