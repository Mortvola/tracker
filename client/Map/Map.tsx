import React, { useEffect } from 'react';
import {
  GoogleMap, HeatmapLayer, Marker, Polyline, useJsApiLoader,
} from '@react-google-maps/api';
import Http from '@mortvola/http';

const containerStyle = {
  width: '100%',
  height: '100%',
};

const center = {
  lat: 40.60795207337327,
  lng: -119.26400153901108,
};

const libraries: ['visualization'] = ['visualization'];

type PropsType = {
  apiKey: string,
  showLocation?: boolean,
  heatmap?: google.maps.LatLng[],
}

const Map: React.FC<PropsType> = ({ apiKey, showLocation = false, heatmap = [] }) => {
  const { isLoaded } = useJsApiLoader({
    id: 'google-map-script',
    googleMapsApiKey: apiKey,
    libraries,
  });

  const [, setMap] = React.useState<google.maps.Map | null>(null);
  const [location, setLocation] = React.useState<{ lat: number, lng: number } | null>(null);
  const [trail, setTrail] = React.useState<{ lat: number, lng: number }[][] | null>(null);

  useEffect(() => {
    if (isLoaded) {
      if (showLocation) {
        (async () => {
          const response = await fetch('/api/location');

          if (response.ok) {
            const body = await response.json() as number[];
            setLocation({
              lat: body[1],
              lng: body[0],
            });
          }
        })();
      }

      (async () => {
        const response = await fetch('/api/trail/PCT');

        if (response.ok) {
          const body = await response.json() as [number, number][][];

          setTrail(body.map((p) => (
            p.map((c) => ({ lat: c[1], lng: c[0] }))
          )));
        }
      })();
    }
  }, [isLoaded, showLocation]);

  const onLoad = React.useCallback((m: google.maps.Map) => {
    setMap(m);
  }, []);

  const onUnmount = React.useCallback(() => {
    setMap(null);
  }, []);

  if (isLoaded) {
    return (
      <GoogleMap
        mapContainerStyle={containerStyle}
        center={center}
        zoom={5}
        onLoad={onLoad}
        onUnmount={onUnmount}
        options={{ minZoom: 5, streetViewControl: false }}
      >
        {
          location
            ? (
              <Marker
                position={location}
                visible
              />
            )
            : null
        }
        {
          trail
            ? (
              trail.map((t, index) => (
                <Polyline
                  key={index}
                  path={t}
                  options={{ strokeWeight: 1 }}
                />
              ))
            )
            : null
        }
        <HeatmapLayer
          data={heatmap}
          options={{ dissipating: true, opacity: 1 }}
        />
      </GoogleMap>
    );
  }

  return null;
};

export default Map;
