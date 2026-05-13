import { Outlet, NavLink, useLocation, useNavigate } from 'react-router';
import { Home, ArrowLeftRight, Grid2X2, User, Plus } from 'lucide-react';
import { theme } from '../theme';

const navItems = [
  { path: '/',             icon: Home,          label: 'Home'         },
  { path: '/transactions', icon: ArrowLeftRight, label: 'Transactions' },
  { path: '/categories',   icon: Grid2X2,        label: 'Categories'   },
  { path: '/profile',      icon: User,           label: 'Profile'      },
];

// Mobile bottom nav item
function MobileTabItem({ path, icon: Icon, label }: { path: string; icon: React.ElementType; label: string }) {
  const location = useLocation();
  const isActive = path === '/' ? location.pathname === '/' : location.pathname.startsWith(path);
  return (
    <NavLink
      to={path}
      style={{
        flex: 1,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: '3px',
        textDecoration: 'none',
        color: isActive ? '#4A9B8E' : '#6B8577',
        opacity: isActive ? 1 : 0.65,
        padding: '10px 0 6px',
      }}
    >
      <Icon size={19} strokeWidth={isActive ? 2 : 1.5} />
      <span style={{ fontSize: '10px', letterSpacing: '0.02em', fontFamily: 'DM Sans, sans-serif' }}>
        {label}
      </span>
    </NavLink>
  );
}

// Desktop sidebar item
function SidebarNavItem({ path, icon: Icon, label }: { path: string; icon: React.ElementType; label: string }) {
  const location = useLocation();
  const isActive = path === '/' ? location.pathname === '/' : location.pathname.startsWith(path);
  return (
    <NavLink
      to={path}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: '10px',
        textDecoration: 'none',
        color: isActive ? '#4A9B8E' : '#6B8577',
        backgroundColor: isActive ? '#DCEBDD' : 'transparent',
        padding: '10px 14px',
        borderRadius: '10px',
        fontSize: '13px',
        fontWeight: isActive ? 500 : 400,
        transition: 'all 0.15s ease',
      }}
    >
      <Icon size={18} strokeWidth={isActive ? 2 : 1.5} />
      <span>{label}</span>
    </NavLink>
  );
}

export function Layout() {
  const navigate = useNavigate();

  return (
    <>
      <style>{`
        .mobile-nav { display: flex; }
        .desktop-sidebar { display: none; }
        .content-wrapper { max-width: 390px; }

        @media (min-width: 768px) {
          .mobile-nav { display: none; }
          .desktop-sidebar { display: flex; }
          .content-wrapper { max-width: none; }
          .app-container { padding-left: 200px; }
        }
      `}</style>

      <div style={{ backgroundColor: '#F5F8F4', minHeight: '100vh' }}>
        {/* Desktop Sidebar */}
        <aside
          className="desktop-sidebar"
          style={{
            position: 'fixed',
            left: 0,
            top: 0,
            width: '200px',
            height: '100vh',
            backgroundColor: '#FFFFFF',
            borderRight: '1px solid #D7E3D8',
            padding: '24px 14px',
            flexDirection: 'column',
            gap: '8px',
            zIndex: 30,
          }}
        >
          {/* Logo/Brand */}
          <div style={{ marginBottom: '32px', padding: '0 12px' }}>
            <h1 style={{ fontSize: '20px', color: '#4A9B8E', fontWeight: 600, margin: 0 }}>FireBuddy</h1>
            <p style={{ fontSize: '11px', color: '#6B8577', margin: '4px 0 0' }}>SG FIRE Tracker</p>
          </div>

          {/* Nav items */}
          <nav style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
            {navItems.map(item => (
              <SidebarNavItem key={item.path} {...item} />
            ))}
          </nav>

          {/* Desktop Add Button */}
          <button
            onClick={() => navigate('/add')}
            className="button-press"
            style={{
              marginTop: 'auto',
              width: '100%',
              padding: '11px',
              borderRadius: '10px',
              backgroundColor: '#4A9B8E',
              color: '#FFFFFF',
              border: 'none',
              fontSize: '13px',
              fontWeight: 500,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '6px',
            }}
          >
            <Plus size={16} strokeWidth={2} />
            Add Transaction
          </button>
        </aside>

        {/* Main Content */}
        <div className="app-container" style={{ minHeight: '100vh', display: 'flex', justifyContent: 'center' }}>
          <div
            className="content-wrapper"
            style={{
              width: '100%',
              height: '100vh',
              backgroundColor: '#F5F8F4',
              display: 'flex',
              flexDirection: 'column',
              overflow: 'hidden',
              position: 'relative',
            }}
          >
            {/* Scrollable content area */}
            <div style={{ flex: 1, overflowY: 'auto' }}>
              <Outlet />
            </div>

            {/* Mobile Bottom navigation with protruding FAB */}
            <nav
              className="mobile-nav"
              style={{
                height: '68px',
                flexShrink: 0,
                backgroundColor: '#F5F8F4',
                borderTop: '1px solid #D7E3D8',
                alignItems: 'stretch',
                position: 'relative',
                overflow: 'visible',
              }}
            >
              {/* First two items */}
              <div style={{ flex: 1, display: 'flex' }}>
                {navItems.slice(0, 2).map(t => <MobileTabItem key={t.path} {...t} />)}
              </div>

              {/* Center spacer for FAB */}
              <div style={{ width: '72px', flexShrink: 0 }} />

              {/* Last two items */}
              <div style={{ flex: 1, display: 'flex' }}>
                {navItems.slice(2, 4).map(t => <MobileTabItem key={t.path} {...t} />)}
              </div>

              {/* Protruding FAB — centered, half outside the nav */}
              <button
                onClick={() => navigate('/add')}
                className="button-press fab-pulse"
                style={{
                  position: 'absolute',
                  top: '-26px',
                  left: '50%',
                  transform: 'translateX(-50%)',
                  width: '56px',
                  height: '56px',
                  borderRadius: '50%',
                  backgroundColor: '#4A9B8E',
                  color: '#FFFFFF',
                  border: '3px solid #F5F8F4',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  zIndex: 20,
                  boxSizing: 'border-box',
                }}
              >
                <Plus size={22} strokeWidth={2.5} />
              </button>
            </nav>
          </div>
        </div>
      </div>
    </>
  );
}
