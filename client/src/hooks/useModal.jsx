// client/src/hooks/useModal.jsx
import React, { useState, useCallback, useMemo } from 'react';
import Modal from '../components/Modal';

export function useModal() {
  const [modalState, setModalState] = useState({
    isOpen: false,
    title: '',
    message: '',
    type: 'info'
  });

  const showModal = useCallback((message, title = '', type = 'info') => {
    setModalState({
      isOpen: true,
      title,
      message,
      type
    });
  }, []);

  const hideModal = useCallback(() => {
    setModalState(prev => ({ ...prev, isOpen: false }));
  }, []);

  const ModalComponent = useCallback(() => (
    <Modal
      isOpen={modalState.isOpen}
      onClose={hideModal}
      title={modalState.title}
      message={modalState.message}
      type={modalState.type}
    />
  ), [modalState.isOpen, modalState.title, modalState.message, modalState.type, hideModal]);

  return { showModal, hideModal, ModalComponent };
}

// Convenience function that works like alert() but with modal
export function showAlert(message, title = '', type = 'info') {
  // This will be used with a global modal context
  // For now, we'll use the hook approach
  return { message, title, type };
}

