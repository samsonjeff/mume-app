import React from 'react';
import { Icon } from './Icon';

interface HeaderProps {
  title?: string;
  subtitle?: string;
  showBack?: boolean;
  userInitials?: string;
  onBack?: () => void;
  onMenuClick?: () => void;
  onProfileClick?: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  showBack = false,
  userInitials = 'JS',
  onBack,
  onMenuClick,
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
          onClick={onMenuClick || onProfileClick}
          aria-label="Main menu"
          className="menu-button"
        >
          <Icon name="menu" size={20} />
        </button>
      )}

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

