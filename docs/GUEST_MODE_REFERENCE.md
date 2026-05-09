# Guest Mode Developer Reference

## Quick Reference for Guest Session Features

### Guest Session Flow (30 Minutes)

```
Click "Play as Guest" → Create UUID token → Store in localStorage 
  → Add to x-guest-token header → Validate on each request 
  → Display countdown in navbar → Auto-expire & logout
```

### Key Endpoints

**Create Guest Session:**
```bash
POST /api/auth/guest-login
Response: {
  guestToken: "550e8400-e29b-41d4-a716-446655440000",
  expiresIn: 1800000,
  user: { _id, username, isAnonymous }
}
```

**Validate Guest Token:**
```bash
POST /api/auth/validate-guest-token
Body: { token: "550e8400-..." }
Response: {
  valid: true,
  user: { ... },
  expiresAt: 1691234567890
}
```

### Request Headers

**Registered User:**
```
Authorization: Bearer eyJhbGc...
```

**Guest User:**
```
x-guest-token: 550e8400-e29b-41d4-a716-446655440000
```

## Backend Implementation

### Guest Middleware (server/src/middleware/auth.js)

```javascript
async function guestSessionMiddleware(req, res, next) {
  const guestToken = req.headers['x-guest-token'];
  
  // Create new guest if no token
  if (!guestToken) {
    const sessionToken = uuidv4();
    const user = await User.create({
      username: `guest_${sessionToken.slice(0, 8)}`,
      isAnonymous: true,
      anonymousSessionToken: sessionToken,
      anonymousSessionExpires: new Date(Date.now() + 1800000)
    });
    req.user = user;
    req.isGuest = true;
    return next();
  }
  
  // Validate existing token
  const user = await User.findOne({
    anonymousSessionToken: guestToken,
    anonymousSessionExpires: { $gt: new Date() }
  });
  
  if (!user) return res.status(401).json({ error: 'Expired' });
  
  req.user = user;
  req.isGuest = true;
  next();
}
```

### Guest Login Controller (server/src/controllers/auth.js)

```javascript
async function guestLogin(req, res) {
  try {
    const sessionToken = uuidv4();
    const sessionExpires = new Date(Date.now() + 1800000);
    
    const guestUser = await User.create({
      username: `guest_${sessionToken.slice(0, 8)}`,
      isAnonymous: true,
      anonymousSessionToken: sessionToken,
      anonymousSessionExpires: sessionExpires
    });
    
    res.json({
      guestToken: sessionToken,
      expiresIn: 1800000,
      user: guestUser
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to create guest session' });
  }
}
```

### Check if Guest (in controllers)

```javascript
if (req.isGuest) {
  // Don't save scores
  // Don't update profile
  // Don't record stats
  return res.json({ readOnly: true, message: 'Guest session' });
}
```

## Frontend Implementation

### Guest Store (client/src/store/guestStore.js)

```javascript
import { create } from 'zustand';

const useGuestStore = create((set, get) => ({
  guestToken: localStorage.getItem('guestToken') || null,
  isGuest: !!localStorage.getItem('guestToken'),
  guestExpires: localStorage.getItem('guestExpires') 
    ? parseInt(localStorage.getItem('guestExpires')) : null,
  
  setGuestToken: (token, expiresIn) => {
    const expiresAt = Date.now() + expiresIn;
    localStorage.setItem('guestToken', token);
    localStorage.setItem('guestExpires', expiresAt);
    set({ guestToken: token, isGuest: true, guestExpires: expiresAt });
  },
  
  clearGuest: () => {
    localStorage.removeItem('guestToken');
    localStorage.removeItem('guestExpires');
    set({ guestToken: null, isGuest: false, guestExpires: null });
  },
  
  isGuestSessionValid: () => {
    const { guestExpires } = get();
    return guestExpires && Date.now() < guestExpires;
  }
}));
```

### Use Guest Store

```javascript
import { useGuestStore } from '@/store/guestStore';

function MyComponent() {
  const { isGuest, guestExpires, clearGuest } = useGuestStore();
  
  if (isGuest && !isGuestSessionValid()) {
    clearGuest();
    navigate('/login');
  }
  
  return isGuest && <span>Guest ({formatTime(guestExpires)})</span>;
}
```

### API Client (client/src/api/client.js)

```javascript
const api = axios.create({ baseURL: process.env.VITE_API_URL });

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('authToken');
  const guestToken = localStorage.getItem('guestToken');
  
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  } else if (guestToken) {
    config.headers['x-guest-token'] = guestToken;
  }
  
  return config;
});
```

### Guest Login Handler (client/src/pages/LoginPage.jsx)

```javascript
const handleGuestLogin = async () => {
  try {
    const response = await api.post('/auth/guest-login');
    useGuestStore.setState({
      guestToken: response.data.guestToken,
      isGuest: true,
      guestExpires: Date.now() + response.data.expiresIn
    });
    localStorage.setItem('guestToken', response.data.guestToken);
    localStorage.setItem('guestExpires', 
      Date.now() + response.data.expiresIn);
    navigate('/home');
  } catch (error) {
    alert('Failed to create guest session');
  }
};
```

### Protected Route (client/src/App.jsx)

```javascript
function ProtectedRoute({ children }) {
  const { isAuthenticated } = useAuthStore();
  const { isGuest, isGuestSessionValid } = useGuestStore();
  
  const isAuthorized = isAuthenticated || 
    (isGuest && isGuestSessionValid());
  
  return isAuthorized ? children : <Navigate to="/login" />;
}
```

### Guest Status in Navbar (client/src/components/Navbar.jsx)

```javascript
function Navbar() {
  const { isGuest, guestExpires } = useGuestStore();
  
  const formatTimeRemaining = () => {
    if (!guestExpires) return '';
    const ms = guestExpires - Date.now();
    const minutes = Math.floor(ms / 60000);
    return `${minutes}m`;
  };
  
  return (
    <nav>
      {isGuest && (
        <span>👤 Guest ({formatTimeRemaining()} Remaining)</span>
      )}
    </nav>
  );
}
```

## Database Query Examples

### Find Guest User

```javascript
const user = await User.findOne({
  anonymousSessionToken: 'token-value',
  anonymousSessionExpires: { $gt: new Date() }
});
```

### Exclude Guests from Leaderboard

```javascript
const leaderboard = await User.find({ 
  isAnonymous: false 
}).sort({ xp: -1 }).limit(100);
```

### Check if User is Guest

```javascript
const isGuest = user.isAnonymous === true;
const isExpired = user.anonymousSessionExpires < new Date();
```

### Create User Fields

```javascript
// For registered user
await User.create({
  email: 'user@example.com',
  username: 'john',
  passwordHash: hashedPassword,
  isAnonymous: false
});

// For guest user
await User.create({
  username: 'guest_abc12345',
  isAnonymous: true,
  anonymousSessionToken: uuidv4(),
  anonymousSessionExpires: new Date(Date.now() + 1800000)
});
```

## Common Issues & Solutions

### Issue: Guest token expires but frontend doesn't notice

**Solution:** App.jsx checks every 60 seconds:
```javascript
useEffect(() => {
  const interval = setInterval(() => {
    if (isGuest && !useGuestStore.getState().isGuestSessionValid()) {
      useGuestStore.getState().clearGuest();
      navigate('/login');
    }
  }, 60000);
  return () => clearInterval(interval);
}, [isGuest, navigate]);
```

### Issue: Same user can create multiple guest sessions

**Design Decision:** This is intentional - each browser/device gets its own 30-min session. Multiple tabs in same browser share localStorage, so they share the same session token.

### Issue: Guest sessions accumulate in database

**Solution:** Add TTL index (MongoDB will auto-delete):
```javascript
userSchema.index(
  { anonymousSessionExpires: 1 },
  { expireAfterSeconds: 0 }  // Delete at expiration
);
```

Or add cleanup job:
```javascript
// Run every hour
setInterval(async () => {
  await User.deleteMany({
    isAnonymous: true,
    anonymousSessionExpires: { $lt: new Date() }
  });
}, 3600000);
```

## Testing Guest Features

### Manual Testing

1. **Test Guest Creation**
   ```bash
   curl -X POST http://localhost:5000/api/auth/guest-login
   # Should return token + 1800000ms expiration
   ```

2. **Test Guest Request**
   ```bash
   curl http://localhost:5000/api/games \
     -H "x-guest-token: 550e8400-..."
   # Should return games list
   ```

3. **Test Expired Token**
   ```bash
   curl http://localhost:5000/api/games \
     -H "x-guest-token: expired-token"
   # Should return 401 Unauthorized
   ```

### Unit Test Example

```javascript
describe('Guest Session', () => {
  it('creates guest with 30 min expiration', async () => {
    const response = await request(app)
      .post('/api/auth/guest-login');
    
    expect(response.body.guestToken).toBeDefined();
    expect(response.body.expiresIn).toBe(1800000);
    expect(response.body.user.isAnonymous).toBe(true);
  });

  it('validates valid guest token', async () => {
    const { guestToken, expiresIn } = await createGuestSession();
    
    const response = await request(app)
      .post('/api/auth/validate-guest-token')
      .send({ token: guestToken });
    
    expect(response.body.valid).toBe(true);
  });

  it('rejects expired token', async () => {
    const expiredToken = 'old-token-123';
    
    const response = await request(app)
      .post('/api/auth/validate-guest-token')
      .send({ token: expiredToken });
    
    expect(response.body.valid).toBe(false);
  });
});
```

## Monitoring Guest Sessions

### Track in Database

```javascript
// Count active guest sessions
const activeGuests = await User.countDocuments({
  isAnonymous: true,
  anonymousSessionExpires: { $gt: new Date() }
});

// Find expired guest sessions
const expiredGuests = await User.countDocuments({
  isAnonymous: true,
  anonymousSessionExpires: { $lt: new Date() }
});

// Average session duration
const avgDuration = await User.aggregate([
  { $match: { isAnonymous: true } },
  { 
    $group: {
      _id: null,
      avgMs: { 
        $avg: { 
          $subtract: ['$anonymousSessionExpires', '$createdAt'] 
        } 
      }
    }
  }
]);
```

## Performance Tips

1. **Use indexes** - MongoDB creates on email, username, anonymousSessionToken
2. **Minimize localStorage writes** - Only update when token changes
3. **Don't validate on every render** - Check every 60 seconds instead
4. **Use soft deletes** - Set isActive = false instead of deleting games
5. **Populate sparingly** - Only populate when needed in response

## Future Enhancements

### Phase 1: Essential
- [ ] TTL index for auto-cleanup
- [ ] Background job to delete old guests
- [ ] Rate limiting (5 guest sessions per IP per hour)
- [ ] Guest activity logging

### Phase 2: Nice to Have
- [ ] Guest achievements (temporary)
- [ ] Extend session button (15 more minutes)
- [ ] Guest stats dashboard (not saved after session)
- [ ] Convert guest to registered (data migration)

### Phase 3: Advanced
- [ ] Guest referral system
- [ ] Gamified promotion (weekend: 60 min)
- [ ] Guest API token (for mobile apps)
- [ ] Anonymous leaderboard (separate)
