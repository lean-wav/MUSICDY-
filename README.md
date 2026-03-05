# Mi App Musical

Una plataforma para compartir y descubrir música, beats y colaboraciones entre artistas.

## Estructura del Proyecto

```
mi_app_musical/
├── backend/
│   ├── app/
│   │   ├── models/      # Modelos de la base de datos
│   │   ├── routes/      # Rutas de la API
│   │   ├── services/    # Servicios y lógica de negocio
│   │   └── utils/       # Utilidades y helpers
│   ├── static/          # Archivos estáticos
│   ├── uploads/         # Archivos subidos por usuarios
│   ├── main.py         # Punto de entrada de la aplicación
│   └── requirements.txt # Dependencias del backend
├── frontend/           # Aplicación web React
└── mobile-app/        # Aplicación móvil React Native
```

## Características

- Compartir y descubrir música
- Sistema de beats con licencias
- Colaboraciones entre productores
- Sistema de likes y comentarios
- Perfiles de usuario
- Moderación de contenido
- Integración con blockchain para contratos
- Procesamiento de pagos con Stripe

## Requisitos

- Python 3.8+
- Node.js 14+
- SQLite (desarrollo) / PostgreSQL (producción)

## Instalación

### Backend

1. Crear un entorno virtual:
```bash
python -m venv venv
source venv/bin/activate  # Linux/Mac
venv\Scripts\activate     # Windows
```

2. Instalar dependencias:
```bash
cd backend
pip install -r requirements.txt
```

3. Iniciar el servidor:
```bash
python main.py
```

### Frontend

1. Instalar dependencias:
```bash
cd frontend
npm install
```

2. Iniciar el servidor de desarrollo:
```bash
npm start
```

## API Endpoints

### Autenticación
- POST /auth/register - Registro de usuario
- POST /auth/token - Login (obtener token)

### Contenido
- GET /publicaciones - Listar publicaciones
- POST /subir-audio - Subir nuevo contenido
- GET /feed - Feed personalizado
- POST /beats/comprar/{beat_id} - Comprar un beat

## Contribuir

1. Fork el repositorio
2. Crear una rama para tu feature (`git checkout -b feature/AmazingFeature`)
3. Commit tus cambios (`git commit -m 'Add some AmazingFeature'`)
4. Push a la rama (`git push origin feature/AmazingFeature`)
5. Abrir un Pull Request

## Licencia

Este proyecto está bajo la Licencia MIT. Ver el archivo `LICENSE` para más detalles. 