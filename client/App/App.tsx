import React from 'react';
import { createRoot } from 'react-dom/client';
import Http from '@mortvola/http';
import { Dropdown } from 'react-bootstrap';
import CookieConsent from 'react-cookie-consent';
import Map, { LocationStatus } from '../Map/Map';
import styles from './App.module.css';
import 'bootstrap/dist/css/bootstrap.min.css';
import { useGarminFeedSettings } from './GarminFeedSettings';
import AvatarButton from './AvatarButton';
import { useDeleteConfirmation } from './DeleteConfirmation';
import Login from './login/Login';
import GpsFeedStatus from './GpsFeedStatus';
import { PointResponse, UserResponse } from '../../common/ResponseTypes';
import SetupUserDialog from './setup/SetupUser';

type PropsType = {
  mapApiKey: string,
}

const App: React.FC<PropsType> = ({ mapApiKey }) => {
  const [Settings, showSettings] = useGarminFeedSettings();
  const [showSetupDialog, setShowSetupDialog] = React.useState(false);
  const [locationStatus, setLocationStatus] = React.useState<LocationStatus>('yellow');
  const [DeleteConfirmation, handleDeleteClick] = useDeleteConfirmation(
    'Are you sure you want to delete your account?',
    async () => {
      const response = await Http.delete('/api/account');

      if (response.ok) {
        window.location.assign('/');
      }
    },
  );
  const [showLogin, setShowLogin] = React.useState(false);
  const [user, setUser] = React.useState<UserResponse | null>(null);

  const getUser = React.useCallback(
    async () => {
      const response = await Http.get<UserResponse | null>('/api/user');

      if (response.ok) {
        const body = await response.body();

        setUser(body);
      }
      else {
        setUser(null);
      }
    }, []);

  React.useEffect(() => {
    getUser();
  }, [getUser]);

  React.useEffect(() => {
    if (user !== null && !user.initialized) {
      setShowSetupDialog(true);
    }
  }, [user]);

  const [location, setLocation] = React.useState<{ lat: number, lng: number } | null>(null);

  const locateUser = React.useCallback(async () => {
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

          setLocationStatus('green');
        }
        else if (body.code === 'gps-feed-null') {
          setLocation(null);
          setLocationStatus('yellow');
        }
        else {
          setLocation(null);
          setLocationStatus('red');
        }
      }
      else {
        setLocation(null);
        setLocationStatus('red');
      }
    }
    catch (error) {
      setLocationStatus('red');
      setLocation(null);
    }
  }, []);

  React.useEffect(() => {
    if (user) {
      locateUser();
    }
    else {
      setLocation(null);
    }
  }, [locateUser, user]);

  const handleLoginClick = () => {
    setShowLogin(true);
  };

  const handleLoginHide = () => {
    setShowLogin(false);
  };

  const handleLoggedIn = async () => {
    await getUser();

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

      case 'SETUP':
        setShowSetupDialog(true);
        break;

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

  const handleSettingsHide = () => {
    locateUser();
  };

  const handleUserSetupFinish = () => {
    setShowSetupDialog(false);
    if (user) {
      setUser({
        ...user,
        initialized: true,
      });

      locateUser();
    }
  };

  return (
    <>
      <div className={styles.layout}>
        <div className={styles.toolbar}>
          <span className={styles.title}>Hiker Heat Map</span>
          {
            user
              ? (
                <div className={styles.iconTray}>
                  <GpsFeedStatus status={locationStatus} />
                  <Dropdown onSelect={handleSelect}>
                    <Dropdown.Toggle avatarUrl={user.avatarUrl} as={AvatarButton} />
                    <Dropdown.Menu>
                      {
                          user !== null && !user.initialized
                            ? <Dropdown.Item eventKey="SETUP">Setup...</Dropdown.Item>
                            : <Dropdown.Item eventKey="SETTINGS">Garmin MapShare Settings...</Dropdown.Item>
                      }
                      <Dropdown.Item eventKey="LOGOUT">Sign Out</Dropdown.Item>
                      <Dropdown.Divider />
                      <Dropdown.Item eventKey="DELETE_ACCOUNT">Delete Account</Dropdown.Item>
                    </Dropdown.Menu>
                  </Dropdown>
                </div>
              )
              : (
                <div className={styles.toolbar}>
                  <button type="button" onClick={handleLoginClick}>Sign In</button>
                </div>
              )
          }
        </div>
        <Map
          apiKey={mapApiKey}
          location={location}
        />
        <CookieConsent style={{ zIndex: 2000 }}>
          This site uses cookies to enhance the user experience.
        </CookieConsent>
      </div>
      <Login show={showLogin} onHide={handleLoginHide} onLoggedIn={handleLoggedIn} />
      <Settings onHide={handleSettingsHide} />
      <SetupUserDialog
        show={showSetupDialog}
        onHide={() => setShowSetupDialog(false)}
        onFinish={handleUserSetupFinish}
      />
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
