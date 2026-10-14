import { isTitle } from '../game';

export default function Card({ card, faceUp, selected, dim, className = '', style, children, ...rest }) {
  const classes = ['card'];
  if (!faceUp) classes.push('card-back');
  else classes.push(isTitle(card) ? 'card-title' : 'card-item');
  if (selected) classes.push('card-selected');
  if (dim) classes.push('card-dim');
  if (className) classes.push(className);

  return (
    <div className={classes.join(' ')} style={style} {...rest}>
      {faceUp && card && (
        <div className="card-face">
          {isTitle(card) ? (
            <>
              <span className="card-name">{card.categoryTitle}</span>
              <span className="card-count">{card.total} cards</span>
            </>
          ) : (
            <span className="card-name">{card.itemName}</span>
          )}
        </div>
      )}
      {children}
    </div>
  );
}
