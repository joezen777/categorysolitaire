import React from 'react';
import { useDroppable } from '@dnd-kit/core';

interface DropZoneProps {
  id: string;
  zone: 'foundation' | 'tableau';
  index: number;
  children: React.ReactNode;
  disabled?: boolean;
}

export const DropZone: React.FC<DropZoneProps> = ({
  id,
  zone,
  index,
  children,
  disabled = false,
}) => {
  const { isOver, setNodeRef } = useDroppable({
    id,
    data: {
      zone,
      index,
    },
    disabled,
  });

  return (
    <div ref={setNodeRef}>
      {React.cloneElement(children as React.ReactElement, {
        isDraggingOver: isOver && !disabled,
      })}
    </div>
  );
};

export default DropZone;