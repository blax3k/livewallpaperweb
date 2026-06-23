import { createPortal } from 'react-dom';
import './ImageLibraryModal.scss';
import { Button } from '../../components/Button';
import { useImageLibrary, getUploadUrl, getImageThumbnailUrl } from '../../hooks/useImageLibrary';
import { formatBytes } from '../../utils/sceneSize';

export function ImageLibraryModal({ projectId, onClose }: { projectId: string, onClose: () => void }) {
  const {
    images,
    loading,
    uploading,
    previewImage,
    setPreviewImage,
    confirmDelete,
    setConfirmDelete,
    fileInputRef,
    handleDelete,
    handleDeleteConfirmed,
    handleFileChange,
  } = useImageLibrary(projectId);

  return createPortal(
    <>
    <div className="add-sprite-overlay">
      <div className="add-sprite-modal" onClick={e => e.stopPropagation()}>
        <div className="add-sprite-modal-header">
          <span>Image Library</span>
          <div className="add-sprite-modal-header-actions">
            <Button
              disabled={uploading}
              onClick={() => fileInputRef.current?.click()}
            >
              {uploading ? 'Uploading…' : 'Upload'}
            </Button>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/png,image/jpeg,image/gif,image/webp"
              style={{ display: 'none' }}
              onChange={handleFileChange}
            />
            <button className="add-sprite-modal-close" onClick={onClose}>✕</button>
          </div>
        </div>
        <div className="add-sprite-modal-body">
          {loading && <div className="add-sprite-loading">Loading…</div>}
          {!loading && images.length === 0 && <div className="add-sprite-loading">No images found. Upload one to get started.</div>}
          {images.map(image => (
            <div
              key={image.id}
              className="add-sprite-image-item"
            >
              <img
                src={image.thumb_filename ? getImageThumbnailUrl(image.thumb_filename) : getUploadUrl(image.filename)}
                alt={image.original_name}
                className="add-sprite-thumb"
                loading="lazy"
              />
              <span className="add-sprite-image-name">{image.original_name}</span>
              <span className="image-size-label">{formatBytes(image.size_bytes)}</span>
              <div className="image-item-overlay">
                <button
                  className="image-item-overlay-btn image-item-overlay-btn--preview"
                  onClick={e => { e.stopPropagation(); setPreviewImage(image); }}
                  title="Preview"
                >
                  &#128065;
                </button>
              </div>
              <button
                className="image-item-overlay-btn image-item-overlay-btn--delete"
                onClick={e => handleDelete(image, e)}
                title="Delete"
              >
                &#128465;
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
    {previewImage && (
      <div className="add-sprite-preview-overlay" onClick={() => setPreviewImage(null)}>
        <div className="add-sprite-preview-modal" onClick={e => e.stopPropagation()}>
          <button className="add-sprite-preview-close" onClick={() => setPreviewImage(null)}>✕</button>
          <img src={getUploadUrl(previewImage.filename)} alt={previewImage.original_name} className="add-sprite-preview-img" />
        </div>
      </div>
    )}
    {confirmDelete && (
      <div className="add-sprite-preview-overlay" onClick={() => setConfirmDelete(null)}>
        <div className="add-sprite-confirm-delete-dialog" onClick={e => e.stopPropagation()}>
          <p>Delete <strong>{confirmDelete.original_name}</strong>?</p>
          <p className="add-sprite-confirm-delete-sub">This cannot be undone.</p>
          <div className="sprite-confirm-actions">
            <Button variant="danger" onClick={handleDeleteConfirmed}>Delete</Button>
            <Button onClick={() => setConfirmDelete(null)}>Cancel</Button>
          </div>
        </div>
      </div>
    )}
    </>,
    document.body
  );
}
