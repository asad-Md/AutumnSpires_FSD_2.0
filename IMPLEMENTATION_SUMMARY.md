# Implementation Summary - Autumn Spires

## Overview
This document summarizes all features, functions, and implementations completed in the Autumn Spires project - a real-time chat and room-based communication platform built with Next.js, Supabase, and WebRTC.

---

## 1. Authentication System

### OTP-Based Email Authentication
**Files:**
- `src/app/api/auth/send-otp/route.js` - Generates and sends OTP codes via email
- `src/app/api/auth/verify-otp/route.js` - Verifies OTP and creates/logs in users
- `src/app/api/auth/verify-magic/route.js` - Magic link verification (alternative auth method)
- `src/lib/otp.js` - OTP generation utility
- `src/lib/email.js` - Email sending functionality

**How it works:**
1. User enters email/username
2. System generates 6-digit OTP and sends via email
3. OTP stored in database with expiration time (10 minutes)
4. User enters OTP to verify
5. System creates user account or logs in existing user
6. User data stored in `userStore` with persistence

**Key Functions:**
- `generateOTP()` - Creates random 6-digit code
- `sendOTPEmail()` - Sends email with OTP
- `verifyOTP()` - Validates OTP against database

---

## 2. State Management (Zustand Stores)

### UserStore (`src/store/userStore.js`)
**Purpose:** Manages user authentication state, profile data, and friends list

**State:**
- `user` - Current user object (id, username, email, avatar_url, bio, created_at)
- `isAuthenticated` - Boolean auth status
- `friends` - Array of accepted friends
- `sidebarWidth` - UI preference
- `_hasHydrated` - Hydration tracking
- `_version` - Schema version for migrations

**Functions:**
- `setUser(userData)` - Sets authenticated user
- `clearUser()` - Logs out and redirects to home
- `updateUser(updates)` - Partial user data update
- `setFriends(friends)` - Sets friends array
- `fetchFriends(userId)` - Fetches friends from API
- `setSidebarWidth(width)` - Updates sidebar width

**Persistence:**
- Uses localStorage via Zustand persist middleware
- Version 2 with migration to clear stale friends data
- Auto-hydrates on app load

### RoomStore (`src/store/roomStore.js`)
**Purpose:** Manages rooms (spires) that users create or join

**State:**
- `rooms` - Array of rooms user belongs to
- `currentRoom` - Currently selected room
- `isLoading` - Loading state
- `error` - Error messages
- `_hasHydrated` - Hydration tracking
- `_version` - Schema version

**Functions:**
- `setRooms(rooms)` - Sets rooms array
- `setCurrentRoom(room)` - Selects active room
- `addRoom(room)` - Adds new room to list
- `removeRoom(roomId)` - Removes room
- `updateRoom(roomId, updates)` - Updates room data
- `fetchRooms(userId)` - Fetches user's rooms from API
- `reset()` - Clears all room data

**Persistence:**
- localStorage with version 2 migration
- Clears stale rooms on version mismatch

### ChatStore (`src/store/chatStore.js`)
**Purpose:** Manages direct message chats between friends

**State:**
- `selectedChat` - Currently active chat
- `selectedRoom` - Currently active room (overlaps with roomStore)
- `chats` - Chat history

**Functions:**
- `setSelectedChat()` - Opens friend chat
- `setSelectedRoom()` - Opens room chat
- `clearSelection()` - Closes all chats

### AuthStore (`src/store/authStore.js`)
**Purpose:** Temporary authentication flow state (OTP verification)

**State:**
- `email` - Email being verified
- `token` - OTP token
- `step` - Current auth step

### SnackbarStore (`src/store/snackbarStore.js`)
**Purpose:** Global notification system

**Functions:**
- `showSnackbar(message, type)` - Displays notification
- `hideSnackbar()` - Dismisses notification

---

## 3. Room Management System

### Room Creation
**API:** `src/app/api/room/create/route.js`

**Process:**
1. User fills create room form (name, description)
2. Server generates UUID for room
3. Inserts room into `Room` table
4. Adds creator as admin in `RoomMember` table
5. Returns room data with code (UUID)
6. Success screen shows room code for sharing

**Function:**
```javascript
POST /api/room/create
Body: { name, description, createdBy }
Returns: { success, room: { id, name, description, created_by } }
```

**Database Tables:**
- `Room` - Stores room metadata (id, name, description, created_by, is_private)
- `RoomMember` - Tracks user membership (user_id, room_id, role, joined_at)

### Room Joining
**API:** `src/app/api/room/join/route.js`

**Process:**
1. User enters room code (UUID)
2. System validates room exists
3. Checks if user already member (prevents duplicates)
4. Adds user to `RoomMember` with role="member"
5. Returns room data

**Function:**
```javascript
POST /api/room/join
Body: { roomCode, userId }
Returns: { success, room }
```

### Room Listing
**API:** `src/app/api/room/list/route.js`

**Process:**
1. Fetches all rooms user is member of
2. Joins `RoomMember` with `Room` table
3. Returns rooms with user's role and join date

**Function:**
```javascript
GET /api/room/list?userId={userId}
Returns: { success, rooms: [{ id, name, description, userRole, joinedAt }] }
```

**Uses:** `supabaseAdmin` to bypass RLS (Row Level Security)

### Room Messages
**API:** `src/app/api/room/messages/route.js`

**Process:**
1. Fetches messages for a specific room
2. Validates user is a member of the room
3. Returns messages with sender details

**Function:**
```javascript
GET /api/room/messages?roomId={roomId}
Returns: { success, messages: [{ id, content, sender: { username, avatar_url }, created_at }] }
```

---

## 4. Friendship System

### Friend Listing
**API:** `src/app/api/friendship/list/route.js`

**Process:**
1. Fetches friendships where user is requester OR addressee
2. Filters for status="accepted" only
3. Extracts friend IDs (the other person in relationship)
4. Fetches User details for all friend IDs
5. Returns friend profiles

**Function:**
```javascript
GET /api/friendship/list?userId={userId}
Returns: { success, friends: [{ id, username, email, avatar_url, bio }] }
```

**Database Table:**
- `Friendship` - Stores relationships (requesterId, addresseeId, status, createdAt)
- Status values: 'pending', 'accepted', 'blocked'

**Note:** Currently only returns accepted friendships. Pending requests need manual database update or future acceptance flow implementation.

### Friend Request Management
**APIs:**
- `src/app/api/friendship/send/route.js` - Send friend request
- `src/app/api/friendship/respond/route.js` - Accept/Reject request
- `src/app/api/friendship/requests/route.js` - List pending requests
- `src/app/api/friendship/unfriend/route.js` - Remove friend

**Features:**
- Send request by username (checks for existing friendship)
- List pending requests received by user
- Accept or reject requests
- Remove existing friends

### Friend Invitation
**API:** `src/app/api/friendship/invite/route.js`

**Process:**
1. User enters email to invite
2. System checks if user already exists
3. Sends email with signup link containing invite token
4. Uses `sendInviteEmail` utility

### Friend Search
**API:** `src/app/api/friendship/search/` (Directory exists, route not implemented)

---

## 5. Chat System

### Direct Messaging
**API:** `src/app/api/chat/route.js`

**Database Table:**
- `Chat` - Stores 1-on-1 messages (sender_id, receiver_id, content, created_at, is_read)

### Unread Message Count
**API:** `src/app/api/chat/unread/route.js`

**Component:**
- `src/components/chat/friendChat.js` - Friend chat interface

---

## 6. WebRTC Signaling Infrastructure

This section summarizes everything implemented for the live-room experience (video + audio using WebRTC) which uses the `Signal` table as the signaling transport via Supabase Realtime + `postgres_changes`. It also lists pending work necessary to harden and complete the experience.

### Signal Management (What is implemented)
- **Library:** `src/lib/signal.js`
- **Client library functions:**
  - `sendSignal({ roomId, senderId, receiverId, type, data })` — inserts a new row into `Signal` table and returns the row (throws on error).
  - `getUnconsumedSignals(userId, roomId)` — selects pending signals for consumer.
  - `markSignalConsumed(signalId)` — updates `consumed` flag to true for given `id`.
  - `subscribeToSignals(roomId, userId, callback)` — subscribes to the Supabase realtime channel for `Signal` table changes and calls `callback` for new rows.

- **Realtime:**
  - `subscribeToSignals` uses Supabase channels + `postgres_changes` filter `room_id=eq.<roomId>,receiver_id=eq.<userId>`.

- **WebRTC Hook:** `src/hooks/useWebRTC.js` implemented the following:
  - Lazy `getUserMedia` via `startMedia(constraints)`.
  - Local stream stored in `localStream` state with `localStreamRef` (ref used for adding tracks to RTCPeerConnections).
  - `createPeerConnection(remoteUser, isInitiator)` creates a new `RTCPeerConnection` with ICE servers and sets up `ontrack`, `onicecandidate`, and `onnegotiationneeded` handlers.
  - Presence-based offer logic (supabase presence `channel.track`), sending `offer` to new presences via `sendSignal`.
  - Signal handling: receives `offer`/`answer`/`ice-candidate` and applies to corresponding `RTCPeerConnection`.
  - Dynamic track management: `toggleVideo` properly stops tracks to turn off camera (stopping hardware) and adds/replaces tracks when starting video again. `toggleAudio` toggles audio enabled state rather than re-requesting permissions.
  - Cleanup on unmount: stops tracks and closes peers.

### Server / API integrations (What is implemented)
- **Server/admin client:** `src/lib/supabase/admin.js` contains the service role client for server-side operations.
- **API Routes:**
  - `src/app/api/signal/route.js` — existing route to fetch/consume signals (server-side or SSR path).
  - `src/app/api/signal/send/route.js` — route to insert signals via the server when needed.
  - `src/app/api/room/join` uses `supabaseAdmin` when adding users to a room.

### Database / Realtime setup (What is implemented / partially implemented)
- **Tables:** `Signal` table exists with columns `room_id`, `sender_id`, `receiver_id`, `data`, `type`, `consumed`.
- **Realtime subscription:** The app relies on `postgres_changes`/Supabase Realtime channel to notify client on `Signal` rows.
- **Row Level Security (RLS):** Policies were prepared in `supabaseQueries/fix_signal_rls_final.sql` but **must be applied to the DB** to allow client inserts and updates for authenticated users.

### Live Room UI Implementation (What is implemented)
- `src/app/room/[roomId]/page.js` — immersive room view with video grid, chat, and controls (mics, camera toggles, draggable video grid).
- `src/components/room/roomDetails.js` — Lobby view with

---

## 7. UI Components

### Authentication Components
**Path:** `src/components/auth/`

**Components:**
- `LoginForm.js` - Email/username input with OTP sending
- `SignupForm.js` - Similar to login (unified auth)
- `FormInput.js` - Reusable input field component

**Features:**
- Tab-based UI (Login/Signup)
- Framer Motion animations
- Form validation
- OTP verification flow

### Room Components
**Path:** `src/components/room/`

**Components:**
- `roomDetails.js` - Room chat interface

### Sidebar Components
**Path:** `src/components/sidebar/`

**Components:**
- `sidebar.js` - Main sidebar container
- `SidebarHeader.js` - Top section with user profile
- `SearchInput.js` - Friend/room search
- `TabSwitcher.js` - Friends/Rooms tab switcher
- `AddFriendBtn.js` - Opens friend addition flow
- `AddRoomBtn.js` - Opens room creation/join modal
- `UserProfile.js` - User avatar and info display
- `SidebarSkeleton.js` - Loading state
- `InviteFriendBtn.js` - Modal to send email invitations

### Sidebar - Friends
**Path:** `src/components/sidebar/friends/`

**Components:**
- `FriendsList.js` - Displays all friends, lazy-loads from `userStore`
- `FriendItem.js` - Individual friend card with avatar, username

### Sidebar - Rooms (Spires)
**Path:** `src/components/sidebar/spires(rooms)/`

**Components:**
- `RoomsList.js` - Displays all rooms, lazy-loads from `roomStore`
- `RoomItem.js` - Individual room card with name, description

### Add Room Modal
**Component:** `src/components/sidebar/AddRoomBtn.js`

**Features:**
- Modal overlay with backdrop blur
- Two tabs: Create Room / Join Room
- Framer Motion tab animations (similar to auth page)
- Create form: Name, description inputs
- Join form: Room code input
- Success screen showing:
  - Room name and host
  - Copy-to-clipboard room code
  - Visual confirmation
- API integration with error handling

**State Machine:**
```
Closed → Modal Open → Tab Selection → Form Submission → Success Screen → Close
```

### Common Components
**Path:** `src/components/common/`

**Components:**
- `Snackbar.js` - Global notification system

### Button Components
**Path:** `src/components/buttons/`

**Components:**
- `cta.js` - Call-to-action button
- `PlainBtn.js` - Simple button with hover effects
- `WideBtn.js` - Full-width button

### Navbar
**Path:** `src/components/navbar/`

**Component:**
- `navbar.js` - Top navigation (if applicable)

---

## 8. Pages & Routing

### Authentication Pages
- `/auth` - `src/app/auth/page.js` - Login/Signup page
- `/auth/verify-otp` - `src/app/auth/verify-otp/page.js` - OTP verification
- `/auth/verify-magic` - `src/app/auth/verify-magic/page.js` - Magic link verification

### Home Page
- `/home` - `src/app/home/page.js` - Main authenticated interface

**Features:**
- Auth guard (redirects to /auth if not logged in)
- Lazy-loading for rooms and friends (only fetches when empty)
- Conditional rendering:
  - Shows FriendChat when friend selected
  - Shows RoomDetails when room selected
  - Shows welcome screen when nothing selected
- Displays user greeting and member since date

**Layout:** `src/app/home/layout.js` - Wraps home page with sidebar

### Root Page
- `/` - `src/app/page.js` - Landing page

---

## 9. Database Schema

### User Table
```sql
id: text (UUID, primary key)
username: text (unique)
email: text (unique)
avatar_url: text
bio: text
created_at: timestamp
```

### Room Table
```sql
id: text (UUID, primary key)
name: text
description: text
is_private: boolean (default: false)
created_by: text (foreign key → User.id)
created_at: timestamp
```

### RoomMember Table
```sql
id: integer (auto-increment, primary key)
user_id: text (foreign key → User.id)
room_id: text (foreign key → Room.id)
role: text (default: 'member', can be 'admin')
joined_at: timestamp
UNIQUE(user_id, room_id) - prevents duplicate memberships
```

### Friendship Table
```sql
id: integer (auto-increment, primary key)
requesterId: text (foreign key → User.id) [camelCase!]
addresseeId: text (foreign key → User.id) [camelCase!]
status: enum (pending, accepted, blocked)
createdAt: timestamp [camelCase!]
UNIQUE(requesterId, addresseeId)
```

### Chat Table
```sql
id: bigint (auto-increment, primary key)
sender_id: text (foreign key → User.id)
receiver_id: text (foreign key → User.id)
content: text
created_at: timestamp
edited_at: timestamp
is_read: boolean (default: false)
```

### Message Table (Room Messages)
```sql
id: bigint (auto-increment, primary key)
room_id: text (foreign key → Room.id)
user_id: text (foreign key → User.id)
content: text
created_at: timestamp
edited_at: timestamp
```

### Signal Table (WebRTC)
```sql
id: bigint (auto-increment, primary key)
room_id: text (foreign key → Room.id)
sender_id: text (foreign key → User.id)
receiver_id: text (foreign key → User.id)
type: text (offer, answer, ice-candidate)
data: jsonb
created_at: timestamp
consumed: boolean (default: false)
```

### OTP Table
```sql
id: text (UUID, primary key)
email: text
otp: text
token: text (unique)
type: text
username: text
created_at: timestamp
expires_at: timestamp
verified: boolean (default: false)
```

### Presence Table
```sql
id: integer (auto-increment, primary key)
user_id: text (foreign key → User.id)
room_id: text (foreign key → Room.id)
last_seen: timestamp
is_online: boolean (default: false)
```

---

## 10. Supabase Configuration

### Two Client Types

**Regular Client (`supabase`)**
- Used for client-side operations
- Respects Row Level Security (RLS)
- Requires authenticated session
- Used in components and client-side code

**Admin Client (`supabaseAdmin`)**
- Uses service role key
- Bypasses Row Level Security
- Used in API routes (server-side)
- Has full database access

**File:** `src/lib/supabase.js`

### Row Level Security (RLS)
**File:** `supabaseQueries/rls.txt`

**Policies:**
- Users can only see their own chats
- Users can only see friendships they're part of
- Users can only see messages in rooms they belong to
- Users can only see their own room memberships
- Users can view rooms they created or joined

**Critical Issue Solved:**
- API routes use `supabaseAdmin` because they run server-side without user auth context
- `auth.uid()` in RLS returns NULL without session
- Using regular `supabase` client in APIs blocked all queries

### Mixed Database Access
- Some newer APIs (Friendship requests, invites) use `PrismaClient` directly
- Older APIs use `supabaseAdmin`
- Both approaches effectively bypass RLS for server-side operations

---

## 11. Utility Libraries

### Room Utilities
**File:** `src/lib/room.js`

**Functions:**
- `generateRoomId()` - Returns `crypto.randomUUID()`

### Supabase Utilities
**File:** `src/lib/supabase.js`

**Exports:**
- `supabase` - Regular client
- `supabaseAdmin` - Admin client with service role

### Signal Utilities
**File:** `src/lib/signal.js`

**WebRTC signaling helpers** (documented in section 6)

### OTP Utilities
**File:** `src/lib/otp.js`

**Functions:**
- `generateOTP()` - 6-digit random code

### Email Utilities
**File:** `src/lib/email.js`

**Functions:**
- `sendOTPEmail(to, otp)` - Sends OTP via email service

---

## 12. Custom Hooks

### useRealtimeChats
**File:** `src/hooks/useRealtimeChats.js`

**Purpose:** Subscribes to real-time chat updates via Supabase

### useSidebarResize
**File:** `src/hooks/useSidebarResize.js`

**Purpose:** Handles sidebar width resizing with drag interaction

---

## 13. Styling & Design

**Global Styles:** `src/app/globals.css`

**Features:**
- Tailwind CSS for utility classes
- Custom color palette with yellow accent
- Dark theme primary
- Backdrop blur effects for modals
- Smooth animations with Framer Motion

---

## 14. Key Technical Decisions

### Why Zustand with Persist?
- Simple, lightweight state management
- Built-in localStorage persistence
- Version-based migrations for schema changes
- Hydration tracking for SSR compatibility

### Why supabaseAdmin in APIs?
- Server-side API routes lack user auth session
- RLS policies check `auth.uid()` which is NULL server-side
- Admin client bypasses RLS while still validating userId from request
- Secure because userId is explicitly passed and validated

### Why UUID for Room Codes?
- Unique, collision-resistant identifiers
- Easy to share (copy-paste)
- No need for separate code generation system
- Direct database lookup by ID

### Column Name Inconsistency
- Friendship table uses camelCase (requesterId, addresseeId, createdAt)
- Other tables use snake_case (user_id, room_id, created_at)
- Created directly in Supabase vs. Prisma migration
- Requires careful column name handling in queries

---

## 15. Current Issues & Limitations

### Pending Friendships
**Status:** APIs implemented (`send`, `respond`, `requests`), UI integration in progress.
- `InviteFriendBtn` implemented for email invites.
- Friend request list and response UI pending.

### WebRTC Not Connected
**Status:** Signal infrastructure complete, peer connections not implemented

**Next Steps:**
- Create RTCPeerConnection instances
- Handle offer/answer exchange
- Process ICE candidates
- Establish audio/video streams

### No Friend Request UI
**Missing:** Flow to send, accept, reject friend requests

**Current:** Must manually manage Friendship table in database

### No Chat History Fetching
**Missing:** Chat history not loaded on friend selection

**Needed:** API route to fetch chat history between two users

### No Room Search
**Missing:** Search/filter rooms and friends

**Existing:** SearchInput component exists but not connected

---

## 16. Data Flow Summary

### App Initialization
1. App loads → Zustand stores hydrate from localStorage
2. User navigates to /home
3. Auth guard checks `isAuthenticated` from userStore
4. If not authenticated → redirect to /auth
5. If authenticated → check if rooms/friends arrays empty
6. If empty → trigger `fetchRooms()` and `fetchFriends()`
7. APIs fetch data using `supabaseAdmin` (bypassing RLS)
8. Data populated in stores → triggers component re-renders
9. FriendsList and RoomsList display fetched data

### Creating a Room
1. User clicks "Add Room" → Modal opens
2. User selects "Create" tab → Enters name/description
3. Form submits → POST to /api/room/create
4. Server generates UUID, inserts Room + RoomMember records
5. API returns room data
6. `addRoom(room)` called in roomStore
7. Success screen shows room code
8. User can copy code to share with others

### Joining a Room
1. User clicks "Add Room" → Modal opens
2. User selects "Join" tab → Enters room code (UUID)
3. Form submits → POST to /api/room/join
4. Server validates room exists, checks duplicate membership
5. Adds RoomMember record with role='member'
6. API returns room data
7. `addRoom(room)` called in roomStore
8. Success screen confirms join

### Opening a Chat
1. User clicks friend in FriendsList
2. `setSelectedChat(friend)` called in chatStore
3. HomePage detects `selectedChat` is set
4. Renders FriendChat component
5. (Chat history fetching not yet implemented)

### Version Migration (Cache Invalidation)
1. User loads app with old cached data
2. Zustand persist checks version number
3. If persisted version < 2 → migrate function runs
4. Clears friends and rooms arrays
5. Sets _version: 2
6. Hydration completes with empty arrays
7. Lazy-load logic triggers fetch from API
8. Fresh data from database populates stores

---

## 17. File Structure Overview

```
src/
├── app/
│   ├── api/
│   │   ├── auth/          # OTP sending and verification
│   │   ├── chat/          # Direct messaging
│   │   ├── friendship/    # Friend management
│   │   ├── room/          # Room CRUD operations
│   │   └── signal/        # WebRTC signaling
│   ├── auth/              # Auth pages
│   ├── home/              # Main app (with sidebar layout)
│   ├── globals.css        # Global styles
│   ├── layout.js          # Root layout
│   └── page.js            # Landing page
├── components/
│   ├── auth/              # Login/signup forms
│   ├── buttons/           # Reusable buttons
│   ├── chat/              # Chat interfaces
│   ├── common/            # Snackbar, etc.
│   ├── navbar/            # Top navigation
│   ├── room/              # Room details
│   └── sidebar/           # Sidebar with friends/rooms lists
├── hooks/                 # Custom React hooks
├── lib/                   # Utilities (supabase, otp, email, signal, room)
└── store/                 # Zustand state management
    ├── authStore.js
    ├── chatStore.js
    ├── roomStore.js
    ├── snackbarStore.js
    └── userStore.js
```

---

## 18. Environment Variables Required

```env
# Supabase
DATABASE_URL=postgresql://...
DIRECT_URL=postgresql://...
NEXT_PUBLIC_SUPABASE_URL=https://...
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
SUPABASE_SERVICE_ROLE_KEY=eyJ...

# Email Service (for OTP)
EMAIL_SERVICE_API_KEY=...
EMAIL_FROM=noreply@...
```

---

## 19. Next Steps / Roadmap

### High Priority
### High Priority
- [x] Implement friend request acceptance flow (APIs ready)
- [ ] Add chat history fetching
- [ ] Connect WebRTC peer connections for video/audio
- [ ] Add room message sending (Fetching implemented)
- [ ] Implement friend search functionality
- [ ] Complete UI for Friend Requests (List/Accept/Reject)

### Medium Priority
- [ ] Add room search/filter
- [ ] Implement presence system (online/offline status)
- [ ] Add typing indicators
- [ ] Implement message editing/deletion
- [ ] Add file sharing in chats

### Low Priority
- [ ] Add user profile editing
- [ ] Implement avatar upload
- [ ] Add room settings (make private, change name)
- [ ] Implement room member management (kick, ban, promote)
- [ ] Add notification preferences

---

## 20. Debugging Tips

### Data Not Loading?
1. Check browser console for API errors
2. Check terminal logs (APIs log all queries)
3. Verify RLS policies allow access
4. Confirm supabaseAdmin is used in API routes
5. Hard refresh (Ctrl+Shift+R) to trigger migration

### Friends/Rooms Not Showing?
1. Check friendship status is 'accepted' in database
2. Verify room memberships exist in RoomMember table
3. Check userId matches between stores and database
4. Look for errors in [Friendship API] and [Room API] logs

### Auth Issues?
1. Verify OTP hasn't expired (10 min limit)
2. Check email was sent successfully
3. Confirm user record created in User table
4. Check localStorage for persisted auth state

### Store Not Updating?
1. Verify version migration completed
2. Clear localStorage manually if needed
3. Check _hasHydrated is true before fetching
4. Ensure API returns success: true

---

**Last Updated:** November 19, 2025
**Project Status:** Core infrastructure complete, Friend Request APIs added, WebRTC and advanced features pending
