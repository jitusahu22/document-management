# DocManager — Document Management System

A React + Vite web application for uploading, searching, previewing, and downloading documents. Users log in via OTP, upload files with metadata (date, category, tags), and search/filter documents with options to preview or download individually or as a ZIP.

## Run the Application

```bash
npm install
npm run dev
```

The app runs at `http://localhost:5173`.

> A local CORS proxy is included in the Vite dev server to handle cross-origin file downloads (ZIP export). No extra setup needed.

## Build for Production

```bash
npm run build
npm run preview
```

## Linting

```bash
npm run lint
```

## Testing

No test framework is currently configured. To add tests, install Vitest:

```bash
npm install -D vitest @testing-library/react @testing-library/jest-dom jsdom
```

Then add to `package.json` scripts:

```json
"test": "vitest"
```

Run tests with:

```bash
npm run test
```
