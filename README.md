# Agente Reactivo

Proyecto academico de un agente reactivo simple para un invernadero inteligente.

## Tema

El agente observa sensores de un invernadero y decide una accion inmediata con reglas condicionales. No planifica a largo plazo: reacciona al estado actual del ambiente.

## Acciones del agente

1. Activar riego
2. Encender ventilacion
3. Encender calefaccion
4. Encender luces
5. Activar alarma
6. Abrir sombreado

## Estructura

```text
Agente-Reactivo/
├── backend/
│   └── AgenteApi/
├── frontend/
│   └── Agente-client/
└── README.md
```

## Backend

Tecnologias:

- ASP.NET Core Web API
- Entity Framework Core
- SQLite

Comandos:

```bash
cd backend/AgenteApi
dotnet restore --configfile ../../NuGet.config
dotnet run --no-restore --launch-profile http
```

La API queda disponible en:

```text
http://localhost:5000
```

Endpoints principales:

- `GET /api/agente/acciones`
- `GET /api/agente/historial`
- `GET /api/agente/estadisticas`
- `POST /api/agente/evaluar`
- `POST /api/agente/simular`

Ejemplo para `POST /api/agente/evaluar`:

```json
{
  "temperatura": 32,
  "humedadSuelo": 28,
  "luz": 70,
  "humedadAmbiente": 66,
  "hayMovimiento": false
}
```

## Frontend

Tecnologias:

- React + Vite
- Axios
- Tailwind CSS

Comandos:

```bash
cd frontend/Agente-client
npm install
npm run dev
```

El cliente queda disponible en:

```text
http://localhost:5173
```

## Reglas reactivas

El agente evalua las condiciones en orden de prioridad:

- Si detecta movimiento, activa la alarma.
- Si la humedad del suelo es baja, activa el riego.
- Si la temperatura es alta, enciende la ventilacion.
- Si la temperatura es baja, enciende la calefaccion.
- Si hay poca luz, enciende las luces.
- Si hay mucha luz y calor, abre el sombreado.
- Si todo esta normal, mantiene monitoreo.
