import React from 'react';
import { createRoot } from 'react-dom/client';
import Http from '@mortvola/http';
import { DropdownButton, Dropdown } from 'react-bootstrap';
import Map from '../Map/Map';
import styles from './App.module.css';
import 'bootstrap/dist/css/bootstrap.min.css';
import { useGarminFeedSettings } from './GarminFeedSettings';
import AvatarButton from './AvatarButton';

type PropsType = {
  mapApiKey: string,
  avatarUrl: string | null,
}

const App: React.FC<PropsType> = ({ mapApiKey, avatarUrl }) => {
  const [Settings, showSettings] = useGarminFeedSettings();

  const handleSelect = async (event: string | null) => {
    switch (event) {
      case 'LOGOUT': {
        const response = await Http.post('/logout');

        if (response.ok) {
          window.location.replace('/');
        }

        break;
      }

      case 'SETTINGS':
        showSettings();
        break;

      default:
        break;
    }
  };

  return (
    <div className={styles.layout}>
      <div className={styles.toolbar}>
        <Dropdown onSelect={handleSelect}>
          <Dropdown.Toggle avatarUrl={avatarUrl} as={AvatarButton} />
          <Dropdown.Menu>
            <Dropdown.Item eventKey="SETTINGS">Garmin MapShare Settings</Dropdown.Item>
            <Dropdown.Item eventKey="LOGOUT">Sign Out</Dropdown.Item>
            <Dropdown.Item eventKey="DELETE_ACCOUNT">Delete Account</Dropdown.Item>
          </Dropdown.Menu>
        </Dropdown>
      </div>
      <Map apiKey={mapApiKey} showLocation />
      <Settings />
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
