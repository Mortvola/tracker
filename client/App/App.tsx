import React from 'react';
import { createRoot } from 'react-dom/client';
import Http from '@mortvola/http';
import Map from '../Map/Map';
import styles from './App.module.css';
import 'bootstrap/dist/css/bootstrap.min.css';

type PropsType = {
  username: string,
  mapApiKey: string,
}

const App: React.FC<PropsType> = ({ username, mapApiKey }) => {
  const handleLogoutClick = async () => {
    const response = await Http.post('/logout');

    if (response.ok) {
      window.location.replace('/');
    }
  };

  return (
    <div className={styles.layout}>
      <div className={styles.toolbar}>
        <div>{username}</div>
        <button type="button" onClick={handleLogoutClick}>Logout</button>
      </div>
      <Map apiKey={mapApiKey} showLocation />
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
