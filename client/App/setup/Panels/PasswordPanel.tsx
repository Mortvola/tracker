import React from 'react';
import { Button } from 'react-bootstrap';
import { NextPanelHandler } from './types';
import styles from './Panel.module.css';
import { useStore } from '../Context';

type PropsType = {
  onNext: NextPanelHandler,
}

const PasswordPanel: React.FC<PropsType> = ({
  onNext,
}) => {
  const store = useStore();
  const [password, setPassword] = React.useState(store.password ?? '');

  const handlePrevClick = () => {
    store.password = password;
    onNext('url');
  };

  const handleNextClick = () => {
    store.password = password;
    onNext('test');
  };

  const handleChange: React.ChangeEventHandler<HTMLInputElement> = (event) => {
    setPassword(event.target.value);
  };

  return (
    <div className={styles.body}>
      <div>
        If your MapShare is password protected, enter the password below.
        You can find the password under MapShare Settings.
      </div>
      <div className={styles.inputWrapper}>
        Password:
        <input onChange={handleChange} value={password} />
      </div>
      <img src="/mapshare_password.png" alt="mapshare" style={{ width: '80%' }} />
      <div className={styles.footer}>
        <Button onClick={handlePrevClick}>Previous</Button>
        <Button onClick={handleNextClick}>Next</Button>
      </div>
    </div>
  );
};

export default PasswordPanel;
