import { ArrowLeft, BadgeCheck, Copyright, FileText, RotateCcw, Scale, ShieldCheck } from "lucide-react";
import React, { useState } from "react";

const updatedAt = "12 de julio de 2026";

const legalSections = [
  {
    id: "terms",
    title: "Términos y condiciones",
    icon: FileText,
    intro: "Reglas de uso de la tienda, compras, cuenta, entregas, promociones y recompensas.",
    blocks: [
      {
        heading: "Uso de la plataforma",
        text: "GymVerse permite comprar productos fitness, consultar contenido, canjear recompensas y elegir retiro en gimnasios afiliados o entrega a domicilio cuando esté disponible. Al crear una cuenta o realizar una compra aceptas estos términos, las políticas de privacidad, pagos, devoluciones y cualquier aviso operativo mostrado antes de confirmar el pedido.",
      },
      {
        heading: "Cuenta y seguridad",
        text: "La persona usuaria es responsable de mantener la confidencialidad de su cuenta, contraseña y dispositivos. GymVerse puede suspender accesos cuando detecte uso indebido, fraude, intento de manipulación de precios, abuso de promociones o actividad que comprometa la seguridad de clientes, gimnasios, proveedores o la operación.",
      },
      {
        heading: "Precios, disponibilidad y promociones",
        text: "Los precios se muestran en pesos mexicanos e incluyen la información visible antes del pago. La disponibilidad depende del inventario real por variante. Las promociones, cupones y recompensas pueden tener vigencia, límite de uso, mínimo de compra o condiciones específicas. Si un precio, cupón o inventario presenta un error evidente, GymVerse podrá cancelar o corregir la operación antes de surtirla, informando a la persona usuaria.",
      },
      {
        heading: "Pedidos y entrega",
        text: "El pedido queda confirmado cuando el sistema genera un folio. En pago por Mercado Pago, el pedido puede quedar pendiente hasta recibir confirmación del proveedor de pago. En retiro, se solicitará el código de retiro para entregar el pedido. La persona usuaria debe verificar producto, talla, sabor, cantidad y estado del empaque al recibir.",
      },
    ],
  },
  {
    id: "privacy",
    title: "Aviso de privacidad",
    icon: ShieldCheck,
    intro: "Tratamiento de datos personales, finalidades, seguridad, terceros y derechos ARCO.",
    blocks: [
      {
        heading: "Responsable y contacto",
        text: "GymVerse es responsable del tratamiento de los datos personales recabados en la plataforma. Para solicitudes de privacidad o derechos ARCO puedes escribir a privacidad@gymverse.mx. Antes de producción, este correo y el domicilio legal del responsable deben validarse con la entidad operadora real.",
      },
      {
        heading: "Datos tratados",
        text: "Podemos tratar nombre, correo, teléfono, domicilio de entrega, historial de pedidos, puntos, favoritos, reseñas, devoluciones, gimnasios de retiro seleccionados, datos de sesión y registros de seguridad. Para proveedores, gimnasios afiliados y usuarios internos podemos tratar datos de contacto, operación, pagos de afiliación, accesos y bitácoras administrativas.",
      },
      {
        heading: "Finalidades",
        text: "Usamos los datos para crear cuentas, autenticar accesos, procesar pedidos, coordinar entregas o retiros, gestionar pagos por Mercado Pago, operar devoluciones, administrar recompensas, enviar avisos transaccionales, prevenir fraude, cumplir obligaciones legales, atender soporte y mantener seguridad operativa.",
      },
      {
        heading: "Pagos y tarjetas",
        text: "GymVerse no almacena números de tarjeta, CVV, vencimientos ni titulares de tarjetas. Los pagos en línea se procesan mediante Mercado Pago. GymVerse solo conserva referencias operativas del pedido y estado del pago necesarias para conciliación, soporte y cumplimiento.",
      },
      {
        heading: "Seguridad y conservación",
        text: "La plataforma aplica controles de acceso por rol, cifrado en reposo de campos sensibles, minimización de respuestas, bitácoras administrativas, bloqueo de payloads peligrosos y no-cache en respuestas de API. Los datos se conservan mientras exista relación con la persona usuaria o por los plazos necesarios para cumplir obligaciones legales, fiscales, operativas o de defensa de derechos.",
      },
      {
        heading: "Derechos ARCO",
        text: "Puedes solicitar acceso, rectificación, cancelación u oposición al tratamiento de tus datos. La solicitud debe incluir nombre, medio de contacto, descripción clara de lo solicitado y documentos que acrediten identidad o representación. GymVerse atenderá la solicitud conforme a los plazos y excepciones aplicables en la ley mexicana.",
      },
      {
        heading: "Transferencias y encargados",
        text: "Podemos compartir datos estrictamente necesarios con proveedores de pago, paquetería, gimnasios afiliados de retiro, servicios de hosting, soporte técnico, autoridades competentes y encargados que ayuden a operar la plataforma. No vendemos bases de datos personales.",
      },
    ],
  },
  {
    id: "returns",
    title: "Cambios, devoluciones y cancelaciones",
    icon: RotateCcw,
    intro: "Reglas claras para cancelar pedidos, solicitar devolución o recibir reembolso.",
    blocks: [
      {
        heading: "Cancelación",
        text: "Puedes solicitar cancelación mientras el pedido esté pendiente de pago, pagado o en preparación. Cuando el pedido ya esté en tránsito, entregado, devuelto o cancelado, la operación se revisará conforme a esta política y al estado logístico real.",
      },
      {
        heading: "Devoluciones aceptadas",
        text: "Se aceptan devoluciones por producto equivocado, daño visible, defecto de origen, faltante o discrepancia entre lo comprado y lo entregado. La solicitud debe realizarse desde el historial del pedido con una descripción clara del motivo. GymVerse puede pedir evidencia del empaque y producto para validar la solicitud.",
      },
      {
        heading: "Productos fitness y suplementos",
        text: "Por seguridad e higiene, suplementos, alimentos, productos sellados o artículos de uso personal solo podrán devolverse si están sin abrir, con sello intacto, o si presentan defecto comprobable o error atribuible a GymVerse. Ropa y accesorios deben devolverse sin uso, limpios, con empaque y etiquetas cuando aplique.",
      },
      {
        heading: "Reembolsos",
        text: "Cuando una devolución sea aprobada, el reembolso se realizará al método de pago original o al mecanismo que legal y operativamente corresponda. En pagos por Mercado Pago, la acreditación puede depender de los tiempos del proveedor financiero. Esta política no limita derechos irrenunciables de la persona consumidora.",
      },
    ],
  },
  {
    id: "payments",
    title: "Pagos, facturación y afiliaciones",
    icon: BadgeCheck,
    intro: "Condiciones para Mercado Pago, pago al recoger y membresías de gimnasios afiliados.",
    blocks: [
      {
        heading: "Mercado Pago",
        text: "Los pagos en línea se procesan fuera de GymVerse mediante Mercado Pago. La aprobación, rechazo, devolución o contracargo puede depender de validaciones del proveedor financiero. GymVerse sincroniza el estado del pago para preparar, entregar o cancelar pedidos según corresponda.",
      },
      {
        heading: "Pago al recoger",
        text: "Cuando esté disponible, el pago al recoger aplica únicamente para retiro en gimnasio. El gimnasio afiliado o punto autorizado podrá confirmar entrega mediante código de retiro y registrar el pago conforme a la operación definida por GymVerse.",
      },
      {
        heading: "Gimnasios afiliados",
        text: "Los gimnasios afiliados pueden estar sujetos a una cuota mensual, estatus de pago y reglas operativas para retiro de pedidos. El incumplimiento de pago, uso indebido del acceso o fallas de operación pueden causar pausa o baja del afiliado, sin afectar derechos de clientes sobre pedidos ya confirmados.",
      },
      {
        heading: "Comprobantes y facturación",
        text: "Los comprobantes de pedido se generan dentro de la plataforma. La facturación fiscal, si aplica, deberá solicitarse por los canales de soporte y con los datos fiscales correctos dentro del plazo operativo que GymVerse comunique.",
      },
    ],
  },
  {
    id: "ip",
    title: "Propiedad intelectual, marcas de agua y derechos reservados",
    icon: Copyright,
    intro: "Uso permitido de marca, contenido, imágenes, guías, diseños y materiales.",
    blocks: [
      {
        heading: "Marca GymVerse",
        text: "GymVerse, su logotipo, nombre comercial, interfaces, textos, guías, reportes, imágenes, iconografía, diseños, bases de datos, contenido fitness y materiales relacionados son propiedad de GymVerse o se usan con autorización. Queda prohibida su reproducción, venta, modificación o explotación sin permiso previo por escrito.",
      },
      {
        heading: "Marcas de agua",
        text: "GymVerse puede incluir marcas de agua, metadatos, identificadores visuales o leyendas de derechos reservados en reportes, guías, imágenes, contenido fitness y documentos generados por la plataforma. La eliminación u ocultamiento de estos elementos sin autorización está prohibida.",
      },
      {
        heading: "Contenido del usuario",
        text: "Las reseñas, comentarios o contenidos enviados por usuarios deben ser lícitos, veraces y no infringir derechos de terceros. Al publicarlos, autorizas a GymVerse a mostrarlos dentro de la plataforma para fines de operación, reputación de producto y mejora del servicio.",
      },
      {
        heading: "Derechos reservados",
        text: `© ${new Date().getFullYear()} GymVerse. Todos los derechos reservados. Ninguna parte de la plataforma debe entenderse como cesión de derechos de propiedad intelectual o industrial.`,
      },
    ],
  },
  {
    id: "legal",
    title: "Aviso legal y contacto",
    icon: Scale,
    intro: "Información general, soporte y alcance de estos documentos.",
    blocks: [
      {
        heading: "Alcance",
        text: "Estos documentos son una base operativa para la plataforma GymVerse en México. Deben revisarse y completarse con razón social, domicilio fiscal, RFC, canales oficiales, datos de facturación y criterios internos finales antes de liberarse a producción.",
      },
      {
        heading: "Soporte",
        text: "Para pedidos, devoluciones o soporte puedes escribir a soporte@gymverse.mx. Para privacidad, privacidad@gymverse.mx. Para temas legales o propiedad intelectual, legal@gymverse.mx. Estos correos deben sustituirse por los canales oficiales reales antes del lanzamiento público.",
      },
      {
        heading: "Cambios",
        text: "GymVerse puede actualizar estos términos y políticas para reflejar cambios legales, técnicos u operativos. La versión vigente se mostrará en esta sección y aplicará desde su publicación, salvo que la ley requiera consentimiento adicional.",
      },
    ],
  },
];

const iconByKey = {
  terms: FileText,
  privacy: ShieldCheck,
  returns: RotateCcw,
  payments: BadgeCheck,
  ip: Copyright,
  contact: Scale,
};

function normalizeDocuments(documents = []) {
  if (!documents.length) return legalSections;
  return documents.map((document) => ({
    id: document.key || document._id,
    title: document.title,
    icon: iconByKey[document.key] || FileText,
    intro: document.intro,
    blocks: document.blocks || [],
    versionLabel: document.versionLabel,
    updatedAt: document.updatedAt,
  }));
}

export function LegalPage({ documents = [], onBack }) {
  const sections = normalizeDocuments(documents);
  const [active, setActive] = useState(sections[0].id);
  const section = sections.find((item) => item.id === active) || sections[0];
  const Icon = section.icon;
  const versionLabel = section.versionLabel || (section.updatedAt ? new Date(section.updatedAt).toLocaleDateString("es-MX") : updatedAt);

  return (
    <section className="screen legalScreen">
      <div className="detailTop">
        <button className="iconTextButton" onClick={onBack}>
          <ArrowLeft size={18} />
          Volver
        </button>
      </div>

      <header className="legalHero">
        <div>
          <span>Documentos legales</span>
          <h1>Transparencia y derechos</h1>
          <p>Consulta los términos, privacidad, devoluciones, pagos, propiedad intelectual y avisos de GymVerse.</p>
        </div>
          <strong>Actualizado: {versionLabel}</strong>
      </header>

      <div className="legalLayout">
        <nav className="legalTabs" aria-label="Secciones legales">
          {sections.map((item) => {
            const TabIcon = item.icon;
            return (
              <button key={item.id} className={active === item.id ? "active" : ""} onClick={() => setActive(item.id)} type="button">
                <TabIcon size={16} />
                <span>{item.title}</span>
              </button>
            );
          })}
        </nav>

        <article className="legalDocument">
          <div className="legalWatermark">GymVerse</div>
          <div className="legalDocumentHead">
            <Icon size={22} />
            <div>
              <span>GymVerse Legal</span>
              <h2>{section.title}</h2>
              <p>{section.intro}</p>
            </div>
          </div>
          {section.blocks.map((block) => (
            <section className="legalBlock" key={block.heading}>
              <h3>{block.heading}</h3>
              <p>{block.text}</p>
            </section>
          ))}
          <footer className="legalFooter">
            <span>© {new Date().getFullYear()} GymVerse. Todos los derechos reservados.</span>
            <span>Versión legal: {versionLabel}</span>
          </footer>
        </article>
      </div>
    </section>
  );
}
