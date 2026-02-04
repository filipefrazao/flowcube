'use client';
import { Canvas } from '@react-three/fiber';
import { OrbitControls, PerspectiveCamera, Environment } from '@react-three/drei';
import { Node3D } from './Node3D';

interface Canvas3DProps {
  nodes: any[];
  onNodeClick?: (nodeId: string) => void;
}

export function Canvas3D({ nodes, onNodeClick }: Canvas3DProps) {
  return (
    <div className="w-full h-full relative bg-gradient-to-b from-gray-900 to-black">
      <Canvas shadows>
        <PerspectiveCamera makeDefault position={[0, 5, 10]} />
        <OrbitControls enableDamping dampingFactor={0.05} minDistance={3} maxDistance={20} />
        <ambientLight intensity={0.3} />
        <directionalLight position={[10, 10, 5]} intensity={1} castShadow />
        <pointLight position={[-10, -10, -5]} intensity={0.5} color="#A855F7" />
        <pointLight position={[10, -10, -5]} intensity={0.5} color="#00ffff" />
        <Environment preset="city" />
        {nodes.map((node, index) => (
          <Node3D key={node.id} node={node} position={[(index % 5) * 3 - 6, Math.floor(index / 5) * 3, 0]} onClick={() => onNodeClick?.(node.id)} />
        ))}
      </Canvas>
    </div>
  );
}
