import ReplayIcon from '@mui/icons-material/Replay';
import PlayingCard from './PlayingCard';
import DraggableCard from './DraggableCard';

// Source deck (face down) and draft pile (face up).
export default function SourcePiles({ stock, waste, onDraw, isDragging, isSelected, isShaking, onWasteClick }) {
  const top = waste[waste.length - 1];
  const under = waste[waste.length - 2];
  const from = { zone: 'waste' };
  const dragging = isDragging(from);

  return (
    <div className="source-row">
      <div className="pile">
        {stock.length > 0 ? (
          <button type="button" className="pile__button" onClick={onDraw} aria-label="Draw a card">
            {stock.length > 1 && <PlayingCard card={null} faceUp={false} className="card--depth" />}
            <PlayingCard card={null} faceUp={false} />
            <span className="pile__badge">{stock.length}</span>
          </button>
        ) : (
          <button
            type="button"
            className="slot slot--empty pile__button"
            onClick={onDraw}
            aria-label="Flip the draft pile back over"
          >
            {waste.length > 0 && <ReplayIcon className="slot__icon" />}
          </button>
        )}
      </div>

      <div className="pile">
        <div className="slot slot--empty" />
        {under && <PlayingCard card={under} className="pile__layer" />}
        {top && (
          <DraggableCard
            key={top.id}
            card={top}
            from={from}
            className="pile__layer"
            hidden={dragging}
            selected={isSelected(from)}
            shaking={isShaking(from)}
            onClick={(e) => {
              e.stopPropagation();
              onWasteClick();
            }}
          />
        )}
        {waste.length > 0 && <span className="pile__badge pile__badge--light">{waste.length}</span>}
      </div>
    </div>
  );
}
