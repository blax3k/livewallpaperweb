import { createPortal } from 'react-dom';
import './ImageInUseModal.scss';
import { Button } from './Button';

interface FlagInUseModalProps {
  flagName: string;
  scenes: string[];
  rules: string[];
  onClose: () => void;
}

export function FlagInUseModal({ flagName, scenes, rules, onClose }: FlagInUseModalProps) {
  return createPortal(
    <div className="image-in-use-overlay" onClick={onClose}>
      <div className="image-in-use-dialog" onClick={e => e.stopPropagation()}>
        <p><strong>"{flagName}" could not be deleted.</strong></p>
        <p className="image-in-use-sub">It is currently referenced by the following:</p>
        {scenes.length > 0 && (
          <>
            <p className="image-in-use-sub">Scenes</p>
            <ul className="image-in-use-list">
              {scenes.map(scene => <li key={scene}>{scene}</li>)}
            </ul>
          </>
        )}
        {rules.length > 0 && (
          <>
            <p className="image-in-use-sub">Rules</p>
            <ul className="image-in-use-list">
              {rules.map(rule => <li key={rule}>{rule}</li>)}
            </ul>
          </>
        )}
        <div className="image-in-use-actions">
          <Button onClick={onClose}>OK</Button>
        </div>
      </div>
    </div>,
    document.body
  );
}
