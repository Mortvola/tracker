import React from 'react';
import { createRoot } from 'react-dom/client';
import CookieConsent from 'react-cookie-consent';
import Http from '@mortvola/http';
import GoogleMap from '../Map/Map';
import styles from './Welcome.module.css';
import Login from './login/Login';
import Register from './login/Register';
import 'bootstrap/dist/css/bootstrap.min.css';
import Controls from '../Map/Controls';

type PropsType = {
  mapApiKey: string,
}

const App: React.FC<PropsType> = ({ mapApiKey }) => {
  type HeatmapListEntry = {
    id: number,
    date: string,
    map: null | google.maps.LatLng[],
  };

  const [showLogin, setShowLogin] = React.useState(false);
  const [showRegister, setShowRegister] = React.useState(false);
  const [heatmapList, setHeatmaplist] = React.useState<HeatmapListEntry[]>([]);
  const [heatmap, setHeatmap] = React.useState<google.maps.LatLng[]>([]);
  const [heatmapIndex, setHeatmapIndex] = React.useState<number>(0);

  React.useEffect(() => {
    (async () => {
      const response = await Http.get<{ id: number, date: string }[]>('/api/heatmap-list');

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

  const handleLoginClick = () => {
    setShowLogin(true);
  };

  const handleLoginHide = () => {
    setShowLogin(false);
  };

  const handleRegisterClick = () => {
    setShowRegister(true);
  };

  const handleRegisterHide = () => {
    setShowRegister(false);
  };

  const handleChange = async (value: number) => {
    setHeatmapIndex(value);
  };

  React.useEffect(() => {
    (async () => {
      const hm = heatmapList[heatmapIndex].map;

      if (hm === null) {
        const response = await Http.get<[number, number][]>(`/api/heatmap/${heatmapList[heatmapIndex].id}`);

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

  return (
    <div className={styles.layout}>
      <div className={styles.toolbar}>
        <button type="button" onClick={handleRegisterClick}>Register</button>
        <button type="button" onClick={handleLoginClick}>Login</button>
      </div>
      <GoogleMap apiKey={mapApiKey} heatmap={heatmap} />
      <Controls
        min={0}
        max={heatmapList.length - 1}
        onChange={handleChange}
        value={heatmapIndex}
      />
      <CookieConsent>
        This site uses cookies to enhance the user experience.
      </CookieConsent>
      <Login show={showLogin} onHide={handleLoginHide} />
      <Register show={showRegister} onHide={handleRegisterHide} />
    </div>
  );
};

const rootElement = document.querySelector('.app');

if (rootElement) {
  const initialPropsString = rootElement.getAttribute('data-props');
  if (initialPropsString === null) {
    throw new Error('initialProps attribute could not be found');
  }

  const initialProps = JSON.parse(initialPropsString);

  const root = createRoot(rootElement);

  root.render(
    <App {...initialProps} />,
  );
}
