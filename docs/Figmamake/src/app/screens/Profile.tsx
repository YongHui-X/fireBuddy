import { useState } from 'react';
import { ChevronRight, Bell, Lock, HelpCircle, LogOut, User, Shield, MessageSquare, Database } from 'lucide-react';
import { FIRE_DATA } from '../data/mockData';
import { theme } from '../theme';
import { clearAllData } from '../utils/localStorage';

const SETTINGS = [
  { icon: User,          label: 'Account info',        danger: false, action: 'navigate' },
  { icon: Bell,          label: 'Notifications',       danger: false, action: 'navigate' },
  { icon: Shield,        label: 'Login and security',  danger: false, action: 'navigate' },
  { icon: Lock,          label: 'Data and privacy',    danger: false, action: 'navigate' },
  { icon: MessageSquare, label: 'Message center',      danger: false, action: 'navigate' },
  { icon: HelpCircle,    label: 'Help & feedback',     danger: false, action: 'navigate' },
  { icon: Database,      label: 'Clear all data',      danger: true,  action: 'clear' },
  { icon: LogOut,        label: 'Sign out',            danger: true,  action: 'logout' },
];

export function Profile() {
  const [showClearDialog, setShowClearDialog] = useState(false);

  const handleClearData = () => {
    clearAllData();
    setShowClearDialog(false);
    // Reload the page to reset the app state
    window.location.reload();
  };

  const handleSettingClick = (action: string) => {
    if (action === 'clear') {
      setShowClearDialog(true);
    }
    // Handle other actions as needed
  };

  return (
    <div className="page-transition" style={{ minHeight: '100vh', backgroundColor: theme.colors.background.primary, overflowX: 'hidden', width: '100%' }}>
      <style>{`
        @media (max-width: 767px) {
          .profile-header {
            padding: 32px 20px 60px !important;
          }
          .profile-content {
            margin-top: -30px !important;
            padding: 0 20px 80px !important;
          }
        }
      `}</style>
      {/* Teal Header with Wave */}
      <div
        className="profile-header"
        style={{
          background: `linear-gradient(135deg, ${theme.colors.primary} 0%, ${theme.colors.primaryDark} 100%)`,
          padding: '48px 24px 80px',
          position: 'relative',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          overflowX: 'hidden',
          width: '100%',
          boxSizing: 'border-box',
        }}
      >
        {/* Avatar */}
        <div
          style={{
            width: 100,
            height: 100,
            borderRadius: '50%',
            backgroundColor: '#FFFFFF',
            border: `4px solid rgba(255,255,255,0.3)`,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            marginBottom: '16px',
            boxShadow: theme.shadows.lg,
          }}
        >
          <div style={{
            width: 92,
            height: 92,
            borderRadius: '50%',
            backgroundColor: theme.colors.primaryLight,
            color: theme.colors.primary,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '32px',
            fontWeight: 600,
          }}>
            {FIRE_DATA.initials}
          </div>
        </div>

        {/* Name */}
        <h2 style={{
          fontSize: '24px',
          color: '#FFFFFF',
          margin: '0 0 6px',
          fontWeight: 600,
        }}>
          {FIRE_DATA.name}
        </h2>
        <p style={{
          fontSize: '14px',
          color: 'rgba(255,255,255,0.8)',
          margin: 0,
        }}>
          @{FIRE_DATA.name.toLowerCase().replace(' ', '_')}
        </p>
      </div>

      {/* Content */}
      <div className="profile-content" style={{
        maxWidth: '600px',
        margin: '-40px auto 0',
        padding: '0 24px 100px',
        position: 'relative',
        zIndex: 1,
        width: '100%',
        boxSizing: 'border-box',
      }}>
        {/* Settings Card */}
        <div
          style={{
            backgroundColor: theme.colors.background.white,
            borderRadius: theme.borderRadius.xl,
            overflow: 'hidden',
            boxShadow: theme.shadows.lg,
          }}
        >
          {SETTINGS.map((item, i, arr) => (
            <div key={item.label}>
              <button
                onClick={() => handleSettingClick(item.action)}
                style={{
                  width: '100%',
                  background: 'none',
                  border: 'none',
                  padding: '18px 24px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '16px',
                  cursor: 'pointer',
                  textAlign: 'left',
                  fontFamily: 'DM Sans, sans-serif',
                  transition: 'background-color 0.2s',
                }}
                onMouseEnter={(e) => e.currentTarget.style.backgroundColor = theme.colors.background.primary}
                onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
              >
                <div style={{
                  width: 40,
                  height: 40,
                  borderRadius: theme.borderRadius.md,
                  backgroundColor: item.danger ? '#FEF2F2' : theme.colors.primaryLight,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0,
                }}>
                  <item.icon
                    size={20}
                    strokeWidth={2}
                    color={item.danger ? theme.colors.danger : theme.colors.primary}
                  />
                </div>
                <div style={{ flex: 1 }}>
                  <p style={{
                    fontSize: '15px',
                    fontWeight: 500,
                    color: item.danger ? theme.colors.danger : theme.colors.text.primary,
                    margin: 0,
                  }}>
                    {item.label}
                  </p>
                </div>
                {!item.danger && (
                  <ChevronRight
                    size={20}
                    strokeWidth={2}
                    color={theme.colors.text.light}
                  />
                )}
              </button>
              {i < arr.length - 1 && (
                <div style={{
                  height: '1px',
                  backgroundColor: theme.colors.border.light,
                  margin: '0 24px',
                }} />
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Clear Data Confirmation Dialog */}
      {showClearDialog && (
        <div
          style={{
            backgroundColor: 'rgba(0,0,0,0.5)',
            position: 'fixed',
            inset: 0,
            zIndex: 100,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '20px',
            animation: 'fadeIn 0.2s ease-out',
          }}
          onClick={() => setShowClearDialog(false)}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              width: '100%',
              maxWidth: '400px',
              backgroundColor: theme.colors.background.white,
              borderRadius: theme.borderRadius.xl,
              overflow: 'hidden',
              boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
              animation: 'slideUp 0.3s ease-out',
            }}
          >
            <div style={{
              padding: '24px',
            }}>
              <div style={{
                width: 48,
                height: 48,
                borderRadius: theme.borderRadius.md,
                backgroundColor: '#FEF2F2',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                marginBottom: '16px',
              }}>
                <Database size={24} color={theme.colors.danger} strokeWidth={2} />
              </div>
              <h3 style={{
                fontSize: '18px',
                fontWeight: 600,
                color: theme.colors.text.primary,
                margin: '0 0 8px',
              }}>
                Clear All Data?
              </h3>
              <p style={{
                fontSize: '14px',
                color: theme.colors.text.secondary,
                margin: '0 0 24px',
                lineHeight: 1.5,
              }}>
                This will permanently delete all your transactions, categories, and accounts. This action cannot be undone.
              </p>
              <div style={{
                display: 'flex',
                gap: '12px',
              }}>
                <button
                  onClick={() => setShowClearDialog(false)}
                  style={{
                    flex: 1,
                    padding: '12px',
                    borderRadius: theme.borderRadius.md,
                    border: `1px solid ${theme.colors.border.medium}`,
                    backgroundColor: theme.colors.background.white,
                    color: theme.colors.text.primary,
                    fontSize: '14px',
                    fontWeight: 500,
                    cursor: 'pointer',
                    fontFamily: 'DM Sans, sans-serif',
                    transition: 'all 0.2s',
                  }}
                >
                  Cancel
                </button>
                <button
                  onClick={handleClearData}
                  style={{
                    flex: 1,
                    padding: '12px',
                    borderRadius: theme.borderRadius.md,
                    border: 'none',
                    backgroundColor: theme.colors.danger,
                    color: '#FFFFFF',
                    fontSize: '14px',
                    fontWeight: 600,
                    cursor: 'pointer',
                    fontFamily: 'DM Sans, sans-serif',
                    transition: 'all 0.2s',
                  }}
                >
                  Clear All Data
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
