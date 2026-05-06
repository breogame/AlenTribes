# 🎲 AlenTribes - Roleplay Stream Board

AlenTribes es una plataforma de tablero virtual diseñada para partidas de rol en streaming. Permite la gestión de cartas, tiradas de dados en tiempo real y sincronización de estado entre el GM (Game Master) y los jugadores mediante WebSockets.


## 🏗️ Arquitectura del Proyecto

El proyecto está dividido en dos partes principales:

* **Backend:** FastAPI (Python) desplegado en **Google Cloud Run** (Región: `europe-southwest1`).
* **Frontend:** React (Create React App/Craco) desplegado en **Firebase Hosting**.


## 🚀 Despliegue del Backend (Cloud Run)

El servidor gestiona el estado en memoria y las conexiones WebSocket.

### Requisitos
- Google Cloud SDK instalado y configurado.
- Docker (si se construye localmente) o uso de Cloud Build.

### Comandos de Despliegue
Desde la carpeta `/backend`:

```bash
gcloud run deploy alentribes-api \
    --source . \
    --region europe-southwest1 \
    --platform managed \
    --allow-unauthenticated \
    --max-instances 1 \
    --memory 512Mi \
    --cpu 1 \
    --timeout 3600 \
    --port 8080 \
    --set-env-vars CORS_ORIGINS="[https://alentribes-65306.web.app](https://alentribes-65306.web.app),[https://alentribes-65306.firebaseapp.com](https://alentribes-65306.firebaseapp.com)"
````


## 💻 Despliegue del Frontend (Firebase Hosting)

Aplicación React optimizada para producción.

### Requisitos

- Node.js y npm.
    
- Firebase CLI (`npm install -g firebase-tools`).
    

### Pasos para actualizar la web

1. Entrar en la carpeta `/frontend`.
    
2. Generar el build de producción:
    
    Bash
    
    ```
    npm run build
    ```
    
3. Desplegar en Firebase:
    
    Bash
    
    ```
    firebase deploy --only hosting
    ```
    

> **Nota:** La carpeta de salida configurada en `firebase.json` es `build`.

---

## 🛠️ Tecnologías utilizadas

- **Frontend:** React, Craco, Tailwind CSS (si aplica), Firebase SDK.
    
- **Backend:** Python 3.11, FastAPI, Uvicorn (WebSockets), Starlette.
    
- **Infraestructura:** Google Cloud Platform & Firebase.
    

---

## ⚙️ Configuración de Variables de Entorno

### Backend (.env)

- `CORS_ORIGINS`: Lista de URLs permitidas separadas por comas.
    
- `ROOM_TTL_SECONDS`: Tiempo de vida de las salas inactivas.
    

### Frontend

Asegúrate de que el cliente apunte a la URL correcta del backend:

- API REST: `https://alentribes-api-972555331636.europe-southwest1.run.app/api`
    
- WebSocket: `wss://alentribes-api-972555331636.europe-southwest1.run.app/api/ws`


📝 Licencia
Este proyecto es una creación de BreoGame Studio bajo licencia Creative Commons (CC BY) con todos los permisos habilitados.
