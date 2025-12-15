# Google Places API Setup Guide

## Overview
The Location Management feature includes Google Places Autocomplete API integration for easy location search and address validation.

## Features

### Two Input Modes
1. **Google Places Mode** (Default)
   - Search and select locations using Google's database
   - Auto-fills: Location name, formatted address, coordinates
   - Provides accurate geocoding data
   - Shows place predictions as you type

2. **Manual Mode**
   - Enter location details manually
   - Useful when Google API is unavailable or for custom locations
   - No external dependencies

### Location Data Captured
- **Name**: Location/place name
- **Address**: Street address (manual or from Google)
- **Description**: Custom notes about the location
- **Google Places Data** (when using Google mode):
  - `placeId`: Unique Google Places identifier
  - `formattedAddress`: Standardized address from Google
  - `latitude`: Geographic latitude coordinate
  - `longitude`: Geographic longitude coordinate

## Setup Instructions

### Step 1: Get Google Maps API Key

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select an existing one
3. Enable the following APIs:
   - **Places API**
   - **Maps JavaScript API** (optional, for future map features)
4. Go to **Credentials** → **Create Credentials** → **API Key**
5. Copy your API key

### Step 2: Secure Your API Key (Recommended)

1. In Google Cloud Console, go to your API key settings
2. Under **Application restrictions**, select "HTTP referrers (web sites)"
3. Add your domains:
   ```
   localhost:3000/*
   yourdomain.com/*
   ```
4. Under **API restrictions**, select "Restrict key"
5. Choose only the APIs you're using:
   - Places API
   - Maps JavaScript API

### Step 3: Add API Key to Your Project

Open `src/components/AddLocationModal.tsx` and replace the placeholder:

```typescript
// Line ~108
const API_KEY = "YOUR_GOOGLE_MAPS_API_KEY";
```

Replace `"YOUR_GOOGLE_MAPS_API_KEY"` with your actual API key.

**For production**, use environment variables instead:

1. Create `.env` file:
   ```bash
   VITE_GOOGLE_MAPS_API_KEY=your_actual_api_key_here
   ```

2. Update the code:
   ```typescript
   const API_KEY = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;
   ```

3. Add `.env` to `.gitignore` to keep your key secure

### Step 4: Test the Integration

1. Start your dev server: `pnpm dev`
2. Navigate to `/locations`
3. Click "Add Location"
4. The modal should show "Google Places" mode by default
5. Type a location name (e.g., "Statue of Liberty")
6. Predictions should appear as you type
7. Select a prediction to auto-fill all fields

### Fallback to Manual Mode

If Google Places API fails to load:
- The component automatically switches to Manual mode
- Users can still add locations by typing manually
- You can toggle between modes using the "Switch to Manual/Google" button

## Usage Example

```typescript
// In your page/component
import AddLocationModal from "~/components/AddLocationModal";

<AddLocationModal
  open={showModal()}
  onClose={() => setShowModal(false)}
  onSave={async () => {
    await reloadLocations();
  }}
  editingLocation={selectedLocation()} // Optional: for editing
/>
```

## API Pricing (Google Places)

- **Free Tier**: First $200/month of usage
- **Autocomplete - Per Session**: $2.83 per 1,000 sessions
- **Place Details**: $17 per 1,000 requests

Typical usage for a small organization: **Free** (well within the free tier)

## Troubleshooting

### "Google Maps API failed to load"
- Check your API key is correct
- Verify Places API is enabled in Google Cloud Console
- Check browser console for specific error messages

### "Cannot find name 'google'"
- Make sure the Google Maps script is loaded before use
- The component waits for the script to load automatically
- Check network tab to see if the script loaded successfully

### Predictions not showing
- Ensure you've typed at least 3 characters
- Check API key restrictions (HTTP referrers)
- Verify your billing is set up in Google Cloud (required even for free tier)

### "This API project is not authorized to use this API"
- Enable Places API in your Google Cloud project
- Wait a few minutes for the changes to propagate

## Alternative: Using Without Google Places

If you don't want to use Google Places API:

1. The component defaults to Manual mode if Google fails to load
2. Users can always toggle to Manual mode
3. All location data can be entered manually
4. No external dependencies or API costs

Simply leave the API key as `"YOUR_GOOGLE_MAPS_API_KEY"` and the component will function in Manual-only mode.

## Security Best Practices

1. **Never commit API keys to git**
   - Use environment variables
   - Add `.env` to `.gitignore`

2. **Restrict your API key**
   - Use HTTP referrer restrictions
   - Restrict to specific APIs
   - Monitor usage in Google Cloud Console

3. **Set usage quotas**
   - Go to Google Cloud Console → Quotas
   - Set daily/monthly limits to prevent unexpected charges

## Future Enhancements

Potential improvements you could add:
- Display map preview when a location is selected
- Autocomplete based on user's current location
- Support for multiple address types (billing, shipping, etc.)
- Bulk location import from CSV
- Distance calculations between locations
