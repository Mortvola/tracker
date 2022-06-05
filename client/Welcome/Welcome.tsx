import React from 'react';
import { createRoot } from 'react-dom/client';
import CookieConsent from 'react-cookie-consent';
import Map from '../Map/Map';
import styles from './Welcome.module.css';
import Login from './login/Login';
import Register from './login/Register';
import 'bootstrap/dist/css/bootstrap.min.css';

type PropsType = {
  mapApiKey: string,
}

const App: React.FC<PropsType> = ({ mapApiKey }) => {
  const [showLogin, setShowLogin] = React.useState(false);
  const [showRegister, setShowRegister] = React.useState(false);

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

  return (
    <div className={styles.layout}>
      <div className={styles.toolbar}>
        <button type="button" onClick={handleRegisterClick}>Register</button>
        <button type="button" onClick={handleLoginClick}>Login</button>
      </div>
      <Map apiKey={mapApiKey} />
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
