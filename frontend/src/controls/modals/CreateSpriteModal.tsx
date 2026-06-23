import { useState } from 'react';
import { createPortal } from 'react-dom';
import './CreateSpriteModal.scss';
import { Button } from '../../components/Button';
import { ImageInUseModal } from '../../components/ImageInUseModal';
import { useImageLibrary, getUploadUrl, getImageThumbnailUrl } from '../../hooks/useImageLibrary';
import { formatBytes } from '../../utils/sceneSize';

export function CreateSpriteModal({ onSelect, onClose, projectId }: { onSelect: (textureResource: string) => void; onClose: () => void; projectId: string; }) {
  const [selectedImage, setSelectedImage] = useState<string | null>(null);

  const {
    images,
    loading,
    uploading,
    previewImage,
    setPreviewImage,
    confirmDelete,
    setConfirmDelete,
    inUseScenes,
    setInUseScenes,
    fileInputRef,
    handleDelete,
    handleDeleteConfirmed,
    handleFileChange,
  } = useImageLibrary(projectId, (deleted) => {
    if (selectedImage === getUploadUrl(deleted.filename)) setSelectedImage(null);
  });

  return createPortal(
    <>
    <div className="create-sprite-overlay">
      <div className="create-sprite-modal" onClick={e => e.stopPropagation()}>
        <div className="create-sprite-modal-header">
          <span>Create Sprite</span>
          <div className="create-sprite-modal-header-actions">
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
            <button className="create-sprite-modal-close" onClick={onClose}>✕</button>
          </div>
        </div>
        <div className="create-sprite-modal-body">
          {loading && <div className="create-sprite-loading">Loading…</div>}
          {!loading && images.length === 0 && <div className="create-sprite-loading">No images found. Upload one to get started.</div>}
          {images.map(image => (
            <div
              key={image.id}
              className={`create-sprite-image-item${selectedImage === getUploadUrl(image.filename) ? ' create-sprite-image-item--selected' : ''}`}
              onClick={() => setSelectedImage(getUploadUrl(image.filename))}
            >
              <img
                src={image.thumb_filename ? getImageThumbnailUrl(image.thumb_filename) : getUploadUrl(image.filename)}
                alt={image.original_name}
                className="create-sprite-thumb"
                loading="lazy"
              />
              <span className="create-sprite-image-name">{image.original_name}</span>
              <span className="image-size-label">{formatBytes(image.size_bytes)}</span>
              <div className="create-sprite-image-item-overlay">
                <button
                  className="create-sprite-image-item-overlay-btn create-sprite-image-item-overlay-btn--preview"
                  onClick={e => { e.stopPropagation(); setPreviewImage(image); }}
                  title="Preview"
                >
                  &#128065;
                </button>
                <button
                  className="create-sprite-image-item-overlay-btn create-sprite-image-item-overlay-btn--delete"
                  onClick={e => handleDelete(image, e)}
                  title="Delete"
                >
                  &#128465;
                </button>
              </div>
            </div>
          ))}
        </div>
        <div className="create-sprite-modal-footer">
          <Button
            variant="primary"
            disabled={selectedImage === null}
            onClick={() => { onSelect(selectedImage!); }}
          >
            Create
          </Button>
        </div>
      </div>
    </div>
    {previewImage && (
      <div className="create-sprite-preview-overlay" onClick={() => setPreviewImage(null)}>
        <div className="create-sprite-preview-modal" onClick={e => e.stopPropagation()}>
          <button className="create-sprite-preview-close" onClick={() => setPreviewImage(null)}>✕</button>
          <img src={getUploadUrl(previewImage.filename)} alt={previewImage.original_name} className="create-sprite-preview-img" />
        </div>
      </div>
    )}
    {confirmDelete && (
      <div className="create-sprite-preview-overlay" onClick={() => setConfirmDelete(null)}>
        <div className="create-sprite-confirm-delete-dialog" onClick={e => e.stopPropagation()}>
          <p>Delete <strong>{confirmDelete.original_name}</strong>?</p>
          <p className="create-sprite-confirm-delete-sub">This cannot be undone.</p>
          <div className="create-sprite-confirm-actions">
            <Button variant="danger" onClick={handleDeleteConfirmed}>Delete</Button>
            <Button onClick={() => setConfirmDelete(null)}>Cancel</Button>
          </div>
        </div>
      </div>
    )}
    {inUseScenes && <ImageInUseModal scenes={inUseScenes} onClose={() => setInUseScenes(null)} />}
    </>,
    document.body
  );
}
