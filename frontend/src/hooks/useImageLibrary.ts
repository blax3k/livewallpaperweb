import { useState, useEffect, useRef } from 'react';
import { imagesApi } from '../api';
import type { ImageRecord } from '../api';

export function getUploadUrl(filename: string) {
  return `/uploads/${filename}`;
}

export function getImageThumbnailUrl(thumbFilename: string) {
  return `/image-thumbnails/${thumbFilename}`;
}

export function useImageLibrary(projectId: string, onImageDeleted?: (image: ImageRecord) => void, onImageReplaced?: (oldResource: string, newResource: string) => void) {
  const [images, setImages] = useState<ImageRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [replacing, setReplacing] = useState(false);
  const [previewImage, setPreviewImage] = useState<ImageRecord | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<ImageRecord | null>(null);
  const [inUseScenes, setInUseScenes] = useState<string[] | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    imagesApi.list(projectId)
      .then((records) => { setImages(records); setLoading(false); })
      .catch(() => setLoading(false));
  }, [projectId]);

  const handleDelete = async (image: ImageRecord, e: React.MouseEvent) => {
    e.stopPropagation();
    const { scenes } = await imagesApi.checkUsage(image.id);
    if (scenes.length > 0) {
      setInUseScenes(scenes);
    } else {
      setConfirmDelete(image);
    }
  };

  const handleReplace = async (image: ImageRecord, e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setReplacing(true);
    try {
      const record = await imagesApi.replace(image.id, projectId, file);
      setImages(prev => prev.map(i => i.id === image.id ? record : i));
      onImageReplaced?.(`/uploads/${image.filename}`, `/uploads/${record.filename}`);
    } finally {
      setReplacing(false);
      e.target.value = '';
    }
  };

  const handleDeleteConfirmed = async () => {
    if (!confirmDelete) return;
    await imagesApi.delete(confirmDelete.id);
    setImages(prev => prev.filter(i => i.id !== confirmDelete.id));
    onImageDeleted?.(confirmDelete);
    setConfirmDelete(null);
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const record = await imagesApi.upload(projectId, file);
      setImages(prev => [record, ...prev]);
    } finally {
      setUploading(false);
      e.target.value = '';
    }
  };

  return {
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
    replacing,
    handleReplace,
    handleDelete,
    handleDeleteConfirmed,
    handleFileChange,
  };
}
