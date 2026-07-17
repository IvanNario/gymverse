import { LegalDocument } from "../models/LegalDocument.js";

export const DEFAULT_LEGAL_DOCUMENTS = [
  {
    key: "terms",
    title: "Términos y condiciones",
    intro: "Reglas de uso de la tienda, compras, cuenta, entregas, promociones y recompensas.",
    sortOrder: 10,
    blocks: [
      {
        heading: "Uso de la plataforma",
        text: "GymVerse permite comprar productos fitness, consultar contenido, canjear recompensas y elegir retiro en gimnasios afiliados o entrega a domicilio cuando esté disponible. Al crear una cuenta o realizar una compra aceptas estos términos y cualquier aviso operativo mostrado antes de confirmar el pedido.",
      },
      {
        heading: "Cuenta y seguridad",
        text: "La persona usuaria es responsable de mantener la confidencialidad de su cuenta, contraseña y dispositivos. GymVerse puede suspender accesos cuando detecte uso indebido, fraude, abuso de promociones o actividad que comprometa la seguridad de la operación.",
      },
      {
        heading: "Precios, disponibilidad y promociones",
        text: "Los precios se muestran en pesos mexicanos. La disponibilidad depende del inventario real por variante. Las promociones, cupones y recompensas pueden tener vigencia, límites de uso, mínimo de compra o condiciones específicas.",
      },
    ],
  },
  {
    key: "privacy",
    title: "Aviso de privacidad",
    intro: "Tratamiento de datos personales, finalidades, seguridad, terceros y derechos ARCO.",
    sortOrder: 20,
    blocks: [
      {
        heading: "Responsable y contacto",
        text: "GymVerse es responsable del tratamiento de los datos personales recabados en la plataforma. Para solicitudes de privacidad o derechos ARCO puedes escribir a privacidad@gymverse.mx. Antes de producción, este correo y el domicilio legal deben validarse con la entidad operadora real.",
      },
      {
        heading: "Datos tratados",
        text: "Podemos tratar nombre, correo, teléfono, domicilio de entrega, historial de pedidos, puntos, favoritos, devoluciones, datos de sesión y registros de seguridad. Para proveedores, gimnasios afiliados y usuarios internos podemos tratar datos de contacto, operación, pagos de afiliación, accesos y bitácoras administrativas.",
      },
      {
        heading: "Pagos y tarjetas",
        text: "GymVerse no almacena números de tarjeta, CVV, vencimientos ni titulares de tarjetas. Los pagos en línea se procesan mediante Mercado Pago. GymVerse conserva referencias operativas necesarias para conciliación, soporte y cumplimiento.",
      },
    ],
  },
  {
    key: "returns",
    title: "Cambios, devoluciones y cancelaciones",
    intro: "Reglas claras para cancelar pedidos, solicitar devolución o recibir reembolso.",
    sortOrder: 30,
    blocks: [
      {
        heading: "Cancelación",
        text: "Puedes solicitar cancelación mientras el pedido esté pendiente de pago, pagado o en preparación. Cuando el pedido ya esté en tránsito, entregado, devuelto o cancelado, la operación se revisará conforme al estado logístico real.",
      },
      {
        heading: "Devoluciones aceptadas",
        text: "Se aceptan devoluciones por producto equivocado, daño visible, defecto de origen, faltante o discrepancia entre lo comprado y lo entregado. GymVerse puede pedir evidencia para validar la solicitud.",
      },
      {
        heading: "Productos fitness y suplementos",
        text: "Por seguridad e higiene, suplementos, alimentos, productos sellados o artículos de uso personal solo podrán devolverse si están sin abrir, con sello intacto, o si presentan defecto comprobable o error atribuible a GymVerse.",
      },
    ],
  },
  {
    key: "payments",
    title: "Pagos, facturación y afiliaciones",
    intro: "Condiciones para Mercado Pago, pago al recoger y membresías de gimnasios afiliados.",
    sortOrder: 40,
    blocks: [
      {
        heading: "Mercado Pago",
        text: "Los pagos en línea se procesan fuera de GymVerse mediante Mercado Pago. La aprobación, rechazo, devolución o contracargo puede depender de validaciones del proveedor financiero.",
      },
      {
        heading: "Gimnasios afiliados",
        text: "Los gimnasios afiliados pueden estar sujetos a una cuota mensual, estatus de pago y reglas operativas para retiro de pedidos. El incumplimiento de pago o uso indebido del acceso puede causar pausa o baja del afiliado.",
      },
      {
        heading: "Comprobantes y facturación",
        text: "Los comprobantes de pedido se generan dentro de la plataforma. La facturación fiscal, si aplica, deberá solicitarse por los canales de soporte y con los datos fiscales correctos dentro del plazo operativo comunicado.",
      },
    ],
  },
  {
    key: "ip",
    title: "Propiedad intelectual, marcas de agua y derechos reservados",
    intro: "Uso permitido de marca, contenido, imágenes, guías, diseños y materiales.",
    sortOrder: 50,
    blocks: [
      {
        heading: "Marca GymVerse",
        text: "GymVerse, su logotipo, nombre comercial, interfaces, textos, guías, reportes, imágenes, diseños, bases de datos, contenido fitness y materiales relacionados son propiedad de GymVerse o se usan con autorización.",
      },
      {
        heading: "Marcas de agua",
        text: "GymVerse puede incluir marcas de agua, metadatos, identificadores visuales o leyendas de derechos reservados en reportes, guías, imágenes, contenido fitness y documentos generados por la plataforma.",
      },
      {
        heading: "Derechos reservados",
        text: "Todos los derechos reservados. Ninguna parte de la plataforma debe entenderse como cesión de derechos de propiedad intelectual o industrial.",
      },
    ],
  },
  {
    key: "contact",
    title: "Aviso legal y contacto",
    intro: "Información general, soporte y alcance de estos documentos.",
    sortOrder: 60,
    blocks: [
      {
        heading: "Alcance",
        text: "Estos documentos son una base operativa para la plataforma GymVerse en México. Deben revisarse y completarse con razón social, domicilio fiscal, RFC, canales oficiales, datos de facturación y criterios internos finales antes de producción.",
      },
      {
        heading: "Soporte",
        text: "Para pedidos, devoluciones o soporte puedes escribir a soporte@gymverse.mx. Para privacidad, privacidad@gymverse.mx. Para temas legales o propiedad intelectual, legal@gymverse.mx. Estos correos deben sustituirse por los canales oficiales reales antes del lanzamiento público.",
      },
    ],
  },
];

export async function ensureDefaultLegalDocuments() {
  for (const document of DEFAULT_LEGAL_DOCUMENTS) {
    await LegalDocument.updateOne(
      { key: document.key },
      { $setOnInsert: { ...document, status: "published", versionLabel: "Base inicial" } },
      { upsert: true }
    );
  }
  return LegalDocument.find().sort({ sortOrder: 1, title: 1 });
}
