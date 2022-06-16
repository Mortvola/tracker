import React from 'react';
import styles from './AvatarButton.module.css';

type PropsType = {
  avatarUrl: string | null,
  onClick: (event: React.MouseEvent) => void,
};

const AvatarButton: React.FC<PropsType> = React.forwardRef<HTMLButtonElement, PropsType>(({
  avatarUrl,
  onClick,
}, ref) => (
  <button type="button" className={styles.avatarButton} ref={ref} onClick={onClick}>
    <div className={styles.avatarFrame}>
      <img src={avatarUrl ?? '/user-svgrepo-com.svg'} alt="" className={styles.avatar} />
    </div>
  </button>
));

AvatarButton.displayName = 'AvatarButton';

export default AvatarButton;
