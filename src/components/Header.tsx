import React from 'react';
import mumeMarkLight from '../assets/mume-mark-light.png';
import { Icon } from './Icon';

interface HeaderProps {
  title?: string;
  subtitle?: string;
  showBack?: boolean;
  onBack?: () => void;
  onProfileClick?: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  title = 'Mume',
  subtitle = 'Santa Ana Sari-Sari Store',
  showBack = false,
  onBack,
  onProfileClick,
}) => {
  return (
    <header className="app-header">
      {showBack && onBack ? (
        <button
          type="button"
          onClick={onBack}
          aria-label="Go back"
          className="flex items-center justify-center min-w-[48px] min-h-[48px] -ml-2 rounded-full active:bg-black/5 transition-colors"
        >
          <Icon name="chevron-left" size={24} />
        </button>
      ) : null}

      <div className="brand-mark">
        <img src={mumeMarkLight} alt="Mume Brand Mark" />
      </div>

      <div className="brand-copy">
        <strong>{title}</strong>
        <span>{subtitle}</span>
      </div>

      <button
        aria-label="Open profile settings"
        className="profile-button"
        type="button"
        onClick={onProfileClick}
      >
        AN
      </button>
    </header>
  );
};

export default Header;

