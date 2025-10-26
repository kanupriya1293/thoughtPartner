import React from 'react';
import { MessageSquare, GitBranch } from 'lucide-react';
import FloatingMenu from './FloatingMenu';

interface SelectionMenuProps {
  selectedText: string;
  position: { x: number; y: number };
  onAsk: () => void;
  onBranch: () => void;
  onClose: () => void;
}

const SelectionMenu: React.FC<SelectionMenuProps> = ({ selectedText, position, onAsk, onBranch, onClose }) => {
  const menuItems = [
    {
      id: 'ask',
      label: 'Ask here',
      icon: <MessageSquare className="w-3 h-3" />,
      onClick: onAsk,
    },
    {
      id: 'branch',
      label: 'Branch',
      icon: <GitBranch className="w-3 h-3" />,
      onClick: onBranch,
    },
  ];

  return (
    <FloatingMenu
      items={menuItems}
      isOpen={true}
      onClose={onClose}
      position={position}
      anchor="left"
    />
  );
};

export default SelectionMenu;

