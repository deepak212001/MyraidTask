# TaskFlow - Production-Ready Task Management Application

A full-stack MERN (MongoDB, Express.js, React, Node.js) task management application with secure authentication, scalable backend architecture, and a modern frontend.

## Tech Stack

### Backend
- **Node.js** + **Express.js** 5.x
- **MongoDB** with Mongoose ODM
- **JWT** (HTTP-only cookies)
- **bcrypt** for password hashing
- **Zod** for request validation
- **express-rate-limit** for rate limiting
- **Hybrid encryption** (AES-256-GCM + RSA-OAEP) for auth request/response payloads

### Frontend
- **React 18** + **Vite**
- **React Router** for routing
- **Tailwind CSS**
- **Web Crypto API** for hybrid encryption (AES-GCM, RSA-OAEP)
- Fetch API with `credentials: "include"` for cookie-based auth

## Project Structure

```
inter_task/
├── server/                 # Express backend
│   ├── api/
│   │   ├── controllers/
│   │   ├── middlewares/
│   │   ├── models/
│   │   ├── routers/
│   │   ├── utils/
│   │   ├── validators/
│   │   ├── aes.js           # Hybrid encryption (server)
│   │   ├── app.js
│   │   └── index.js
│   ├── public.pem           # RSA public key
│   ├── private.pem          # RSA private key
│   ├── key.js               # Key loader
│   └── package.json
├── client/                 # React (Vite) frontend
│   ├── src/
│   │   ├── pages/
│   │   ├── components/
│   │   ├── context/
│   │   ├── crypto/           # aes.js, publicKey.js
│   │   └── lib/
│   └── package.json
└── README.md
```

## Setup Instructions

### Prerequisites
- Node.js 18+
- MongoDB (local or Atlas)
- npm or yarn

### Local Development

#### 1. Backend Setup

```bash
cd server
npm install
cp .env.example .env
# Edit .env with your MongoDB URI and JWT_SECRET

# Generate RSA keypair for hybrid encryption (if not present)
openssl genrsa -out private.pem 2048
openssl rsa -in private.pem -pubout -out public.pem

npm run dev
```

Backend runs at `http://localhost:5000`

#### 2. Frontend Setup

```bash
cd client
npm install
cp .env.example .env
# Set VITE_API_URL=http://localhost:5000/api/v1
npm run dev
```

Frontend runs at `http://localhost:3000`

#### 3. Environment Variables

**Server (.env)**
```
PORT=5000
MONGODB_URI=mongodb://localhost:27017/taskmanager
JWT_SECRET=your-super-secret-jwt-key
FRONTEND_URL=http://localhost:3000

```

**Client (.env)**
```
VITE_API_URL=http://localhost:5000/api/v1
```

## API Endpoints

### Authentication

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/v1/crypto/public-key` | Get server RSA public key (for hybrid encryption) |
| POST | `/api/v1/users/register` | Register new user (encrypted) |
| POST | `/api/v1/users/login` | Login user (encrypted) |
| GET | `/api/v1/users/me` | Get current user (protected) |
| POST | `/api/v1/users/logout` | Logout (protected) |

**Register / Login Request (encrypted):**

Requests are hybrid-encrypted. Plain payload (before encryption):
```json
{
  "name": "John Doe",
  "email": "john@example.com",
  "password": "secret123"
}
```

Encrypted request body sent to server:
```json
{
  "encryptedData": "<base64 AES-GCM ciphertext>",
  "encryptedAESKey": "<base64 RSA-OAEP encrypted key>",
  "iv": "<hex IV>"
}
```

**Register / Login Response (encrypted):**

Responses are encrypted with the same AES key from the request. Decrypted payload:
```json
{
  "user": { "_id": "...", "name": "John Doe", "email": "john@example.com" },
  "message": "User registered successfully"
}
```

### Tasks (all require authentication)

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/v1/tasks` | Create task |
| GET | `/api/v1/tasks` | Get tasks (paginated, filterable) |
| GET | `/api/v1/tasks/:id` | Get task by ID |
| PATCH | `/api/v1/tasks/:id` | Update task |
| DELETE | `/api/v1/tasks/:id` | Delete task |

**Create Task Request:**
```json
{
  "title": "Complete project",
  "description": "Finish the MERN stack app",
  "status": "pending"
}
```

**Get Tasks Query Params:**
- `page` (default: 1)
- `limit` (default: 10, max: 100)
- `status` (optional: pending | in_progress | completed)
- `search` (optional: partial title match)

**Get Tasks Response:**
```json
{
  "statusCode": 200,
  "success": true,
  "data": {
    "tasks": [...],
    "pagination": {
      "page": 1,
      "limit": 10,
      "total": 25,
      "totalPages": 3
    }
  }
}
```

## Authentication Flow

1. **Register/Login**: User submits credentials → Server validates → Password hashed (bcrypt) / compared → JWT generated → Token stored in **HTTP-only, Secure** cookie
2. **Protected Routes**: Client sends request with `credentials: "include"` → Cookie automatically sent → Server middleware verifies JWT → `req.user` populated
3. **Logout**: Client calls `/logout` → Server clears cookie

### Why HTTP-only Cookies?
- Prevents XSS attacks (JavaScript cannot access the cookie)
- Automatic inclusion in same-origin/cors requests with `credentials: include`
- Secure flag in production ensures HTTPS-only transmission

## Hybrid Encryption (AES-GCM + RSA-OAEP)

Authentication requests and responses (register, login) are protected using **hybrid encryption** that combines **AES-256-GCM** for bulk data and **RSA-OAEP** for key exchange. This ensures that sensitive credentials and user data are never transmitted in plaintext over the network.

### Why Hybrid Encryption?

- **RSA alone** is slow and has size limits for encrypting large payloads.
- **AES alone** requires a shared secret key to be exchanged securely.
- **Hybrid approach**: Use RSA to securely exchange a random AES key, then use AES to encrypt the actual data. This gives the speed of symmetric encryption with the security of asymmetric key exchange.

### Algorithms Used

| Component | Algorithm | Purpose |
|-----------|-----------|---------|
| Symmetric encryption | **AES-256-GCM** | Encrypt request/response payloads (credentials, user data) |
| Asymmetric encryption | **RSA-OAEP (SHA-256)** | Encrypt the AES key so only the server can decrypt it |
| Key size | 256-bit AES, 2048-bit RSA | Industry-standard key lengths |

### Request Flow (Client → Server)

1. **Fetch server public key**  
   Client calls `GET /api/v1/crypto/public-key` to obtain the server’s RSA public key (PEM format).

2. **Generate AES key**  
   Client generates a random 256-bit AES key using the Web Crypto API.

3. **Encrypt payload with AES-GCM**  
   - Serialize the payload (e.g. `{ email, password }`) to JSON.  
   - Generate a random 12-byte IV (nonce).  
   - Encrypt with AES-256-GCM; the auth tag is appended to the ciphertext.

4. **Encrypt AES key with RSA**  
   Import the server’s public key and encrypt the raw AES key with RSA-OAEP (SHA-256).

5. **Send encrypted request**  
   Request body:
   ```json
   {
     "encryptedData": "<base64 ciphertext + authTag>",
     "encryptedAESKey": "<base64 RSA-encrypted AES key>",
     "iv": "<hex or base64 IV>"
   }
   ```

### Server-Side Decryption

1. **Decrypt AES key**  
   Server uses its RSA private key to decrypt `encryptedAESKey` and recover the AES key.

2. **Decrypt payload**  
   - Parse `iv` (hex or base64).  
   - Decrypt `encryptedData` with AES-256-GCM (auth tag is the last 16 bytes).  
   - Parse the decrypted JSON and validate with Zod.

### Response Flow (Server → Client)

The server reuses the **same AES key** from the request to encrypt the response. This avoids extra RSA operations and keeps the client logic simple.

1. **Encrypt response**  
   Server uses the decrypted AES key and (optionally) the request’s IV to encrypt the response JSON with AES-256-GCM.

2. **Send encrypted response**  
   Response body:
   ```json
   {
     "encrypted": true,
     "encryptedData": "<base64 ciphertext + authTag>",
     "iv": "<base64 IV>",
     "encryptedAESKey": "<echoed from request for correlation>"
   }
   ```

### Client-Side Response Decryption

1. **Use stored AES key**  
   The client keeps the AES key in memory (never sent to the server).

2. **Decrypt response**  
   Decrypt `encryptedData` with AES-256-GCM using the stored key and the response `iv`.

3. **Parse and use data**  
   Parse the decrypted JSON and update auth state (e.g. `setUser`).

### Implementation Details

**Client (Browser)**  
- `client/src/crypto/aes.js`: `hybridEncrypt`, `hybridDecryptResponse`  
- `client/src/crypto/publicKey.js`: `fetchPublicKey`  
- Uses Web Crypto API (`window.crypto.subtle`)

**Server (Node.js)**  
- `server/api/aes.js`: `hybridDecryptWithKey`, `encryptJsonWithAesKey`  
- `server/key.js`: Loads RSA keypair from `public.pem` and `private.pem`  
- Uses Node.js `crypto` module

**Key Format**  
- IV: 12 bytes (96 bits), recommended for GCM  
- Auth tag: 16 bytes (128 bits), appended to ciphertext  
- IV/encryptedData support both hex and base64

**Key Management**  
- RSA keypair: `server/public.pem` (public), `server/private.pem` (private)  
- Generate with: `openssl genrsa -out private.pem 2048` and `openssl rsa -in private.pem -pubout -out public.pem`  
- Public key endpoint uses cache-busting (`?t=timestamp`) to avoid stale keys after rotation

### Security Properties

- **Confidentiality**: Payloads are encrypted end-to-end; only the server can read requests and only the client can read responses.  
- **Integrity**: AES-GCM provides authenticated encryption; tampering is detected.  
- **Forward secrecy**: Each request uses a new random AES key.  
- **No key on wire**: The AES key is only sent encrypted with RSA; the private key never leaves the server.

## Architecture Decisions

### Backend
- **Centralized Error Handling**: `errorHandler` middleware catches all errors, returns consistent JSON
- **Validation**: Zod schemas validate request body/query before controllers
- **Ownership Middleware**: Ensures users can only modify their own tasks (403 on unauthorized)
- **Rate Limiting**: 100 requests per 15 minutes per IP on `/api/*`

### Frontend
- **Auth Context**: Global auth state, fetches `/me` on mount
- **Route Protection**: Dashboard redirects to login if unauthenticated
- **Debounced Search**: 300ms debounce on task search to reduce API calls

## Deployment

### Backend (Render / Railway / AWS)

1. Set environment variables in your platform
2. Build command: (none - Node.js)
3. Start command: `node api/index.js` (from server directory)
4. Ensure `FRONTEND_URL` matches your deployed frontend URL
5. For MongoDB: Use MongoDB Atlas connection string

### Frontend (Vercel / Netlify)

1. Connect repository, set root directory to `client`
2. Set `VITE_API_URL` to your deployed backend URL (e.g. `https://your-api.onrender.com/api/v1`)
3. Build command: `npm run build`
4. Output directory: `dist`

### CORS
Backend CORS allows: `localhost:3000`, `localhost:5173`, and `FRONTEND_URL`. Add your production frontend URL to `FRONTEND_URL` env var.

## Optional Enhancements

- **Refresh Tokens**: Implement refresh token rotation for longer sessions
- **Rate Limiting**: Adjust `max` in `express-rate-limit` for production

## License

ISC
