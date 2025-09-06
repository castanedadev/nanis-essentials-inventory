import React from 'react';
import { Button } from '../atoms/Button';
import { Heading } from '../atoms/Typography';

interface ModalProps {
  title: string;
  onClose: () => void;
  children: React.ReactNode;
}

export function Modal({ title, onClose, children }: ModalProps) {
  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <div className="modal-title">
            <Heading level={3}>{title}</Heading>
          </div>
          <Button variant="icon" onClick={onClose} aria-label="Close modal">
            ✕
          </Button>
        </div>
        <div className="modal-body">{children}</div>
      </div>
    </div>
  );
}
