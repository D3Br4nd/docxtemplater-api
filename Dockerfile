# Usa un'immagine Node.js leggera e sicura
FROM node:18-alpine

# Imposta la directory di lavoro
WORKDIR /app

# Copia i file di definizione delle dipendenze
COPY package.json package-lock.json ./

# Installa solo le dipendenze di produzione
RUN npm install --omit=dev

# Copia il codice sorgente dell'applicazione
COPY . .

# Esponi la porta su cui l'API sarà in ascolto
EXPOSE 8080

# Comando per avviare il servizio
CMD ["node", "server.js"]
