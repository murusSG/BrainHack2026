import logo from '../assets/logo.jpg';

export function AppLogo({ className = '', variant = 'default' }) {
  return (
    <img
      className={`app-logo app-logo--${variant} ${className}`.trim()}
      src={logo}
      alt="MURUS SG"
      draggable="false"
    />
  );
}
