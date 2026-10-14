import { useDraggable, useDroppable } from '@dnd-kit/core';

export function DraggableWrap({ id, src, disabled, className = '', style, onClick, children }) {
  const { attributes, listeners, setNodeRef } = useDraggable({ id, data: { src }, disabled });
  return (
    <div
      ref={setNodeRef}
      className={`draggable ${className}`}
      style={style}
      onClick={onClick}
      {...(disabled ? {} : listeners)}
      {...(disabled ? {} : attributes)}
    >
      {children}
    </div>
  );
}

export function DropZone({ id, dest, highlight, className = '', style, onClick, children }) {
  const { setNodeRef, isOver } = useDroppable({ id, data: { dest } });
  const state = highlight ? (isOver ? 'drop-over' : 'drop-valid') : '';
  return (
    <div ref={setNodeRef} className={`${className} ${state}`} style={style} onClick={onClick}>
      {children}
    </div>
  );
}
