import React from 'react';
import { createRoot } from 'react-dom/client';
import Http from '@mortvola/http';
import { Dropdown } from 'react-bootstrap';
import CookieConsent from 'react-cookie-consent';
import Map from '../Map/Map';
import styles from './App.module.css';
import 'bootstrap/dist/css/bootstrap.min.css';
import { useGarminFeedSettings } from './GarminFeedSettings';
import AvatarButton from './AvatarButton';
import { useDeleteConfirmation } from './DeleteConfirmation';
import Login from './login/Login';

type PropsType = {
  mapApiKey: string,
  avatarUrl: string | null,
}

const App: React.FC<PropsType> = ({ mapApiKey, avatarUrl }) => {
  const [Settings, showSettings] = useGarminFeedSettings();
  const [DeleteConfirmation, handleDeleteClick] = useDeleteConfirmation(
    'Are you sure you want to delete your account?',
    async () => {
      console.log('delete account');
      const response = await Http.delete('/api/account');

      if (response.ok) {
        window.location.assign('/');
      }
    },
  );
  const [showLogin, setShowLogin] = React.useState(false);

  type User = {
    id: number,
    avatarUrl: string | null,
  }

  const [user, setUser] = React.useState<User | null>(null);

  React.useEffect(() => {
    (async () => {
      const response = await Http.get<User | null>('/api/user');

      if (response.ok) {
        const body = await response.body();

        setUser(body);
      }
      else {
        setUser(null);
      }
    })();
  }, []);

  const handleLoginClick = () => {
    setShowLogin(true);
  };

  const handleLoginHide = () => {
    setShowLogin(false);
  };

  const handleLoggedIn = async () => {
    const response = await Http.get<User | null>('/api/user');

    if (response.ok) {
      const body = await response.body();

      setUser(body);
    }
    else {
      setUser(null);
    }

    setShowLogin(false);
  };

  const handleSelect = async (event: string | null) => {
    switch (event) {
      case 'LOGOUT': {
        const response = await Http.post('/logout');

        if (response.ok) {
          setUser(null);
        }

        break;
      }

      case 'SETTINGS':
        showSettings();
        break;

      case 'DELETE_ACCOUNT':
        handleDeleteClick();
        break;

      default:
        break;
    }
  };

  return (
    <>
      <div className={styles.layout}>
        <div className={styles.toolbar}>
          <span className={styles.title}>Hiker Bubbles</span>
          {
            user
              ? (
                <Dropdown onSelect={handleSelect}>
                  <Dropdown.Toggle avatarUrl={user.avatarUrl} as={AvatarButton} />
                  <Dropdown.Menu>
                    <Dropdown.Item eventKey="SETTINGS">Garmin MapShare Settings</Dropdown.Item>
                    <Dropdown.Item eventKey="LOGOUT">Sign Out</Dropdown.Item>
                    <Dropdown.Divider />
                    <Dropdown.Item eventKey="DELETE_ACCOUNT">Delete Account</Dropdown.Item>
                  </Dropdown.Menu>
                </Dropdown>
              )
              : (
                <div className={styles.toolbar}>
                  <button type="button" onClick={handleLoginClick}>Sign In</button>
                </div>
              )
          }
        </div>
        <Map apiKey={mapApiKey} showLocation={user !== null} />
        <CookieConsent>
          This site uses cookies to enhance the user experience.
        </CookieConsent>
      </div>
      <Login show={showLogin} onHide={handleLoginHide} onLoggedIn={handleLoggedIn} />
      <Settings />
      <DeleteConfirmation />
    </>
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
