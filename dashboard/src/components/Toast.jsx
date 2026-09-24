import {
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Info,
  X
} from 'lucide-react';
import './Toast.css';

export default function Toast({ message, type = 'info', onDismiss }) {
  function renderIcon() {
    switch (type) {
      case 'success':
        return <CheckCircle2 size={16} className="toast-icon text-success" />;
      case 'warning':
        return <AlertTriangle size={16} className="toast-icon text-warning" />;
      case 'error':
        return <XCircle size={16} className="toast-icon text-danger" />;
      default:
        return <Info size={16} className="toast-icon text-cyan" />;
    }
  }

  return (
    <div className={`toast toast--${type}`} role="alert">
      {renderIcon()}
      <span className="toast-message">{message}</span>
      <button className="toast-dismiss" onClick={onDismiss} aria-label="Dismiss">
        <X size={14} />
      </button>
    </div>
  );
}
