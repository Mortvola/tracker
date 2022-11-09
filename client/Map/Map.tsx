import React from 'react';
import {
  GoogleMap, HeatmapLayer, Marker, Polygon, Polyline, useJsApiLoader,
} from '@react-google-maps/api';
import Http from '@mortvola/http';
import { DateTime } from 'luxon';
import { Toast, ToastContainer } from 'react-bootstrap';
import Controls from './Controls';
import styles from './Map.module.css';
import {
  HeatmapResponse, PerimeterResponse, TrailResponse, WildlandFireResponse,
} from '../../common/ResponseTypes';
import WildlandFireMarker, { Perimeter, WildlandFire } from './WildlandFireMarker';
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

  type Changes = 'New' | 'Size' | 'Distance';

  type WildfireChanges = {
    wildlandFire: WildlandFire,
    changes: Changes[],
  }

  const [loading, setLoading] = React.useState<boolean>(true);
  const [, setMap] = React.useState<google.maps.Map | null>(null);
  const [trail, setTrail] = React.useState<{ lat: number, lng: number }[][] | null>(null);
  const [heatmap, setHeatmap] = React.useState<google.maps.LatLng[]>([]);
  const [day, setDay] = React.useState<number>(
    Math.trunc(DateTime.now().diff(DateTime.fromISO('2022-01-01'), 'days').days),
  );
  const heatmaps = React.useRef<Map<number, google.maps.LatLng[]>>();
  const incidents = React.useRef<Map<number, WildlandFire[]>>();
  const perimeters = React.useRef<Map<number, Perimeter>>();
  const [wildlandFires, setWildlandFires] = React.useState<WildlandFire[] | null>(null);
  const [changeAlerts, setChangeAlerts] = React.useState<WildfireChanges[]>([]);

  if (heatmaps.current === undefined) {
    heatmaps.current = new Map<number, google.maps.LatLng[]>();
  }

  if (incidents.current === undefined) {
    incidents.current = new Map<number, WildlandFire[]>();
  }

  if (perimeters.current === undefined) {
    perimeters.current = new Map<number, Perimeter>();
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

  const compareIncidents = React.useCallback((
    prevWf: WildlandFire[] | undefined,
    wf: WildlandFire[],
  ) => {
    if (prevWf) {
      wf.forEach((incident) => {
        const prevIncident = prevWf.find((i) => i.id === incident.id);

        const incidentChanges: WildfireChanges = {
          wildlandFire: incident,
          changes: [],
        };

        if (!prevIncident) {
          incidentChanges.changes = ['New'];
        }
        else {
          if (prevIncident?.distance !== incident.distance) {
            incidentChanges.changes.push('Distance');
          }

          if (prevIncident?.incidentSize !== incident.incidentSize) {
            incidentChanges.changes.push('Size');
          }
        }

        if (incidentChanges.changes.length) {
          setChangeAlerts((prev) => ([
            incidentChanges,
            ...prev,
          ]));
        }
      });
    }
  }, []);

  const fetchPerimeters = async (wf: WildlandFire[]) => {
    const perimetersMap = perimeters.current;

    if (perimetersMap) {
      wf.forEach(async (w) => {
        if (w.perimeterId !== null && !perimetersMap.has(w.perimeterId)) {
          const response = await Http.get<PerimeterResponse>(`/api/perimeter/${w.perimeterId}`);

          if (response.ok) {
            const body = await response.body();

            perimetersMap.set(w.perimeterId, {
              rings: body.rings.map((r) => (
                r.map((r2) => (
                  new google.maps.LatLng(r2[1], r2[0])
                ))
              )),
            });

            console.log(`added perimeter ${w.perimeterId}`);
          }
        }
      });
    }
  };

  const fetchWildfireIncidents = React.useCallback(async () => {
    if (!incidents.current) {
      throw new Error('incidents.current is null');
    }

    setLoading(true);
    try {
      const response = await Http.get<WildlandFireResponse>(`/api/wildland-fires/2022/${day}`);

      if (response.ok) {
        const body = await response.body();

        const wf: WildlandFire[] = body.map((p) => ({
          id: p.globalId,
          latlng: new google.maps.LatLng(p.lat, p.lng),
          name: p.name,
          discoveredAt: DateTime.fromISO(p.discoveredAt),
          modifiedAt: DateTime.fromISO(p.modifiedAt),
          incidentTypeCategory: p.incidentTypeCategory,
          incidentSize: p.incidentSize,
          percentContained: p.percentContained,
          distance: p.distance,
          perimeterId: p.perimeterId,
          // perimeter: {
          //   rings: p.perimeter
          //     ? p.perimeter.rings.map((r) => (
          //       r.map((r2) => (
          //         new google.maps.LatLng(r2[1], r2[0])
          //       ))
          //     ))
          //     : [],
          // },
        }));

        const prevWf = incidents.current.get(day);
        compareIncidents(prevWf, wf);
        incidents.current.set(day, wf);
        setWildlandFires(incidents.current.get(day) ?? []);

        return wf;
      }

      incidents.current.set(day, []);
      setWildlandFires([]);
    }
    catch (error) {
      console.log(error);
    }
    setLoading(false);

    return [];
  }, [compareIncidents, day]);

  React.useEffect(() => {
    if (isLoaded) {
      (async () => {
        if (!incidents.current) {
          throw new Error('incidents.current is null');
        }

        const wf = incidents.current.get(day);

        if (!wf) {
          const wf2 = await fetchWildfireIncidents();
          fetchPerimeters(wf2);
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

  const renderChange = (cx: Changes) => {
    switch (cx) {
      case 'New':
        return <div key="New">New fire incident</div>;

      case 'Distance':
        return <div key="Distance">Distance to trail changed</div>;

      case 'Size':
        return <div key="Size">Size of incident changed</div>;

      default:
        return <div key="Unknown">Unknown change</div>;
    }
  };

  const handleCloseToast = (change: WildfireChanges) => {
    setChangeAlerts((prev) => {
      const index = prev.findIndex((c) => c.wildlandFire.id === change.wildlandFire.id);

      if (index !== -1) {
        return [
          ...prev.slice(0, index),
          ...prev.slice(index + 1),
        ];
      }

      return prev;
    });
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
                    wildlandFires.map((wf) => {
                      let perimeter: Perimeter | undefined;

                      if (wf.perimeterId) {
                        const perimetersMap = perimeters.current;

                        if (perimetersMap) {
                          perimeter = perimetersMap.get(wf.perimeterId);
                          if (perimeter) {
                            console.log(`perimeter found in map: ${wf.perimeterId}, ${perimeter.rings.length}`);
                          }
                          else {
                            console.log(`perimeter not found in map: ${wf.perimeterId}`);
                          }
                        }
                      }

                      return (
                        perimeter
                          ? (
                            <Polygon
                              key={wf.id}
                              paths={perimeter.rings}
                              options={{
                                fillColor: '#cf0000',
                                fillOpacity: 0.25,
                                strokeColor: '#cf0000',
                              }}
                            />
                          )
                          : null
                      );
                    })
                  }
                </>
              )
              : null
          }
          {
            loading
              ? (
                <div className={styles.loading}>
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
          <ToastContainer position="top-end" className={styles.toasts}>
            {
              changeAlerts.map((c) => (
                <Toast key={c.wildlandFire.id} onClose={() => handleCloseToast(c)}>
                  <Toast.Header className={styles.toastHeader}>
                    {c.wildlandFire.name}
                  </Toast.Header>
                  <Toast.Body>
                    {
                      c.changes.map((cx) => (
                        renderChange(cx)
                      ))
                    }
                  </Toast.Body>
                </Toast>
              ))
            }
          </ToastContainer>
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
