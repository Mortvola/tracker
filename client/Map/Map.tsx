import React from 'react';
import {
  GoogleMap, HeatmapLayer, Marker, Polygon, Polyline, useJsApiLoader,
} from '@react-google-maps/api';
import Http from '@mortvola/http';
import { DateTime } from 'luxon';
import Controls from './Controls';
import styles from './Map.module.css';
import {
  HeatmapResponse, TrailResponse, WildlandFireResponse,
} from '../../common/ResponseTypes';
import WildlandFireMarker, { WildlandFire } from './WildlandFireMarker';
import IconButton from '../IconButton/IconButton';

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
  location?: { lat: number, lng: number } | null,
}

const MapWrapper: React.FC<PropsType> = ({
  apiKey,
  location,
}) => {
  const { isLoaded } = useJsApiLoader({
    id: 'google-map-script',
    googleMapsApiKey: apiKey,
    libraries,
  });

  const [loading, setLoading] = React.useState<boolean>(true);
  const [, setMap] = React.useState<google.maps.Map | null>(null);
  const [trail, setTrail] = React.useState<{ lat: number, lng: number }[][] | null>(null);
  const [heatmap, setHeatmap] = React.useState<google.maps.LatLng[]>([]);
  const [day, setDay] = React.useState<number>(
    Math.trunc(DateTime.now().diff(DateTime.fromISO('2022-01-01'), 'days').days),
  );
  const heatmaps = React.useRef<Map<number, google.maps.LatLng[]>>();
  const incidents = React.useRef<Map<number, WildlandFire[]>>();
  const [wildlandFires, setWildlandFires] = React.useState<WildlandFire[] | null>(null);

  if (heatmaps.current === undefined) {
    heatmaps.current = new Map<number, google.maps.LatLng[]>();
  }

  if (incidents.current === undefined) {
    incidents.current = new Map<number, WildlandFire[]>();
  }

  React.useEffect(() => {
    (async () => {
      const response = await Http.get<TrailResponse>('/PCT.json');

      if (response.ok) {
        const body = await response.body();

        setTrail(body.map((p) => (
          p.map((c) => ({ lat: c[1], lng: c[0] }))
        )));
      }
    })();
  }, []);

  // React.useEffect(() => {
  //   (async () => {
  //     const response = await Http.get<WildlandFireResponse>('/api/wildland-fires');

  //     if (response.ok) {
  //       const body = await response.body();

  //       setWildlandFires(body.map((p) => ({
  //         id: p.globalId,
  //         latlng: new google.maps.LatLng(p.lat, p.lng),
  //         name: p.name,
  //         discoveredAt: DateTime.fromISO(p.discoveredAt),
  //         modifiedAt: DateTime.fromISO(p.modifiedAt),
  //         incidentSize: p.incidentSize,
  //         percentContained: p.percentContained,
  //       })));
  //     }
  //   })();
  // }, []);

  React.useEffect(() => {
    if (isLoaded) {
      (async () => {
        if (!heatmaps.current) {
          throw new Error('heatmaps.current is null');
        }

        let hm = heatmaps.current.get(day);

        if (!hm) {
          const response = await Http.get<HeatmapResponse>(`/api/heatmap/2022/${day}`);

          if (response.ok) {
            const body = await response.json();

            hm = body.map((p) => (
              new google.maps.LatLng(p[1], p[0])
            ));

            heatmaps.current.set(day, hm);
            setHeatmap(heatmaps.current.get(day) ?? []);
          }
          else {
            heatmaps.current.set(day, []);
            setHeatmap([]);
          }
        }
        else {
          setHeatmap(hm);
        }
      })();
    }
  }, [day, isLoaded]);

  const fetchWildfireIncidents = React.useCallback(async () => {
    if (!incidents.current) {
      throw new Error('incidents.current is null');
    }

    setLoading(true);
    try {
      const response = await Http.get<WildlandFireResponse>(`/api/wildland-fires/2022/${day}`);

      if (response.ok) {
        const body = await response.body();

        const wf = body.map((p) => ({
          id: p.globalId,
          latlng: new google.maps.LatLng(p.lat, p.lng),
          name: p.name,
          discoveredAt: DateTime.fromISO(p.discoveredAt),
          modifiedAt: DateTime.fromISO(p.modifiedAt),
          incidentTypeCategory: p.incidentTypeCategory,
          incidentSize: p.incidentSize,
          percentContained: p.percentContained,
          distance: p.distance,
          perimeter: {
            rings: p.perimeter
              ? p.perimeter.rings.map((r) => (
                r.map((r2) => (
                  new google.maps.LatLng(r2[1], r2[0])
                ))
              ))
              : [],
          },
        }));

        incidents.current.set(day, wf);
        setWildlandFires(incidents.current.get(day) ?? []);
      }
      else {
        incidents.current.set(day, []);
        setWildlandFires([]);
      }
    }
    catch (error) {
      console.log(error);
    }
    setLoading(false);
  }, [day]);

  React.useEffect(() => {
    if (isLoaded) {
      (async () => {
        if (!incidents.current) {
          throw new Error('incidents.current is null');
        }

        const wf = incidents.current.get(day);

        if (!wf) {
          fetchWildfireIncidents();
        }
        else {
          setWildlandFires(wf);
        }
      })();
    }
  }, [day, fetchWildfireIncidents, isLoaded]);

  const [infoWindowOpen, setInfoWindowOpen] = React.useState<string | null>(null);
  const handleInfoWindowOpen = (id: string | null) => {
    setInfoWindowOpen(id);
  };

  const handleChange = async (value: number) => {
    setDay(value);
    setInfoWindowOpen(null);
  };

  const handleDecrement = async () => {
    setDay((prev) => prev - 1);
    setInfoWindowOpen(null);
  };

  const handleIncrement = async () => {
    setDay((prev) => prev + 1);
    setInfoWindowOpen(null);
  };

  const onLoad = React.useCallback((m: google.maps.Map) => {
    setMap(m);
  }, []);

  const onUnmount = React.useCallback(() => {
    setMap(null);
  }, []);

  const handleRefresh = () => {
    fetchWildfireIncidents();
  };

  if (isLoaded) {
    const { days } = DateTime.fromISO('2022-12-31').diff(DateTime.fromISO('2022-01-01'), 'days');

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
            wildlandFires
              ? (
                <>
                  {
                    wildlandFires.map((wf) => (
                      <WildlandFireMarker
                        key={wf.id}
                        wf={wf}
                        infoWindowOpen={infoWindowOpen === wf.id}
                        setInfoWindowOpen={handleInfoWindowOpen}
                      />
                    ))
                  }
                  {
                    wildlandFires.map((wf) => (
                      wf.perimeter
                        ? (
                          <Polygon
                            key={wf.id}
                            paths={wf.perimeter.rings}
                            options={{
                              fillColor: '#cf0000',
                              fillOpacity: 0.25,
                              strokeColor: '#cf0000',
                            }}
                          />
                        )
                        : null
                    ))
                  }
                </>
              )
              : null
          }
          {
            loading
              ? (
                <div
                  style={{
                    position: 'absolute',
                    zIndex: 1,
                    backgroundColor: '#fff',
                    padding: '0 0.5rem',
                    bottom: '2px',
                    left: '2px',
                  }}
                >
                  Loading...
                </div>
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
          <div>
            {DateTime.fromISO('2022-01-01').plus({ days: day }).toISODate()}
          </div>
          <IconButton icon="angle-left" onClick={handleDecrement} />
          <IconButton icon="angle-right" onClick={handleIncrement} />
          <IconButton icon="sync-alt" onClick={handleRefresh} />
        </div>
        <Controls
          min={0}
          max={days}
          onChange={handleChange}
          value={day}
        />
      </div>
    );
  }

  return null;
};

export default MapWrapper;
