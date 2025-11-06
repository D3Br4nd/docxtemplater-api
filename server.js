const express = require('express');
const fileUpload = require('express-fileupload');
const PizZip = require('pizzip');
const Docxtemplater = require('docxtemplater');

// Definizioni OpenXML per le Checkbox (come da Sezione 2)
const CHECKBOX_CHECKED_XML = '<w:sdt><w:sdtPr><w:id w:val="-733150215"/><w14:checkbox><w14:checked w14:val="1"/><w14:checkedState w14:val="2612" w14:font="MS Gothic"/><w14:uncheckedState w14:val="2610" w14:font="MS Gothic"/></w14:checkbox></w:sdtPr><w:sdtContent><w:r><w:rPr><w:rFonts w:ascii="MS Gothic" w:eastAsia="MS Gothic" w:hAnsi="MS Gothic" w:hint="eastAsia"/></w:rPr><w:t>☒</w:t></w:r></w:sdtContent></w:sdt>';
const CHECKBOX_UNCHECKED_XML = '<w:sdt><w:sdtPr><w:id w:val="-990252438"/><w14:checkbox><w14:checked w14:val="0"/><w14:checkedState w14:val="2612" w14:font="MS Gothic"/><w14:uncheckedState w14:val="2610" w14:font="MS Gothic"/></w14:checkbox></w:sdtPr><w:sdtContent><w:r><w:rPr><w:rFonts w:ascii="MS Gothic" w:eastAsia="MS Gothic" w:hAnsi="MS Gothic" w:hint="eastAsia"/></w:rPr><w:t>☐</w:t></w:r></w:sdtContent></w:sdt>';

const app = express();
const PORT = 8080;

// Abilita il middleware per l'upload di file
app.use(fileUpload());

/**
 * Endpoint API per la generazione di DOCX.
 * Si aspetta un body 'multipart/form-data' con due campi:
 * 1. 'template': Il file template.docx
 * 2. 'data': Una stringa JSON con i dati di rendering
 */
app.post('/generate/docx', (req, res) => {
    
    if (!req.files ||!req.files.template ||!req.body.data) {
        return res.status(400).send("Richiesta non valida. 'template' (file) e 'data' (JSON string) sono richiesti.");
    }

    try {
        const templateBuffer = req.files.template.data;
        const inputData = JSON.parse(req.body.data);

        // --- Logica di Trasformazione Dati ---
        // Clona l'oggetto dati per evitare side-effect
        const transformedData = {...inputData };
        
        // Trasforma i booleani in XML per le checkbox
        // Esempio: Se il JSON ha "conferma_riga_1: true", mappa a "chk_riga_1: <XML...>"
        if (transformedData.hasOwnProperty('conferma_riga_1')) {
            transformedData.chk_riga_1 = transformedData.conferma_riga_1 
               ? CHECKBOX_CHECKED_XML 
                : CHECKBOX_UNCHECKED_XML;
            // Opzionale: rimuovi il booleano originale
            // delete transformedData.conferma_riga_1;
        }
        //... (Aggiungere altre logiche di trasformazione se necessario)
        // --- Fine Trasformazione ---

        // Carica il template.docx dal buffer [14, 15]
        const zip = new PizZip(templateBuffer);

        const doc = new Docxtemplater(zip, {
            paragraphLoop: true,
            linebreaks: true,
            // Importante: specificare il tag per l'XML grezzo
            parser: (tag) => {
                if (tag.startsWith('@')) {
                    return { type: "raw", value: tag.slice(1) };
                }
                return { type: "placeholder", value: tag };
            }
        });

        // Esegui il rendering del documento con i dati trasformati [16]
        doc.render(transformedData);

        // Genera il file.docx renderizzato come buffer [1, 16]
        const outputBuffer = doc.getZip().generate({
            type: "nodebuffer",
            compression: "DEFLATE",
        });

        // Invia il file.docx generato come risposta
        res.set('Content-Type', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document');
        res.set('Content-Disposition', 'attachment; filename="generated.docx"');
        res.send(outputBuffer); // [17]

    } catch (error) {
        console.error(error);
        res.status(500).send(`Errore durante la generazione del documento: ${error.message}`);
    }
});

app.listen(PORT, () => {
    console.log(`Servizio API Docxtemplater in ascolto sulla porta ${PORT}`);
});