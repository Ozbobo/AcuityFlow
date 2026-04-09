import { Room } from '../lib/types';
import './RoomCell.css';

interface Props {
  room: Room;
  onClick?: () => void;
  highlight?: boolean;
}

export default function RoomCell({ room, onClick, highlight }: Props) {
  const classes = ['room-cell'];
  if (room.criticality) classes.push(room.criticality);
  if (room.assignedTo !== null) classes.push(`rn-${room.assignedTo % 6}`);
  if (highlight) classes.push('highlight');

  return (
    <div
      className={classes.join(' ')}
      role={onClick ? 'button' : undefined}
      aria-label={`Room ${room.number}`}
      onClick={onClick}
    >
      {room.number}
    </div>
  );
}
