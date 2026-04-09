import { Room } from '../lib/types';
import RoomCell from './RoomCell';
import './FloorMap.css';

interface Props {
  rooms: Room[];
  onRoomClick?: (room: Room) => void;
  highlightedRooms?: number[];
  showLegend?: boolean;
  rnCount?: number;
}

// Display order: for High Hall (vertical, runs up from station),
// we render from farthest-from-station (top) to closest (bottom).
// Each row is a pair: [even, odd] visually.
const HIGH_DISPLAY_ORDER: Array<[number, number]> = [
  [930, 929],
  [928, 927],
  [926, 925],
  [924, 923],
  [922, 921],
  [920, 919],
  [918, 917],
  [916, 915],
];

// Low Hall (horizontal, runs right from station):
// each column is a pair [odd on top, even on bottom].
const LOW_DISPLAY_COLUMNS: Array<[number, number]> = [
  [901, 902],
  [903, 904],
  [905, 906],
  [907, 908],
  [909, 910],
  [911, 912],
  [913, 914],
];

export default function FloorMap({
  rooms,
  onRoomClick,
  highlightedRooms = [],
  showLegend = false,
  rnCount = 0,
}: Props) {
  const byNumber = new Map(rooms.map((r) => [r.number, r]));
  const isHighlighted = (n: number) => highlightedRooms.includes(n);

  return (
    <div className="floor-map">
      <div className="hall-label">High Hall ↑</div>
      <div className="high-hall">
        {HIGH_DISPLAY_ORDER.flatMap(([left, right]) => {
          const lr = byNumber.get(left);
          const rr = byNumber.get(right);
          return [
            lr && (
              <RoomCell
                key={left}
                room={lr}
                onClick={onRoomClick ? () => onRoomClick(lr) : undefined}
                highlight={isHighlighted(left)}
              />
            ),
            rr && (
              <RoomCell
                key={right}
                room={rr}
                onClick={onRoomClick ? () => onRoomClick(rr) : undefined}
                highlight={isHighlighted(right)}
              />
            ),
          ];
        })}
      </div>

      <div className="station-row">
        <div className="station">
          NURSE
          <br />
          STATION
        </div>
        <div className="low-hall">
          {LOW_DISPLAY_COLUMNS.flatMap(([top, bottom]) => {
            const tr = byNumber.get(top);
            const br = byNumber.get(bottom);
            return [
              tr && (
                <RoomCell
                  key={top}
                  room={tr}
                  onClick={onRoomClick ? () => onRoomClick(tr) : undefined}
                  highlight={isHighlighted(top)}
                />
              ),
              br && (
                <RoomCell
                  key={bottom}
                  room={br}
                  onClick={onRoomClick ? () => onRoomClick(br) : undefined}
                  highlight={isHighlighted(bottom)}
                />
              ),
            ];
          })}
        </div>
      </div>
      <div className="hall-label">Low Hall →</div>

      {showLegend && rnCount > 0 && (
        <div className="legend">
          {Array.from({ length: rnCount }, (_, i) => (
            <span className="legend-item" key={i}>
              <span
                className="legend-swatch"
                style={{ background: `var(--rn-${i % 6})` }}
              />
              RN{i + 1}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}
