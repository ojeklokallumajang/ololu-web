/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useState } from 'react';
import { useMap, useMapsLibrary } from '@vis.gl/react-google-maps';

interface MapDirectionsProps {
  origin: { lat: number; lng: number };
  destination: { lat: number; lng: number };
  waypoints?: { location: { lat: number; lng: number }; stopover: boolean }[];
}

export default function MapDirections({ origin, destination, waypoints = [] }: MapDirectionsProps) {
  const map = useMap();
  const routesLib = useMapsLibrary('routes');
  const [directionsService, setDirectionsService] = useState<google.maps.DirectionsService | null>(null);
  const [directionsRenderer, setDirectionsRenderer] = useState<google.maps.DirectionsRenderer | null>(null);

  useEffect(() => {
    if (!routesLib || !map) return;
    setDirectionsService(new routesLib.DirectionsService());
    setDirectionsRenderer(new routesLib.DirectionsRenderer({
      map,
      suppressMarkers: true, // We draw our own markers
      polylineOptions: {
        strokeColor: '#046A38',
        strokeOpacity: 0.8,
        strokeWeight: 5
      }
    }));
  }, [routesLib, map]);

  useEffect(() => {
    if (!directionsService || !directionsRenderer || !origin || !destination || !destination.lat) return;

    directionsService.route({
      origin: origin,
      destination: destination,
      waypoints: waypoints,
      travelMode: google.maps.TravelMode.DRIVING,
    }, (result, status) => {
      if (status === google.maps.DirectionsStatus.OK) {
        directionsRenderer.setDirections(result);
      } else {
        console.warn("Directions request failed due to " + status);
      }
    });
  }, [directionsService, directionsRenderer, origin, destination, waypoints]);

  return null;
}
