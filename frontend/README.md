# Shoutbox - Messenger-First Gaming Platform

A real-time chat and polling platform built for instant, frictionless collaboration and engagement.

## 🎯 Overview

Shoutbox is a modern web application that combines real-time messaging with interactive polling features. Built with a messenger-first philosophy, it enables instant room creation, zero-friction onboarding (no account required), and seamless real-time communication.

## ✨ Features

### Real-Time Chat
- **Instant messaging** with WebSocket-based real-time communication
- **Live typing indicators** with bright, visible pulse animations
- **Online presence** tracking for all participants
- **Session-based identity** - no registration required
- **Per-tab sessions** using sessionStorage for multi-window support

### Interactive Polls
- **Single & multiple choice** poll types
- **Configurable duration** (5-120 seconds or unlimited)
- **Real-time results** with optional live vote display
- **Visual vote feedback** with percentage bars and counts
- **Countdown timer** with color-coded states (green/orange/red)
- **Creator controls** - End poll or cancel anytime
- **Result replacement** - Poll questions are replaced by final results

### Room Management
- **6-character room codes** for easy sharing
- **QR code generation** for mobile joining
- **Housemaster system** - First person becomes room owner
- **Auto-transfer** - Housemaster role transfers if owner leaves
- **Room persistence** - Rooms exist as long as participants remain

### User Experience
- **Zero-friction onboarding** - Enter name and start chatting
- **URL-based invites** - Share room links with `?room=CODE` parameter
- **Mobile-optimized** - Full viewport usage, responsive design
- **Typing indicators** - See who's actively typing in real-time
- **Visual feedback** - Selected votes, message states, connection status

## 🏗️ Architecture

### Frontend Stack
- **React** - Component-based UI
- **Vite** - Fast build tool and dev server
- **WebSocket** - Real-time bidirectional communication
- **QR Code React** - QR code generation for sharing
- **Nanoid** - Compact, URL-safe ID generation

### Backend Integration
- **Funkhaus WebSocket Server** - Node.js + Socket.io + Redis
- **Health monitoring** - Connection testing on app startup
- **Cold start handling** - Graceful Render.com free tier support
- **CORS configuration** - Secure cross-origin communication

### State Management
- **React Hooks** - useState, useEffect, useRef
- **Local state** - Component-level state management
- **Session storage** - Per-tab session persistence
- **Optimistic updates** - Instant UI feedback before server confirmation

## 📱 Mobile Optimization

- **Dynamic viewport height** - Uses `100dvh` for proper mobile rendering
- **Touch-friendly** - Minimum 16px font sizes prevent zoom
- **Fixed layout** - No scrolling except chat messages
- **Symmetric spacing** - Consistent padding on all edges
- **Responsive buttons** - Proper sizing and alignment on all devices

## 🎨 Design Philosophy

### Messenger-First
- Chat is the primary interface
- Polls are interactive messages in the chat flow
- Minimal chrome, maximum content

### Visual Hierarchy
- **Bright green** (#00FF88) typing indicator for regular users
- **Bright magenta** (#FF00FF) typing indicator for housemaster
- **Gold gradient** for housemaster badges
- **Color-coded timers** for poll countdowns
- **Subtle header links** to reduce distraction

### Accessibility
- High contrast colors for visibility
- Clear visual feedback for all interactions
- Keyboard-friendly navigation
- Screen reader compatible structure

## 🚀 Deployment

### Frontend (Vercel)
- **Auto-deploy** on git push to main
- **Environment variable**: `VITE_BACKEND_URL`
- **Production URL**: `https://frontend-[hash]-antiroms-projects.vercel.app`

### Backend (Render)
- **Service name**: `funkhaus-websocket`
- **Auto-deploy** on git push to main
- **Production URL**: `https://funkhaus-websocket.onrender.com`
- **Cold start**: ~30-60 seconds on free tier

## 🔧 Development

### Prerequisites
```bash
Node.js >= 18.0.0
npm or yarn
```

### Environment Setup
Create `.env` file:
```bash
VITE_BACKEND_URL=https://funkhaus-websocket.onrender.com
```

### Local Development
```bash
# Install dependencies
npm install

# Start dev server
npm run dev

# Build for production
npm run build
```

### Testing Connection
The app includes a built-in test screen that validates:
1. Backend URL configuration
2. Health endpoint connectivity (90s timeout for cold starts)
3. WebSocket connection establishment

## 📦 Version History

### v1.1.0 (Current)
- Enhanced typing indicators with bright, visible colors
- Fixed mobile button alignment and spacing
- Redesigned header with text links instead of buttons
- Improved poll form with multiple choice support
- Better mobile viewport handling
- Symmetric footer layout with proper edge spacing

### v1.0.0
- Initial release
- Real-time chat and messaging
- Interactive poll system with configurable settings
- Room management with housemaster controls
- Mobile-optimized responsive design
- QR code sharing for easy room joining

## 🎯 Use Cases

- **Team collaboration** - Quick polls and instant feedback
- **Event engagement** - Live audience polling during presentations
- **Classroom interaction** - Real-time quizzes and discussions
- **Social gatherings** - Fun polls and group chat
- **Decision making** - Fast consensus building

## 🔐 Privacy & Security

- **No data persistence** - Messages exist only in memory
- **Session-based** - No accounts, no passwords, no email
- **CORS protection** - Controlled origin access
- **Rate limiting** - API request throttling
- **No tracking** - Zero analytics or user monitoring

## 🛠️ Technical Highlights

- **Optimistic UI updates** - Instant feedback before server confirmation
- **Debounced typing events** - 2-second inactivity timeout
- **Automatic poll cleanup** - Questions replaced by results on completion
- **Flexible poll duration** - Optional time limits with auto-end
- **Multi-tab support** - Unique session per browser tab
- **Graceful degradation** - Works without WebSocket (fallback to polling)

## 📄 License

MIT License - Feel free to use and modify for your projects.

## 🤝 Contributing

This is a personal project, but suggestions and feedback are welcome!

---

**Built with ❤️ using React, WebSocket, and modern web technologies**

🤖 *Development powered by [Claude Code](https://claude.com/claude-code)*
