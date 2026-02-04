'use client';
import { useRef, useState } from 'react';
import { useFrame } from '@react-three/fiber';
import { RoundedBox, Text } from '@react-three/drei';
import * as THREE from 'three';

interface Node3DProps {
  node: any;
  position: [number, number, number];
  onClick?: () => void;
}

export function Node3D({ node, position, onClick }: Node3DProps) {
  const meshRef = useRef<THREE.Mesh>(null);
  const [hovered, setHovered] = useState(false);
  
  useFrame((state) => {
    if (meshRef.current) {
      meshRef.current.position.y = position[1] + Math.sin(state.clock.elapsedTime + position[0]) * 0.1;
    }
  });
  
  const color = node.type === 'trigger' ? '#A855F7' : node.type === 'action' ? '#00ffff' : node.type === 'condition' ? '#c8eb2d' : '#3B82F6';
  
  return (
    <group position={position}>
      <RoundedBox ref={meshRef} args={[2, 1.5, 0.3]} radius={0.2} smoothness={4} onPointerOver={() => setHovered(true)} onPointerOut={() => setHovered(false)} onClick={onClick} castShadow receiveShadow>
        <meshPhysicalMaterial color={color} transparent opacity={hovered ? 0.9 : 0.7} roughness={0.2} metalness={0.1} transmission={0.5} thickness={0.5} clearcoat={1} clearcoatRoughness={0.1} />
      </RoundedBox>
      <Text position={[0, 0, 0.2]} fontSize={0.2} color="white" anchorX="center" anchorY="middle" outlineWidth={0.02} outlineColor="#000000">
        {node.data?.label || node.type}
      </Text>
      {hovered && <pointLight position={[0, 0, 1]} intensity={2} distance={3} color={color} />}
    </group>
  );
}
