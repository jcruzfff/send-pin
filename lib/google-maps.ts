export async function getLocationFromCoordinates(lat: number, lng: number): Promise<string> {
  try {
    const response = await fetch(
      `https://maps.googleapis.com/maps/api/geocode/json?latlng=${lat},${lng}&key=${process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY}`
    );
    
    const data = await response.json();
    
    if (data.results && data.results.length > 0) {
      // Find the city and state from address components
      const addressComponents = data.results[0].address_components;
      let city = '';
      let state = '';
      
      for (const component of addressComponents) {
        if (component.types.includes('locality')) {
          city = component.long_name;
        }
        if (component.types.includes('administrative_area_level_1')) {
          state = component.short_name;
        }
      }
      
      return city && state ? `${city}, ${state}` : 'Location not found';
    }
    
    return 'Location not found';
  } catch (error) {
    console.error('Error getting location:', error);
    return 'Location not found';
  }
} 