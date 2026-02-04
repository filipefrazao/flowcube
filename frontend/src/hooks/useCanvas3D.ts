import { useState, useCallback } from 'react';

export function useCanvas3D() {
  const [is3DMode, setIs3DMode] = useState(false);
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  
  const toggle3DMode = useCallback(() => {
    setIs3DMode(prev => !prev);
  }, []);
  
  const handleNodeClick = useCallback((nodeId: string) => {
    setSelectedNodeId(nodeId);
  }, []);
  
  return { is3DMode, toggle3DMode, selectedNodeId, handleNodeClick };
}
