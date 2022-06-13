import React from 'react';
import { createRoot } from 'react-dom/client';
import CookieConsent from 'react-cookie-consent';
import Http from '@mortvola/http';
import Map from '../Map/Map';
import styles from './Welcome.module.css';
import Login from './login/Login';
import Register from './login/Register';
import 'bootstrap/dist/css/bootstrap.min.css';
import Controls from '../Map/Controls';

type PropsType = {
  mapApiKey: string,
}

const App: React.FC<PropsType> = ({ mapApiKey }) => {
  const [showLogin, setShowLogin] = React.useState(false);
  const [showRegister, setShowRegister] = React.useState(false);
  const [heatmapList, setHeatmaplist] = React.useState<{ id: number, date: string }[]>([]);
  const [heatmap, setHeatmap] = React.useState<google.maps.LatLng[]>([]);

  React.useEffect(() => {
    (async () => {
      const response = await Http.get<{ id: number, date: string }[]>('/api/heatmap-list');

      if (response.ok) {
        const body = await response.body();

        setHeatmaplist(body);
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

  const handleChange = (value: number) => {
    (async () => {
      const response = await Http.get<[number, number][]>(`/api/heatmap/${heatmapList[value].id}`);

      if (response.ok) {
        const body = await response.json();

        setHeatmap(body.map((p) => (
          new google.maps.LatLng(p[1], p[0])
        )));
      }
    })();
};

  return (
    <div className={styles.layout}>
      <div className={styles.toolbar}>
        <button type="button" onClick={handleRegisterClick}>Register</button>
        <button type="button" onClick={handleLoginClick}>Login</button>
      </div>
      <Map apiKey={mapApiKey} heatmap={heatmap} />
      <Controls min={0} max={heatmapList.length - 1} onChange={handleChange} />
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
