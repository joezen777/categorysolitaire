import React, { createContext, useContext, useState, useCallback } from 'react';

const SelectionContext = createContext(null);

export function SelectionProvider({ children }) {
  const [selected, setSelected] = useState(null);
  // selected shape: { type: 'waste' | 'tableau', colIndex?, cardIndex? }

  const select = useCallback((source) => {
    setSelected(source);
  }, []);

  const clearSelection = useCallback(() => {
    setSelected(null);
  }, []);

  return (
    <SelectionContext.Provider value={{ selected, select, clearSelection }}>
      {children}
    </SelectionContext.Provider>
  );
}

export function useSelection() {
  const context = useContext(SelectionContext);
  if (!context) {
    throw new Error('useSelection must be used within a SelectionProvider');
  }
  return context;
}
