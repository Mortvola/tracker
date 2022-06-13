import React, { useEffect } from 'react';
import {
  GoogleMap, HeatmapLayer, Marker, Polyline, useJsApiLoader,
} from '@react-google-maps/api';
import Http from '@mortvola/http';
import Controls from './Controls';
import styles from './Map.module.css';
import { HeatmapListResponse, HeatmapResponse, PointResponse, TrailResponse } from '../../common/ResponseTypes';

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
}

const Map: React.FC<PropsType> = ({ apiKey, showLocation = false }) => {
  const { isLoaded } = useJsApiLoader({
    id: 'google-map-script',
    googleMapsApiKey: apiKey,
    libraries,
  });

  type HeatmapListEntry = {
    id: number,
    date: string,
    map: null | google.maps.LatLng[],
  };

  const [, setMap] = React.useState<google.maps.Map | null>(null);
  const [location, setLocation] = React.useState<{ lat: number, lng: number } | null>(null);
  const [trail, setTrail] = React.useState<{ lat: number, lng: number }[][] | null>(null);
  const [heatmapList, setHeatmaplist] = React.useState<HeatmapListEntry[]>([]);
  const [heatmap, setHeatmap] = React.useState<google.maps.LatLng[]>([]);
  const [heatmapIndex, setHeatmapIndex] = React.useState<number>(0);

  useEffect(() => {
    if (showLocation) {
      (async () => {
        const response = await Http.get<PointResponse>('/api/location');

        if (response.ok) {
          const body = await response.body();
          setLocation({
            lat: body.point[1],
            lng: body.point[0],
          });
        }
      })();
    }
  }, [showLocation]);

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
      const response = await Http.get<HeatmapListResponse>('/api/heatmap-list');

      if (response.ok) {
        const body = await response.body();

        setHeatmaplist(body.map((m) => ({
          id: m.id,
          date: m.date,
          map: null,
        })));

        setHeatmapIndex(body.length - 1);
      }
    })();
  }, []);

  React.useEffect(() => {
    (async () => {
      const hm = heatmapList[heatmapIndex].map;

      if (hm === null) {
        const response = await Http.get<HeatmapResponse>(`/api/heatmap/${heatmapList[heatmapIndex].id}`);

        if (response.ok) {
          const body = await response.json();

          heatmapList[heatmapIndex].map = body.map((p) => (
            new google.maps.LatLng(p[1], p[0])
          ));

          setHeatmap(heatmapList[heatmapIndex].map ?? []);
        }
      }
      else {
        setHeatmap(hm);
      }
    })();
  }, [heatmapIndex, heatmapList]);

  const handleChange = async (value: number) => {
    setHeatmapIndex(value);
  };

  const onLoad = React.useCallback((m: google.maps.Map) => {
    setMap(m);
  }, []);

  const onUnmount = React.useCallback(() => {
    setMap(null);
  }, []);

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
        <Controls
          min={0}
          max={heatmapList.length - 1}
          onChange={handleChange}
          value={heatmapIndex}
        />
      </div>
    );
  }

  return null;
};

export default Map;
