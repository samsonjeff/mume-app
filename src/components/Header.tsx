import React from 'react';
import mumeMarkLight from '../assets/mume-mark-light.png';
import { Icon } from './Icon';

interface HeaderProps {
  title?: string;
  subtitle?: string;
  showBack?: boolean;
  userInitials?: string;
  onBack?: () => void;
  onProfileClick?: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  title = 'Mume',
  subtitle = 'Santa Ana Sari-Sari Store',
  showBack = false,
  userInitials = 'JS',
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
          className="menu-button"
        >
          <Icon name="chevron-left" size={20} />
        </button>
      ) : (
        <button
          type="button"
          onClick={onProfileClick}
          aria-label="Open menu"
          className="menu-button"
        >
          <span className="text-base font-bold">☰</span>
        </button>
      )}

      <div
        className="model-pill cursor-pointer"
        onClick={onProfileClick}
        role="button"
        tabIndex={0}
        aria-label="Store details & mode"
      >
        <img src={mumeMarkLight} alt="Mume" className="w-4 h-4 rounded-full object-contain" />
        <strong className="text-xs font-bold">{title}</strong>
        <span className="truncate max-w-[130px] text-[11px] opacity-75">{subtitle}</span>
        <span className="text-[11px] opacity-60">▾</span>
      </div>

      <button
        aria-label="Open profile settings"
        className="profile-button"
        type="button"
        onClick={onProfileClick}
      >
        {userInitials}
      </button>
    </header>
  );
};

export default Header;

