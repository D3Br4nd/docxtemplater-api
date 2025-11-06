# Servizio API Docxtemplater

Questo progetto fornisce un semplice servizio API per compilare documenti `.docx` utilizzando la libreria open-source `docxtemplater`.

L'API accetta un file template `.docx` e un payload di dati JSON, e restituisce il documento compilato.

## Struttura del Progetto

```
docxtemplater-api/
├── .dockerignore
├── .gitignore
├── Dockerfile
├── package.json
├── README.md
└── server.js
```

## Prerequisiti

- [Docker](https://www.docker.com/)
- [Node.js](https://nodejs.org/) (per lo sviluppo locale)

## Build e Run con Docker

1.  **Costruisci l'immagine Docker:**

    ```bash
    docker build -t docxtemplater-api-service .
    ```

2.  **Avvia il container:**

    ```bash
    docker run -p 8080:8080 docxtemplater-api-service
    ```

Il servizio sarà in ascolto sulla porta `8080`.

## Build e Run con Docker Compose

Il file `docker-compose.yml` è configurato per avviare il servizio e connetterlo a una rete esterna (es. `debrand_network` per un proxy manager) senza esporre porte pubblicamente.

1.  **Assicurati che la rete esterna esista:**

    ```bash
    docker network create debrand_network
    ```

2.  **Avvia il servizio:**

    ```bash
    docker-compose up -d
    ```

## Sviluppo Locale

1.  **Installa le dipendenze:**

    ```bash
    npm install
    ```

2.  **Avvia il server:**

    ```bash
    npm start
    ```

Il servizio sarà in ascolto sulla porta `8080`.

## Utilizzo dell'API

Invia una richiesta `POST` all'endpoint `/generate/docx` con un body `multipart/form-data`.

### Campi Richiesti

-   `template`: Il file template `.docx`.
-   `data`: Una stringa contenente i dati in formato JSON.

### Esempio con `curl`

```bash
curl -X POST \
  http://localhost:8080/generate/docx \
  -F "template=@/percorso/del/tuo/template.docx" \
  -F "data={\"nome\":\"Mario\",\"cognome\":\"Rossi\"}" \
  --output generated.docx
```

### Gestione delle Checkbox

Il server include una logica per trasformare valori booleani in checkbox selezionate o deselezionate nel documento Word.

Se il tuo JSON contiene una proprietà come `"conferma_riga_1": true`, il server la mapperà a un tag `{@chk_riga_1}` nel template, inserendo l'XML corretto per una checkbox selezionata.

**Template `.docx`:**

`Confermo: {@chk_riga_1}`

**JSON `data`:**

`{
  "conferma_riga_1": true
}`

Questo meccanismo richiede che nel template si usi il tag `@` per indicare l'inserimento di XML grezzo (raw XML).
