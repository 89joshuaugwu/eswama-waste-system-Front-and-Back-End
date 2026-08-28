// Great-circle distance between two lat/lng points using the Haversine
// formula, matching the pseudocode presented in Section 4.6 of the report.

const EARTH_RADIUS_KM = 6371;

function toRadians(degrees) {
  return (degrees * Math.PI) / 180;
}

function haversineDistanceKm(lat1, lon1, lat2, lon2) {
  const dLat = toRadians(lat2 - lat1);
  const dLon = toRadians(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRadians(lat1)) *
      Math.cos(toRadians(lat2)) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return EARTH_RADIUS_KM * c;
}

// availableDrivers: [{ driver_id, latitude, longitude, ... }]
function findNearestDriver(reportLat, reportLon, availableDrivers) {
  let nearestDriver = null;
  let shortestDistance = Infinity;

  for (const driver of availableDrivers) {
    const distance = haversineDistanceKm(
      reportLat,
      reportLon,
      driver.latitude,
      driver.longitude
    );
    if (distance < shortestDistance) {
      shortestDistance = distance;
      nearestDriver = driver;
    }
  }

  return nearestDriver ? { ...nearestDriver, distanceKm: shortestDistance } : null;
}

module.exports = { haversineDistanceKm, findNearestDriver };
