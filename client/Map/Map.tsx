import React, { useEffect } from 'react';
import {
  GoogleMap, HeatmapLayer, Marker, Polyline, useJsApiLoader,
} from '@react-google-maps/api';
import Http from '@mortvola/http';
import { DateTime } from 'luxon';
import Controls from './Controls';
import styles from './Map.module.css';
import {
  HeatmapResponse, PointResponse, TrailResponse,
} from '../../common/ResponseTypes';

export type LocationStatus = 'red' | 'green' | 'yellow';

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
  onLocationStatus: (status: LocationStatus) => void,
  showLocation?: boolean,
}

const MapWrapper: React.FC<PropsType> = ({ apiKey, onLocationStatus, showLocation = false }) => {
  const { isLoaded } = useJsApiLoader({
    id: 'google-map-script',
    googleMapsApiKey: apiKey,
    libraries,
  });

  const [, setMap] = React.useState<google.maps.Map | null>(null);
  const [location, setLocation] = React.useState<{ lat: number, lng: number } | null>(null);
  const [trail, setTrail] = React.useState<{ lat: number, lng: number }[][] | null>(null);
  const [heatmap, setHeatmap] = React.useState<google.maps.LatLng[]>([]);
  const [heatmapDay, setHeatmapDay] = React.useState<number>(
    DateTime.now().minus({ days: 1 }).diff(DateTime.fromISO('2022-01-01'), 'days').days,
  );
  const heatmaps = React.useRef<Map<number, google.maps.LatLng[]>>();

  if (heatmaps.current === undefined) {
    heatmaps.current = new Map<number, google.maps.LatLng[]>();
  }

  useEffect(() => {
    if (showLocation) {
      (async () => {
        try {
          const response = await Http.get<PointResponse>('/api/location');

          if (response.ok) {
            const body = await response.body();

            if (body.code === 'success') {
              if (!body.point) {
                throw new Error('point is  undefined');
              }

              setLocation({
                lat: body.point.point[1],
                lng: body.point.point[0],
              });

              onLocationStatus('green');
            }
            else if (body.code === 'gps-feed-null') {
              onLocationStatus('yellow');
            }
            else {
              onLocationStatus('red');
            }
          }
        }
        catch (error) {
          onLocationStatus('red');
        }
      })();
    }
    else {
      setLocation(null);
    }
  }, [onLocationStatus, showLocation]);

  useEffect(() => {
    (async () => {
      const response = await Http.get<TrailResponse>('/api/trail/PCT');

      if (response.ok) {
        const body = await response.body();

        setTrail(body.map((p) => (
          p.map((c) => ({ lat: c[1], lng: c[0] }))
        )));
      }
    })();
  }, []);

  React.useEffect(() => {
    (async () => {
      if (!heatmaps.current) {
        throw new Error('heatmaps.current is null');
      }

      let hm = heatmaps.current.get(heatmapDay);

      if (!hm) {
        const response = await Http.get<HeatmapResponse>(`/api/heatmap/2022/${heatmapDay}`);

        if (response.ok) {
          const body = await response.json();

          hm = body.map((p) => (
            new google.maps.LatLng(p[1], p[0])
          ));

          heatmaps.current.set(heatmapDay, hm);
          setHeatmap(heatmaps.current.get(heatmapDay) ?? []);
        }
        else {
          heatmaps.current.set(heatmapDay, []);
          setHeatmap([]);
        }
      }
      else {
        setHeatmap(hm);
      }
    })();
  }, [heatmapDay]);

  const handleChange = async (value: number) => {
    setHeatmapDay(value);
  };

  const onLoad = React.useCallback((m: google.maps.Map) => {
    setMap(m);
  }, []);

  const onUnmount = React.useCallback(() => {
    setMap(null);
  }, []);

  const { days } = DateTime.fromISO('2022-12-31').diff(DateTime.fromISO('2022-01-01'), 'days');

  if (isLoaded) {
    return (
      <div className={styles.layout}>
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
        <div className={styles.date}>
          {DateTime.fromISO('2022-01-01').plus({ days: heatmapDay }).toISODate()}
        </div>
        <Controls
          min={0}
          max={days}
          onChange={handleChange}
          value={heatmapDay}
        />
      </div>
    );
  }

  return null;
};

export default MapWrapper;
