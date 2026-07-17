function cleanPdfText(value) {
  return String(value ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^\x20-\x7e]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function escapePdfText(value) {
  return cleanPdfText(value)
    .replace(/\\/g, "\\\\")
    .replace(/\(/g, "\\(")
    .replace(/\)/g, "\\)");
}

function text(value, x, y, size = 11, font = "F1", color = "0.06 0.07 0.09") {
  return ["BT", `/${font} ${size} Tf`, `${color} rg`, `${x} ${y} Td`, `(${escapePdfText(value)}) Tj`, "ET"].join("\n");
}

function box(x, y, width, height, fill = "1 1 1", stroke = "0.84 0.82 0.7") {
  return [`${fill} rg`, `${stroke} RG`, "1 w", `${x} ${y} ${width} ${height} re B`].join("\n");
}

function fillRect(x, y, width, height, fill) {
  return [`${fill} rg`, `${x} ${y} ${width} ${height} re f`].join("\n");
}

function splitLabel(line) {
  const index = line.indexOf(":");
  if (index < 0) return ["", line];
  return [line.slice(0, index), line.slice(index + 1).trim()];
}

function drawLabelLine(line, x, y, labelWidth = 92) {
  const [label, value] = splitLabel(line);
  if (!label) return text(value, x, y);
  return [
    text(`${label}:`, x, y, 10, "F2", "0.37 0.38 0.42"),
    text(value || "-", x + labelWidth, y, 10, "F1", "0.06 0.07 0.09"),
  ].join("\n");
}

function truncate(value, maxLength) {
  const cleaned = cleanPdfText(value);
  return cleaned.length > maxLength ? `${cleaned.slice(0, maxLength - 3)}...` : cleaned;
}

function extractSections(lines) {
  const productIndex = lines.findIndex((line) => cleanPdfText(line).toLowerCase() === "productos:");
  const firstProductBreak = lines.findIndex((line, index) => index > productIndex && cleanPdfText(line) === "");
  const productsEnd = firstProductBreak === -1 ? lines.length : firstProductBreak;

  return {
    title: lines[0] || "GymVerse - Guía de envío",
    details: lines.slice(1, productIndex).filter((line) => cleanPdfText(line)),
    products: lines.slice(productIndex + 1, productsEnd).filter((line) => cleanPdfText(line)),
    totals: lines.slice(productsEnd + 1).filter((line) => cleanPdfText(line) && !cleanPdfText(line).startsWith("Notas")),
    note: lines.find((line) => cleanPdfText(line).startsWith("Notas")) || "Notas: documento generado por GymVerse Admin.",
  };
}

function buildStyledContent(lines) {
  const { title, details, products, totals, note } = extractSections(lines);
  const orderLine = details.find((line) => cleanPdfText(line).startsWith("Pedido:")) || "";
  const detailLines = details.filter((line) => line !== orderLine);
  const [, orderNumber] = splitLabel(orderLine);
  const content = [
    fillRect(0, 0, 612, 792, "0.988 0.973 0.867"),
    fillRect(0, 674, 612, 118, "0.06 0.07 0.09"),
    fillRect(0, 674, 612, 8, "1 0.843 0"),
    fillRect(46, 712, 52, 52, "1 0.843 0"),
    text("GV", 61, 733, 16, "F2", "0.06 0.07 0.09"),
    text("GymVerse", 118, 746, 24, "F2", "1 1 1"),
    text(title.replace("GymVerse - ", ""), 118, 724, 13, "F1", "0.988 0.973 0.867"),
    text("Pedido", 432, 746, 10, "F2", "1 0.843 0"),
    text(orderNumber || "-", 432, 724, 15, "F2", "1 1 1"),

    box(36, 492, 540, 148),
    text("Datos de entrega", 58, 612, 14, "F2"),
    ...detailLines.slice(0, 6).map((line, index) => drawLabelLine(line, 58, 584 - index * 20, 106)),

    box(36, 226, 540, 232),
    text("Productos", 58, 430, 14, "F2"),
    ...products.slice(0, 8).map((line, index) => [
      fillRect(58, 404 - index * 22, 496, 1, "0.88 0.86 0.74"),
      text(truncate(line, 82), 58, 390 - index * 22, 10, "F1"),
    ].join("\n")),

    box(374, 74, 202, 118, "1 0.843 0", "0.78 0.63 0"),
    text("Resumen", 396, 164, 13, "F2", "0.06 0.07 0.09"),
    ...totals.slice(0, 3).map((line, index) => drawLabelLine(line, 396, 138 - index * 24, 72)),

    box(36, 74, 306, 118),
    text("Notas", 58, 164, 13, "F2"),
    text(truncate(splitLabel(note)[1] || note, 54), 58, 138, 10, "F1", "0.24 0.25 0.3"),
    text("Documento generado desde GymVerse Admin", 58, 112, 9, "F1", "0.5 0.5 0.54"),
  ];

  return content.join("\n");
}

function buildPdf(contentsByPage) {
  const objects = [];
  const pageCount = contentsByPage.length;
  const pageIds = contentsByPage.map((_, index) => 3 + index);
  const fontRegularId = 3 + pageCount;
  const fontBoldId = 4 + pageCount;
  const contentIds = contentsByPage.map((_, index) => 5 + pageCount + index);

  objects.push("<< /Type /Catalog /Pages 2 0 R >>");
  objects.push(`<< /Type /Pages /Kids [${pageIds.map((id) => `${id} 0 R`).join(" ")}] /Count ${pageCount} >>`);
  contentsByPage.forEach((_, index) => {
    objects.push(
      `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Resources << /Font << /F1 ${fontRegularId} 0 R /F2 ${fontBoldId} 0 R >> >> /Contents ${contentIds[index]} 0 R >>`
    );
  });
  objects.push("<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>");
  objects.push("<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold >>");
  contentsByPage.forEach((content) => {
    objects.push(`<< /Length ${Buffer.byteLength(content)} >>\nstream\n${content}\nendstream`);
  });

  let body = "%PDF-1.4\n";
  const offsets = [0];
  objects.forEach((object, index) => {
    offsets.push(Buffer.byteLength(body));
    body += `${index + 1} 0 obj\n${object}\nendobj\n`;
  });

  const xrefOffset = Buffer.byteLength(body);
  body += `xref\n0 ${objects.length + 1}\n`;
  body += "0000000000 65535 f \n";
  offsets.slice(1).forEach((offset) => {
    body += `${String(offset).padStart(10, "0")} 00000 n \n`;
  });
  body += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xrefOffset}\n%%EOF`;

  return Buffer.from(body, "utf8");
}

export function createSimplePdf(lines) {
  return buildPdf([buildStyledContent(lines)]);
}

export function createDocumentPdf({ title = "GymVerse", subtitle = "", sections = [] }) {
  const pages = [];
  let content = [];
  let y = 0;

  function finishPage() {
    content.push(text("Documento generado desde GymVerse Admin", 46, 34, 8, "F1", "0.47 0.48 0.5"));
    pages.push(content.join("\n"));
  }

  function startPage() {
    content = [
      fillRect(0, 0, 612, 792, "0.988 0.973 0.867"),
      fillRect(0, 690, 612, 102, "0.06 0.07 0.09"),
      fillRect(0, 690, 612, 8, "1 0.843 0"),
      fillRect(46, 724, 42, 42, "1 0.843 0"),
      text("GV", 58, 740, 13, "F2", "0.06 0.07 0.09"),
      text("GymVerse", 106, 752, 22, "F2", "1 1 1"),
      text(truncate(title, 62), 106, 728, 13, "F1", "0.988 0.973 0.867"),
      text(truncate(subtitle, 46), 410, 746, 9, "F1", "1 0.843 0"),
      text(new Date().toLocaleDateString("es-MX"), 410, 728, 10, "F2", "1 1 1"),
    ];
    y = 652;
  }

  function ensureSpace(height = 24) {
    if (y - height < 58) {
      finishPage();
      startPage();
    }
  }

  startPage();
  sections.forEach((section) => {
    const rows = section.rows || [];
    ensureSpace(48);
    content.push(text(section.heading || "Detalle", 46, y, 14, "F2"));
    y -= 18;
    if (!rows.length) {
      ensureSpace(24);
      content.push(text("Sin registros para mostrar.", 58, y, 10, "F1", "0.37 0.38 0.42"));
      y -= 24;
    }
    rows.forEach((row, index) => {
      ensureSpace(22);
      if (index % 2 === 0) content.push(fillRect(46, y - 7, 520, 18, "1 1 1"));
      content.push(text(truncate(row, 112), 58, y, 9, "F1", "0.06 0.07 0.09"));
      y -= 20;
    });
    y -= 8;
  });
  finishPage();

  return buildPdf(pages);
}
