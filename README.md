# Closelook SDK

AI-powered e-commerce SDK providing intelligent shopping assistance and virtual try-on capabilities for fashion e-commerce stores.

## Features

- 🤖 **AI Shopping Assistant**: Context-aware chatbot with natural language understanding
- 🎨 **Virtual Try-On**: Photorealistic AI-generated images of customers wearing products
- 📊 **Admin Dashboard**: Manage catalog, policies, and monitor analytics
- 🔒 **Secure & Private**: All third-party APIs hidden from frontend
- 🚀 **Easy Integration**: Simple embeddable widget for any e-commerce site

## Tech Stack

- **Frontend**: Next.js 14, React, TypeScript, Tailwind CSS, shadcn/ui
- **Backend**: Next.js API Routes (Serverless)
- **AI Services**: Google Gemini 2.0 Flash, Replicate Seedream-4
- **Database**: Neon PostgreSQL (via Drizzle ORM)
- **Cache**: Redis (ioredis)
- **Storage**: AWS S3
- **Email**: SendGrid
- **Deployment**: Railway

## Quick Start

### 1. Installation

```bash
npm install
```

### 2. Environment Variables

Create a `.env.local` file:

```bash
# AI Services
GOOGLE_GEMINI_API_KEY=your_gemini_api_key
REPLICATE_API_TOKEN=your_replicate_token

# Database
DATABASE_URL=postgresql://user:password@host:5432/closelook

# Redis
REDIS_URL=redis://default:password@host:6379

# Storage - AWS S3
AWS_ACCESS_KEY_ID=your_aws_key
AWS_SECRET_ACCESS_KEY=your_aws_secret
AWS_S3_BUCKET=closelook-images
AWS_REGION=us-east-1

# Email
SENDGRID_API_KEY=your_sendgrid_key
ADMIN_EMAIL=admin@client-store.com

# Security
API_SECRET_KEY=random_32_char_string
RATE_LIMIT_MAX_REQUESTS=100
RATE_LIMIT_WINDOW_MS=60000

# App Config
NEXT_PUBLIC_API_URL=https://your-domain.com
NODE_ENV=production
```

### 3. Database Setup

```bash
# Generate migrations
npm run db:generate

# Run migrations
npm run db:migrate
```

### 4. Development

```bash
npm run dev
```

### 5. Build

```bash
npm run build
npm start
```

## Integration

### Embed Widget in Your Site

Add this script to your HTML:

```html
<script>
  window.CLOSELOOK_API_URL = 'https://your-domain.com';
</script>
<script src="https://your-domain.com/widget.js"></script>
```

The widget will automatically:
- Detect the current product page
- Create a session for the user
- Show a chat button in the bottom-right corner

### Manual Integration

```javascript
import { ChatWidget } from '@closelook/sdk';

function ProductPage() {
  return (
    <ChatWidget
      apiUrl="https://your-domain.com"
      sessionId="user-session-id"
      shopDomain="your-store.com"
      currentProduct={{
        id: "product-123",
        title: "Product Name",
        price: 9999, // in cents
        image: "https://...",
        category: "Jackets"
      }}
    />
  );
}
```

## API Endpoints

### Chat API

```POST /api/chat```

Request:
```json
{
  "sessionId": "session_123",
  "message": "Show me blue jackets under $100",
  "context": {
    "currentProduct": { ... },
    "shopDomain": "store.com",
    "customerId": "customer_123"
  }
}
```

Response:
```json
{
  "message": "Here are some blue jackets under $100...",
  "products": [...],
  "intent": "search",
  "ticketId": "TKT-123" // if ticket was created
}
```

### Try-On API

```POST /api/try-on```

Form Data:
- `userPhoto`: File
- `productImage`: File
- `sessionId`: string
- `shopDomain`: string
- `productId`: string

Response:
```json
{
  "success": true,
  "imageUrl": "https://...",
  "category": "Jacket",
  "categoryType": "CLOTHING_UPPER",
  "generationTimeMs": 12000
}
```

## Architecture

### System Overview

```
Client E-commerce Site
  ↓
Closelook SDK (Next.js)
  ├── API Routes (Serverless)
  ├── Business Logic Layer
  │   ├── Intent Detection
  │   ├── Semantic Search
  │   ├── Product Ranking
  │   └── Try-On System
  ├── Database (PostgreSQL)
  ├── Cache (Redis)
  └── Storage (S3)
      ↓
External Services
  ├── Google Gemini
  └── Replicate Seedream-4
```

### Key Design Decisions

1. **Serverless API Routes**: Auto-scaling, fast deployment
2. **Redis for Sessions**: Fast read/write for temporary data
3. **PostgreSQL**: Relational data, complex queries, analytics
4. **S3 for Images**: Scalable, cost-effective storage
5. **Error Handling**: All internal APIs hidden from frontend

## Security

- ✅ Rate limiting on all endpoints
- ✅ Input validation with Zod
- ✅ Error messages hide internal details
- ✅ API keys never exposed to frontend
- ✅ Session-based authentication
- ✅ CORS protection

## Performance

- **Chatbot Response**: < 3 seconds
- **Try-On Generation**: < 15 seconds
- **Concurrent Users**: 10,000+
- **Uptime**: 99.9%

## Development

### Project Structure

```
closelook-sdk/
├── app/
│   ├── api/          # API endpoints
│   ├── admin/        # Admin dashboard
│   └── widget/        # Embeddable widget
├── components/
│   ├── ui/           # shadcn/ui components
│   └── widget/       # Chat widget, Try-on button
├── lib/
│   ├── ai/           # Gemini, Replicate clients
│   ├── chatbot/      # Intent, search, ranking
│   ├── try-on/       # Product analysis, prompts
│   ├── database/     # Schema, queries
│   ├── cache/        # Redis session manager
│   ├── storage/      # S3 upload
│   └── utils/        # Error handling, rate limiting
└── public/
    └── widget.js     # Embeddable script
```

### Database Schema

- `sessions`: User sessions
- `conversations`: Chat history
- `tickets`: Support tickets
- `try_on_history`: Try-on generations
- `product_catalog`: Cached product data
- `shop_policies`: Store policies
- `analytics_events`: User interactions
- `api_usage`: API quota tracking

## Deployment

### Railway

1. Connect your GitHub repository
2. Set environment variables
3. Deploy

The app will automatically:
- Run database migrations
- Start the Next.js server
- Handle serverless functions

### Environment Variables

All required environment variables must be set in Railway dashboard.

## Monitoring

- All API calls are logged
- Performance metrics tracked
- Error tracking with stack traces
- API usage monitoring

## License

MIT

## Support

For issues and questions, please open a GitHub issue.

