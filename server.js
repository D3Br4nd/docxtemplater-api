// server.js
"use strict";

const express = require("express");
const fileUpload = require("express-fileupload");
const PizZip = require("pizzip");
const Docxtemplater = require("docxtemplater");

const app = express();
const PORT = process.env.PORT || 8080;

// Se stai dietro a un reverse proxy (nginx/traefik), abilita trust proxy
app.set("trust proxy", true);

// Solo multipart: niente bodyParser json/urlencoded qui
app.use(
  fileUpload({
    limits: { fileSize: 20 * 1024 * 1024 }, // 20MB
    abortOnLimit: true,
    useTempFiles: false,
    preserveExtension: true,
  })
);

// Health & root
app.get("/", (_req, res) => res.status(200).send("Docxtemplater API running"));
app.get("/health", (_req, res) => res.status(200).json({ ok: true }));

// Endpoint accetta /generate/docx e /generate/docx/
app.post(["/generate/docx", "/generate/docx/"], async (req, res) => {
  // Validazione minima
  if (!req.files || !req.files.template) {
    return res.status(400).send("Richiesta non valida: campo file 'template' mancante.");
  }
  if (!req.body || typeof req.body.data !== "string") {
    return res.status(400).send("Richiesta non valida: campo testo 'data' (JSON string) mancante.");
  }

  try {
    // 1) Leggi input
    const templateBuffer = req.files.template.data;

    let inputData;
    try {
      inputData = JSON.parse(req.body.data);
    } catch (e) {
      return res.status(400).send("Campo 'data' non è un JSON valido.");
    }

    // 2) Trasformazioni dati (opzionali ma sicure)
    // NB: niente raw XML: usa caratteri per checkbox se servono
    const transformedData = { ...inputData };
    // Esempio: booleano -> simbolo checkbox
    for (const k of Object.keys(transformedData)) {
      if (typeof transformedData[k] === "boolean") {
        transformedData[`${k}_checkbox`] = transformedData[k] ? "☒" : "☐";
      }
    }

    // 3) Carica template DOCX
    const zip = new PizZip(templateBuffer);

    // 4) Istanzia Docxtemplater senza parser custom
    const doc = new Docxtemplater(zip, {
      paragraphLoop: true,
      linebreaks: true,
      nullGetter: () => "",
      delimiters: { start: "[[", end: "]]" }
    });


    // 5) Render
    doc.render(transformedData);

    // 6) Genera buffer DOCX
    const outputBuffer = doc.getZip().generate({
      type: "nodebuffer",
      compression: "DEFLATE",
    });

    // 7) Header “anti-proxy-munge” e invio file
    res.set("Content-Type", "application/vnd.openxmlformats-officedocument.wordprocessingml.document");
    res.set("Content-Disposition", 'attachment; filename="generated.docx"');
    res.set("Content-Length", String(outputBuffer.length));
    // Evita trasformazioni (es. gzip) da parte di proxy/CDN
    res.set("Cache-Control", "no-transform");
    res.set("X-Content-Type-Options", "nosniff");

    return res.status(200).send(outputBuffer);
  } catch (error) {
    // Log esteso utile quando Docxtemplater lancia MultiError
    console.error("Docxtemplater error:", error);
    if (error.properties && error.properties.errors) {
      console.error("Detailed:", JSON.stringify(error.properties.errors, null, 2));
    }
    return res
      .status(500)
      .send(`Errore durante la generazione del documento: ${error.message || "Unknown error"}`);
  }
});

// 404 esplicito (evita HTML rumorosi)
app.use((_req, res) => res.status(404).send("Not found"));

app.listen(PORT, () => {
  console.log(`Docxtemplater API in ascolto sulla porta ${PORT}`);
});
