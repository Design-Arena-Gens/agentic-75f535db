## Nifty Market Navigator

Opinionated Nifty 50 intelligence dashboard delivering six months of price history, indicator overlays, and narrative guidance on the next move.

### Features
- Live Nifty 50 daily candles streamed from Yahoo Finance through `/api/nifty`
- SMA 10/20/50, RSI-14, 5-day momentum, and dynamic support/resistance mapping
- Natural-language next move synopsis with confidence scoring
- Responsive Tailwind UI optimized for Vercel deployment

### Commands
```bash
npm run dev     # start local development
npm run lint    # lint the project
npm run build   # production build
npm start       # serve production build
```

### Data
Data comes from the Yahoo Finance chart API and is cached for 15 minutes to balance freshness and rate limits. No API key required.

### Deploy
Push to Vercel using:
```bash
vercel deploy --prod --yes --token $VERCEL_TOKEN --name agentic-75f535db
```
