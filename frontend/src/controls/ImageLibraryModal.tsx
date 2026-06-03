import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import './ImageLibraryModal.scss';
import { Button } from '../components/Button';

interface ImageRecord {
  id: string;
  filename: string;
  original_name: string;
  mime_type: string;
  size_bytes: number;
  created_at: string;
}

function getUploadUrl(filename: string) {
  return `/uploads/${filename}`;
}

function getThumbnailUrl(filename: string) {
  return `/thumbnails/${filename}`;
}

export function ImageLibraryModal({ onSelect, onClose }: { onSelect?: (textureResource: string) => void; onClose: () => void }) {
  const [images, setImages] = useState<ImageRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [previewImage, setPreviewImage] = useState<ImageRecord | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<ImageRecord | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const fetchImages = () => {
    fetch('/api/images')
      .then(r => r.json())
      .then((records: ImageRecord[]) => { setImages(records); setLoading(false); })
      .catch(() => setLoading(false));
  };

  useEffect(() => { fetchImages(); }, []);

  const handleDelete = async (image: ImageRecord, e: React.MouseEvent) => {
    e.stopPropagation();
    setConfirmDelete(image);
  };

  const handleDeleteConfirmed = async () => {
    if (!confirmDelete) return;
    const res = await fetch(`/api/images/${confirmDelete.id}`, { method: 'DELETE' });
    if (res.ok) {
      setImages(prev => prev.filter(i => i.id !== confirmDelete.id));
      if (selectedImage === getUploadUrl(confirmDelete.filename)) setSelectedImage(null);
    }
    setConfirmDelete(null);
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    const form = new FormData();
    form.append('file', file);
    try {
      const res = await fetch('/api/images', { method: 'POST', body: form });
      if (!res.ok) throw new Error('Upload failed');
      const record: ImageRecord = await res.json();
      setImages(prev => [record, ...prev]);
    } finally {
      setUploading(false);
      e.target.value = '';
    }
  };

  return createPortal(
    <>
    <div className="add-sprite-overlay">
      <div className="add-sprite-modal" onClick={e => e.stopPropagation()}>
        <div className="add-sprite-modal-header">
          <span>Select Image</span>
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
              className={`add-sprite-image-item${selectedImage === getUploadUrl(image.filename) ? ' add-sprite-image-item--selected' : ''}`}
              onClick={() => setSelectedImage(getUploadUrl(image.filename))}
            >
              <img
                src={getThumbnailUrl(image.filename)}
                alt={image.original_name}
                className="add-sprite-thumb"
                loading="lazy"
              />
              <span className="add-sprite-image-name">{image.original_name}</span>
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
        {onSelect && (
          <div className="add-sprite-modal-footer">
            <Button
              variant="primary"
              disabled={selectedImage === null}
              onClick={() => { onSelect(selectedImage!); }}
            >
              Select
            </Button>
          </div>
        )}
      </div>
    </div>
    {previewImage && (
      <div className="add-sprite-preview-overlay" onClick={() => setPreviewImage(null)}>
        <div className="add-sprite-preview-modal" onClick={e => e.stopPropagation()}>
          <button className="add-sprite-preview-close" onClick={() => setPreviewImage(null)}>✕</button>
          <img src={getUploadUrl(previewImage!.filename)} alt={previewImage!.original_name} className="add-sprite-preview-img" />
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