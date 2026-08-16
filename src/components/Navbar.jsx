import { useState } from 'react';

function Navbar({ userName, userRole, isSidebarOpen, onMenuClick, onLogout }) {
  const [isProfileMenuOpen, setIsProfileMenuOpen] = useState(false);

  return (
    <header className="top-navbar">
      <div className="navbar-left">
        <button
          type="button"
          className="sidebar-toggle"
          aria-label={isSidebarOpen ? 'Hide sidebar' : 'Show sidebar'}
          aria-controls="side-navigation"
          aria-expanded={isSidebarOpen}
          onClick={onMenuClick}
        >
          <span /><span /><span />
        </button>
        <div className="navbar-logo" aria-hidden="true">
          <svg viewBox="0 0 24 24"><path d="M12 2.75 20 7.3v9.4l-8 4.55-8-4.55V7.3l8-4.55Z" /><path d="m8.4 12 2.3 2.3 4.9-5" /></svg>
        </div>
        <div className="navbar-brand"><h2>AEGIS Autopro</h2><span>TXE / RDB Portal</span></div>
      </div>
      <div className="navbar-right">
        <div className="profile-menu-wrapper">
          <button
            type="button"
            className="profile-trigger"
            aria-label="Open user menu"
            aria-haspopup="menu"
            aria-expanded={isProfileMenuOpen}
            onClick={() => setIsProfileMenuOpen((open) => !open)}
          >
            <span className="profile-avatar" aria-hidden="true"><svg viewBox="0 0 24 24"><circle cx="12" cy="8" r="3.25" /><path d="M5.5 20c.65-3.35 3.15-5.25 6.5-5.25s5.85 1.9 6.5 5.25" /></svg></span>
            <span className="user-name">{userName}</span>
            <span className="profile-chevron" aria-hidden="true">▾</span>
          </button>
          {isProfileMenuOpen && (
            <div className="profile-menu" role="menu">
              <p className="profile-role">{userRole.replace('_', ' ')}</p>
              <button type="button" className="profile-logout" role="menuitem" onClick={onLogout}>
                Logout
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}

export default Navbar;
