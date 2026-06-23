import { createPortal } from 'react-dom';
import './ImageInUseModal.scss';
import { Button } from './Button';

export function ImageInUseModal({ scenes, onClose }: { scenes: string[]; onClose: () => void }) {
  return createPortal(
    <div className="image-in-use-overlay" onClick={onClose}>
      <div className="image-in-use-dialog" onClick={e => e.stopPropagation()}>
        <p><strong>Image could not be deleted.</strong></p>
        <p className="image-in-use-sub">It is currently used in the following scene{scenes.length !== 1 ? 's' : ''}:</p>
        <ul className="image-in-use-list">
          {scenes.map(scene => <li key={scene}>{scene}</li>)}
        </ul>
        <div className="image-in-use-actions">
          <Button onClick={onClose}>OK</Button>
        </div>
      </div>
    </div>,
    document.body
  );
}
