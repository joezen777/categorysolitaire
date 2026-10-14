import { CARD_TITLE } from '../game/deck';

// Visual card. Face-down cards show the generic back; face-up cards show a
// small label strip at the top (visible when stacked) plus the full face.
export default function PlayingCard({
  card,
  faceUp = true,
  selected = false,
  shaking = false,
  hidden = false,
  className = '',
  style,
  onClick,
  ref,
  ...rest
}) {
  const classes = ['card'];
  if (!faceUp) classes.push('card--back');
  else classes.push(card.type === CARD_TITLE ? 'card--title' : 'card--item');
  if (selected) classes.push('card--selected');
  if (shaking) classes.push('card--shake');
  if (hidden) classes.push('card--hidden');
  if (className) classes.push(className);

  return (
    <div
      ref={ref}
      className={classes.join(' ')}
      style={style}
      onClick={onClick}
      aria-label={faceUp ? cardAriaLabel(card) : 'Face-down card'}
      {...rest}
    >
      {faceUp && <CardFace card={card} />}
    </div>
  );
}

function cardAriaLabel(card) {
  return card.type === CARD_TITLE
    ? `Category title ${card.label}, ${card.total} cards`
    : `Item ${card.label}`;
}

function CardFace({ card }) {
  const isTitle = card.type === CARD_TITLE;
  return (
    <>
      <div className="card__strip">{card.label}</div>
      <div className="card__body">
        {isTitle && <div className="card__kicker">Category</div>}
        <div className="card__label">{card.label}</div>
        {isTitle && <div className="card__count">{card.total} cards</div>}
      </div>
    </>
  );
}
