# Weekly Runner Dashboard

A Next.js dashboard for tracking running statistics from Strava.

## Features

- Weekly mileage tracking
- Average cadence per week
- Average heart rate monitoring
- Toggle between miles and kilometers
- Date range selection
- Dark mode support

## Setup

### Prerequisites

- Node.js 18+ 
- npm or yarn
- Strava API credentials

### Strava API Setup

1. Go to https://www.strava.com/settings/api
2. Create a new application
3. Note your **Client ID** and **Client Secret**
4. Set the **Authorization Callback Domain** to `localhost` (for development)

### Installation

1. Clone the repository:
```bash
git clone git@github.com:StephenDillon/weekly-runner-dashboard.git
cd weekly-runner-dashboard
```

2. Install dependencies:
```bash
npm install
```

3. Create a `.env.local` file:
```bash
cp .env.example .env.local
```

4. Fill in your Strava API credentials in `.env.local`:
```env
NEXT_PUBLIC_STRAVA_CLIENT_ID=your_client_id
STRAVA_CLIENT_SECRET=your_client_secret
NEXT_PUBLIC_STRAVA_REDIRECT_URI=http://localhost:3000/api/v1/auth/callback
NEXTAUTH_SECRET=your_random_secret
```

To generate a random secret for NEXTAUTH_SECRET:
```bash
openssl rand -base64 32
```

5. Run the development server:
```bash
npm run dev
```

6. Open [http://localhost:3000](http://localhost:3000) in your browser

### Connecting to Strava

1. Click the settings gear icon
2. Click "Connect to Strava" (when implemented)
3. Authorize the application
4. Your running data will be synced automatically

## Development

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run start` - Start production server
- `npm run lint` - Run ESLint

## Tech Stack

- Next.js 16
- React 19
- TypeScript
- Tailwind CSS
- Strava API v3

## License

MIT