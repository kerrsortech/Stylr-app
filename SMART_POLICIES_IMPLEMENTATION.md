# Smart Policies Access Implementation

## Overview
This implementation provides intelligent, on-demand access to store policies, reducing token usage by only including policy documents when users ask policy-related questions.

## How It Works

### 1. **Policy File Loading** (`lib/store/policies-loader.ts`)
- Reads the local store policies file: `lib/store/Standard Shipping:.md`
- Uses in-memory caching (5-minute TTL) to avoid repeated file system reads
- Automatically falls back gracefully if the file is not available

### 2. **Enhanced Intent Detection** (`lib/chatbot/intent-detector.ts`)
The intent detector now recognizes a comprehensive set of policy-related queries:

**Shipping & Delivery:**
- shipping, delivery, ship, dispatch, tracking, carrier
- express shipping, standard shipping, international shipping
- delivery time, shipping cost, free shipping

**Returns & Refunds:**
- return policy, refund policy, exchange
- return window, damaged item, wrong item, defective
- refund process, return shipping, restocking fee

**Payments & Discounts:**
- payment methods, discount codes, promo codes
- Klarna, Clearpay, PayPal, Apple Pay, Google Pay
- student discount, buy now pay later

**General Policies:**
- terms of service, privacy policy, warranty
- customer service policies, holiday returns

### 3. **Smart Context Building** (`lib/chatbot/context-builder.ts`)
- **Conditional Inclusion**: Policies are only added to the prompt when:
  - Intent type is `policy_query`
  - Query type is `policy`
  - User message contains policy-related keywords (shipping, return, refund, payment, etc.)

- **Priority System**:
  1. First tries to load from local file (`Standard Shipping:.md`)
  2. Falls back to database policies if local file is unavailable
  3. Provides helpful note to AI even when policies aren't included

### 4. **Optimized API Route** (`app/api/chat/route.ts`)
- Only fetches policies from database when intent suggests policy-related query
- Reduces unnecessary database calls and token usage
- Policies are fetched in parallel with other data when needed

## Benefits

1. **Reduced Token Usage**: Policies are only included in prompts when relevant, significantly reducing API costs
2. **Faster Responses**: Fewer tokens mean faster processing and lower latency
3. **Smart Detection**: Comprehensive keyword matching ensures policy queries are accurately identified
4. **Caching**: In-memory cache reduces file system reads
5. **Fallback Support**: Gracefully handles missing files or database issues

## Usage Example

**Policy Query (Policies Included):**
```
User: "What's your return policy?"
→ Intent: policy_query
→ Policies loaded and included in prompt
→ AI has full access to return policy information
```

**Non-Policy Query (Policies Excluded):**
```
User: "Do you have any blue shirts?"
→ Intent: search
→ Policies NOT loaded
→ Reduced token usage
```

## File Structure

```
lib/
  store/
    policies-loader.ts          # Policy file loader with caching
    Standard Shipping:.md       # Store policies document
  chatbot/
    intent-detector.ts          # Enhanced policy detection
    context-builder.ts          # Conditional policy inclusion
app/
  api/
    chat/
      route.ts                  # Optimized policy fetching
```

## Cache Management

The policies cache can be cleared if needed:
```typescript
import { clearPoliciesCache } from '@/lib/store/policies-loader';
clearPoliciesCache(); // Useful when policies file is updated
```

## Future Enhancements

- Add support for multiple policy files
- Implement semantic search within policies for better matching
- Add policy versioning support
- Create admin interface for policy updates

