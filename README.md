<p align="center">
  <img src="https://img.shields.io/badge/React-18.3-61DAFB?style=for-the-badge&logo=react&logoColor=white" />
  <img src="https://img.shields.io/badge/TypeScript-5.7-3178C6?style=for-the-badge&logo=typescript&logoColor=white" />
  <img src="https://img.shields.io/badge/Node.js-Express-339933?style=for-the-badge&logo=node.js&logoColor=white" />
  <img src="https://img.shields.io/badge/PostgreSQL-Prisma-4169E1?style=for-the-badge&logo=postgresql&logoColor=white" />
  <img src="https://img.shields.io/badge/Socket.io-Real--Time-010101?style=for-the-badge&logo=socket.io&logoColor=white" />
</p>

# FloorView — Restaurant Floor Plan Manager

An interactive, real-time restaurant floor plan manager that helps staff manage table sections and assignments during service. Designed to solve real operational problems where servers need a clearer way to visualize table sections and claim their areas during a shift.

---

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────────────┐
│                          FLOORVIEW                                  │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  ┌───────────────────────────────────────────────────────────────┐  │
│  │                    React Frontend (Vite)                      │  │
│  │                                                               │  │
│  │  ┌─────────┐  ┌──────────┐  ┌──────────┐  ┌──────────────┐  │  │
│  │  │  Auth    │  │  Canvas  │  │  Service │  │  Dashboard   │  │  │
│  │  │  Pages   │  │  Editor  │  │  View    │  │  & Analytics │  │  │
│  │  └────┬────┘  └────┬─────┘  └────┬─────┘  └──────┬───────┘  │  │
│  │       │             │             │               │           │  │
│  │  ┌────▼─────────────▼─────────────▼───────────────▼────────┐  │  │
│  │  │              Zustand State Management                   │  │  │
│  │  │  authStore │ canvasStore │ floorStore │ uiStore         │  │  │
│  │  └────────────────────┬───────────────────────────────────┘  │  │
│  │                       │                                       │  │
│  │  ┌────────────────────▼───────────────────────────────────┐  │  │
│  │  │         Axios HTTP Client  │  Socket.io Client         │  │  │
│  │  └────────────────────┬──────────────┬────────────────────┘  │  │
│  └───────────────────────┼──────────────┼────────────────────────┘  │
│                          │              │                            │
│              ┌───────────▼──────────────▼─────────────────┐         │
│              │         Express.js + Socket.io             │         │
│              │                                            │         │
│              │  ┌──────┐ ┌───────┐ ┌────────┐ ┌───────┐ │         │
│              │  │ Auth │ │Layouts│ │Sections│ │Shifts │ │         │
│              │  │Routes│ │Routes │ │ Routes │ │Routes │ │         │
│              │  └──┬───┘ └───┬───┘ └───┬────┘ └───┬───┘ │         │
│              │     │         │         │          │      │         │
│              │  ┌──▼─────────▼─────────▼──────────▼───┐  │         │
│              │  │    JWT Auth  │  Role Middleware      │  │         │
│              │  └──────────────┬───────────────────────┘  │         │
│              └─────────────────┼──────────────────────────┘         │
│                                │                                    │
│              ┌─────────────────▼──────────────────────────┐         │
│              │          Prisma ORM (12 Models)            │         │
│              └─────────────────┬──────────────────────────┘         │
│                                │                                    │
│              ┌─────────────────▼──────────────────────────┐         │
│              │             PostgreSQL                     │         │
│              │  Users│Restaurants│Floors│Layouts│Tables   │         │
│              │  Sections│Shifts│Assignments│Reservations  │         │
│              └────────────────────────────────────────────┘         │
│                                                                     │
│  ┌───────────────────────────────────────────────────────────────┐  │
│  │                  @rfm/shared (Monorepo)                       │  │
│  │           Zod Schemas │ TypeScript Types │ Constants           │  │
│  └───────────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────────┘
```

---

## Database Schema

```
┌──────────────┐       ┌──────────────┐       ┌──────────────┐
│     User     │       │  Restaurant  │       │    Floor     │
├──────────────┤       ├──────────────┤       ├──────────────┤
│ id           │──┐    │ id           │──┐    │ id           │
│ email        │  │    │ name         │  │    │ name         │
│ password     │  ├───▶│ address      │  ├───▶│ level        │
│ name         │  │    │ timezone     │  │    │ restaurantId │
│ role (enum)  │  │    │ ownerId ─────┘  │    └──────┬───────┘
│ active       │  │    └──────────────┘       │      │
└──────────────┘  │                           │      │
    │  ADMIN      │    ┌──────────────┐       │      ▼
    │  MANAGER    │    │    Layout    │◀──────┘ ┌──────────────┐
    │  SERVER     │    ├──────────────┤         │   Section    │
    │             │    │ id           │────┐    ├──────────────┤
    │             │    │ name         │    │    │ id           │
    │             │    │ elements[]   │    │    │ name         │
    │             │    │ gridSize     │    ├───▶│ color        │
    │             │    │ width/height │    │    │ layoutId     │
    │             │    │ isActive     │    │    │ floorId      │
    │             │    │ version      │    │    └──────┬───────┘
    │             │    └──────┬───────┘    │           │
    │             │           │            │           │
    │             │           ▼            │           ▼
    │             │    ┌──────────────┐    │    ┌──────────────┐
    │             │    │ TableConfig  │    │    │ SectionTable │
    │             │    ├──────────────┤    │    ├──────────────┤
    │             │    │ id           │◀───┼────│ sectionId    │
    │             │    │ tableNumber  │    │    │ tableId      │
    │             │    │ seats        │    │    └──────────────┘
    │             │    │ shape (enum) │    │
    │             │    │ x, y, w, h   │    │    ┌──────────────┐
    │             │    │ rotation     │    │    │    Shift     │
    │             │    └──────┬───────┘    │    ├──────────────┤
    │             │           │            │    │ id           │
    │             │           ▼            │    │ name         │
    │             │    ┌──────────────┐    │    │ startTime    │
    │             │    │ TableStatus  │    │    │ endTime      │
    │             │    ├──────────────┤    │    │ date         │
    │             │    │ status (enum)│    │    │ floorId      │
    │             │    │ guestCount   │    │    └──────┬───────┘
    │             │    │ notes        │    │           │
    │             │    │ serverName   │    │           ▼
    │             │    │ seatedAt     │    │    ┌──────────────┐
    │             │    └──────────────┘    │    │  Assignment  │
    │             │                        │    ├──────────────┤
    │             └────────────────────────┼───▶│ userId       │
    │                                      └───▶│ sectionId    │
    │                  ┌──────────────┐         │ shiftId      │
    │                  │ Reservation  │         │ status (enum)│
    │                  ├──────────────┤         │ claimedAt    │
    │                  │ guestName    │         └──────────────┘
    │                  │ partySize    │
    │                  │ dateTime     │         ┌──────────────┐
    │                  │ tableId      │         │ ActivityLog  │
    │                  └──────────────┘         ├──────────────┤
    └──────────────────────────────────────────▶│ userId       │
                                                │ action       │
                                                │ entityType   │
                                                │ details{}    │
                                                └──────────────┘
```

---

## Features

### Canvas Floor Plan Editor
- **5 table shapes**: Round, Square, Rectangle, Booth, Bar Stool — each with chair indicators and capacity display
- **Decorations**: Bar counter, kitchen zone, entrance, restrooms, plants, pillars
- **Walls & Labels**: Draw walls, place text labels anywhere on the floor plan
- **Full interactions**: Drag, resize, rotate, multi-select, copy/paste, undo/redo (50 levels)
- **Snap-to-grid**: Configurable grid (10/20/40px) with visual grid lines and major grid marks
- **Zoom & Pan**: Mouse wheel zoom toward cursor, middle-click pan, zoom controls
- **Layer management**: Toggle visibility/lock per layer (Background, Walls, Decorations, Tables, Labels, Sections)
- **Properties panel**: Edit any element's position, size, rotation, opacity, and type-specific properties
- **Layout versioning**: Save named layouts, switch between versions, duplicate layouts
- **Keyboard shortcuts**: Delete, Ctrl+Z/Y, Ctrl+C/V, Ctrl+A, Escape, G (grid snap)

### Real-Time Table Status Tracking
Seven distinct statuses with color coding and automatic timers:

```
Available ──▶ Seated ──▶ Ordering ──▶ Served ──▶ Check ──▶ Cleaning ──▶ Available
  (green)     (blue)     (amber)     (cyan)     (red)     (gray)       (green)
```

### Section Management
- Create color-coded sections from 12 preset colors
- Assign tables to sections via click or bulk selection
- Semi-transparent colored overlays on the canvas with section labels
- Section capacity tracking (total seats)

### Role-Based Access Control

| Feature | Admin | Manager | Server |
|---------|:-----:|:-------:|:------:|
| Edit floor plan layout | ✅ | ✅ | ❌ |
| Manage sections | ✅ | ✅ | ❌ |
| Create/manage shifts | ✅ | ✅ | ❌ |
| Assign servers to sections | ✅ | ✅ | ❌ |
| Claim assigned section | ✅ | ✅ | ✅ |
| Update table status | ✅ | ✅ | ✅ |
| View service floor plan | ✅ | ✅ | ✅ |
| Manage staff & roles | ✅ | ❌ | ❌ |
| View analytics | ✅ | ✅ | ❌ |

### Shift Management
- Create shifts with name and time range (Lunch, Dinner, Late Night, Custom)
- Assign servers to specific sections per shift
- Servers claim their sections at shift start
- Assignment status tracking: Assigned → Claimed → Active → Completed

### Service View (Server-Optimized)
- Grid-based table card view organized by section
- Quick-tap status updates (designed for tablets)
- "My Tables" filter to focus on assigned section
- Time-since-seated badges on each table
- Real-time updates across all connected devices

### Analytics Dashboard
- **Stats cards**: Total tables, occupied count, total guests, average turnover time
- **Occupancy chart**: Line chart showing occupancy percentage over time
- **Section comparison**: Bar chart comparing tables and guests across sections
- **Status distribution**: Donut chart showing current table status breakdown
- **Staff performance**: Server efficiency rankings

### Real-Time WebSocket Events
All changes broadcast instantly to every connected client:
- Table status changes
- Section claims
- Layout updates
- User presence (online/offline indicators)
- Shift updates

---

## Tech Stack

### Frontend
| Technology | Purpose |
|-----------|---------|
| React 18 | UI framework |
| TypeScript 5.7 | Type safety |
| Vite 6 | Build tool & dev server |
| Tailwind CSS 3.4 | Utility-first styling |
| react-konva (Konva.js 9) | HTML5 Canvas floor plan editor |
| Zustand 5 | State management |
| React Router 7 | Client-side routing |
| Socket.io Client 4.8 | Real-time communication |
| Axios | HTTP client |
| Recharts 2.15 | Analytics charts |
| Lucide React | Icon library |

### Backend
| Technology | Purpose |
|-----------|---------|
| Node.js + Express 4.21 | REST API server |
| TypeScript 5.7 | Type safety |
| Prisma 6.2 | ORM & database migrations |
| PostgreSQL | Relational database |
| Socket.io 4.8 | WebSocket server |
| JSON Web Tokens | Authentication |
| bcryptjs | Password hashing |
| Zod 3.23 | Request validation |

### Monorepo
| Technology | Purpose |
|-----------|---------|
| npm Workspaces | Package management |
| Turborepo | Build orchestration |
| @rfm/shared | Shared schemas, types, constants |

---

## Project Structure

```
restaurant-floor-manager/
├── package.json                        # Root monorepo config
├── turbo.json                          # Turborepo pipeline
├── tsconfig.json                       # Root TypeScript config
│
├── packages/
│   └── shared/                         # Shared library (@rfm/shared)
│       └── src/
│           ├── constants/              # Enums, colors, defaults
│           ├── schemas/                # Zod validation schemas
│           └── types/                  # TypeScript type definitions
│
├── apps/
│   ├── server/                         # Express API + Socket.io
│   │   ├── prisma/
│   │   │   └── schema.prisma          # Database schema (12 models)
│   │   └── src/
│   │       ├── config/                # Environment & Prisma client
│   │       ├── middleware/            # Auth, validation, error handling
│   │       ├── routes/                # REST API endpoints
│   │       │   ├── auth.ts            # Register, login, refresh, me
│   │       │   ├── users.ts           # User management (admin)
│   │       │   ├── restaurants.ts     # Restaurant CRUD
│   │       │   ├── layouts.ts         # Floor plan layouts
│   │       │   ├── tables.ts         # Table config & status
│   │       │   ├── sections.ts       # Section management
│   │       │   ├── shifts.ts         # Shift & assignment management
│   │       │   └── analytics.ts      # Turnover, sections, staff stats
│   │       ├── socket/               # Real-time event handlers
│   │       └── index.ts              # Server entry point
│   │
│   └── client/                        # React + Vite frontend
│       └── src/
│           ├── api/                   # Axios client & API functions
│           ├── hooks/                 # useAuth, useSocket
│           ├── stores/                # Zustand (auth, canvas, floor, ui)
│           ├── components/
│           │   ├── auth/              # Login, Register, ProtectedRoute
│           │   ├── layout/            # AppShell (header + sidebar)
│           │   ├── canvas/            # Floor plan editor (9 components)
│           │   ├── sections/          # Section panel & overlay
│           │   ├── tables/            # Table status panel & details
│           │   ├── shifts/            # Shift manager & staff list
│           │   ├── dashboard/         # Charts & stat cards
│           │   └── ui/                # Button, Modal, Input, Badge, etc.
│           └── pages/                 # 6 route pages
```

---

## Getting Started

### Prerequisites
- **Node.js** >= 18
- **PostgreSQL** >= 14
- **npm** >= 9

### Installation

```bash
# Clone the repository
git clone https://github.com/shayanxjavid/restaurant-floor-manager.git
cd restaurant-floor-manager

# Install all dependencies (root + workspaces)
npm install
```

### Database Setup

```bash
# Create a PostgreSQL database
createdb restaurant_floor_manager

# Copy and configure environment variables
cp .env.example apps/server/.env
# Edit apps/server/.env with your database URL and secrets

# Run migrations to create all tables
cd apps/server
npx prisma migrate dev --name init

# (Optional) Open Prisma Studio to inspect the database
npx prisma studio
```

### Running the Application

```bash
# From the root directory — starts both server and client
npm run dev
```

| Service | URL |
|---------|-----|
| Frontend | http://localhost:5173 |
| Backend API | http://localhost:3001/api |
| Health Check | http://localhost:3001/api/health |

### First-Time Setup

1. Open http://localhost:5173
2. Register an account (first user should select **Admin** role)
3. Create a restaurant from the dashboard
4. Navigate to **Floor Plan** to start designing your layout
5. Create sections and assign tables
6. Register additional accounts as **Server** role to test the service view

---

## API Endpoints

### Authentication
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/auth/register` | Create account |
| POST | `/api/auth/login` | Login, returns JWT tokens |
| POST | `/api/auth/refresh` | Refresh access token |
| GET | `/api/auth/me` | Get current user profile |

### Layouts
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/layouts/floor/:floorId` | List layouts for a floor |
| GET | `/api/layouts/:id` | Get layout with elements |
| POST | `/api/layouts` | Create layout |
| PUT | `/api/layouts/:id` | Update layout |
| POST | `/api/layouts/:id/activate` | Set as active layout |
| POST | `/api/layouts/:id/duplicate` | Clone layout |

### Tables
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/tables/layout/:layoutId` | Get tables for layout |
| POST | `/api/tables` | Create table |
| PATCH | `/api/tables/:id/status` | Update table status |
| GET | `/api/tables/:id/history` | Get status history |

### Sections
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/sections/layout/:layoutId` | Get sections |
| POST | `/api/sections` | Create section |
| POST | `/api/sections/:id/tables` | Assign tables |

### Shifts
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/shifts/date/:date` | Get shifts for date |
| POST | `/api/shifts` | Create shift |
| POST | `/api/shifts/:id/assign` | Assign server |
| POST | `/api/shifts/:id/claim` | Claim section |

### Analytics
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/analytics/overview` | Dashboard stats |
| GET | `/api/analytics/turnover` | Table turnover rates |
| GET | `/api/analytics/sections` | Section performance |
| GET | `/api/analytics/staff` | Staff efficiency |

---

## Environment Variables

```env
# Database
DATABASE_URL="postgresql://user:password@localhost:5432/restaurant_floor_manager"

# JWT Authentication
JWT_SECRET="your-secret-key"
JWT_REFRESH_SECRET="your-refresh-secret"
JWT_EXPIRES_IN="15m"
JWT_REFRESH_EXPIRES_IN="7d"

# Server
PORT=3001
CLIENT_URL="http://localhost:5173"
NODE_ENV="development"
```

---

## License

MIT
