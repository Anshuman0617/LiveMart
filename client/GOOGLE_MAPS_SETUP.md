# Google Maps Places API Setup

## Where to Add the Google Maps API Key

Add the following environment variable to your `.env` file in the `client` directory:

```env
VITE_GOOGLE_MAPS_API_KEY=your_google_maps_api_key_here
```

## Getting Your Google Maps API Key

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select an existing one
3. Enable the following APIs:
   - **Maps JavaScript API**
   - **Places API**
   - **Geocoding API** (for address to coordinates conversion)
   - **Distance Matrix API** (for distance calculations)
4. Go to **APIs & Services** → **Credentials**
5. Click **Create Credentials** → **API Key**
6. Copy the API key
7. (Recommended) Restrict the API key:
   - Click on the API key to edit it
   - Under **Application restrictions**, select **HTTP referrers**
   - Add your domain (e.g., `http://localhost:3000/*` for development)
   - Under **API restrictions**, select **Restrict key** and choose:
     - Maps JavaScript API
     - Places API
     - Geocoding API
     - Distance Matrix API

## Example `.env` File Location

```
client/.env
```

## What This API Key Is Used For

- **Address Autocomplete**: Allows users to search and select addresses using Google Places Autocomplete
- **Geocoding**: Converts addresses to latitude/longitude coordinates
- **Distance Calculations**: Calculates driving distances between user location and product locations

## Important Notes

- ⚠️ **Never commit your `.env` file to version control**
- ⚠️ **Restrict your API key** to prevent unauthorized usage
- ⚠️ **Use different keys for development and production**
- The API key is loaded dynamically when the AddressAutocomplete component is used
- If the API key is not set, address autocomplete will show an error message

## Troubleshooting

1. **"Google Maps Places API not loaded" error**:
   - Check that `VITE_GOOGLE_MAPS_API_KEY` is set in `client/.env`
   - Restart your Vite dev server after adding the key
   - Verify the API key is valid and has the required APIs enabled

2. **Autocomplete not working**:
   - Check browser console for errors
   - Verify Places API is enabled in Google Cloud Console
   - Check that the API key has the correct restrictions

3. **API quota exceeded**:
   - Google Maps APIs have usage limits
   - Check your usage in Google Cloud Console
   - Consider upgrading your plan if needed

