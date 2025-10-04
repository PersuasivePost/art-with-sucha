import React, { useEffect } from 'react';
import './ImageModal.css';

interface ImageModalProps {
  isOpen: boolean;
  imageUrl: string;
  altText?: string;
  onClose: () => void;
}

export default function ImageModal({ isOpen, imageUrl, altText = 'Full size image', onClose }: ImageModalProps) {
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener('keydown', handleEscape);
      document.body.style.overflow = 'hidden'; // Prevent background scrolling
    } else {
      document.body.style.overflow = 'unset';
    }

    return () => {
      document.removeEventListener('keydown', handleEscape);
      document.body.style.overflow = 'unset';
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  return (
    <div className="image-modal-overlay" onClick={handleBackdropClick}>
      <div className="image-modal-container">
        <button 
          className="image-modal-close"
          onClick={onClose}
          aria-label="Close image modal"
        >
          ×
        </button>
        
        <div className="image-modal-content">
          <img 
            src={imageUrl} 
            alt={altText}
            className="image-modal-img"
            onClick={e => e.stopPropagation()}
          />
        </div>
      </div>
    </div>
  );
}