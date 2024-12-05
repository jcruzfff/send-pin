function initMap() {
  // Your existing map initialization code...
  const map = new google.maps.Map(document.getElementById("map"), {
    // your existing options...
  });

  // Create the search box and link it to the UI element
  const input = document.getElementById("pac-input");
  const searchBox = new google.maps.places.SearchBox(input);

  // Bias the SearchBox results towards current map's viewport
  map.addListener("bounds_changed", () => {
    searchBox.setBounds(map.getBounds());
  });

  let markers = [];

  // Listen for the event fired when the user selects a prediction
  searchBox.addListener("places_changed", () => {
    const places = searchBox.getPlaces();

    if (places.length === 0) {
      return;
    }

    // Clear out the old markers
    markers.forEach((marker) => {
      marker.setMap(null);
    });
    markers = [];

    // For each place, get the icon, name and location
    const bounds = new google.maps.LatLngBounds();
    
    places.forEach((place) => {
      if (!place.geometry || !place.geometry.location) {
        console.log("Returned place contains no geometry");
        return;
      }

      // Create a marker for each place
      markers.push(
        new google.maps.Marker({
          map,
          title: place.name,
          position: place.geometry.location,
        })
      );

      if (place.geometry.viewport) {
        // Only geocodes have viewport
        bounds.union(place.geometry.viewport);
      } else {
        bounds.extend(place.geometry.location);
      }
    });
    
    map.fitBounds(bounds);
  });
} 