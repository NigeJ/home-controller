Project brief to paste into Claude Code:

Create a Vite + React + TypeScript project called "home-controller" for a 1280×800 touch-screen kiosk mounted in a hallway. Dark theme, large touch targets (minimum 48px), no scrolling — everything visible on one screen.
The app has a tab bar at the bottom with two sections:

Home Control — Scene buttons (Away, Home, Bedtime) that call Home Assistant's REST API. Show current room temperature and outdoor temperature from HA. Show heat pump status (mode, set temp). Individual toggle buttons for key smart plugs (outdoor lights, bathroom fan, heat transfer fan).
Morning Mission — A checklist for a child (lamp off, get dressed, breakfast, brush teeth, bag ready, shoes on) with a countdown timer to 8:30am, progress bar, and celebration animation when all tasks complete.

The HA REST API is at http://Nigel-Pi.local:8123/api/ and requires a Bearer token. Use environment variables for the token. Design for touch — no hover states, big tap targets, visual feedback on press.

Additional context:

Screen will be in portrait orientation (800×1280 in practice — width 800, height 1280)
A clock should be prominently displayed at the top — this is a hallway panel, time is the first thing you glance at
Weather from MetService integration — show today's forecast and current conditions
Font sizes need to be readable from 1–2 metres away (clock ~72px, temperatures ~32px, button labels ~20px)
I already have a Morning Mission React prototype — here to be used
Use CSS custom properties for theming so colours are easy to change
No external UI library — keep it simple with plain CSS
The app should handle HA being temporarily unavailable (show last known state, don't crash)