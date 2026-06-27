# PorgDutyEmergency - Teacher Duty Booking System

A modern, responsive web application for managing teacher duties, emergency covers, and booking administration.

## Features

- **Shift Booking:** Teachers can book available duty slots and emergency covers.
- **My Bookings:** Teachers can review and cancel their own booked shifts.
- **Admin Dashboard:** Admins can import schedules from CSV and export booking data for HR.
- **Google Sign-In:** Teachers sign in with Google and must use an `@novyporg.cz` account.
- **Browser Persistence:** Bookings and admin settings are stored in browser localStorage.

## Tech Stack

- React 19
- TypeScript
- Vite
- Tailwind CSS
- Lucide React icons
- Motion animations

## Setup

### Prerequisites

- Node.js (v16+)
- npm

### Install

1. Clone the repository:
   ```bash
   git clone <repository-url>
   ```
2. Change to the project folder:
   ```bash
   cd emergency-lesson-&-duty-booking
   ```
3. Install dependencies:
   ```bash
   npm install
   ```

### Run locally

```bash
npm run dev
```

Open the app at `http://localhost:3000`.

### Build for production

```bash
npm run build
```

The production build output is written to `dist`.

## Firebase and Google Sign-In

- The app currently uses Firebase only for Google authentication.
- The Firebase config is stored in `src/firebase.ts` and initializes `firebase/auth`.
- The app does not save booking or colleague data to Firestore yet; all runtime data is persisted locally in the browser via `localStorage`.
- For Google sign-in to work, your Firebase project must have:
  - Google Sign-In enabled under Firebase Authentication.
  - Authorized domains including `localhost` and any deployed domain.
- The app enforces access for `@novyporg.cz` accounts only.
- Admin access is controlled by a local email list in browser storage, not by server-side Firebase rules.

## Notes

- The repository includes a `.env.example`, but the current app does not use environment variables for Firebase configuration.
- Some dependencies in `package.json` may come from scaffolding and are not used by the current app logic.

## Recommended Improvements

- Add Firestore or a backend service to persist bookings across devices and users.
- Move Firebase config into environment variables for deploy flexibility.
- Clean up unused dependencies such as `express`, `dotenv`, and `@google/genai` if they are not needed.

## License

This project is licensed under the MIT License.
