import { InfoWindow, Marker } from '@react-google-maps/api';
import { DateTime } from 'luxon';
import React from 'react';

export type WildlandFire = {
  id: string,
  latlng: google.maps.LatLng,
  name: string,
  discoveredAt: DateTime,
  modifiedAt: DateTime,
  incidentTypeCategory: string,
  incidentSize: number | null,
  percentContained: number | null,
  distance?: number,
  perimeter?: { rings: google.maps.LatLng[][] },
};

type PropsType = {
  wf: WildlandFire,
  infoWindowOpen?: boolean,
  setInfoWindowOpen?: (id: string | null) => void,
}

const WildlandFireMarker: React.FC<PropsType> = ({
  wf,
  infoWindowOpen = false,
  setInfoWindowOpen,
}) => {
  const handleWfClick = () => {
    if (setInfoWindowOpen) {
      setInfoWindowOpen(infoWindowOpen ? null : wf.id);
    }
  };

  const handleInfoClose = () => {
    if (setInfoWindowOpen) {
      setInfoWindowOpen(null);
    }
  };

  return (
    <Marker
      position={wf.latlng}
      onClick={handleWfClick}
      options={{
        title: wf.name,
        icon: 'https://inciweb.nwcg.gov/images/esri/marker_fire.png',
      }}
    >
      {
        infoWindowOpen
          ? (
            <InfoWindow onCloseClick={handleInfoClose}>
              <div>
                <div>{wf.name}</div>
                <div>{`Discovered At: ${wf.discoveredAt.toLocaleString(DateTime.DATETIME_SHORT)}`}</div>
                <div>{`Updated At: ${wf.modifiedAt.toLocaleString(DateTime.DATETIME_SHORT)}`}</div>
                <div>{`Category: ${wf.incidentTypeCategory}`}</div>
                <div>{`Size (acres): ${wf.incidentSize ?? 'not set'}`}</div>
                <div>{`Containment: ${wf.percentContained ?? 'not set'}`}</div>
                <div>{`Distance to Trail (miles): ${wf.distance ? (wf.distance / 1609.34).toFixed(1) : 'not set'}`}</div>
              </div>
            </InfoWindow>
          )
          : null
      }
    </Marker>
  );
};

export default WildlandFireMarker;
